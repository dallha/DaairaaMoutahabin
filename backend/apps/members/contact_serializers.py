"""
Sérialiseurs pour l'API Contacts.
"""

from rest_framework import serializers
from django.db import transaction
from apps.accounts.models import CustomUser
from common.constants import UserRole
from .models import Contact, Member


class ContactReadSerializer(serializers.ModelSerializer):
    """
    Sérialiseur de lecture pour un contact.
    Masque le téléphone et WhatsApp si l'utilisateur n'est ni Admin, ni Propriétaire,
    ni bénéficiaire du consentement explicite `phone_visible_to_members=True`.
    """
    phone = serializers.SerializerMethodField()
    whatsapp = serializers.SerializerMethodField()
    member_name = serializers.CharField(source='member.display_name', read_only=True)
    member_matricule = serializers.CharField(source='member.matricule', read_only=True)

    class Meta:
        model = Contact
        fields = [
            'id',
            'member',
            'member_name',
            'member_matricule',
            'phone',
            'phone_visible_to_members',
            'whatsapp',
            'email',
            'address',
            'city',
            'country',
            'is_primary',
            'created_at',
        ]

    def _can_see_phone(self, obj):
        request = self.context.get('request')
        if not request or not getattr(request.user, 'is_authenticated', False):
            return False
        user = request.user
        if user.is_superuser or user.is_staff or user.groups.filter(name__in=[UserRole.ADMIN, UserRole.SUPERADMIN]).exists():
            return True
        if obj.member and obj.member.user_id == user.id:
            return True
        return bool(obj.phone_visible_to_members)

    def get_phone(self, obj):
        return obj.phone if self._can_see_phone(obj) else None

    def get_whatsapp(self, obj):
        return obj.whatsapp if self._can_see_phone(obj) else None


class ContactWriteSerializer(serializers.ModelSerializer):
    """
    Sérialiseur pour la création et mise à jour de contact.
    """
    class Meta:
        model = Contact
        fields = [
            'id',
            'member',
            'phone',
            'phone_visible_to_members',
            'whatsapp',
            'email',
            'address',
            'city',
            'country',
            'is_primary',
        ]
        read_only_fields = ['id']

    def validate_member(self, member):
        request = self.context.get('request')
        if not request:
            return member
        user = request.user
        is_admin = user.is_superuser or user.is_staff or user.groups.filter(name__in=[UserRole.ADMIN, UserRole.SUPERADMIN]).exists()
        if not is_admin and member.user_id != user.id:
            raise serializers.ValidationError("Vous ne pouvez pas ajouter un contact à un autre membre.")
        return member

    @transaction.atomic
    def create(self, validated_data):
        is_primary = validated_data.get('is_primary', False)
        member = validated_data['member']

        # Si le membre n'a aucun contact, le premier est automatiquement principal
        if not Contact.objects.filter(member=member).exists():
            validated_data['is_primary'] = True
            is_primary = True

        if is_primary:
            # Rétrograder les autres contacts principaux
            Contact.objects.filter(member=member, is_primary=True).update(is_primary=False)

        return super().create(validated_data)

    @transaction.atomic
    def update(self, instance, validated_data):
        is_primary = validated_data.get('is_primary', instance.is_primary)
        if is_primary:
            Contact.objects.filter(member=instance.member, is_primary=True).exclude(pk=instance.pk).update(is_primary=False)

        return super().update(instance, validated_data)
