"""
Classe d'authentification DRF par cookie HttpOnly sécurisé avec fallback sur header Bearer,
intégrant le contrôle CSRF strict sur les requêtes mutantes authentifiées par cookie.
"""

from django.conf import settings
from rest_framework import exceptions
from rest_framework.authentication import CSRFCheck
from rest_framework_simplejwt.authentication import JWTAuthentication


class JWTCookieAuthentication(JWTAuthentication):
    """
    Authentification JWT prioritaire via Cookie HttpOnly sécurisé.
    Empêche tout accès aux tokens depuis le JavaScript client (protection XSS).
    Conserve le fallback sur le header Authorization: Bearer pour les tests et outils API.

    Sécurité CSRF :
    - Si le JWT provient du cookie 'access_token' ET que la méthode est POST, PUT, PATCH ou DELETE,
      on applique enforce_csrf(request).
    - Si le JWT provient de 'Authorization: Bearer ...', le CSRF n'est pas requis.
    """

    def authenticate(self, request):
        header = self.get_header(request)
        cookie_name = getattr(settings, 'JWT_AUTH_COOKIE', 'access_token')
        raw_token = None
        is_cookie_auth = False

        # Si un header Authorization est explicitement fourni, il est traité comme Bearer auth
        if header is not None:
            raw_token = self.get_raw_token(header)
            is_cookie_auth = False
        elif cookie_name in request.COOKIES and request.COOKIES[cookie_name]:
            raw_token = request.COOKIES[cookie_name]
            is_cookie_auth = True

        if raw_token is None:
            return None

        # Validation cryptographique du jeton
        validated_token = self.get_validated_token(raw_token)
        user = self.get_user(validated_token)

        # Contrôle CSRF obligatoire si l'authentification provient d'un cookie
        if is_cookie_auth:
            self.enforce_csrf(request)

        return user, validated_token

    def enforce_csrf(self, request):
        """
        Contrôle de validation CSRF obligatoire pour les requêtes basées sur cookie.
        """
        # Exempter les méthodes de lecture idempotentes (GET, HEAD, OPTIONS, TRACE)
        if request.method in ('GET', 'HEAD', 'OPTIONS', 'TRACE'):
            return

        def dummy_get_response(req):
            return None

        check = CSRFCheck(dummy_get_response)
        check.process_request(request)
        reason = check.process_view(request, None, (), {})
        if reason:
            raise exceptions.PermissionDenied(f'CSRF Failed: {reason}')
