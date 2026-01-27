from django.core.management.base import BaseCommand
from ...services.analytics_service import AnalyticsService

class Command(BaseCommand):
    help = 'Aggregates daily lead metrics and stores a DailySnapshot.'

    def handle(self, *args, **kwargs):
        self.stdout.write("Capturing daily snapshot...")
        try:
            snapshot = AnalyticsService.capture_daily_snapshot()
            self.stdout.write(self.style.SUCCESS(f"Successfully captured snapshot for {snapshot.date}"))
            self.stdout.write(f"- Total Leads: {snapshot.total_leads}")
            self.stdout.write(f"- Pipeline Value: ${snapshot.total_pipeline_value}")
            self.stdout.write(f"- Avg Quality: {snapshot.avg_lead_quality}")
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error capturing snapshot: {str(e)}"))
