from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Personnel, Lead, Communication, Assignment

@admin.register(Personnel)
class PersonnelAdmin(UserAdmin):
    list_display = ['email', 'first_name', 'last_name', 'division', 'role', 'workload', 'is_active_personnel']
    list_filter = ['division', 'role', 'is_active', 'is_active_personnel', 'hire_date']
    search_fields = ['email', 'first_name', 'last_name']
    ordering = ['email']
    
    fieldsets = UserAdmin.fieldsets + (
        ('Personnel Info', {
            'fields': ('division', 'role', 'phone', 'hire_date', 'workload', 'avatar', 'is_active_personnel')
        }),
    )
    
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Personnel Info', {
            'fields': ('first_name', 'last_name', 'email', 'division', 'role', 'phone')
        }),
    )

class CommunicationInline(admin.TabularInline):
    model = Communication
    extra = 0
    readonly_fields = ['date']

class AssignmentInline(admin.TabularInline):
    model = Assignment
    extra = 0
    readonly_fields = ['date']

@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ['company', 'contact_name', 'status', 'priority', 'division', 'assigned_to', 'deal_value', 'created_by']
    list_filter = ['status', 'priority', 'division', 'assigned_to', 'created_by']
    search_fields = ['company', 'contact_name', 'comments']
    inlines = [CommunicationInline, AssignmentInline]
    readonly_fields = ['created_at', 'updated_at']

@admin.register(Communication)
class CommunicationAdmin(admin.ModelAdmin):
    list_display = ['lead', 'communication_type', 'user', 'date']
    list_filter = ['communication_type', 'date', 'user']
    readonly_fields = ['date']

@admin.register(Assignment)
class AssignmentAdmin(admin.ModelAdmin):
    list_display = ['lead', 'from_personnel', 'to_personnel', 'assigned_by', 'date']
    list_filter = ['date', 'assigned_by']
    readonly_fields = ['date']