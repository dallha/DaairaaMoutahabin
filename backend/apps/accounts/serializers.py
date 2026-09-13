from django.contrib.auth import authenticate
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers
from .models import CustomUser


class LoginSerializer(serializers.Serializer):
    """Sérialiseur de connexion validant email et mot de passe."""
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True, style={'input_type': 'password'})

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')

        if email and password:
            user = authenticate(request=self.context.get('request'), email=email, password=password)
            if not user:
                raise serializers.ValidationError(
                    _("Identifiants incorrects. Vérifiez votre adresse email et votre mot de passe."),
                    code='authorization'
                )
            if not user.is_active:
                raise serializers.ValidationError(
                    _("Ce compte utilisateur a été désactivé."),
                    code='inactive'
                )
        else:
            raise serializers.ValidationError(
                _("L'adresse email et le mot de passe sont obligatoires."),
                code='required'
            )

        attrs['user'] = user
        return attrs


class UserMeSerializer(serializers.ModelSerializer):
    """Sérialiseur du profil utilisateur connecté (/api/v1/auth/me/)."""
    groups = serializers.SlugRelatedField(many=True, read_only=True, slug_field='name')
    role = serializers.SerializerMethodField()
    member_id = serializers.SerializerMethodField()
    member_matricule = serializers.SerializerMethodField()
    member_display_name = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = (
            'id',
            'email',
            'first_name',
            'last_name',
            'is_staff',
            'is_superuser',
            'role',
            'groups',
            'member_id',
            'member_matricule',
            'member_display_name',
            'date_joined',
            'last_login',
        )
        read_only_fields = fields

    def get_role(self, obj):
        if obj.is_superuser or obj.groups.filter(name='Super-Administrateurs').exists():
            return 'superadmin'
        if obj.is_staff or obj.groups.filter(name='Administrateurs').exists():
            return 'admin'
        if obj.groups.filter(name='Agents').exists():
            return 'agent'
        return 'member'

    def get_member_id(self, obj):
        profile = getattr(obj, 'member_profile', None)
        return str(profile.id) if profile else None

    def get_member_matricule(self, obj):
        profile = getattr(obj, 'member_profile', None)
        return profile.matricule if profile else None

    def get_member_display_name(self, obj):
        profile = getattr(obj, 'member_profile', None)
        return profile.display_name if profile else f"{obj.first_name} {obj.last_name}".strip()


class UserManagementListSerializer(serializers.ModelSerializer):
    """Sérialiseur complet pour l'administration des utilisateurs (/api/v1/auth/users/)."""
    role = serializers.SerializerMethodField()
    groups = serializers.SlugRelatedField(many=True, read_only=True, slug_field='name')
    member_id = serializers.SerializerMethodField()
    member_matricule = serializers.SerializerMethodField()
    member_display_name = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = (
            'id',
            'email',
            'first_name',
            'last_name',
            'is_active',
            'is_staff',
            'is_superuser',
            'role',
            'groups',
            'member_id',
            'member_matricule',
            'member_display_name',
            'date_joined',
            'last_login',
        )
        read_only_fields = fields

    def get_role(self, obj):
        if obj.is_superuser or obj.groups.filter(name='Super-Administrateurs').exists():
            return 'superadmin'
        if obj.is_staff or obj.groups.filter(name='Administrateurs').exists():
            return 'admin'
        if obj.groups.filter(name='Agents').exists():
            return 'agent'
        return 'member'

    def get_member_id(self, obj):
        profile = getattr(obj, 'member_profile', None)
        return str(profile.id) if profile else None

    def get_member_matricule(self, obj):
        profile = getattr(obj, 'member_profile', None)
        return profile.matricule if profile else None

    def get_member_display_name(self, obj):
        profile = getattr(obj, 'member_profile', None)
        return profile.display_name if profile else f"{obj.first_name} {obj.last_name}".strip()


class UserCreateSerializer(serializers.Serializer):
    """Sérialiseur de création d'un utilisateur par un administrateur."""
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True, min_length=8)
    first_name = serializers.CharField(required=False, allow_blank=True, default='')
    last_name = serializers.CharField(required=False, allow_blank=True, default='')
    role = serializers.ChoiceField(choices=['member', 'admin', 'superadmin'], default='member')
    is_active = serializers.BooleanField(default=True)
    member_id = serializers.UUIDField(required=False, allow_null=True, default=None)

    def validate_email(self, value):
        if CustomUser.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(_("Un utilisateur avec cette adresse email existe déjà."))
        return value.lower()

    def validate_member_id(self, value):
        if value:
            from apps.members.models import Member
            try:
                member = Member.all_objects.get(id=value)
            except Member.DoesNotExist:
                raise serializers.ValidationError(_("Le membre spécifié n'existe pas."))
            if member.user is not None:
                raise serializers.ValidationError(_(f"Ce membre est déjà associé au compte {member.user.email}."))
        return value


class UserUpdateSerializer(serializers.Serializer):
    """Sérialiseur de mise à jour d'un compte utilisateur."""
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    role = serializers.ChoiceField(choices=['member', 'admin', 'superadmin'], required=False)
    is_active = serializers.BooleanField(required=False)
    member_id = serializers.UUIDField(required=False, allow_null=True)

    def validate_member_id(self, value):
        if value:
            from apps.members.models import Member
            try:
                member = Member.all_objects.get(id=value)
            except Member.DoesNotExist:
                raise serializers.ValidationError(_("Le membre spécifié n'existe pas."))
            target_user = self.context.get('target_user')
            if member.user is not None and member.user != target_user:
                raise serializers.ValidationError(_(f"Ce membre est déjà associé au compte {member.user.email}."))
        return value


class UserResetPasswordSerializer(serializers.Serializer):
    """Sérialiseur pour réinitialiser le mot de passe d'un utilisateur."""
    new_password = serializers.CharField(required=True, write_only=True, min_length=8)

