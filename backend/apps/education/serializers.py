"""
Sérialiseurs pour l'API Éducation / Formations.
"""

from rest_framework import serializers
from common.constants import UserRole
from .models import Education, EducationLevelChoices, EducationStatusChoices


class EducationReadSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='member.display_name', read_only=True)
    member_matricule = serializers.CharField(source='member.matricule', read_only=True)
    level_display = serializers.CharField(source='get_level_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Education
        fields = [
            'id',
            'member',
            'member_name',
            'member_matricule',
            'institution',
            'field',
            'level',
            'level_display',
            'diploma',
            'status',
            'status_display',
            'start_year',
            'end_year',
        ]


class EducationWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Education
        fields = [
            'id',
            'member',
            'institution',
            'field',
            'level',
            'diploma',
            'status',
            'start_year',
            'end_year',
        ]
        read_only_fields = ['id']

    def validate_member(self, member):
        request = self.context.get('request')
        if not request:
            return member
        user = request.user
        is_admin = user.is_superuser or user.is_staff or user.groups.filter(name__in=[UserRole.ADMIN, UserRole.SUPERADMIN]).exists()
        if not is_admin and member.user_id != user.id:
            raise serializers.ValidationError("Vous ne pouvez pas ajouter une formation à un autre membre.")
        return member

    def validate(self, attrs):
        start_year = attrs.get('start_year', getattr(self.instance, 'start_year', None))
        end_year = attrs.get('end_year', getattr(self.instance, 'end_year', None))
        if start_year and end_year and start_year > end_year:
            raise serializers.ValidationError({"end_year": "L'année de fin ne peut pas être antérieure à l'année de début."})
        return attrs
