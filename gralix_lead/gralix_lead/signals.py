from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Communication, Lead, Assignment, Notification

@receiver(post_save, sender=Communication)
def update_lead_score_on_communication(sender, instance, created, **kwargs):
    """
    Recalculate lead quality score whenever a communication is logged.
    Also generate notification for the assigned user.
    """
    if created:
        # Score update
        if instance.lead:
            instance.lead.calculate_quality_score()
        
        # Notification: Notify assigned_to if they didn't create the log
        lead_owner = instance.lead.assigned_to
        if lead_owner and lead_owner != instance.user:
            Notification.objects.create(
                user=lead_owner,
                message=f"New {instance.get_communication_type_display()} logged on {instance.lead.company} by {instance.user.name}",
                lead=instance.lead,
                notification_type='activity',
                meta_data={'communication_id': instance.id}
            )

@receiver(post_save, sender=Assignment)
def notify_on_assignment(sender, instance, created, **kwargs):
    """
    Notify user when they are assigned a lead via the Assignment model.
    """
    if created:
        Notification.objects.create(
            user=instance.to_personnel,
            message=f"You have been assigned new lead: {instance.lead.company}",
            lead=instance.lead,
            notification_type='assignment',
            meta_data={'assignment_id': instance.id}
        )

@receiver(post_save, sender=Lead)
def update_lead_score_on_change(sender, instance, created, **kwargs):
    """Recalculate quality score whenever lead fields change (status, deal value, contacts, etc.)."""
    # Skip if we're inside a quality_score save to avoid recursion
    update_fields = kwargs.get('update_fields')
    if update_fields and set(update_fields) <= {'quality_score', 'updated_at'}:
        return

    if instance.is_deleted:
        return

    instance.calculate_quality_score()

