from rest_framework import serializers
import re
from django.contrib.auth import authenticate
from .models import Lead, Personnel, Communication, Assignment, Product, Team, ResourceAssignment, MaterialCost, Notification


class PersonnelSerializer(serializers.ModelSerializer):
    name = serializers.ReadOnlyField()
    avatar = serializers.SerializerMethodField()
    # Derived workload is provided by the model property (and/or queryset annotations).
    workload = serializers.SerializerMethodField()
    
    class Meta:
        model = Personnel
        fields = ['id', 'name', 'first_name', 'last_name', 'email', 'division', 
                 'workload', 'avatar', 'role', 'phone', 'is_active_personnel', 'team']
    
    def get_avatar(self, obj):
        return obj.get_avatar()

    def get_workload(self, obj):
        # Use annotated value if available (optimization), else fallback to property (slow)
        return getattr(obj, 'active_workload', obj.workload)


class PersonnelLoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        username = data.get('username')
        password = data.get('password')

        if username and password:
            user = authenticate(username=username, password=password)
            if user:
                if not user.is_active:
                    raise serializers.ValidationError('User account is disabled.')
                if not user.is_active_personnel:
                    raise serializers.ValidationError('Personnel account is inactive.')
                data['user'] = user
            else:
                raise serializers.ValidationError('Invalid username or password.')
        else:
            raise serializers.ValidationError('Must include username and password.')

        return data


class PersonnelCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = Personnel
        fields = ['id', 'username', 'password', 'first_name', 'last_name', 'email', 
                  'division', 'role', 'phone', 'is_active_personnel']

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = Personnel(**validated_data)
        user.set_password(password)
        user.save()
        return user


class ProductSerializer(serializers.ModelSerializer):
    division_display = serializers.CharField(source='get_division_display', read_only=True)
    
    class Meta:
        model = Product
        fields = ['id', 'name', 'division', 'division_display', 'description', 'is_active']


class TeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = ['id', 'name', 'division', 'description', 'is_active']


class CommunicationSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.name', read_only=True)
    
    class Meta:
        model = Communication
        fields = ['id', 'communication_type', 'note', 'user', 'user_name', 'date']


class AssignmentSerializer(serializers.ModelSerializer):
    from_personnel_name = serializers.CharField(source='from_personnel.name', read_only=True)
    to_personnel_name = serializers.CharField(source='to_personnel.name', read_only=True)
    assigned_by_name = serializers.CharField(source='assigned_by.name', read_only=True)
    
    class Meta:
        model = Assignment
        fields = ['id', 'from_personnel', 'from_personnel_name', 'to_personnel', 
                 'to_personnel_name', 'assigned_by', 'assigned_by_name', 'reason', 'date']


class ResourceAssignmentSerializer(serializers.ModelSerializer):
    personnel_name = serializers.CharField(source='personnel.name', read_only=True)
    personnel_role = serializers.CharField(source='personnel.role', read_only=True)
    total_cost = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = ResourceAssignment
        fields = ['id', 'lead', 'personnel', 'personnel_name', 'personnel_role',
                  'role', 'daily_rate', 'days_allocated', 'total_cost']


class MaterialCostSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaterialCost
        fields = ['id', 'lead', 'name', 'cost']


class LeadSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.CharField(source='assigned_to.name', read_only=True)
    assigned_to_avatar = serializers.SerializerMethodField()
    assigned_to_email = serializers.CharField(source='assigned_to.email', read_only=True)
    assigned_to_division = serializers.CharField(source='assigned_to.division', read_only=True)
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    communications = CommunicationSerializer(many=True, read_only=True)
    assignments = AssignmentSerializer(many=True, read_only=True)
    resource_assignments = ResourceAssignmentSerializer(many=True, read_only=True)
    material_costs = MaterialCostSerializer(many=True, read_only=True)
    can_edit = serializers.SerializerMethodField()
    
    class Meta:
        model = Lead
        fields = '__all__'
    
    def get_assigned_to_avatar(self, obj):
        return obj.assigned_to.get_avatar() if obj.assigned_to else None
    
    def get_can_edit(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.can_be_edited_by(request.user)
        return False


class LeadCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lead
        exclude = ['created_by']

    def validate(self, attrs):
        """
        - Enforce probability_of_completion is set-once (immutable after creation).
        - Enforce product.division matches lead.division (create/update).
        """
        # Determine target division for this operation (new value or existing instance)
        instance = getattr(self, 'instance', None)
        division = attrs.get('division', getattr(instance, 'division', None))
        product = attrs.get('product', getattr(instance, 'product', None))

        if product and division and product.division != division:
            raise serializers.ValidationError({
                'product': 'Selected product does not belong to the chosen division.'
            })

        # Immutable probability after create
        if instance is not None and 'probability_of_completion' in attrs:
            if attrs['probability_of_completion'] != instance.probability_of_completion:
                raise serializers.ValidationError({
                    'probability_of_completion': 'Probability of completion can only be set at lead creation.'
                })
        
        # Phone Validation
        phone = attrs.get('phone')
        if phone:
            # Basic regex for international or local format (allows +, spaces, dashes, digits)
            # Minimum 7 digits to avoid too short numbers
            if not re.match(r'^[\+\d\s\-]+$', phone) or len(re.sub(r'\D', '', phone)) < 7:
                raise serializers.ValidationError({'phone': 'Invalid phone number format.'})

        # Email Validation (explicit check though EmailField handles basic syntax)
        email = attrs.get('email')
        if email:
             if not re.match(r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$', email):
                 raise serializers.ValidationError({'email': 'Invalid email address format.'})

        # Duplicate Lead Check (on creation only)
        if not instance:
            company = attrs.get('company')
            if company:
                # Case-insensitive duplicate check
                if Lead.objects.filter(company__iexact=company.strip()).exists():
                    raise serializers.ValidationError({
                        'company': f"A lead with company name '{company}' already exists."
                    })

        return attrs
    
    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'user', 'message', 'lead', 'notification_type', 'is_read', 'created_at', 'meta_data']
