from django.db.models import Count, Q
from ..models import Personnel, Assignment, Communication, Lead

class AssignmentService:
    ACTIVE_WORKLOAD_STATUSES = Lead.ACTIVE_WORKLOAD_STATUSES

    @staticmethod
    def assign_lead(lead, to_personnel, assigned_by, reason):
        """
        Assigns a single lead to a user, creating history and communication logs.
        """
        old_assignee = lead.assigned_to
        
        # Update lead assignment
        lead.assigned_to = to_personnel
        lead.save()
        
        # Create assignment record (Audit Trail)
        Assignment.objects.create(
            lead=lead,
            from_personnel=old_assignee,
            to_personnel=to_personnel,
            assigned_by=assigned_by,
            reason=reason
        )
        
        # Create communication entry (Visible to User)
        from_name = old_assignee.name if old_assignee else 'Unassigned'
        to_name = to_personnel.name if to_personnel else 'Unassigned'
        
        Communication.objects.create(
            lead=lead,
            communication_type='reassignment',
            note=f'Lead reassigned from {from_name} to {to_name}. Reason: {reason}',
            user=assigned_by
        )
        
        return lead

    @staticmethod
    def bulk_assign(leads, strategy, assigned_by, manual_assignee_id=None):
        """
        Bulk assigns a queryset of leads based on a strategy.
        Strategies: 'manual', 'round-robin', 'workload', 'division'.
        """
        if not leads.exists():
            return 0

        # Get eligible personnel (Active only)
        # Note: In a real enterprise app, we might filter by the leads' division here
        # But sticking to existing logic, we assume caller filters or we use generic pool.
        # Let's use all active personnel for now, or filter by division if strategy requires.
        
        base_personnel = Personnel.objects.filter(is_active_personnel=True)
        
        # Annotate workload if needed
        personnel = base_personnel.annotate(
            annotated_workload=Count(
                'assigned_leads',
                filter=Q(
                    assigned_leads__is_deleted=False,
                    assigned_leads__status__in=AssignmentService.ACTIVE_WORKLOAD_STATUSES,
                ),
            )
        )
        
        assigned_count = 0
        
        for i, lead in enumerate(leads):
            assignee = None
            reason = ""

            if strategy == 'manual' and manual_assignee_id:
                try:
                    assignee = Personnel.objects.get(id=manual_assignee_id)
                    reason = 'Bulk manual assignment'
                except Personnel.DoesNotExist:
                    continue
                    
            elif strategy == 'round-robin':
                if personnel.exists():
                    assignee = personnel[i % personnel.count()]
                    reason = 'Round-robin assignment'
                    
            elif strategy == 'workload':
                if personnel.exists():
                    # Pick person with lowest workload
                    assignee = personnel.order_by('annotated_workload', 'id').first()
                    reason = 'Workload-based assignment'
            
            elif strategy == 'division':
                # Filter personnel by lead's division
                division_personnel = personnel.filter(division=lead.division)
                if division_personnel.exists():
                    assignee = division_personnel.order_by('annotated_workload', 'id').first()
                    reason = 'Division expertise assignment'
            
            if assignee:
                AssignmentService.assign_lead(lead, assignee, assigned_by, reason)
                assigned_count += 1
                
        return assigned_count
