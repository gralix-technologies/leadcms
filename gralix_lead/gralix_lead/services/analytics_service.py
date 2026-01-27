from django.db.models import Sum, Avg, Count
from django.utils import timezone
from ..models import Lead, DailySnapshot

class AnalyticsService:
    @staticmethod
    def capture_daily_snapshot():
        """
        Aggregates current lead state and saves a DailySnapshot.
        Designed to be run once per day (e.g., at midnight).
        """
        today = timezone.now().date()
        
        # 1. Base Queryset (Active Non-deleted Leads)
        active_leads = Lead.objects.filter(is_deleted=False)
        
        # 2. High Level Metrics
        total_leads = active_leads.count()
        
        # Aggregate pipeline value (sum of deal_value)
        # Handle None result if no leads exist
        agg_value = active_leads.aggregate(total=Sum('deal_value'))['total'] or 0
        
        # Aggregate Average IQ
        agg_quality = active_leads.aggregate(avg=Avg('quality_score'))['avg'] or 0
        
        # 3. Stage Distribution
        # Use database grouping for efficiency
        stage_data = active_leads.values('status').annotate(count=Count('id'))
        stage_dist = {item['status']: item['count'] for item in stage_data}
        
        # 4. Division Distribution
        division_data = active_leads.values('division').annotate(count=Count('id'))
        division_dist = {item['division']: item['count'] for item in division_data}
        
        # 5. Create or Update Snapshot
        # update_or_create allows re-running safely on the same day
        snapshot, created = DailySnapshot.objects.update_or_create(
            date=today,
            defaults={
                'total_leads': total_leads,
                'total_pipeline_value': agg_value,
                'avg_lead_quality': int(agg_quality),
                'stage_distribution': stage_dist,
                'division_distribution': division_dist
            }
        )
        
        return snapshot
