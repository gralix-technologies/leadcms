
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lead.settings')
django.setup()

from gralix_lead.models import Lead, Personnel, Assignment
from gralix_lead.services.assignment_service import AssignmentService

# Setup Data
admin = Personnel.objects.filter(role='admin').first() or Personnel.objects.first()
leads = Lead.objects.all()[:3]
strategies = ['round-robin', 'workload']

print(f"Testing AssignmentService with Admin: {admin.name}")
print(f"Leads to assign: {[l.company for l in leads]}")

# Test 1: Round Robin
print("\n--- Testing Round Robin ---")
count = AssignmentService.bulk_assign(leads, 'round-robin', admin)
print(f"Assigned {count} leads.")
for l in leads:
    l.refresh_from_db()
    print(f"Lead {l.company} assigned to: {l.assigned_to.name if l.assigned_to else 'None'}")

# Verify History
last_assignment = Assignment.objects.last()
print(f"Last Assignment Log: {last_assignment.reason if last_assignment else 'None'}")

print("\n--- Test Complete ---")
