from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from datetime import date, timedelta
from django.db.models import Q

class Team(models.Model):
    """
    Team model for shared ownership and cross-division visibility.

    A Team can optionally be tied to a division, but it can also be cross-division.
    Personnel can belong to one team (simple model) and Leads can optionally be owned by a team.
    """

    DIVISION_CHOICES = [
        ('tech', 'Gralix Tech'),
        ('actuarial', 'Gralix Actuarial'),
        ('capital', 'Gralix Capital'),
    ]

    name = models.CharField(max_length=100, unique=True)
    division = models.CharField(max_length=20, choices=DIVISION_CHOICES, null=True, blank=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Personnel(AbstractUser):
    """
    Custom User model extending AbstractUser
    Personnel are the users of the system
    """
    DIVISION_CHOICES = [
        ('tech', 'Gralix Tech'),
        ('actuarial', 'Gralix Actuarial'),
        ('capital', 'Gralix Capital'),
    ]

    ROLE_CHOICES = [
        ('admin', 'Administrator'),
        ('manager', 'Manager'),
        ('agent', 'Sales Agent'),
        ('executive', 'Executive Manager'),
    ]

    division = models.CharField(max_length=20, choices=DIVISION_CHOICES, null=True, blank=True)
    # Deprecated: keep for historical reference / admin display, but do not rely on it.
    # Workload should be derived from the DB via the `workload` property.
    workload_cached = models.IntegerField(default=0)
    avatar = models.CharField(max_length=10, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='agent')
    phone = models.CharField(max_length=20, blank=True)
    hire_date = models.DateField(default=timezone.now)
    is_active_personnel = models.BooleanField(default=True)
    daily_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Standard daily rate for this personnel")
    team = models.ForeignKey(Team, on_delete=models.SET_NULL, null=True, blank=True, related_name='members')

    # Override email to be required but not the USERNAME_FIELD
    email = models.EmailField(unique=True)

    # Use username as the PRIMARY key field
    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['first_name', 'last_name', 'division', 'email']

    def __str__(self):
        return f"{self.get_full_name()} ({self.get_division_display()})"

    @property
    def name(self):
        return self.get_full_name() or self.username

    def get_avatar(self):
        if self.avatar:
            return self.avatar
        first_initial = self.first_name[0] if self.first_name else ''
        last_initial = self.last_name[0] if self.last_name else ''
        return (first_initial + last_initial).upper() or self.username[:2].upper()

    @property
    def workload(self) -> int:
        """
        Derived workload: count of currently active, non-deleted leads assigned to this personnel.
        """
        return Lead.objects.filter(
            assigned_to=self,
            is_deleted=False,
            status__in=Lead.ACTIVE_WORKLOAD_STATUSES,
        ).count()

    def can_manage_leads(self):
        return self.role in ['admin', 'manager', 'executive']

    def can_view_all_leads(self):
        return self.role in ['admin', 'executive']

    def get_accessible_leads(self):
        base = Lead.objects.filter(is_deleted=False)

        # Admins can see all non-deleted leads
        if self.can_view_all_leads():
            return base

        # Managers can see their division + (optional) their team leads
        if self.can_manage_leads():
            if self.team_id:
                return base.filter(Q(division=self.division) | Q(team_id=self.team_id))
            return base.filter(division=self.division)

        # Agents can see their assigned leads + (optional) team-owned leads (read access primarily)
        if self.team_id:
            return base.filter(Q(assigned_to=self) | Q(team_id=self.team_id))
        return base.filter(assigned_to=self)


class Product(models.Model):
    """
    Product model - tied to specific divisions
    Each product belongs to one division (tech, actuarial, or capital)
    Users only see products from their division
    """
    DIVISION_CHOICES = [
        ('tech', 'Gralix Tech'),
        ('actuarial', 'Gralix Actuarial'),
        ('capital', 'Gralix Capital'),
    ]
    
    name = models.CharField(max_length=100)
    division = models.CharField(max_length=20, choices=DIVISION_CHOICES)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['division', 'name']
        unique_together = [['name', 'division']]  # Same product name can exist in different divisions
    
    def __str__(self):
        return f"{self.name} ({self.get_division_display()})"


class Lead(models.Model):
    STATUS_CHOICES = [
        ('new', 'New'),
        ('contacted', 'Contacted'),
        ('qualified', 'Qualified'),
        ('proposal', 'Proposal'),
        ('negotiation', 'Negotiation'),
        ('hot', 'Hot'),
        ('won', 'Won'),
        ('lost', 'Lost'),
        ('inactive', 'Inactive'),
    ]
    
    PRIORITY_CHOICES = [
        ('high', 'High'),
        ('medium', 'Medium'),
        ('low', 'Low'),
    ]
    
    DIVISION_CHOICES = [
        ('tech', 'Gralix Tech'),
        ('actuarial', 'Gralix Actuarial'),
        ('capital', 'Gralix Capital'),
    ]
    
    # 🆕 NEW: Probability of Completion choices (0% to 100% in increments of 10%)
    PROBABILITY_CHOICES = [
        (0, '0%'),
        (10, '10%'),
        (20, '20%'),
        (30, '30%'),
        (40, '40%'),
        (50, '50%'),
        (60, '60%'),
        (70, '70%'),
        (80, '80%'),
        (90, '90%'),
        (100, '100%'),
    ]
    
    company = models.CharField(max_length=200)
    contact_name = models.CharField(max_length=100, blank=True)
    position = models.CharField(max_length=100, blank=True)
    email = models.CharField(max_length=200, blank=True)
    comments = models.TextField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    follow_up_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    division = models.CharField(max_length=20, choices=DIVISION_CHOICES)
    deal_value = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # 🆕 NEW: Probability of Completion field (fixed at lead creation, doesn't change)
    probability_of_completion = models.IntegerField(
        choices=PROBABILITY_CHOICES,
        default=0,
        help_text="Probability of closing this deal (set once at lead creation)"
    )
    
    last_contact = models.DateField(null=True, blank=True)
    assigned_to = models.ForeignKey(Personnel, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_leads')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True, related_name='leads')
    team = models.ForeignKey(Team, on_delete=models.SET_NULL, null=True, blank=True, related_name='leads')
    progress = models.IntegerField(default=5)
    created_by = models.ForeignKey(Personnel, on_delete=models.SET_NULL, null=True, related_name='created_leads')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    
    # 🆕 NEW: Algorithmic Quality Score (0-100)
    quality_score = models.IntegerField(default=0, db_index=True)

    # Treat these as "active" leads for workload counting
    ACTIVE_WORKLOAD_STATUSES = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'hot']
    
    def save(self, *args, **kwargs):
        # Auto-update progress based on status if not deleted
        if not self.is_deleted:
            progress_map = {
                'new': 10, 
                'contacted': 25, 
                'qualified': 50,
                'proposal': 75, 
                'negotiation': 90, 
                'hot': 95,
                'won': 100, 
                'lost': 0, 
                'inactive': 0
            }
            # Only override if we can map it (safe default)
            if self.status in progress_map:
                self.progress = progress_map[self.status]
        
        super().save(*args, **kwargs)

    def calculate_quality_score(self):
        """
        Algorithmic Score Calculation (Delegated to Service Layer)
        """
        from .services.scoring_service import LeadScoringService
        
        # Calculate using service
        self.quality_score = LeadScoringService.calculate_score(self)
        
        # Save the result
        self.save(update_fields=['quality_score'])
        return self.quality_score

    
    def __str__(self):
        return self.company

    def soft_delete(self):
        if not self.is_deleted:
            self.is_deleted = True
            self.deleted_at = timezone.now()
            self.status = 'inactive'
            self.progress = 0
            self.save(update_fields=['is_deleted', 'deleted_at', 'status', 'progress', 'updated_at'])
    
    def can_be_viewed_by(self, user):
        if user.can_view_all_leads():
            return True

        # Team members can view team-owned leads (cross-division visibility)
        if self.team_id and user.team_id and self.team_id == user.team_id:
            return True

        if user.can_manage_leads():
            return self.division == user.division

        return self.assigned_to == user
    
    def can_be_edited_by(self, user):
        if user.can_view_all_leads():
            return True

        # Editing is more restrictive: only managers/admins can edit team-owned leads
        if user.can_manage_leads() and self.team_id and user.team_id and self.team_id == user.team_id:
            return True

        if user.can_manage_leads():
            return self.division == user.division

        return self.assigned_to == user


class Communication(models.Model):
    COMMUNICATION_TYPES = [
        ('call', 'Phone Call'),
        ('email', 'Email'),
        ('meeting', 'Meeting'),
        ('demo', 'Demo/Presentation'),
        ('proposal', 'Proposal Sent'),
        ('followup', 'Follow-up'),
        ('reassignment', 'Reassignment'),
    ]
    
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name='communications')
    communication_type = models.CharField(max_length=20, choices=COMMUNICATION_TYPES)
    note = models.TextField()
    user = models.ForeignKey(Personnel, on_delete=models.CASCADE, related_name='communications')
    date = models.DateField(auto_now_add=True)
    
    class Meta:
        ordering = ['-date']
    
    def __str__(self):
        return f"{self.lead.company} - {self.get_communication_type_display()}"


class Assignment(models.Model):
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name='assignments')
    from_personnel = models.ForeignKey(Personnel, on_delete=models.SET_NULL, null=True, blank=True, related_name='assignments_from')
    to_personnel = models.ForeignKey(Personnel, on_delete=models.CASCADE, related_name='assignments_to')
    assigned_by = models.ForeignKey(Personnel, on_delete=models.SET_NULL, null=True, related_name='assignments_made')
    reason = models.TextField()
    date = models.DateField(auto_now_add=True)
    
    class Meta:
        ordering = ['-date']
    
    def __str__(self):
        return f"{self.lead.company} assigned to {self.to_personnel.name}"


class DailySnapshot(models.Model):
    """
    Analytical Snapshot: Stores daily aggregated metrics.
    Used for historical trending charts (e.g., "how did pipeline value change this month?").
    """
    date = models.DateField(unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # High Level Metrics
    total_leads = models.IntegerField(default=0)
    total_pipeline_value = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    avg_lead_quality = models.IntegerField(default=0, help_text="Average Lead IQ score")
    
    # JSON Breakdowns for flexible charting
    stage_distribution = models.JSONField(default=dict, help_text="Count of leads by status")
    division_distribution = models.JSONField(default=dict, help_text="Count of leads by division")
    source_distribution = models.JSONField(default=dict, help_text="Count of leads by source (if tracked)", blank=True)
    
    class Meta:
        ordering = ['-date']
        
    def __str__(self):
        return f"Snapshot: {self.date} (ZMW {self.total_pipeline_value})"


class ResourceAssignment(models.Model):
    """
    Allocates Personnel to a Lead (Project) with time and cost tracking.
    """
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name='resource_assignments')
    personnel = models.ForeignKey(Personnel, on_delete=models.CASCADE, related_name='assignments_received')
    role = models.CharField(max_length=100, blank=True, help_text="Role in this specific project")
    daily_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Rate at time of assignment")
    days_allocated = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    @property
    def total_cost(self):
        return self.daily_rate * self.days_allocated
        
    def __str__(self):
        return f"{self.personnel.name} - {self.lead.company}"


class MaterialCost(models.Model):
    """
    Tracks non-labor costs associated with a Lead (Project).
    """
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name='material_costs')
    name = models.CharField(max_length=200, help_text="Item description")
    cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    
    def __str__(self):
        return f"{self.name} (ZMW {self.cost})"


class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ('followup', 'Follow-up Due'),
        ('activity', 'New Activity'),
        ('assignment', 'New Assignment'),
        ('system', 'System Alert'),
    ]

    user = models.ForeignKey(Personnel, on_delete=models.CASCADE, related_name='notifications')
    message = models.CharField(max_length=255)
    lead = models.ForeignKey(Lead, on_delete=models.SET_NULL, null=True, blank=True, related_name='notifications')
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES, default='system')
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Optional JSON metadata for deep linking (e.g. {'comment_id': 12})
    meta_data = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.message}"
