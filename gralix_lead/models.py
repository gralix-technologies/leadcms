from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from datetime import date, timedelta

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
    ]

    division = models.CharField(max_length=20, choices=DIVISION_CHOICES, null=True, blank=True)
    workload = models.IntegerField(default=0)
    avatar = models.CharField(max_length=10, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='agent')
    phone = models.CharField(max_length=20, blank=True)
    hire_date = models.DateField(default=timezone.now)
    is_active_personnel = models.BooleanField(default=True)

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

    def can_manage_leads(self):
        return self.role in ['admin', 'manager']

    def can_view_all_leads(self):
        return self.role == 'admin'

    def get_accessible_leads(self):
        if self.can_view_all_leads():
            return Lead.objects.all()
        elif self.can_manage_leads():
            return Lead.objects.filter(division=self.division)
        else:
            return Lead.objects.filter(assigned_to=self)


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
    progress = models.IntegerField(default=5)
    created_by = models.ForeignKey(Personnel, on_delete=models.SET_NULL, null=True, related_name='created_leads')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.company
    
    def can_be_viewed_by(self, user):
        if user.can_view_all_leads():
            return True
        elif user.can_manage_leads():
            return self.division == user.division
        else:
            return self.assigned_to == user
    
    def can_be_edited_by(self, user):
        if user.can_view_all_leads():
            return True
        elif user.can_manage_leads():
            return self.division == user.division
        else:
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