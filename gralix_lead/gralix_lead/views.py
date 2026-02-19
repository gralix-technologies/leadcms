from django.shortcuts import render, redirect
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.decorators import login_required
from django.contrib.auth.mixins import LoginRequiredMixin
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.views.decorators.http import require_http_methods
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q, Sum, Count
from django.utils import timezone
from datetime import datetime
import json

from .models import Lead, Personnel, Communication, Assignment, Product, ResourceAssignment, MaterialCost, Notification
from .serializers import (LeadSerializer, LeadCreateSerializer, PersonnelSerializer, 
                         CommunicationSerializer, PersonnelLoginSerializer, ProductSerializer,
                         ResourceAssignmentSerializer, MaterialCostSerializer, NotificationSerializer)

ACTIVE_WORKLOAD_STATUSES = Lead.ACTIVE_WORKLOAD_STATUSES

def login_view(request):
    if request.user.is_authenticated:
        return redirect('dashboard')
    
    if request.method == 'POST':
        serializer = PersonnelLoginSerializer(data=request.POST)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            login(request, user)
            return redirect('dashboard')
        else:
            return render(request, 'leads/login.html', {
                'errors': serializer.errors
            })
    
    return render(request, 'leads/login.html')

@login_required
def logout_view(request):
    logout(request)
    return redirect('login')

@api_view(['POST'])
@permission_classes([])
@csrf_exempt
def api_login(request):
    username = request.data.get('username')
    password = request.data.get('password')
    
    if not username or not password:
        return Response({'error': 'Please provide both username and password'}, status=status.HTTP_400_BAD_REQUEST)
        
    user = authenticate(request, username=username, password=password)
    
    if user is not None:
        login(request, user)
        serializer = PersonnelSerializer(user)
        return Response({
            'message': 'Login successful',
            'user': serializer.data
        })
    else:
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['POST'])
def api_logout(request):
    logout(request)
    return Response({'message': 'Logout successful'})

@login_required
def dashboard(request):
    return render(request, 'leads/dashboard.html', {
        'user': request.user,
        'user_permissions': {
            'can_manage_leads': request.user.can_manage_leads(),
            'can_view_all_leads': request.user.can_view_all_leads(),
        }
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_leads(request):
    # Filter leads based on user permissions
    leads = request.user.get_accessible_leads()
    
    # Server-side Search
    search_query = request.query_params.get('search', '').strip()
    if search_query:
        leads = leads.filter(
            Q(company__icontains=search_query) |
            Q(contact_name__icontains=search_query) |
            Q(email__icontains=search_query)
        )

    leads = leads.select_related('assigned_to', 'created_by').prefetch_related('communications', 'assignments')
    serializer = LeadSerializer(leads, many=True, context={'request': request})
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_calendar(request):
    leads = request.user.get_accessible_leads().filter(follow_up_date__isnull=False)
    
    response = HttpResponse(content_type='text/calendar')
    response['Content-Disposition'] = 'attachment; filename="follow_ups.ics"'
    
    response.write('BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Gralix//Lead Management System//EN\nCALSCALE:GREGORIAN\n')
    
    for lead in leads:
        response.write('BEGIN:VEVENT\n')
        response.write(f'SUMMARY:Follow up: {lead.company}\n')
        if lead.follow_up_date:
            # Format date as YYYYMMDD
            dt_start = lead.follow_up_date.strftime('%Y%m%d')
            response.write(f'DTSTART;VALUE=DATE:{dt_start}\n')
            
        desc = f"Contact: {lead.contact_name or 'N/A'}"
        if lead.email: desc += f" | Email: {lead.email}"
        desc += f" | Status: {lead.get_status_display()}"
        
        # Escape newlines in description if any (simple approach)
        response.write(f'DESCRIPTION:{desc}\n')
        response.write('END:VEVENT\n')
        
    response.write('END:VCALENDAR\n')
    return response

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_personnel(request):
    # Only show active personnel
    if request.user.can_view_all_leads():
        personnel = Personnel.objects.filter(is_active_personnel=True)
    else:
        # Show personnel from same division
        personnel = Personnel.objects.filter(
            is_active_personnel=True, 
            division=request.user.division
        )

    # Add a DB-derived workload count (active, non-deleted assigned leads)
    personnel = personnel.annotate(
        active_workload=Count(
            'assigned_leads',
            filter=Q(
                assigned_leads__is_deleted=False,
                assigned_leads__status__in=ACTIVE_WORKLOAD_STATUSES,
            ),
        )
    )

    serializer = PersonnelSerializer(personnel, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_lead(request):
    serializer = LeadCreateSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        # Check if user can create leads in this division
        division = serializer.validated_data.get('division')
        if not request.user.can_view_all_leads() and division != request.user.division:
            return Response(
                {'error': 'You can only create leads in your division'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        lead = serializer.save()
        
        # Create initial assignment if assigned_to is provided
        if lead.assigned_to:
            Assignment.objects.create(
                lead=lead,
                to_personnel=lead.assigned_to,
                assigned_by=request.user,
                reason='Initial assignment'
            )
        
        return Response(LeadSerializer(lead, context={'request': request}).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_lead(request, lead_id):
    try:
        lead = Lead.objects.get(id=lead_id)
        
        # Check permissions
        if not lead.can_be_edited_by(request.user):
            return Response(
                {'error': 'You do not have permission to edit this lead'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        old_assigned_to = lead.assigned_to
        
        serializer = LeadCreateSerializer(lead, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            lead = serializer.save()
            
            # Track assignment changes
            if old_assigned_to != lead.assigned_to:
                Assignment.objects.create(
                    lead=lead,
                    from_personnel=old_assigned_to,
                    to_personnel=lead.assigned_to,
                    assigned_by=request.user,
                    reason='Lead edited'
                )
            
            return Response(LeadSerializer(lead, context={'request': request}).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Lead.DoesNotExist:
        return Response({'error': 'Lead not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_lead(request, lead_id):
    try:
        lead = Lead.objects.get(id=lead_id)
        
        # Check permissions
        if not lead.can_be_edited_by(request.user):
            return Response(
                {'error': 'You do not have permission to delete this lead'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        lead.soft_delete()
        return Response({'message': 'Lead deleted successfully'})
    except Lead.DoesNotExist:
        return Response({'error': 'Lead not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_status_update(request):
    """
    Bulk update status for a list of lead IDs.
    Expects JSON: { "lead_ids": [1, 2, ...], "status": "new", "progress": 10 }
    """
    lead_ids = request.data.get('lead_ids', [])
    new_status = request.data.get('status')
    progress = request.data.get('progress')

    if not lead_ids or not new_status:
        return Response({'error': 'Missing lead_ids or status'}, status=status.HTTP_400_BAD_REQUEST)

    # Filter leads user can edit
    leads = Lead.objects.filter(id__in=lead_ids)
    updated_count = 0
    
    for lead in leads:
        if lead.can_be_edited_by(request.user):
            lead.status = new_status
            if progress is not None:
                lead.progress = progress
            lead.save()
            updated_count += 1

    return Response({'message': f'Successfully updated {updated_count} leads.'})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_delete(request):
    """
    Bulk delete a list of lead IDs (soft delete).
    Expects JSON: { "lead_ids": [1, 2, ...] }
    """
    lead_ids = request.data.get('lead_ids', [])

    if not lead_ids:
        return Response({'error': 'Missing lead_ids'}, status=status.HTTP_400_BAD_REQUEST)

    # Filter leads user can edit
    leads = Lead.objects.filter(id__in=lead_ids)
    deleted_count = 0
    
    for lead in leads:
        if lead.can_be_edited_by(request.user):
            lead.soft_delete()
            deleted_count += 1

    return Response({'message': f'Successfully deleted {deleted_count} leads.'})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def log_communication(request):
    lead_id = request.data.get('lead_id')
    communication_type = request.data.get('communication_type')
    note = request.data.get('note')
    new_status = request.data.get('new_status')
    next_followup = request.data.get('next_followup')
    
    try:
        lead = Lead.objects.get(id=lead_id)
        
        # Check permissions
        if not lead.can_be_viewed_by(request.user):
            return Response(
                {'error': 'You do not have permission to access this lead'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Create communication entry
        Communication.objects.create(
            lead=lead,
            communication_type=communication_type,
            note=note,
            user=request.user
        )
        
        # Update lead
        lead.last_contact = timezone.now().date()
        
        if new_status:
            lead.status = new_status
        
        if next_followup:
            lead.follow_up_date = datetime.strptime(next_followup, '%Y-%m-%d').date()
        
        # Auto-update status for new leads
        if not new_status and lead.status == 'new' and communication_type != 'email':
            lead.status = 'contacted'
            lead.progress = 25
        
        lead.save()
        
        return Response(LeadSerializer(lead, context={'request': request}).data)
    except Lead.DoesNotExist:
        return Response({'error': 'Lead not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reassign_lead(request):
    lead_id = request.data.get('lead_id')
    new_assignee_id = request.data.get('new_assignee_id')
    reason = request.data.get('reason')
    
    try:
        from .services.assignment_service import AssignmentService
        
        lead = Lead.objects.get(id=lead_id)
        new_assignee = Personnel.objects.get(id=new_assignee_id)
        
        # Check permissions
        if not lead.can_be_edited_by(request.user):
            return Response(
                {'error': 'You do not have permission to reassign this lead'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Use Service Logic
        AssignmentService.assign_lead(lead, new_assignee, request.user, reason)
        
        return Response(LeadSerializer(lead, context={'request': request}).data)
    except (Lead.DoesNotExist, Personnel.DoesNotExist):
        return Response({'error': 'Lead or Personnel not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_assign(request):
    strategy = request.data.get('strategy')
    scope = request.data.get('scope')
    manual_assignee_id = request.data.get('manual_assignee_id')
    
    # Check permissions
    if not request.user.can_manage_leads():
        return Response(
            {'error': 'You do not have permission to perform bulk assignments'}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Get leads to assign based on user permissions
    accessible_leads = request.user.get_accessible_leads()
    
    if scope == 'unassigned':
        leads = accessible_leads.filter(assigned_to__isnull=True)
    else:
        leads = accessible_leads
    
    if not leads.exists():
        return Response({'error': 'No leads to assign'}, status=status.HTTP_400_BAD_REQUEST)
        
    # Use Service Logic
    from .services.assignment_service import AssignmentService
    
    try:
        updated_count = AssignmentService.bulk_assign(
            leads, 
            strategy, 
            request.user, 
            manual_assignee_id
        )
        return Response({'message': f'Successfully assigned {updated_count} leads'})
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_analytics(request):
    from django.db.models import F, Sum, Avg, FloatField, ExpressionWrapper

    # Get leads based on user permissions
    accessible_leads = request.user.get_accessible_leads()

    # Division filtering for the Analytics page tabs
    division_filter = request.GET.get('division', 'all')
    if division_filter != 'all':
        accessible_leads = accessible_leads.filter(division=division_filter)

    total_leads = accessible_leads.count()

    # Aggregate counts and revenue per status in one query
    status_rows = accessible_leads.values('status').annotate(
        count=Count('id'),
        revenue=Sum('deal_value'),
    )
    status_counts = {}
    status_revenue = {}
    for row in status_rows:
        status_counts[row['status']] = row['count']
        status_revenue[row['status']] = float(row['revenue'] or 0)
    for s, _ in Lead.STATUS_CHOICES:
        status_counts.setdefault(s, 0)

    # Pipeline excludes lost and inactive — deals we're no longer actively working
    active_leads = accessible_leads.exclude(status__in=['lost', 'inactive'])
    active_count = active_leads.count()
    total_pipeline = active_leads.aggregate(total=Sum('deal_value'))['total'] or 0
    avg_deal = float(total_pipeline) / active_count if active_count > 0 else 0

    weighted_pipeline = active_leads.annotate(
        weighted_val=ExpressionWrapper(
            F('deal_value') * F('probability_of_completion') / 100.0,
            output_field=FloatField()
        )
    ).aggregate(total=Sum('weighted_val'))['total'] or 0

    lost_count = status_counts.get('lost', 0)
    lost_value = status_revenue.get('lost', 0)

    won_count = status_counts.get('won', 0)
    won_value = status_revenue.get('won', 0)

    # True close rate: won deals as a percentage of all leads
    conversion_rate = (won_count / total_leads * 100) if total_leads > 0 else 0

    avg_quality = accessible_leads.aggregate(avg=Avg('quality_score'))['avg'] or 0

    # Division breakdown uses active pipeline only, so moving a lead to lost
    # immediately reduces that division's count and revenue on the dashboard
    active_filter = ~Q(status__in=['lost', 'inactive'])
    division_rows = accessible_leads.values('division').annotate(
        total_count=Count('id'),
        total_revenue=Sum('deal_value'),
        count=Count('id', filter=active_filter),
        revenue=Sum('deal_value', filter=active_filter),
        won_revenue=Sum('deal_value', filter=Q(status='won')),
        won_count=Count('id', filter=Q(status='won')),
        lost_count=Count('id', filter=Q(status='lost')),
        lost_revenue=Sum('deal_value', filter=Q(status='lost')),
        avg_quality=Avg('quality_score', filter=active_filter),
    )
    division_performance = {}
    for row in division_rows:
        division_performance[row['division']] = {
            'count': row['count'],
            'revenue': float(row['revenue'] or 0),
            'total_count': row['total_count'],
            'total_revenue': float(row['total_revenue'] or 0),
            'won_revenue': float(row['won_revenue'] or 0),
            'won_count': row['won_count'],
            'lost_count': row['lost_count'],
            'lost_revenue': float(row['lost_revenue'] or 0),
            'avg_quality': int(row['avg_quality'] or 0),
        }
    for div, _ in Lead.DIVISION_CHOICES:
        division_performance.setdefault(div, {
            'count': 0, 'revenue': 0, 'total_count': 0, 'total_revenue': 0,
            'won_revenue': 0, 'won_count': 0, 'lost_count': 0, 'lost_revenue': 0,
            'avg_quality': 0,
        })

    top_performers = []
    if request.user.can_view_all_leads():
        personnel_qs = Personnel.objects.filter(is_active_personnel=True)
    else:
        personnel_qs = Personnel.objects.filter(
            division=request.user.division, is_active_personnel=True
        )

    personnel_performance = personnel_qs.annotate(
        leads_count=Count('assigned_leads', filter=Q(assigned_leads__is_deleted=False)),
        total_value=Sum('assigned_leads__deal_value', filter=Q(assigned_leads__is_deleted=False)),
        won_value=Sum('assigned_leads__deal_value', filter=Q(
            assigned_leads__is_deleted=False, assigned_leads__status='won'
        )),
    ).filter(leads_count__gt=0).order_by('-total_value')[:5]

    for person in personnel_performance:
        top_performers.append({
            'id': person.id,
            'name': person.name,
            'avatar': person.get_avatar(),
            'leads_count': person.leads_count,
            'total_value': float(person.total_value or 0),
            'won_value': float(person.won_value or 0),
        })

    return Response({
        'total_pipeline': float(total_pipeline),
        'avg_deal': float(avg_deal),
        'conversion_rate': round(conversion_rate, 1),
        'status_counts': status_counts,
        'division_performance': division_performance,
        'top_performers': top_performers,
        'lost_count': lost_count,
        'lost_value': float(lost_value),
        'won_count': won_count,
        'won_value': float(won_value),
        'weighted_pipeline': float(weighted_pipeline),
        'avg_quality': int(avg_quality),
        'user_stats': {
            'total_accessible_leads': total_leads,
            'user_assigned_leads': accessible_leads.filter(assigned_to=request.user).count(),
            'user_created_leads': accessible_leads.filter(created_by=request.user).count(),
        }
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_profile(request):
    serializer = PersonnelSerializer(request.user)
    return Response({
        'user': serializer.data,
        'permissions': {
            'can_manage_leads': request.user.can_manage_leads(),
            'can_view_all_leads': request.user.can_view_all_leads(),
        }
    })
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_products(request):
    """
    Get active products filtered by user's division
    Users only see products from their division
    Admins can see all products
    """
    if request.user.can_view_all_leads():
        # Admins see all products from all divisions
        products = Product.objects.filter(is_active=True)
    else:
        # Regular users only see products from their division
        products = Product.objects.filter(
            is_active=True, 
            division=request.user.division
        )
    
    serializer = ProductSerializer(products, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_product(request):
    # Admin-only
    if not request.user.can_view_all_leads():
        return Response({'error': 'Only admins can manage products'}, status=status.HTTP_403_FORBIDDEN)

    serializer = ProductSerializer(data=request.data)
    if serializer.is_valid():
        product = serializer.save()
        return Response(ProductSerializer(product).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_product(request, product_id):
    if not request.user.can_view_all_leads():
        return Response({'error': 'Only admins can manage products'}, status=status.HTTP_403_FORBIDDEN)

    try:
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)

    serializer = ProductSerializer(product, data=request.data, partial=True)
    if serializer.is_valid():
        product = serializer.save()
        return Response(ProductSerializer(product).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_product(request, product_id):
    if not request.user.can_view_all_leads():
        return Response({'error': 'Only admins can manage products'}, status=status.HTTP_403_FORBIDDEN)

    try:
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)

    product.delete()
    return Response({'message': 'Product deleted successfully'})


class ResourceAssignmentList(generics.ListCreateAPIView):
    serializer_class = ResourceAssignmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        lead_id = self.request.query_params.get('lead_id')
        if lead_id:
            return ResourceAssignment.objects.filter(lead_id=lead_id)
        return ResourceAssignment.objects.none()

    def perform_create(self, serializer):
        # Additional logic (check user daily rate if not provided?)
        serializer.save()


class ResourceAssignmentDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = ResourceAssignment.objects.all()
    serializer_class = ResourceAssignmentSerializer
    permission_classes = [IsAuthenticated]


class MaterialCostList(generics.ListCreateAPIView):
    serializer_class = MaterialCostSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        lead_id = self.request.query_params.get('lead_id')
        if lead_id:
            return MaterialCost.objects.filter(lead_id=lead_id)
        return MaterialCost.objects.none()



class MaterialCostDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = MaterialCost.objects.all()
    serializer_class = MaterialCostSerializer
    permission_classes = [IsAuthenticated]


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_notifications(request):
    """
    Get notifications for the current user.
    Also dynamically checks for Follow-ups due today.
    """
    # 1. Fetch persistent notifications
    notifications = Notification.objects.filter(user=request.user, is_read=False)
    
    # 2. Check for upcoming follow-ups (Dynamic)
    today = timezone.now().date()
    # Check if we already have notifications for these to avoid spam? 
    # For simplicity, we just return them as a separate list or mixed.
    # The frontend can merge them.
    # OR: we create transient Notification objects in memory.
    
    follow_ups = Lead.objects.filter(
        assigned_to=request.user, 
        follow_up_date__lte=today,
        status__in=ACTIVE_WORKLOAD_STATUSES
    )
    
    # Serialize persistent
    data = NotificationSerializer(notifications, many=True).data
    
    # Add dynamic followups
    for lead in follow_ups:
        # Check if we already have a persistent 'followup' notification for this lead today?
        # A bit complex. Let's just create specialized transient objects.
        data.append({
            'id': f'dynamic_followup_{lead.id}',
            'user': request.user.id,
            'message': f"Follow-up due for {lead.company}",
            'lead': lead.id,
            'notification_type': 'followup',
            'is_read': False,
            'created_at': datetime.now().isoformat(), # approximate
            'meta_data': {'due_date': str(lead.follow_up_date)}
        })
        
    # Sort by created_at desc (simple string sort might fail for mixed types, but frontend can handle)
    return Response(data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, notification_id):
    # Handle dynamic IDs
    if str(notification_id).startswith('dynamic'):
        # Dynamic notifications are "read" by action (e.g. logging a call). 
        # We can ignore marking them read or maybe auto-clear if we had a persistent tracker.
        return Response({'message': 'acknowledge'})
        
    try:
        notification = Notification.objects.get(id=notification_id, user=request.user)
        notification.is_read = True
        notification.save()
        return Response({'message': 'Marked as read'})
    except Notification.DoesNotExist:
        return Response({'error': 'Notification not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_all_read(request):
    Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
    return Response({'message': 'All marked as read'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_personnel(request):
    # Admin-only
    if not request.user.can_view_all_leads():
        return Response({'error': 'Only admins can manage personnel'}, status=status.HTTP_403_FORBIDDEN)

    from .serializers import PersonnelCreateSerializer
    serializer = PersonnelCreateSerializer(data=request.data)
    if serializer.is_valid():
        person = serializer.save()
        return Response(PersonnelSerializer(person).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_personnel(request, user_id):
    # Admin-only
    if not request.user.can_view_all_leads():
        return Response({'error': 'Only admins can manage personnel'}, status=status.HTTP_403_FORBIDDEN)

    try:
        person = Personnel.objects.get(id=user_id)
    except Personnel.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    # For update, we use the standard serializer but allow partial updates
    # Note: Password updates should ideally be separate or handled carefully. 
    # For now, we allow updating fields like division/role/name basic fields using standard serializer (which doesn't include password).
    serializer = PersonnelSerializer(person, data=request.data, partial=True)
    if serializer.is_valid():
        person = serializer.save()
        return Response(PersonnelSerializer(person).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_personnel(request, user_id):
    # Admin-only
    if not request.user.can_view_all_leads():
        return Response({'error': 'Only admins can manage personnel'}, status=status.HTTP_403_FORBIDDEN)

    try:
        person = Personnel.objects.get(id=user_id)
    except Personnel.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Prevent deleting yourself
    if person.id == request.user.id:
        return Response({'error': 'You cannot delete your own account'}, status=status.HTTP_400_BAD_REQUEST)

    # Soft delete is safer? Or hard delete? Personnel usually better soft delete.
    # But Personnel model only has is_active_personnel.
    person.is_active_personnel = False
    person.is_active = False # Disable login
    person.save()

    return Response({'message': 'User deactivated successfully'})

