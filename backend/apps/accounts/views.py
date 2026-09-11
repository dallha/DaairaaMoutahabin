from django.conf import settings
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import LoginSerializer, UserMeSerializer


def set_jwt_cookies(response, access_token, refresh_token=None):
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


def clear_jwt_cookies(response):
    """Supprime les cookies d'authentification lors de la déconnexion."""
    access_cookie_name = getattr(settings, 'JWT_AUTH_COOKIE', 'access_token')
    refresh_cookie_name = getattr(settings, 'JWT_AUTH_REFRESH_COOKIE', 'refresh_token')
    refresh_path = getattr(settings, 'JWT_AUTH_REFRESH_COOKIE_PATH', '/api/v1/auth/')

    response.delete_cookie(access_cookie_name, path='/')
    response.delete_cookie(refresh_cookie_name, path=refresh_path)


class LoginView(APIView):
    """
    Endpoint de connexion sécurisé (/api/v1/auth/login/).
    Pose les cookies HttpOnly 'access_token' et 'refresh_token'.
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
            'user': UserMeSerializer(user).data
        }

        response = Response(response_data, status=status.HTTP_200_OK)
        set_jwt_cookies(response, access_token=access, refresh_token=refresh)
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


class MeView(APIView):
    """
    Endpoint retournant l'identité et les autorisations de l'utilisateur connecté (/api/v1/auth/me/).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        serializer = UserMeSerializer(request.user)
        return Response({
            'success': True,
            'user': serializer.data
        }, status=status.HTTP_200_OK)


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
