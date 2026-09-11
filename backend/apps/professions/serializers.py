"""
Sérialiseurs pour l'API Professions.
"""

from rest_framework import serializers
from apps.accounts.models import CustomUser
from common.constants import UserRole
from .models import ProfessionCategory, Profession, MemberProfession


class ProfessionCategorySerializer(serializers.ModelSerializer):
    professions_count = serializers.IntegerField(source='professions.count', read_only=True)

    class Meta:
        model = ProfessionCategory
        fields = [
            'id',
            'name',
            'slug',
            'display_order',
            'professions_count',
        ]
        read_only_fields = ['id', 'slug']


class ProfessionSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = Profession
        fields = [
            'id',
            'category',
            'category_name',
            'name',
            'slug',
            'description',
            'is_active',
        ]
        read_only_fields = ['id', 'slug']


class MemberProfessionReadSerializer(serializers.ModelSerializer):
    member_name = serializers.CharField(source='member.display_name', read_only=True)
    member_matricule = serializers.CharField(source='member.matricule', read_only=True)
    profession_name = serializers.CharField(source='profession.name', read_only=True)
    category_name = serializers.CharField(source='profession.category.name', read_only=True)

    class Meta:
        model = MemberProfession
        fields = [
            'id',
            'member',
            'member_name',
            'member_matricule',
            'profession',
            'profession_name',
            'category_name',
            'title',
            'organization',
            'is_primary',
            'is_current',
            'start_date',
            'end_date',
        ]


class MemberProfessionWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = MemberProfession
        fields = [
            'id',
            'member',
            'profession',
            'title',
            'organization',
            'is_primary',
            'is_current',
            'start_date',
            'end_date',
        ]
        read_only_fields = ['id']

    def validate_member(self, member):
        request = self.context.get('request')
        if not request:
            return member
        user = request.user
        is_admin = user.is_superuser or user.is_staff or user.groups.filter(name__in=[UserRole.ADMIN, UserRole.SUPERADMIN]).exists()
        if not is_admin and member.user_id != user.id:
            raise serializers.ValidationError("Vous ne pouvez pas associer une profession à un autre membre.")
        return member

    def validate(self, attrs):
        start_date = attrs.get('start_date', getattr(self.instance, 'start_date', None))
        end_date = attrs.get('end_date', getattr(self.instance, 'end_date', None))
        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError({"end_date": "La date de fin ne peut pas être antérieure à la date de début."})
        return attrs
