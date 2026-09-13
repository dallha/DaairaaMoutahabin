from django.contrib.auth.models import AnonymousUser, Group
from django.test import override_settings
from django.urls import path, reverse
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.test import APIClient, APITestCase
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import CustomUser
from common.constants import UserRole
from common.permissions import (
    CanHardDelete,
    IsAdminOrReadOnly,
    IsAdminUserRole,
    IsMemberUserRole,
    IsOwnerOrAdmin,
    IsSuperAdminUser,
)
from config.urls import urlpatterns as base_urlpatterns


# Vue de test mutante pour valider la protection CSRF sur les requêtes authentifiées par cookie
class DummyMutatingView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        return Response({'status': 'posted'}, status=status.HTTP_200_OK)

    def patch(self, request):
        return Response({'status': 'patched'}, status=status.HTTP_200_OK)

    def delete(self, request):
        return Response({'status': 'deleted'}, status=status.HTTP_204_NO_CONTENT)


# Configuration d'URL de test incluant la vue mutante
urlpatterns = list(base_urlpatterns) + [
    path('api/v1/test-mutating/', DummyMutatingView.as_view(), name='test_mutating'),
]


@override_settings(ROOT_URLCONF='apps.accounts.tests.test_auth_rbac')
class AuthAndRBACTests(APITestCase):
    """
    Suite de tests de sécurité approfondie (Phase 4B) :
    1. Authentification JWT et transport par cookies HttpOnly
    2. Protection CSRF stricte sur cookie JWT (POST, PATCH, DELETE) vs exemption Bearer
    3. Rotation et Blacklist des Refresh Tokens (invalidation immédiate de l'ancien token)
    4. Déconnexion et révocation complète
    5. Matrice RBAC exhaustive (Membres, Admins, Superadmins, Anonymes)
    """

    def setUp(self):
        # 1. Création des groupes RBAC via les constantes centralisées
        self.group_members, _ = Group.objects.get_or_create(name=UserRole.MEMBER)
        self.group_admins, _ = Group.objects.get_or_create(name=UserRole.ADMIN)
        self.group_superadmins, _ = Group.objects.get_or_create(name=UserRole.SUPERADMIN)

        # 2. Utilisateur Membre standard
        self.member_user = CustomUser.objects.create_user(
            email='membre@dairatu.sn',
            password='TestPassword123!',
            first_name='Moussa',
            last_name='Diop'
        )
        self.member_user.groups.add(self.group_members)

        # 3. Utilisateur Administrateur normal (non superuser)
        self.admin_user = CustomUser.objects.create_user(
            email='admin@dairatu.sn',
            password='TestPassword123!',
            first_name='Aïcha',
            last_name='Ba'
        )
        self.admin_user.groups.add(self.group_admins)

        # 4. Utilisateur Super-Administrateur via le groupe (sans is_superuser)
        self.superadmin_group_user = CustomUser.objects.create_user(
            email='super_group@dairatu.sn',
            password='TestPassword123!',
            first_name='Fatou',
            last_name='Sall',
            is_superuser=False
        )
        self.superadmin_group_user.groups.add(self.group_superadmins)

        # 5. Utilisateur Super-Administrateur via is_superuser=True
        self.superuser_flag_user = CustomUser.objects.create_superuser(
            email='super_flag@dairatu.sn',
            password='TestPassword123!',
            first_name='Cheikh',
            last_name='Fall'
        )

        # Client de test avec application stricte des vérifications CSRF
        self.csrf_client = APIClient(enforce_csrf_checks=True)

    # -------------------------------------------------------------------------
    # 1. Tests d'Authentification & Cookies HttpOnly
    # -------------------------------------------------------------------------

    def test_login_success_sets_httponly_cookies(self):
        """Test de connexion réussie : vérification stricte des attributs des cookies HttpOnly."""
        url = reverse('auth_login')
        data = {
            'email': 'membre@dairatu.sn',
            'password': 'TestPassword123!'
        }
        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['user']['email'], 'membre@dairatu.sn')
        self.assertIn(UserRole.MEMBER, response.data['user']['groups'])

        # Vérification du mode double-authentification (Bearer token + HttpOnly cookies)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertNotIn('access_token', response.data)
        self.assertNotIn('refresh_token', response.data)

        # Vérification des attributs des cookies
        self.assertIn('access_token', response.cookies)
        self.assertIn('refresh_token', response.cookies)
        self.assertTrue(response.cookies['access_token']['httponly'])
        self.assertTrue(response.cookies['refresh_token']['httponly'])
        self.assertEqual(response.cookies['access_token']['samesite'], 'Lax')
        self.assertEqual(response.cookies['refresh_token']['samesite'], 'Lax')
        self.assertEqual(response.cookies['access_token']['path'], '/')
        self.assertEqual(response.cookies['refresh_token']['path'], '/api/v1/auth/')
        self.assertEqual(response.cookies['access_token']['max-age'], 900)
        self.assertEqual(response.cookies['refresh_token']['max-age'], 604800)

    def test_login_invalid_credentials_returns_error(self):
        """Test de connexion échouée avec mauvais mot de passe."""
        url = reverse('auth_login')
        data = {
            'email': 'membre@dairatu.sn',
            'password': 'MauvaisMotDePasse!'
        }
        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])
        self.assertNotIn('access_token', response.cookies)

    def test_me_endpoint_with_cookie_authentication(self):
        """Test de l'endpoint /api/v1/auth/me/ authentifié par cookie HttpOnly."""
        login_res = self.client.post(reverse('auth_login'), {
            'email': 'admin@dairatu.sn',
            'password': 'TestPassword123!'
        }, format='json')
        access_cookie = login_res.cookies['access_token'].value

        self.client.cookies['access_token'] = access_cookie
        me_res = self.client.get(reverse('auth_me'))

        self.assertEqual(me_res.status_code, status.HTTP_200_OK)
        self.assertTrue(me_res.data['success'])
        self.assertEqual(me_res.data['user']['email'], 'admin@dairatu.sn')
        self.assertIn(UserRole.ADMIN, me_res.data['user']['groups'])

    def test_me_endpoint_unauthenticated_returns_401(self):
        """Test de rejet 401 sur /api/v1/auth/me/ en l'absence de cookie/token."""
        self.client.cookies.clear()
        response = self.client.get(reverse('auth_me'))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # -------------------------------------------------------------------------
    # 2. Tests de Protection CSRF Stricte
    # -------------------------------------------------------------------------

    def test_csrf_cookie_jwt_post_without_csrf_forbidden(self):
        """Règle 1 : cookie JWT + POST sans CSRF -> doit être refusé (403)."""
        token = RefreshToken.for_user(self.member_user).access_token
        self.csrf_client.cookies['access_token'] = str(token)

        response = self.csrf_client.post('/api/v1/test-mutating/', {'key': 'val'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('CSRF Failed', str(response.data))

    def test_csrf_cookie_jwt_patch_without_csrf_forbidden(self):
        """Règle 2 : cookie JWT + PATCH sans CSRF -> doit être refusé (403)."""
        token = RefreshToken.for_user(self.member_user).access_token
        self.csrf_client.cookies['access_token'] = str(token)

        response = self.csrf_client.patch('/api/v1/test-mutating/', {'key': 'val'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('CSRF Failed', str(response.data))

    def test_csrf_cookie_jwt_delete_without_csrf_forbidden(self):
        """Règle 3 : cookie JWT + DELETE sans CSRF -> doit être refusé (403)."""
        token = RefreshToken.for_user(self.member_user).access_token
        self.csrf_client.cookies['access_token'] = str(token)

        response = self.csrf_client.delete('/api/v1/test-mutating/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('CSRF Failed', str(response.data))

    def test_csrf_cookie_jwt_mutation_with_valid_csrf_allowed(self):
        """Règle 4 : cookie JWT + mutation avec CSRF valide -> autorisée (200)."""
        token = RefreshToken.for_user(self.member_user).access_token
        self.csrf_client.cookies['access_token'] = str(token)

        # 1. Récupération préalable du cookie et du token CSRF
        csrf_init = self.csrf_client.get(reverse('auth_csrf'))
        csrf_token = csrf_init.data['csrfToken']
        self.csrf_client.cookies['csrftoken'] = csrf_init.cookies['csrftoken'].value

        # 2. Requête mutante POST avec header X-CSRFToken valide
        response = self.csrf_client.post(
            '/api/v1/test-mutating/',
            {'key': 'val'},
            format='json',
            HTTP_X_CSRFTOKEN=csrf_token
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'posted')

    def test_csrf_bearer_jwt_mutation_without_csrf_allowed(self):
        """Règle 5 : Bearer JWT + mutation sans CSRF -> autorisée (200)."""
        token = RefreshToken.for_user(self.member_user).access_token
        self.csrf_client.cookies.clear()

        # Requête avec header Authorization Bearer sans aucun token ni cookie CSRF
        response = self.csrf_client.post(
            '/api/v1/test-mutating/',
            {'key': 'val'},
            format='json',
            HTTP_AUTHORIZATION=f'Bearer {token}'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'posted')

    # -------------------------------------------------------------------------
    # 3. Tests de Rotation et Blacklist des Refresh Tokens
    # -------------------------------------------------------------------------

    def test_refresh_token_rotation_and_blacklist_mechanisms(self):
        """
        Vérifie exhaustivement le cycle de vie du refresh token :
        1. refresh initial -> succès
        2. nouveau refresh -> présent et fonctionnel
        3. ancien refresh réutilisé -> 401
        4. logout -> refresh révoqué
        5. refresh révoqué -> impossible à réutiliser
        """
        # 1. Login initial
        login_res = self.client.post(reverse('auth_login'), {
            'email': 'membre@dairatu.sn',
            'password': 'TestPassword123!'
        }, format='json')
        initial_refresh = login_res.cookies['refresh_token'].value

        # 2. Premier renouvellement (rotation)
        self.client.cookies['refresh_token'] = initial_refresh
        refresh_res = self.client.post(reverse('auth_refresh'))

        self.assertEqual(refresh_res.status_code, status.HTTP_200_OK)
        self.assertTrue(refresh_res.data['success'])
        new_refresh = refresh_res.cookies['refresh_token'].value
        self.assertNotEqual(initial_refresh, new_refresh)

        # 3. Nouveau refresh fonctionnel
        self.client.cookies['refresh_token'] = new_refresh
        second_refresh_res = self.client.post(reverse('auth_refresh'))
        self.assertEqual(second_refresh_res.status_code, status.HTTP_200_OK)
        third_refresh = second_refresh_res.cookies['refresh_token'].value

        # 4. Tentative de réutilisation de l'ancien refresh token initial -> Rejet 401
        self.client.cookies['refresh_token'] = initial_refresh
        replay_initial_res = self.client.post(reverse('auth_refresh'))
        self.assertEqual(replay_initial_res.status_code, status.HTTP_401_UNAUTHORIZED)

        # 5. Tentative de réutilisation du second refresh token après rotation -> Rejet 401
        self.client.cookies['refresh_token'] = new_refresh
        replay_second_res = self.client.post(reverse('auth_refresh'))
        self.assertEqual(replay_second_res.status_code, status.HTTP_401_UNAUTHORIZED)

        # 6. Logout avec le troisième refresh token
        self.client.cookies['refresh_token'] = third_refresh
        logout_res = self.client.post(reverse('auth_logout'))
        self.assertEqual(logout_res.status_code, status.HTTP_200_OK)
        self.assertEqual(logout_res.cookies['access_token'].value, '')
        self.assertEqual(logout_res.cookies['refresh_token'].value, '')

        # 7. Tentative d'utilisation du refresh token après déconnexion -> Rejet 401
        self.client.cookies['refresh_token'] = third_refresh
        replay_revoked_res = self.client.post(reverse('auth_refresh'))
        self.assertEqual(replay_revoked_res.status_code, status.HTTP_401_UNAUTHORIZED)

    # -------------------------------------------------------------------------
    # 4. Tests RBAC & Classes de Permissions
    # -------------------------------------------------------------------------

    def test_rbac_roles_and_hard_delete_permissions(self):
        """
        Vérification stricte de la matrice RBAC et de CanHardDelete :
        - Administrateur normal -> hard delete refusé
        - Membre -> hard delete refusé
        - Super-Administrateur (via groupe) -> hard delete autorisé
        - Super-Administrateur (via is_superuser=True) -> hard delete autorisé
        - Visiteur anonyme -> accès et hard delete refusés
        """
        perm_member = IsMemberUserRole()
        perm_admin = IsAdminUserRole()
        perm_super = IsSuperAdminUser()
        perm_hard_delete = CanHardDelete()

        class DummyRequest:
            def __init__(self, user, method='POST'):
                self.user = user
                self.method = method

        req_anon = DummyRequest(AnonymousUser())
        req_member = DummyRequest(self.member_user)
        req_admin = DummyRequest(self.admin_user)
        req_super_group = DummyRequest(self.superadmin_group_user)
        req_super_flag = DummyRequest(self.superuser_flag_user)

        # 1. Visiteur Anonyme
        self.assertFalse(perm_member.has_permission(req_anon, None))
        self.assertFalse(perm_admin.has_permission(req_anon, None))
        self.assertFalse(perm_super.has_permission(req_anon, None))
        self.assertFalse(perm_hard_delete.has_permission(req_anon, None))

        # 2. Membre normal
        self.assertTrue(perm_member.has_permission(req_member, None))
        self.assertFalse(perm_admin.has_permission(req_member, None))
        self.assertFalse(perm_super.has_permission(req_member, None))
        self.assertFalse(perm_hard_delete.has_permission(req_member, None))

        # 3. Administrateur normal
        self.assertTrue(perm_member.has_permission(req_admin, None))
        self.assertTrue(perm_admin.has_permission(req_admin, None))
        self.assertFalse(perm_super.has_permission(req_admin, None))
        self.assertFalse(perm_hard_delete.has_permission(req_admin, None))

        # 4. Super-Administrateur via groupe 'Super-Administrateurs' (is_superuser=False)
        self.assertTrue(perm_member.has_permission(req_super_group, None))
        self.assertTrue(perm_admin.has_permission(req_super_group, None))
        self.assertTrue(perm_super.has_permission(req_super_group, None))
        self.assertTrue(perm_hard_delete.has_permission(req_super_group, None))

        # 5. Super-Administrateur via is_superuser=True
        self.assertTrue(perm_member.has_permission(req_super_flag, None))
        self.assertTrue(perm_admin.has_permission(req_super_flag, None))
        self.assertTrue(perm_super.has_permission(req_super_flag, None))
        self.assertTrue(perm_hard_delete.has_permission(req_super_flag, None))
