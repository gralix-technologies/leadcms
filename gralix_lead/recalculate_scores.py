
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lead.settings')
django.setup()

from gralix_lead.models import Lead

print("Starting score recalculation...")
leads = Lead.objects.all()
for lead in leads:
    old_score = lead.quality_score
    new_score = lead.calculate_quality_score()
    print(f"Lead: {lead.company} | Score: {new_score} (was {old_score})")
    print(f"  - Emails: {bool(lead.email)}, Logged Comms: {lead.communications.count()}, Val: {lead.deal_value}")

print("Recalculation complete.")
