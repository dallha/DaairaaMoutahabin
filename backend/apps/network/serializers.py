from rest_framework import serializers
from apps.accounts.models import CustomUser
from apps.members.models import Member, Contact
from common.constants import UserRole
from .models import (
    SkillCategory,
    Skill,
    MemberSkill,
    ServiceCatalog,
    MemberService,
    MemberAvailability,
    MemberRelation,
    RelationStatusChoices,
    MemberNeed,
    NeedStatusChoices,
    ConnectionRequest,
    ConnectionRequestStatusChoices,
)


class SkillCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SkillCategory
        fields = ['id', 'name', 'slug', 'display_order']


class SkillSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = Skill
        fields = ['id', 'category', 'category_name', 'name', 'slug', 'is_active']


class MemberSkillSerializer(serializers.ModelSerializer):
    skill_name = serializers.CharField(source='skill.name', read_only=True)
    category_name = serializers.CharField(source='skill.category.name', read_only=True)
    level_display = serializers.CharField(source='get_level_display', read_only=True)
    verified_by_email = serializers.EmailField(source='verified_by.email', read_only=True)

    class Meta:
        model = MemberSkill
        fields = [
            'id', 'member', 'skill', 'skill_name', 'category_name',
            'level', 'level_display', 'years_experience',
            'is_verified', 'verified_by', 'verified_by_email', 'verified_at',
            'created_at'
        ]
        read_only_fields = ['is_verified', 'verified_by', 'verified_at', 'created_at']

    def validate(self, attrs):
        request = self.context.get('request')
        is_admin = request and request.user and (
            request.user.is_superuser or
            request.user.is_staff or
            request.user.groups.filter(name__in=[UserRole.ADMIN, UserRole.SUPERADMIN]).exists()
        )
        # Si un non-admin tente de forcer is_verified
        if 'is_verified' in attrs and not is_admin:
            attrs.pop('is_verified', None)
        return attrs


class ServiceCatalogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceCatalog
        fields = ['id', 'name', 'description', 'display_order']


class MemberServiceSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(source='service.name', read_only=True)
    service_type_display = serializers.CharField(source='get_service_type_display', read_only=True)
    contact_mode_display = serializers.CharField(source='get_contact_mode_display', read_only=True)

    class Meta:
        model = MemberService
        fields = [
            'id', 'member', 'service', 'service_name',
            'title', 'description', 'service_type', 'service_type_display',
            'terms', 'contact_mode', 'contact_mode_display',
            'is_active', 'created_at'
        ]
        read_only_fields = ['created_at']


class MemberAvailabilitySerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = MemberAvailability
        fields = [
            'id', 'member', 'status', 'status_display',
            'open_for_mentoring', 'open_for_dahirah_events',
            'open_for_pro_help', 'open_for_volunteer',
            'weekly_hours_available', 'preferred_contact_method',
            'notes', 'updated_at'
        ]
        read_only_fields = ['updated_at']


class MemberRelationSerializer(serializers.ModelSerializer):
    from_member_name = serializers.CharField(source='from_member.display_name', read_only=True)
    from_member_matricule = serializers.CharField(source='from_member.matricule', read_only=True)
    to_member_name = serializers.CharField(source='to_member.display_name', read_only=True)
    to_member_matricule = serializers.CharField(source='to_member.matricule', read_only=True)
    relation_type_display = serializers.CharField(source='get_relation_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    approved_by_email = serializers.EmailField(source='approved_by.email', read_only=True)

    class Meta:
        model = MemberRelation
        fields = [
            'id', 'from_member', 'from_member_name', 'from_member_matricule',
            'to_member', 'to_member_name', 'to_member_matricule',
            'relation_type', 'relation_type_display',
            'status', 'status_display',
            'approved_by', 'approved_by_email', 'approved_at',
            'notes', 'created_at'
        ]
        read_only_fields = ['status', 'approved_by', 'approved_at', 'created_at']

    def validate(self, attrs):
        from_m = attrs.get('from_member') or getattr(self.instance, 'from_member', None)
        to_m = attrs.get('to_member') or getattr(self.instance, 'to_member', None)
        if from_m and to_m and from_m == to_m:
            raise serializers.ValidationError("Un membre ne peut pas déclarer une relation avec lui-même.")
        return attrs


class NetworkMemberCardSerializer(serializers.ModelSerializer):
    """
    Sérialiseur optimisé pour les cartes de découverte du Carrefour Professionnel (/network).
    """
    display_name = serializers.CharField(read_only=True)
    city = serializers.SerializerMethodField()
    primary_profession = serializers.SerializerMethodField()
    primary_organization = serializers.SerializerMethodField()
    skills = serializers.SerializerMethodField()
    services_count = serializers.SerializerMethodField()
    availability_status = serializers.SerializerMethodField()
    open_for_mentoring = serializers.SerializerMethodField()
    open_for_pro_help = serializers.SerializerMethodField()

    class Meta:
        model = Member
        fields = [
            'id', 'matricule', 'first_name', 'last_name', 'display_name',
            'gender', 'situation', 'photo', 'city',
            'primary_profession', 'primary_organization',
            'skills', 'services_count',
            'availability_status', 'open_for_mentoring', 'open_for_pro_help'
        ]

    def get_city(self, obj):
        contact = obj.contacts.filter(is_primary=True).first() or obj.contacts.first()
        return contact.city if contact else 'Dakar'

    def get_primary_profession(self, obj):
        prof = obj.professions.filter(is_primary=True).first() or obj.professions.first()
        return prof.profession.name if prof and prof.profession else None

    def get_primary_organization(self, obj):
        prof = obj.professions.filter(is_primary=True).first() or obj.professions.first()
        return prof.organization if prof else None

    def get_skills(self, obj):
        return [
            {
                'id': ms.skill.id,
                'name': ms.skill.name,
                'level': ms.level,
                'level_display': ms.get_level_display(),
                'is_verified': ms.is_verified,
            }
            for ms in obj.skills.all()[:5]
        ]

    def get_services_count(self, obj):
        return obj.services_offered.filter(is_active=True).count()

    def get_availability_status(self, obj):
        if hasattr(obj, 'availability') and obj.availability:
            return obj.availability.status
        return 'NOT_SPECIFIED'

    def get_open_for_mentoring(self, obj):
        if hasattr(obj, 'availability') and obj.availability:
            return obj.availability.open_for_mentoring
        return False

    def get_open_for_pro_help(self, obj):
        if hasattr(obj, 'availability') and obj.availability:
            return obj.availability.open_for_pro_help
        return False


class MemberNeedSerializer(serializers.ModelSerializer):
    """
    Sérialiseur pour les besoins et demandes d'entraide communautaire.
    Applique l'anonymat relatif : masque l'identité pour les pairs si is_anonymous=True,
    mais la restitue systématiquement aux Administrateurs et Super-Administrateurs.
    """
    member_name = serializers.SerializerMethodField()
    member_matricule = serializers.SerializerMethodField()
    need_type_display = serializers.CharField(source='get_need_type_display', read_only=True)
    urgency_level_display = serializers.CharField(source='get_urgency_level_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    visibility_level_display = serializers.CharField(source='get_visibility_level_display', read_only=True)

    class Meta:
        model = MemberNeed
        fields = [
            'id', 'member', 'member_name', 'member_matricule',
            'need_type', 'need_type_display',
            'title', 'description',
            'urgency_level', 'urgency_level_display',
            'status', 'status_display',
            'visibility_level', 'visibility_level_display',
            'is_anonymous', 'expires_at', 'resolved_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def _is_admin(self):
        request = self.context.get('request')
        return bool(request and request.user and (
            request.user.is_superuser or
            request.user.is_staff or
            request.user.groups.filter(name__in=[UserRole.ADMIN, UserRole.SUPERADMIN]).exists()
        ))

    def get_member_name(self, obj):
        request = self.context.get('request')
        if obj.is_anonymous and not self._is_admin():
            if request and hasattr(request.user, 'member_profile') and request.user.member_profile == obj.member:
                return f"{obj.member.display_name} (Vous - anonymisé)"
            return "Membre de la Dahirah (Anonyme)"
        return obj.member.display_name

    def get_member_matricule(self, obj):
        request = self.context.get('request')
        if obj.is_anonymous and not self._is_admin():
            if request and hasattr(request.user, 'member_profile') and request.user.member_profile == obj.member:
                return obj.member.matricule
            return None
        return obj.member.matricule

    def validate(self, attrs):
        from django.utils import timezone
        status_val = attrs.get('status', getattr(self.instance, 'status', None))
        resolved_at = attrs.get('resolved_at', getattr(self.instance, 'resolved_at', None))
        expires_at = attrs.get('expires_at', getattr(self.instance, 'expires_at', None))

        if status_val == NeedStatusChoices.RESOLVED and not resolved_at:
            attrs['resolved_at'] = timezone.now()
        elif status_val in [NeedStatusChoices.OPEN, NeedStatusChoices.IN_PROGRESS]:
            attrs['resolved_at'] = None

        if status_val == NeedStatusChoices.EXPIRED and not expires_at:
            attrs['expires_at'] = timezone.now()

        return attrs


class ConnectionRequestSerializer(serializers.ModelSerializer):
    """
    Sérialiseur pour les demandes de mise en relation.
    Gère l'anonymat relatif : si le besoin lié est anonyme, le demandeur est anonymisé
    pour le membre sollicité (target_member) tant que la demande n'est pas acceptée.
    """
    requester = serializers.PrimaryKeyRelatedField(
        queryset=Member.objects.all(),
        required=False,
        allow_null=True,
        default=None
    )
    requester_name = serializers.SerializerMethodField()
    requester_matricule = serializers.SerializerMethodField()
    requester_photo = serializers.SerializerMethodField()
    target_member_name = serializers.CharField(source='target_member.display_name', read_only=True)
    target_member_matricule = serializers.CharField(source='target_member.matricule', read_only=True)
    target_member_photo = serializers.SerializerMethodField()
    facilitator_email = serializers.EmailField(source='facilitator.email', read_only=True)
    need_title = serializers.CharField(source='need.title', read_only=True)
    need_type = serializers.CharField(source='need.need_type', read_only=True)
    need_type_display = serializers.CharField(source='need.get_need_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    resulting_relation_id = serializers.UUIDField(source='resulting_relation.id', read_only=True)

    class Meta:
        model = ConnectionRequest
        fields = [
            'id',
            'need',
            'need_title',
            'need_type',
            'need_type_display',
            'requester',
            'requester_name',
            'requester_matricule',
            'requester_photo',
            'facilitator',
            'facilitator_email',
            'target_member',
            'target_member_name',
            'target_member_matricule',
            'target_member_photo',
            'status',
            'status_display',
            'message',
            'resulting_relation',
            'resulting_relation_id',
            'created_at',
            'responded_at',
        ]
        read_only_fields = ['status', 'resulting_relation', 'created_at', 'responded_at']

    def _is_admin(self):
        request = self.context.get('request')
        return bool(request and request.user and (
            request.user.is_superuser or
            request.user.is_staff or
            request.user.groups.filter(name__in=[UserRole.ADMIN, UserRole.SUPERADMIN]).exists()
        ))

    def get_requester_name(self, obj):
        request = self.context.get('request')
        if obj.need and obj.need.is_anonymous and obj.status != ConnectionRequestStatusChoices.ACCEPTED and not self._is_admin():
            if request and hasattr(request.user, 'member_profile') and request.user.member_profile == obj.requester:
                return f"{obj.requester.display_name} (Vous)"
            return "Membre de la Dahirah (Confidentiel)"
        return obj.requester.display_name

    def get_requester_matricule(self, obj):
        request = self.context.get('request')
        if obj.need and obj.need.is_anonymous and obj.status != ConnectionRequestStatusChoices.ACCEPTED and not self._is_admin():
            if request and hasattr(request.user, 'member_profile') and request.user.member_profile == obj.requester:
                return obj.requester.matricule
            return None
        return obj.requester.matricule

    def get_requester_photo(self, obj):
        request = self.context.get('request')
        if obj.need and obj.need.is_anonymous and obj.status != ConnectionRequestStatusChoices.ACCEPTED and not self._is_admin():
            if request and hasattr(request.user, 'member_profile') and request.user.member_profile == obj.requester:
                return request.build_absolute_uri(obj.requester.photo.url) if obj.requester.photo else None
            return None
        if obj.requester.photo:
            return request.build_absolute_uri(obj.requester.photo.url) if request else obj.requester.photo.url
        return None

    def get_target_member_photo(self, obj):
        request = self.context.get('request')
        if obj.target_member and obj.target_member.photo:
            return request.build_absolute_uri(obj.target_member.photo.url) if request else obj.target_member.photo.url
        return None

    def validate(self, attrs):
        request = self.context.get('request')
        if not attrs.get('requester'):
            if request and hasattr(request.user, 'member_profile') and request.user.member_profile:
                attrs['requester'] = request.user.member_profile
        requester = attrs.get('requester')
        target_member = attrs.get('target_member')
        if requester and target_member and requester == target_member:
            raise serializers.ValidationError("Un membre ne peut pas s'auto-solliciter.")
        return attrs


