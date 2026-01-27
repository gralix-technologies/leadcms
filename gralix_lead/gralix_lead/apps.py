from django.apps import AppConfig

class GralixLeadConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'gralix_lead'

    def ready(self):
        import gralix_lead.signals
