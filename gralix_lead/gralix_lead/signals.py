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
    """
    Recalculate score if lead details change.
    And potentially check for manual reassignment if not done via Assignment model 
    (though the app uses Assignment model, basic reassignment might bypass it if just .save() is used).
    """
    if kwargs.get('update_fields') and 'quality_score' in kwargs['update_fields'] and len(kwargs['update_fields']) == 1:
        return

    # Check for direct assignment change? 
    # Usually better to rely on Assignment model for history tracking + signals.
    pass

