"""
Sérialiseurs pour l'API Rôles et Fonctions de la Dahirah.
"""

from django.utils import timezone
from rest_framework import serializers
from .models import Role, MemberRole, RoleCategoryChoices


class RoleSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    assignments_count = serializers.IntegerField(source='assignments.count', read_only=True)

    class Meta:
        model = Role
        fields = [
            'id',
            'code',
            'name',
            'category',
            'category_display',
            'description',
            'rank',
            'assignments_count',
        ]
        read_only_fields = ['id']


class MemberRoleReadSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='member.display_name', read_only=True)
    member_matricule = serializers.CharField(source='member.matricule', read_only=True)
    role_name = serializers.CharField(source='role.name', read_only=True)
    role_code = serializers.CharField(source='role.code', read_only=True)
    role_category = serializers.CharField(source='role.category', read_only=True)
    role_category_display = serializers.CharField(source='role.get_category_display', read_only=True)

    class Meta:
        model = MemberRole
        fields = [
            'id',
            'member',
            'member_name',
            'member_matricule',
            'role',
            'role_name',
            'role_code',
            'role_category',
            'role_category_display',
            'start_date',
            'end_date',
            'is_current',
            'notes',
        ]


class MemberRoleWriteSerializer(serializers.ModelSerializer):
    start_date = serializers.DateField(default=timezone.localdate)

    class Meta:
        model = MemberRole
        fields = [
            'id',
            'member',
            'role',
            'start_date',
            'end_date',
            'is_current',
            'notes',
        ]
        read_only_fields = ['id']

    def validate(self, attrs):
        start_date = attrs.get('start_date', getattr(self.instance, 'start_date', None))
        end_date = attrs.get('end_date', getattr(self.instance, 'end_date', None))
        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError({"end_date": "La date de fin ne peut pas précéder la date de début."})
        return attrs
