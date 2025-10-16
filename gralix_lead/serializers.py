from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import Lead, Personnel, Communication, Assignment, Product


class PersonnelSerializer(serializers.ModelSerializer):
    name = serializers.ReadOnlyField()
    avatar = serializers.SerializerMethodField()
    
    class Meta:
        model = Personnel
        fields = ['id', 'name', 'first_name', 'last_name', 'email', 'division', 
                 'workload', 'avatar', 'role', 'phone', 'is_active_personnel']
    
    def get_avatar(self, obj):
        return obj.get_avatar()


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


class ProductSerializer(serializers.ModelSerializer):
    division_display = serializers.CharField(source='get_division_display', read_only=True)
    
    class Meta:
        model = Product
        fields = ['id', 'name', 'division', 'division_display', 'description', 'is_active']


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


class LeadSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.CharField(source='assigned_to.name', read_only=True)
    assigned_to_avatar = serializers.SerializerMethodField()
    assigned_to_email = serializers.CharField(source='assigned_to.email', read_only=True)
    assigned_to_division = serializers.CharField(source='assigned_to.division', read_only=True)
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    communications = CommunicationSerializer(many=True, read_only=True)
    assignments = AssignmentSerializer(many=True, read_only=True)
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
    
    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['created_by'] = request.user
        return super().create(validated_data)