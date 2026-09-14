"""
Sérialiseurs pour l'API Membres respectant la matrice stricte de visibilité et RBAC.
"""

from django.utils import timezone
from rest_framework import serializers
from apps.accounts.models import CustomUser
from common.constants import UserRole
from .models import Contact, Member, SituationChoices, GenderChoices, MemberStatusChoices, VisibilityChoices


class ContactNestedSerializer(serializers.ModelSerializer):
    """Sérialiseur de contact avec masquage serveur du téléphone selon le consentement et le rôle."""
    phone = serializers.SerializerMethodField()
    whatsapp = serializers.SerializerMethodField()

    class Meta:
        model = Contact
        fields = [
            'id',
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
        # Administrateurs et Super-Administrateurs voient tout
        if user.is_superuser or user.is_staff or user.groups.filter(name__in=[UserRole.ADMIN, UserRole.SUPERADMIN]).exists():
            return True
        # Propriétaire direct de la fiche
        if obj.member and obj.member.user_id == user.id:
            return True
        # Membre normal connecté : UNIQUEMENT avec consentement explicite
        return bool(obj.phone_visible_to_members)

    def get_phone(self, obj):
        return obj.phone if self._can_see_phone(obj) else None

    def get_whatsapp(self, obj):
        return obj.whatsapp if self._can_see_phone(obj) else None


def get_institutional_role(obj):
    """Projection directe depuis MemberRole : fonction officielle actuelle de rang prioritaire."""
    role_assignment = obj.dairah_roles.filter(is_current=True).order_by('role__rank').first()
    if role_assignment:
        return role_assignment.role.name
    if getattr(obj, 'is_founder', False):
        return "Guide Spirituel & Fondateur"
    if getattr(obj, 'is_president', False):
        return "Président de la Dahirah"
    return None


class MemberPublicSerializer(serializers.ModelSerializer):
    """Sérialiseur minimal pour les visiteurs anonymes (profils publics uniquement)."""
    display_name = serializers.CharField(read_only=True)
    institutional_role_name = serializers.SerializerMethodField()
    institutional_role_code = serializers.CharField(read_only=True)

    class Meta:
        model = Member
        fields = [
            'id',
            'matricule',
            'display_name',
            'situation',
            'photo',
            'is_founder',
            'is_president',
            'institutional_priority',
            'institutional_role_code',
            'institutional_role_name',
        ]

    def get_institutional_role_name(self, obj):
        return get_institutional_role(obj)


class MemberDirectorySerializer(serializers.ModelSerializer):
    """Sérialiseur pour l'annuaire interne des membres connectés."""
    display_name = serializers.CharField(read_only=True)
    primary_contact = serializers.SerializerMethodField()
    institutional_role_name = serializers.SerializerMethodField()
    institutional_role_code = serializers.CharField(read_only=True)

    class Meta:
        model = Member
        fields = [
            'id',
            'matricule',
            'display_name',
            'first_name',
            'last_name',
            'gender',
            'situation',
            'photo',
            'status',
            'is_founder',
            'is_president',
            'institutional_priority',
            'institutional_role_code',
            'institutional_role_name',
            'primary_contact',
        ]

    def get_primary_contact(self, obj):
        primary = obj.contacts.filter(is_primary=True).first() or obj.contacts.first()
        if primary:
            return ContactNestedSerializer(primary, context=self.context).data
        return None

    def get_institutional_role_name(self, obj):
        return get_institutional_role(obj)


class MemberDetailSerializer(serializers.ModelSerializer):
    """Sérialiseur de consultation détaillée pour membres et propriétaires."""
    display_name = serializers.CharField(read_only=True)
    contacts = ContactNestedSerializer(many=True, read_only=True)
    institutional_role_name = serializers.SerializerMethodField()
    institutional_role_code = serializers.CharField(read_only=True)

    class Meta:
        model = Member
        fields = [
            'id',
            'matricule',
            'display_name',
            'first_name',
            'last_name',
            'gender',
            'birth_date',
            'situation',
            'photo',
            'status',
            'visibility_level',
            'is_founder',
            'is_president',
            'institutional_priority',
            'institutional_role_code',
            'institutional_role_name',
            'joined_at',
            'created_at',
            'updated_at',
            'contacts',
        ]

    def get_institutional_role_name(self, obj):
        return get_institutional_role(obj)


class MemberAdminSerializer(serializers.ModelSerializer):
    """Sérialiseur exhaustif réservé à l'administration (données confidentielles et audit incluses)."""
    display_name = serializers.CharField(read_only=True)
    contacts = ContactNestedSerializer(many=True, read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    institutional_role_name = serializers.SerializerMethodField()
    institutional_role_code = serializers.CharField(read_only=True)

    class Meta:
        model = Member
        fields = [
            'id',
            'user',
            'user_email',
            'matricule',
            'display_name',
            'first_name',
            'last_name',
            'gender',
            'birth_date',
            'situation',
            'photo',
            'status',
            'visibility_level',
            'is_founder',
            'is_president',
            'institutional_priority',
            'institutional_role_code',
            'institutional_role_name',
            'joined_at',
            'notes',
            'is_deleted',
            'created_at',
            'updated_at',
            'contacts',
        ]
        read_only_fields = ['id', 'matricule', 'is_founder', 'is_president', 'institutional_priority', 'institutional_role_code', 'created_at', 'updated_at']

    def get_institutional_role_name(self, obj):
        return get_institutional_role(obj)


from django.db import transaction


class MemberCreateSerializer(serializers.ModelSerializer):
    """Sérialiseur de création de membre (réservé aux administrateurs)."""
    joined_at = serializers.DateField(required=False, default=timezone.localdate)
    phone = serializers.CharField(required=False, write_only=True, allow_blank=True, allow_null=True)
    phone_visible_to_members = serializers.BooleanField(required=False, write_only=True, default=False)
    email = serializers.EmailField(required=False, write_only=True, allow_blank=True, allow_null=True)
    city = serializers.CharField(required=False, write_only=True, allow_blank=True, default='Dakar')
    country = serializers.CharField(required=False, write_only=True, allow_blank=True, default='Sénégal')
    address = serializers.CharField(required=False, write_only=True, allow_blank=True)

    class Meta:
        model = Member
        fields = [
            'id',
            'user',
            'first_name',
            'last_name',
            'gender',
            'birth_date',
            'situation',
            'photo',
            'status',
            'visibility_level',
            'joined_at',
            'notes',
            'phone',
            'phone_visible_to_members',
            'email',
            'city',
            'country',
            'address',
        ]
        read_only_fields = ['id']

    @transaction.atomic
    def create(self, validated_data):
        phone = validated_data.pop('phone', None)
        phone_visible = validated_data.pop('phone_visible_to_members', False)
        email = validated_data.pop('email', None)
        city = validated_data.pop('city', 'Dakar')
        country = validated_data.pop('country', 'Sénégal')
        address = validated_data.pop('address', '')

        member = super().create(validated_data)

        if phone or email:
            Contact.objects.create(
                member=member,
                phone=phone or '',
                phone_visible_to_members=bool(phone_visible),
                email=email or '',
                city=city or 'Dakar',
                country=country or 'Sénégal',
                address=address or '',
                is_primary=True,
            )

        return member


class MemberUpdateSerializer(serializers.ModelSerializer):
    """
    Sérialiseur de mise à jour avec restriction stricte pour les propriétaires.
    Un propriétaire ne peut modifier que son identité civile et sa situation.
    Il ne peut JAMAIS modifier son matricule, statut, visibilité, notes ou is_deleted.
    """
    class Meta:
        model = Member
        fields = [
            'first_name',
            'last_name',
            'gender',
            'birth_date',
            'situation',
            'photo',
            'status',
            'visibility_level',
            'joined_at',
            'notes',
        ]

    def validate(self, attrs):
        request = self.context.get('request')
        user = request.user if request else None

        if user and not (user.is_superuser or user.is_staff or user.groups.filter(name__in=[UserRole.ADMIN, UserRole.SUPERADMIN]).exists()):
            # L'utilisateur est un propriétaire (non-admin)
            forbidden_fields = {'status', 'visibility_level', 'joined_at', 'notes'}
            attempted = forbidden_fields.intersection(attrs.keys())
            if attempted:
                raise serializers.ValidationError({
                    field: "Vous n'avez pas l'autorisation de modifier ce champ administratif."
                    for field in attempted
                })

        return attrs
