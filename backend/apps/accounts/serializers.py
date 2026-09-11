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
            'groups',
            'member_id',
            'member_matricule',
            'member_display_name',
            'date_joined',
            'last_login',
        )
        read_only_fields = fields

    def get_member_id(self, obj):
        profile = getattr(obj, 'member_profile', None)
        return str(profile.id) if profile else None

    def get_member_matricule(self, obj):
        profile = getattr(obj, 'member_profile', None)
        return profile.matricule if profile else None

    def get_member_display_name(self, obj):
        profile = getattr(obj, 'member_profile', None)
        return profile.display_name if profile else f"{obj.first_name} {obj.last_name}".strip()
