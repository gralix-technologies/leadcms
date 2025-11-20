from django.shortcuts import render, redirect
from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.mixins import LoginRequiredMixin
from django.http import JsonResponse
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

from .models import Lead, Personnel, Communication, Assignment, Product
from .serializers import (LeadSerializer, LeadCreateSerializer, PersonnelSerializer, 
                         CommunicationSerializer, PersonnelLoginSerializer, ProductSerializer)

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
    leads = leads.select_related('assigned_to', 'created_by').prefetch_related('communications', 'assignments')
    serializer = LeadSerializer(leads, many=True, context={'request': request})
    return Response(serializer.data)

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
        
        # Update workload
        if lead.assigned_to:
            lead.assigned_to.workload += 1
            lead.assigned_to.save()
        
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
                
                # Update workload
                if old_assigned_to:
                    old_assigned_to.workload = max(0, old_assigned_to.workload - 1)
                    old_assigned_to.save()
                if lead.assigned_to:
                    lead.assigned_to.workload += 1
                    lead.assigned_to.save()
            
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
        
        # Update workload
        if lead.assigned_to:
            lead.assigned_to.workload = max(0, lead.assigned_to.workload - 1)
            lead.assigned_to.save()
        
        lead.delete()
        return Response({'message': 'Lead deleted successfully'})
    except Lead.DoesNotExist:
        return Response({'error': 'Lead not found'}, status=status.HTTP_404_NOT_FOUND)

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
            progress_map = {
                'new': 10, 'contacted': 25, 'qualified': 50,
                'proposal': 70, 'negotiation': 85, 'hot': 90,
                'won': 100, 'lost': 0, 'inactive': 0
            }
            lead.progress = progress_map.get(new_status, 10)
        
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
        lead = Lead.objects.get(id=lead_id)
        new_assignee = Personnel.objects.get(id=new_assignee_id)
        
        # Check permissions
        if not lead.can_be_edited_by(request.user):
            return Response(
                {'error': 'You do not have permission to reassign this lead'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        old_assignee = lead.assigned_to
        
        # Update lead assignment
        lead.assigned_to = new_assignee
        lead.save()
        
        # Update workload
        if old_assignee:
            old_assignee.workload = max(0, old_assignee.workload - 1)
            old_assignee.save()
        new_assignee.workload += 1
        new_assignee.save()
        
        # Create assignment record
        Assignment.objects.create(
            lead=lead,
            from_personnel=old_assignee,
            to_personnel=new_assignee,
            assigned_by=request.user,
            reason=reason
        )
        
        # Create communication entry
        from_name = old_assignee.name if old_assignee else 'Unassigned'
        Communication.objects.create(
            lead=lead,
            communication_type='reassignment',
            note=f'Lead reassigned from {from_name} to {new_assignee.name}. Reason: {reason}',
            user=request.user
        )
        
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
    
    # Get personnel based on user permissions
    if request.user.can_view_all_leads():
        personnel = Personnel.objects.filter(is_active_personnel=True)
    else:
        personnel = Personnel.objects.filter(
            is_active_personnel=True, 
            division=request.user.division
        )
    
    for i, lead in enumerate(leads):
        old_assignee = lead.assigned_to
        
        if strategy == 'manual':
            assignee = Personnel.objects.get(id=manual_assignee_id)
            reason = 'Bulk manual assignment'
        elif strategy == 'round-robin':
            assignee = personnel[i % personnel.count()]
            reason = 'Round-robin assignment'
        elif strategy == 'workload':
            assignee = personnel.order_by('workload').first()
            reason = 'Workload-based assignment'
        elif strategy == 'division':
            division_personnel = personnel.filter(division=lead.division)
            if division_personnel.exists():
                assignee = division_personnel.order_by('workload').first()
                reason = 'Division expertise assignment'
            else:
                continue
        
        lead.assigned_to = assignee
        lead.save()
        
        # Update workload
        if old_assignee:
            old_assignee.workload = max(0, old_assignee.workload - 1)
            old_assignee.save()
        assignee.workload += 1
        assignee.save()
        
        # Create assignment record
        Assignment.objects.create(
            lead=lead,
            from_personnel=old_assignee,
            to_personnel=assignee,
            assigned_by=request.user,
            reason=reason
        )
    
    return Response({'message': f'Successfully assigned {leads.count()} leads'})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_analytics(request):
    # Get leads based on user permissions
    accessible_leads = request.user.get_accessible_leads()
    
    total_leads = accessible_leads.count()
    total_pipeline = accessible_leads.aggregate(Sum('deal_value'))['deal_value__sum'] or 0
    avg_deal = total_pipeline / total_leads if total_leads > 0 else 0
    
    # Conversion rate (qualified + hot leads)
    qualified_count = accessible_leads.filter(status__in=['qualified', 'hot', 'won']).count()
    conversion_rate = (qualified_count / total_leads * 100) if total_leads > 0 else 0
    
    # Status counts
    status_counts = {}
    for status, _ in Lead.STATUS_CHOICES:
        status_counts[status] = accessible_leads.filter(status=status).count()
    
    # Division performance
    division_performance = {}
    for division, _ in Lead.DIVISION_CHOICES:
        division_leads = accessible_leads.filter(division=division)
        division_performance[division] = {
            'count': division_leads.count(),
            'revenue': division_leads.aggregate(Sum('deal_value'))['deal_value__sum'] or 0
        }
    
    # Top performers (based on accessible leads)
    top_performers = []
    if request.user.can_view_all_leads():
        personnel_performance = Personnel.objects.annotate(
            leads_count=Count('assigned_leads'),
            total_value=Sum('assigned_leads__deal_value')
        ).filter(leads_count__gt=0, is_active_personnel=True).order_by('-total_value')[:3]
    else:
        # For non-admins, show performance within their division
        personnel_performance = Personnel.objects.filter(
            division=request.user.division,
            is_active_personnel=True
        ).annotate(
            leads_count=Count('assigned_leads'),
            total_value=Sum('assigned_leads__deal_value')
        ).filter(leads_count__gt=0).order_by('-total_value')[:3]
    
    for person in personnel_performance:
        top_performers.append({
            'id': person.id,
            'name': person.name,
            'avatar': person.get_avatar(),
            'leads_count': person.leads_count,
            'total_value': person.total_value or 0
        })
    
    return Response({
        'total_pipeline': float(total_pipeline),
        'avg_deal': float(avg_deal),
        'conversion_rate': conversion_rate,
        'status_counts': status_counts,
        'division_performance': division_performance,
        'top_performers': top_performers,
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