from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Personnel, Lead, Product, Communication, Assignment


@admin.register(Personnel)
class PersonnelAdmin(UserAdmin):
    list_display = ['username', 'first_name', 'last_name', 'email', 'division', 'role', 'workload', 'is_active_personnel']
    list_filter = ['division', 'role', 'is_active_personnel']
    search_fields = ['username', 'first_name', 'last_name', 'email']
    
    fieldsets = UserAdmin.fieldsets + (
        ('Gralix Holdings Info', {
            'fields': ('division', 'role', 'workload', 'avatar', 'phone', 'hire_date', 'is_active_personnel')
        }),
    )
    
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Gralix Holdings Info', {
            'fields': ('division', 'role', 'email', 'phone', 'hire_date')
        }),
    )


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'division', 'is_active', 'created_at', 'updated_at']
    list_filter = ['division', 'is_active', 'created_at']
    search_fields = ['name', 'description']
    ordering = ['division', 'name']
    
    fieldsets = (
        (None, {
            'fields': ('name', 'division', 'description', 'is_active')
        }),
    )


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ['company', 'contact_name', 'division', 'product', 'status', 'priority', 'deal_value', 'assigned_to', 'created_at']
    list_filter = ['division', 'status', 'priority', 'product', 'created_at']
    search_fields = ['company', 'contact_name', 'email', 'comments']
    date_hierarchy = 'created_at'
    ordering = ['-created_at']
    
    fieldsets = (
        ('Company Information', {
            'fields': ('company', 'contact_name', 'position', 'email')
        }),
        ('Lead Details', {
            'fields': ('division', 'product', 'status', 'priority', 'deal_value')
        }),
        ('Assignment', {
            'fields': ('assigned_to', 'created_by')
        }),
        ('Tracking', {
            'fields': ('follow_up_date', 'last_contact', 'progress', 'comments')
        }),
    )


@admin.register(Communication)
class CommunicationAdmin(admin.ModelAdmin):
    list_display = ['lead', 'communication_type', 'user', 'date']
    list_filter = ['communication_type', 'date']
    search_fields = ['lead__company', 'note', 'user__username']
    date_hierarchy = 'date'
    ordering = ['-date']


@admin.register(Assignment)
class AssignmentAdmin(admin.ModelAdmin):
    list_display = ['lead', 'from_personnel', 'to_personnel', 'assigned_by', 'date']
    list_filter = ['date']
    search_fields = ['lead__company', 'reason']
    date_hierarchy = 'date'
    ordering = ['-date']