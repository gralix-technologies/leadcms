from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import datetime, timedelta
import random
from gralix_lead.models import Personnel, Lead, Communication, Assignment

class Command(BaseCommand):
    help = 'Seed database with sample lead data for Gralix Holdings'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.SUCCESS('🚀 Starting data seeding...'))
        
        # Clear existing data (optional - comment out if you want to keep existing data)
        self.stdout.write('Clearing existing data...')
        Communication.objects.all().delete()
        Assignment.objects.all().delete()
        Lead.objects.all().delete()
        # Don't delete Personnel if you have your admin user
        Personnel.objects.filter(is_superuser=False).delete()
        
        # Create personnel
        self.stdout.write('Creating personnel...')
        personnel_data = [
            {'username': 'mulenga.mutati', 'first_name': 'Mulenga', 'last_name': 'Mutati', 'division': 'actuarial', 'role': 'agent', 'email': 'mulenga.m@gralix.com'},
            {'username': 'chipo.sichizya', 'first_name': 'Chipo', 'last_name': 'Sichizya', 'division': 'actuarial', 'role': 'agent', 'email': 'chipo.s@gralix.com'},
            {'username': 'martin.chiwere', 'first_name': 'Martin', 'last_name': 'Chiwere', 'division': 'actuarial', 'role': 'manager', 'email': 'martin.c@gralix.com'},
            {'username': 'joy.kamangala', 'first_name': 'Joy', 'last_name': 'Kamangala', 'division': 'actuarial', 'role': 'agent', 'email': 'joy.k@gralix.com'},
            {'username': 'mwelwa.mondoloka', 'first_name': 'Mwelwa', 'last_name': 'Mondoloka', 'division': 'tech', 'role': 'agent', 'email': 'mwelwa.m@gralix.com'},
            {'username': 'chilufya.chisala', 'first_name': 'Chilufya', 'last_name': 'Chisala', 'division': 'capital', 'role': 'manager', 'email': 'chilufya.c@gralix.com'},
            {'username': 'blessmore.chakundura', 'first_name': 'Blessmore', 'last_name': 'Chakundura', 'division': 'actuarial', 'role': 'agent', 'email': 'blessmore.c@gralix.com'},
            {'username': 'ivy.makhanu', 'first_name': 'Ivy', 'last_name': 'Makhanu', 'division': 'actuarial', 'role': 'agent', 'email': 'ivy.m@gralix.com'},
            {'username': 'mwelwa.chipimo', 'first_name': 'Mwelwa', 'last_name': 'Chipimo', 'division': 'tech', 'role': 'manager', 'email': 'mwelwa.chipimo@gralix.com'},
            {'username': 'vincent.chikomo', 'first_name': 'Vincent', 'last_name': 'Chikomo', 'division': 'actuarial', 'role': 'agent', 'email': 'vincent.c@gralix.com'},
            {'username': 'elly.bubala', 'first_name': 'Elly', 'last_name': 'Bubala', 'division': 'tech', 'role': 'agent', 'email': 'elly.b@gralix.com'},
        ]
        
        personnel_list = []
        for p_data in personnel_data:
            person, created = Personnel.objects.get_or_create(
                username=p_data['username'],
                defaults={
                    'first_name': p_data['first_name'],
                    'last_name': p_data['last_name'],
                    'email': p_data['email'],
                    'division': p_data['division'],
                    'role': p_data['role'],
                    'workload': 0,
                    'is_active_personnel': True
                }
            )
            if created:
                person.set_password('gralix123')  # Default password
                person.save()
                self.stdout.write(f'  ✓ Created: {person.get_full_name()}')
            personnel_list.append(person)
        
        # Get your admin user
        try:
            admin_user = Personnel.objects.get(is_superuser=True)
            personnel_list.append(admin_user)
        except Personnel.DoesNotExist:
            pass
        
        # Create leads
        self.stdout.write('Creating leads...')
        
        leads_data = [
            {
                'company': 'ADELVIS INSURANCE',
                'contact_name': 'Prince Nkata',
                'position': 'CEO',
                'email': '977776561',
                'division': 'tech',
                'status': 'new',
                'priority': 'medium',
                'deal_value': 25000,
                'comments': 'Limited purchasing power - need to understand budget constraints',
                'progress': 10
            },
            {
                'company': 'ADVANTAGE INSURANCE',
                'contact_name': 'Raymond Chella',
                'position': 'CFO',
                'email': 'raymond.c@advantagezambia.com',
                'division': 'actuarial',
                'status': 'qualified',
                'priority': 'high',
                'deal_value': 85000,
                'comments': 'Very interested in actuarial services - high potential',
                'progress': 60
            },
            {
                'company': 'AFRICA PRIDE INSURANCE',
                'contact_name': 'Temba Chibare',
                'position': 'CEO',
                'email': 'temba@africapride.co.zm',
                'division': 'capital',
                'status': 'hot',
                'priority': 'high',
                'deal_value': 150000,
                'comments': 'Looking for capital investment opportunities - expansion plans',
                'progress': 85
            },
            {
                'company': 'AFRICAN GREY INSURANCE',
                'contact_name': 'Sarah Mwanza',
                'position': 'IT Director',
                'email': 'sarah.m@africangrey.co.zm',
                'division': 'tech',
                'status': 'contacted',
                'priority': 'medium',
                'deal_value': 45000,
                'comments': 'Interested in tech solutions for digital transformation',
                'progress': 30
            },
            {
                'company': 'APLUS GENERAL INSURANCE',
                'contact_name': 'Cynthia Chileshe',
                'position': 'Finance Manager',
                'email': 'cchileshe@aplus.co.zm',
                'division': 'actuarial',
                'status': 'proposal',
                'priority': 'high',
                'deal_value': 65000,
                'comments': 'Needs actuarial consulting for new product lines',
                'progress': 70
            },
            {
                'company': 'REGENT INSURANCE BROKERS',
                'contact_name': 'Michael Banda',
                'position': 'Managing Director',
                'email': 'm.banda@regent.co.zm',
                'division': 'tech',
                'status': 'new',
                'priority': 'medium',
                'deal_value': 55000,
                'comments': 'Exploring technology partnerships',
                'progress': 5
            },
            {
                'company': 'MADISON INSURANCE',
                'contact_name': 'Thandiwe Musonda',
                'position': 'Operations Manager',
                'email': 'thandiwe@madison.co.zm',
                'division': 'actuarial',
                'status': 'negotiation',
                'priority': 'high',
                'deal_value': 95000,
                'comments': 'Final stages of contract negotiation',
                'progress': 90
            },
            {
                'company': 'ZSIC INSURANCE',
                'contact_name': 'Joseph Phiri',
                'position': 'Chief Actuary',
                'email': 'j.phiri@zsic.co.zm',
                'division': 'actuarial',
                'status': 'contacted',
                'priority': 'high',
                'deal_value': 120000,
                'comments': 'Large organization, needs comprehensive actuarial review',
                'progress': 25
            },
            {
                'company': 'PROFESSIONAL INSURANCE',
                'contact_name': 'Grace Zulu',
                'position': 'CEO',
                'email': 'grace@professional.co.zm',
                'division': 'capital',
                'status': 'qualified',
                'priority': 'high',
                'deal_value': 180000,
                'comments': 'Seeking capital for market expansion',
                'progress': 55
            },
            {
                'company': 'HOLLARD INSURANCE',
                'contact_name': 'Brian Mwape',
                'position': 'Head of IT',
                'email': 'brian@hollard.co.zm',
                'division': 'tech',
                'status': 'proposal',
                'priority': 'high',
                'deal_value': 78000,
                'comments': 'Modernization of legacy systems',
                'progress': 65
            },
            {
                'company': 'PULA INSURANCE',
                'contact_name': 'Natasha Siame',
                'position': 'CFO',
                'email': 'natasha@pula.co.zm',
                'division': 'actuarial',
                'status': 'new',
                'priority': 'low',
                'deal_value': 32000,
                'comments': 'Initial inquiry about actuarial services',
                'progress': 10
            },
            {
                'company': 'FIRST ASSURANCE',
                'contact_name': 'Peter Lungu',
                'position': 'Director',
                'email': '0977123456',
                'division': 'capital',
                'status': 'contacted',
                'priority': 'medium',
                'deal_value': 67000,
                'comments': 'Investment portfolio review needed',
                'progress': 35
            },
            {
                'company': 'BRITAM INSURANCE',
                'contact_name': 'Angela Mulenga',
                'position': 'Head of Operations',
                'email': 'angela@britam.co.zm',
                'division': 'tech',
                'status': 'hot',
                'priority': 'high',
                'deal_value': 92000,
                'comments': 'Urgent need for systems integration',
                'progress': 80
            },
            {
                'company': 'MOMENTUM INSURANCE',
                'contact_name': 'Charles Kapasa',
                'position': 'Managing Director',
                'email': 'charles@momentum.co.zm',
                'division': 'actuarial',
                'status': 'won',
                'priority': 'high',
                'deal_value': 145000,
                'comments': 'Contract signed! Excellent partnership opportunity',
                'progress': 100
            },
            {
                'company': 'SANLAM INSURANCE',
                'contact_name': 'Ruth Simukonda',
                'position': 'Chief Risk Officer',
                'email': 'ruth@sanlam.co.zm',
                'division': 'actuarial',
                'status': 'qualified',
                'priority': 'high',
                'deal_value': 110000,
                'comments': 'Risk assessment and modeling project',
                'progress': 50
            },
            {
                'company': 'OLD MUTUAL INSURANCE',
                'contact_name': 'David Nyirenda',
                'position': 'IT Manager',
                'email': 'david@oldmutual.co.zm',
                'division': 'tech',
                'status': 'lost',
                'priority': 'medium',
                'deal_value': 58000,
                'comments': 'Chose competitor - follow up in 6 months',
                'progress': 0
            },
            {
                'company': 'METROPOLITAN INSURANCE',
                'contact_name': 'Esther Banda',
                'position': 'Finance Director',
                'email': 'esther@metropolitan.co.zm',
                'division': 'capital',
                'status': 'proposal',
                'priority': 'high',
                'deal_value': 135000,
                'comments': 'Capital restructuring proposal submitted',
                'progress': 75
            },
            {
                'company': 'LIBERTY INSURANCE',
                'contact_name': 'John Sakala',
                'position': 'CEO',
                'email': 'john@liberty.co.zm',
                'division': 'actuarial',
                'status': 'hot',
                'priority': 'high',
                'deal_value': 160000,
                'comments': 'Strategic partnership discussion - very promising',
                'progress': 85
            },
            {
                'company': 'ZICA INSURANCE',
                'contact_name': 'Mary Mwamba',
                'position': 'Operations Head',
                'email': 'mary@zica.co.zm',
                'division': 'tech',
                'status': 'contacted',
                'priority': 'low',
                'deal_value': 28000,
                'comments': 'Small-scale tech consultation',
                'progress': 20
            },
            {
                'company': 'GEMSTONE INSURANCE',
                'contact_name': 'Patrick Chiluba',
                'position': 'Managing Partner',
                'email': '0966789012',
                'division': 'capital',
                'status': 'new',
                'priority': 'medium',
                'deal_value': 72000,
                'comments': 'New market entrant seeking investment advice',
                'progress': 10
            },
            {
                'company': 'PRUDENTIAL INSURANCE',
                'contact_name': 'Susan Mbewe',
                'position': 'Chief Actuary',
                'email': 'susan@prudential.co.zm',
                'division': 'actuarial',
                'status': 'negotiation',
                'priority': 'high',
                'deal_value': 125000,
                'comments': 'Complex actuarial modeling project',
                'progress': 88
            },
            {
                'company': 'RAINBOW INSURANCE',
                'contact_name': 'Emmanuel Mwanza',
                'position': 'IT Director',
                'email': 'emmanuel@rainbow.co.zm',
                'division': 'tech',
                'status': 'qualified',
                'priority': 'medium',
                'deal_value': 48000,
                'comments': 'Cloud migration project',
                'progress': 45
            },
            {
                'company': 'ALLIANCE INSURANCE',
                'contact_name': 'Linda Phiri',
                'position': 'CFO',
                'email': 'linda@alliance.co.zm',
                'division': 'capital',
                'status': 'contacted',
                'priority': 'high',
                'deal_value': 98000,
                'comments': 'Capital adequacy assessment required',
                'progress': 30
            },
            {
                'company': 'PHOENIX INSURANCE',
                'contact_name': 'George Kasonde',
                'position': 'CEO',
                'email': 'george@phoenix.co.zm',
                'division': 'actuarial',
                'status': 'proposal',
                'priority': 'high',
                'deal_value': 115000,
                'comments': 'Product development actuarial support',
                'progress': 68
            },
            {
                'company': 'SENTINEL INSURANCE',
                'contact_name': 'Joyce Bwalya',
                'position': 'Head of Technology',
                'email': 'joyce@sentinel.co.zm',
                'division': 'tech',
                'status': 'inactive',
                'priority': 'low',
                'deal_value': 15000,
                'comments': 'No response to follow-ups - mark as inactive',
                'progress': 0
            },
        ]
        
        # Assign leads to personnel
        for lead_data in leads_data:
            # Select appropriate personnel based on division
            division_personnel = [p for p in personnel_list if p.division == lead_data['division']]
            if not division_personnel:
                division_personnel = personnel_list
            
            # Don't assign "new" or "inactive" leads
            if lead_data['status'] in ['new', 'inactive']:
                assigned_person = None
            else:
                assigned_person = random.choice(division_personnel)
            
            # Calculate follow-up date based on status
            if lead_data['status'] in ['hot', 'proposal', 'negotiation']:
                follow_up_date = datetime.now().date() + timedelta(days=random.randint(1, 7))
            elif lead_data['status'] in ['qualified', 'contacted']:
                follow_up_date = datetime.now().date() + timedelta(days=random.randint(7, 21))
            else:
                follow_up_date = None
            
            lead = Lead.objects.create(
                company=lead_data['company'],
                contact_name=lead_data['contact_name'],
                position=lead_data['position'],
                email=lead_data['email'],
                division=lead_data['division'],
                status=lead_data['status'],
                priority=lead_data['priority'],
                deal_value=lead_data['deal_value'],
                comments=lead_data['comments'],
                progress=lead_data['progress'],
                assigned_to=assigned_person,
                follow_up_date=follow_up_date,
                last_contact=datetime.now().date() - timedelta(days=random.randint(1, 30)) if assigned_person else None,
                created_by=admin_user if 'admin_user' in locals() else None
            )
            
            # Create assignment record if assigned
            if assigned_person:
                Assignment.objects.create(
                    lead=lead,
                    from_personnel=None,
                    to_personnel=assigned_person,
                    assigned_by=admin_user if 'admin_user' in locals() else assigned_person,
                    reason='Initial assignment',
                    date=datetime.now().date() - timedelta(days=random.randint(5, 30))
                )
                
                # Update workload
                assigned_person.workload += 1
                assigned_person.save()
            
            # Add communications for active leads
            if lead_data['status'] not in ['new', 'inactive', 'lost']:
                comm_types = ['call', 'email', 'meeting']
                num_comms = random.randint(1, 4)
                
                for i in range(num_comms):
                    days_ago = random.randint(1, 25)
                    Communication.objects.create(
                        lead=lead,
                        communication_type=random.choice(comm_types),
                        note=self.get_sample_note(lead_data['status'], comm_types[i % len(comm_types)]),
                        user=assigned_person if assigned_person else personnel_list[0],
                        date=datetime.now().date() - timedelta(days=days_ago)
                    )
            
            self.stdout.write(f'  ✓ Created lead: {lead.company}')
        
        # Summary
        self.stdout.write(self.style.SUCCESS('\n✅ Data seeding completed successfully!'))
        self.stdout.write(self.style.SUCCESS(f'📊 Created:'))
        self.stdout.write(f'   - {Personnel.objects.filter(is_active_personnel=True).count()} personnel')
        self.stdout.write(f'   - {Lead.objects.count()} leads')
        self.stdout.write(f'   - {Communication.objects.count()} communications')
        self.stdout.write(f'   - {Assignment.objects.count()} assignments')
        self.stdout.write(self.style.SUCCESS('\n🚀 Your dashboard is now populated with sample data!'))
        self.stdout.write('📝 Default password for all personnel: gralix123')
    
    def get_sample_note(self, status, comm_type):
        notes = {
            'contacted': [
                'Initial contact made. Client expressed interest in our services.',
                'Follow-up call completed. Discussed project scope and timeline.',
                'Sent introductory email with service brochure.',
            ],
            'qualified': [
                'Budget confirmed. Client has allocated funds for this project.',
                'Decision maker identified. Meeting scheduled for next week.',
                'Requirements gathering session completed successfully.',
            ],
            'proposal': [
                'Detailed proposal sent. Waiting for feedback.',
                'Proposal presentation completed. Client asked good questions.',
                'Follow-up on proposal. Client reviewing with leadership team.',
            ],
            'negotiation': [
                'Contract terms under discussion. Pricing negotiations ongoing.',
                'Legal review in progress. Expected to close soon.',
                'Final terms being finalized. Both parties in agreement.',
            ],
            'hot': [
                'Client very eager to proceed. Fast-tracking this deal.',
                'Multiple stakeholders engaged. High probability of closing.',
                'Verbal commitment received. Paperwork in progress.',
            ],
            'won': [
                'Contract signed! Excellent partnership ahead.',
                'Deal closed successfully. Kickoff meeting scheduled.',
            ],
        }
        
        status_notes = notes.get(status, ['General follow-up communication.'])
        return random.choice(status_notes)