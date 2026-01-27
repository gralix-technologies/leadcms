from django.utils import timezone

class LeadScoringService:
    @staticmethod
    def calculate_score(lead) -> int:
        """
        Algorithmic Score Calculation:
        - Engagement: 10 pts per interaction (capped at 50)
        - Completeness: 10 pts each for Email, Phone, Contact Name
        - Deal Value: 20 pts if > 0
        - Decay: -5 pts for every 7 days since last contact
        """
        score = 0
        
        # 1. Completeness (Max 30)
        if lead.email:
            score += 10
        if lead.phone:
            score += 10
        if lead.contact_name and lead.position:
            score += 10
            
        # 2. Deal Value (Max 20)
        if lead.deal_value > 0:
            score += 20
            
        # 3. Engagement (Max 50)
        # Count communications (excluding automated system notes if needed, but for now count all)
        # We need to access the related manager. Since 'lead' is a model instance, 
        # lead.communications should work if the relation is set up correctly.
        interaction_count = lead.communications.count()
        score += min(interaction_count * 10, 50)
        
        # 4. Recency Decay
        if lead.last_contact:
            delta = timezone.now().date() - lead.last_contact
            weeks_inactive = delta.days // 7
            decay = weeks_inactive * 5
            score -= decay
        
        # Clone to min/max
        final_score = max(0, min(100, score))
        
        # Determine if we should save here. The model method did.
        # Ideally, a service calculates and returns, and the caller saves.
        # But to maintain exact behavior of the model method (which saved), 
        # we can stick to just returning for purity, OR do the save if we want to mimic side-effects.
        # However, the task is to refactor logic. 
        # The model's calculate_quality_score() method did: self.quality_score = ...; self.save()
        # So the service should probably return the int, and the model method assigns and saves.
        
        return final_score
