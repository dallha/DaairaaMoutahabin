from django.conf import settings
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from django.contrib.auth.models import Group
from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from apps.audit.models import AuditActionChoices
from apps.audit.services import log_audit_event
from apps.members.models import Member
from common.constants import UserRole
from common.permissions import IsAdminUserRole, IsSuperAdminUser
from .models import CustomUser
from .serializers import (
    LoginSerializer,
    UserMeSerializer,
    UserManagementListSerializer,
    UserCreateSerializer,
    UserUpdateSerializer,
    UserResetPasswordSerializer,
)


def set_jwt_cookies(response, access_token, refresh_token=None, request=None):
    """
    Positionne les cookies HttpOnly sécurisés sur la réponse HTTP.
    Empêche toute lecture des jetons par le JavaScript client.
    """
    cookie_secure = getattr(settings, 'JWT_AUTH_COOKIE_SECURE', False)
    samesite = getattr(settings, 'JWT_AUTH_COOKIE_SAMESITE', 'Lax')
    access_cookie_name = getattr(settings, 'JWT_AUTH_COOKIE', 'access_token')
    refresh_cookie_name = getattr(settings, 'JWT_AUTH_REFRESH_COOKIE', 'refresh_token')

    # Cookie Access Token (15 min)
    access_lifetime = settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME']
    response.set_cookie(
        key=access_cookie_name,
        value=str(access_token),
        max_age=int(access_lifetime.total_seconds()),
        httponly=True,
        secure=cookie_secure,
        samesite=samesite,
        path='/'
    )

    # Cookie Refresh Token (7 jours) si fourni
    if refresh_token is not None:
        refresh_lifetime = settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME']
        refresh_path = getattr(settings, 'JWT_AUTH_REFRESH_COOKIE_PATH', '/api/v1/auth/')
        response.set_cookie(
            key=refresh_cookie_name,
            value=str(refresh_token),
            max_age=int(refresh_lifetime.total_seconds()),
            httponly=True,
            secure=cookie_secure,
            samesite=samesite,
            path=refresh_path
        )

    # Cookie CSRF pour requêtes mutantes du frontend
    if request is not None:
        response.set_cookie(
            key='csrftoken',
            value=get_token(request),
            max_age=31449600,
            httponly=False,
            secure=cookie_secure,
            samesite=samesite,
            path='/'
        )


def clear_jwt_cookies(response):
    """Supprime les cookies d'authentification lors de la déconnexion."""
    access_cookie_name = getattr(settings, 'JWT_AUTH_COOKIE', 'access_token')
    refresh_cookie_name = getattr(settings, 'JWT_AUTH_REFRESH_COOKIE', 'refresh_token')
    refresh_path = getattr(settings, 'JWT_AUTH_REFRESH_COOKIE_PATH', '/api/v1/auth/')

    response.delete_cookie(access_cookie_name, path='/')
    response.delete_cookie(refresh_cookie_name, path=refresh_path)


@method_decorator(ensure_csrf_cookie, name='dispatch')
class LoginView(APIView):
    """
    Endpoint de connexion sécurisé (/api/v1/auth/login/).
    Pose les cookies HttpOnly 'access_token' et 'refresh_token' ainsi que le cookie 'csrftoken'.
    """
    authentication_classes = ()
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = LoginSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']

        # Génération des tokens JWT
        refresh = RefreshToken.for_user(user)
        access = refresh.access_token

        response_data = {
            'success': True,
            'message': 'Connexion réussie.',
            'access': str(access),
            'refresh': str(refresh),
            'user': UserMeSerializer(user).data
        }

        response = Response(response_data, status=status.HTTP_200_OK)
        set_jwt_cookies(response, access_token=access, refresh_token=refresh, request=request)
        return response


class RefreshTokenView(APIView):
    """
    Endpoint de renouvellement du jeton d'accès (/api/v1/auth/refresh/).
    Lit le 'refresh_token' depuis le cookie HttpOnly, procède à l'invalidation officielle (blacklist)
    de l'ancien token, émet un nouveau couple access/refresh (rotation) et repositionne les cookies.
    """
    authentication_classes = ()
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        refresh_cookie_name = getattr(settings, 'JWT_AUTH_REFRESH_COOKIE', 'refresh_token')
        raw_refresh = request.COOKIES.get(refresh_cookie_name) or request.data.get('refresh')

        if not raw_refresh:
            return Response(
                {'success': False, 'message': 'Jeton de rafraîchissement absent.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            refresh = RefreshToken(raw_refresh)
            # 1. Invalidation officielle et immédiate de l'ancien refresh token (blacklist DB)
            refresh.blacklist()

            # 2. Rotation : génération d'un nouvel identifiant (JTI) et renouvellement d'expiration
            refresh.set_jti()
            refresh.set_exp()
            new_access = refresh.access_token

            response = Response(
                {'success': True, 'message': 'Jeton renouvelé avec succès.'},
                status=status.HTTP_200_OK
            )
            set_jwt_cookies(response, access_token=new_access, refresh_token=refresh)
            return response

        except (InvalidToken, TokenError):
            response = Response(
                {'success': False, 'message': 'Jeton de rafraîchissement invalide, révoqué ou expiré.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
            clear_jwt_cookies(response)
            return response


class LogoutView(APIView):
    """
    Endpoint de déconnexion (/api/v1/auth/logout/).
    Blackliste le refresh token et supprime les cookies HttpOnly.
    """
    authentication_classes = ()
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        refresh_cookie_name = getattr(settings, 'JWT_AUTH_REFRESH_COOKIE', 'refresh_token')
        raw_refresh = request.COOKIES.get(refresh_cookie_name) or request.data.get('refresh')

        if raw_refresh:
            try:
                refresh = RefreshToken(raw_refresh)
                refresh.blacklist()
            except (InvalidToken, TokenError):
                pass  # Si le token est déjà expiré ou invalide, on poursuit la suppression des cookies

        response = Response(
            {'success': True, 'message': 'Déconnexion effectuée avec succès.'},
            status=status.HTTP_200_OK
        )
        clear_jwt_cookies(response)
        return response


@method_decorator(ensure_csrf_cookie, name='dispatch')
class MeView(APIView):
    """
    Endpoint retournant l'identité et les autorisations de l'utilisateur connecté (/api/v1/auth/me/).
    Assure également la présence du cookie csrftoken pour les requêtes mutantes.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        csrf_val = get_token(request)
        serializer = UserMeSerializer(request.user)
        response = Response({
            'success': True,
            'user': serializer.data,
            'csrfToken': csrf_val
        }, status=status.HTTP_200_OK)

        cookie_secure = getattr(settings, 'JWT_AUTH_COOKIE_SECURE', False)
        samesite = getattr(settings, 'JWT_AUTH_COOKIE_SAMESITE', 'Lax')
        response.set_cookie(
            key='csrftoken',
            value=csrf_val,
            max_age=31449600,
            httponly=False,
            secure=cookie_secure,
            samesite=samesite,
            path='/'
        )
        return response


class CsrfTokenView(APIView):
    """
    Endpoint utilitaire (/api/v1/auth/csrf/) pour initialiser le cookie CSRF côté Next.js.
    """
    authentication_classes = ()
    permission_classes = [AllowAny]

    @method_decorator(ensure_csrf_cookie)
    def get(self, request, *args, **kwargs):
        csrf_token = get_token(request)
        return Response({
            'success': True,
            'csrfToken': csrf_token
        }, status=status.HTTP_200_OK)


def apply_user_role(user, role_str):
    """Assigne les groupes et indicateurs système correspondant au rôle choisi."""
    group_member, _ = Group.objects.get_or_create(name=UserRole.MEMBER)
    group_admin, _ = Group.objects.get_or_create(name=UserRole.ADMIN)
    group_superadmin, _ = Group.objects.get_or_create(name=UserRole.SUPERADMIN)

    user.groups.remove(group_member, group_admin, group_superadmin)

    if role_str == 'superadmin':
        user.is_superuser = True
        user.is_staff = True
        user.groups.add(group_superadmin)
    elif role_str == 'admin':
        user.is_superuser = False
        user.is_staff = True
        user.groups.add(group_admin)
    else:  # 'member'
        user.is_superuser = False
        user.is_staff = False
        user.groups.add(group_member)
    user.save()


class UserManagementViewSet(viewsets.ModelViewSet):
    """
    CRUD complet d'administration des comptes utilisateurs (/api/v1/auth/users/).
    - Réservé aux Administrateurs et Super-Administrateurs.
    - Règles strictes d'élévation de privilèges (seul superadmin manipule superadmin).
    - Dissociation stricte Membre ≠ Compte utilisateur.
    - Journalisation systématique dans AuditLog.
    """
    permission_classes = [IsAdminUserRole]
    queryset = CustomUser.objects.all().select_related('member_profile').prefetch_related('groups').order_by('-date_joined')
    serializer_class = UserManagementListSerializer

    def _is_caller_superadmin(self):
        user = self.request.user
        return bool(user.is_superuser or user.groups.filter(name=UserRole.SUPERADMIN).exists())

    def _is_target_superadmin(self, target_user):
        return bool(target_user.is_superuser or target_user.groups.filter(name=UserRole.SUPERADMIN).exists())

    def get_queryset(self):
        qs = super().get_queryset()
        search = self.request.query_params.get('search', '').strip()
        role = self.request.query_params.get('role', '').strip()
        is_active = self.request.query_params.get('is_active')

        if search:
            qs = qs.filter(
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(member_profile__matricule__icontains=search) |
                Q(member_profile__first_name__icontains=search) |
                Q(member_profile__last_name__icontains=search)
            )

        if role == 'superadmin':
            qs = qs.filter(Q(is_superuser=True) | Q(groups__name=UserRole.SUPERADMIN)).distinct()
        elif role == 'admin':
            qs = qs.filter(Q(is_staff=True) | Q(groups__name=UserRole.ADMIN)).exclude(is_superuser=True).exclude(groups__name=UserRole.SUPERADMIN).distinct()
        elif role == 'member':
            qs = qs.filter(groups__name=UserRole.MEMBER).exclude(is_staff=True).exclude(is_superuser=True).exclude(groups__name__in=[UserRole.ADMIN, UserRole.SUPERADMIN]).distinct()

        if is_active is not None:
            if is_active.lower() in ['true', '1']:
                qs = qs.filter(is_active=True)
            elif is_active.lower() in ['false', '0']:
                qs = qs.filter(is_active=False)

        return qs

    def create(self, request, *args, **kwargs):
        serializer = UserCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        target_role = data.get('role', 'member')
        if target_role == 'superadmin' and not self._is_caller_superadmin():
            return Response({
                'success': False,
                'status_code': 403,
                'error_code': 'FORBIDDEN',
                'message': 'Seul un Super-Administrateur peut créer un compte Super-Administrateur.'
            }, status=status.HTTP_403_FORBIDDEN)

        user = CustomUser.objects.create_user(
            email=data['email'],
            password=data['password'],
            first_name=data.get('first_name', ''),
            last_name=data.get('last_name', ''),
            is_active=data.get('is_active', True)
        )
        apply_user_role(user, target_role)

        member_id = data.get('member_id')
        if member_id:
            try:
                member = Member.all_objects.get(id=member_id)
                member.user = user
                member.save()
            except Member.DoesNotExist:
                pass

        user.refresh_from_db()

        log_audit_event(
            user=request.user,
            action=AuditActionChoices.CREATE,
            entity='User',
            entity_id=str(user.id),
            new_values={
                'email': user.email,
                'role': target_role,
                'member_id': str(member_id) if member_id else None
            },
            request=request
        )

        return Response({
            'success': True,
            'message': 'Compte utilisateur créé avec succès.',
            'data': UserManagementListSerializer(user).data
        }, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        target_user = self.get_object()

        # Protection contre la modification d'un superadmin par un simple admin
        if self._is_target_superadmin(target_user) and not self._is_caller_superadmin():
            return Response({
                'success': False,
                'status_code': 403,
                'error_code': 'FORBIDDEN',
                'message': 'Seul un Super-Administrateur peut modifier un compte Super-Administrateur.'
            }, status=status.HTTP_403_FORBIDDEN)

        serializer = UserUpdateSerializer(data=request.data, context={'target_user': target_user})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if 'role' in data:
            new_role = data['role']
            if new_role == 'superadmin' and not self._is_caller_superadmin():
                return Response({
                    'success': False,
                    'status_code': 403,
                    'error_code': 'FORBIDDEN',
                    'message': 'Seul un Super-Administrateur peut élever un compte au rôle Super-Administrateur.'
                }, status=status.HTTP_403_FORBIDDEN)
            apply_user_role(target_user, new_role)

        if 'first_name' in data:
            target_user.first_name = data['first_name']
        if 'last_name' in data:
            target_user.last_name = data['last_name']
        if 'is_active' in data:
            if target_user == request.user and not data['is_active']:
                return Response({
                    'success': False,
                    'status_code': 400,
                    'error_code': 'SELF_DEACTIVATION',
                    'message': 'Vous ne pouvez pas désactiver votre propre compte.'
                }, status=status.HTTP_400_BAD_REQUEST)
            target_user.is_active = data['is_active']
        target_user.save()

        # Liaison / Délie membre
        if 'member_id' in data:
            new_member_id = data['member_id']
            old_member = getattr(target_user, 'member_profile', None)
            if old_member and (new_member_id is None or old_member.id != new_member_id):
                old_member.user = None
                old_member.save()

            if new_member_id:
                try:
                    new_member = Member.all_objects.get(id=new_member_id)
                    new_member.user = target_user
                    new_member.save()
                except Member.DoesNotExist:
                    pass

        target_user.refresh_from_db()

        log_audit_event(
            user=request.user,
            action=AuditActionChoices.UPDATE,
            entity='User',
            entity_id=str(target_user.id),
            new_values=UserManagementListSerializer(target_user).data,
            request=request
        )

        return Response({
            'success': True,
            'message': 'Compte utilisateur mis à jour avec succès.',
            'data': UserManagementListSerializer(target_user).data
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='reset-password')
    def reset_password(self, request, pk=None):
        target_user = self.get_object()

        if self._is_target_superadmin(target_user) and not self._is_caller_superadmin():
            return Response({
                'success': False,
                'status_code': 403,
                'error_code': 'FORBIDDEN',
                'message': 'Seul un Super-Administrateur peut réinitialiser le mot de passe d’un Super-Administrateur.'
            }, status=status.HTTP_403_FORBIDDEN)

        serializer = UserResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_password = serializer.validated_data['new_password']

        target_user.set_password(new_password)
        target_user.save()

        log_audit_event(
            user=request.user,
            action=AuditActionChoices.UPDATE,
            entity='User',
            entity_id=str(target_user.id),
            old_values={'action': 'password_reset'},
            new_values={'status': 'password_changed'},
            request=request
        )

        return Response({
            'success': True,
            'message': f"Mot de passe de {target_user.email} réinitialisé avec succès."
        }, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        target_user = self.get_object()

        # Protection 1 : Auto-suppression interdite
        if target_user == request.user:
            return Response({
                'success': False,
                'status_code': 400,
                'error_code': 'SELF_DELETION_FORBIDDEN',
                'message': 'Vous ne pouvez pas supprimer votre propre compte administrateur.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Protection 2 : Seul un superadmin peut supprimer un superadmin
        if self._is_target_superadmin(target_user) and not self._is_caller_superadmin():
            return Response({
                'success': False,
                'status_code': 403,
                'error_code': 'FORBIDDEN',
                'message': 'Seul un Super-Administrateur peut supprimer un compte Super-Administrateur.'
            }, status=status.HTTP_403_FORBIDDEN)

        user_id = str(target_user.id)
        user_email = target_user.email

        # Délie explicitement le profil membre pour sécurité redondante
        member = getattr(target_user, 'member_profile', None)
        if member:
            member.user = None
            member.save()

        log_audit_event(
            user=request.user,
            action=AuditActionChoices.DELETE,
            entity='User',
            entity_id=user_id,
            old_values={'email': user_email},
            request=request
        )

        target_user.delete()

        return Response({
            'success': True,
            'message': f"Le compte utilisateur {user_email} a été supprimé. La fiche membre reste inchangée."
        }, status=status.HTTP_200_OK)

