from django.contrib.auth.models import Group
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import CustomUser
from apps.audit.models import AuditActionChoices, AuditLog
from apps.members.models import Member, GenderChoices, SituationChoices
from common.constants import UserRole


class UserManagementTests(APITestCase):
    """
    Tests exhaustifs du CRUD d'administration des comptes utilisateurs (/api/v1/auth/users/).
    Vérifie l'étanchéité RBAC, la traçabilité d'audit et la dissociation stricte Membre ≠ Utilisateur.
    """

    def setUp(self):
        # 1. Groupes RBAC
        self.group_members, _ = Group.objects.get_or_create(name=UserRole.MEMBER)
        self.group_admins, _ = Group.objects.get_or_create(name=UserRole.ADMIN)
        self.group_superadmins, _ = Group.objects.get_or_create(name=UserRole.SUPERADMIN)

        # 2. Utilisateur SuperAdmin
        self.superadmin = CustomUser.objects.create_superuser(
            email='superadmin@dairatu.sn',
            password='TestPassword123!',
            first_name='Super',
            last_name='Admin'
        )
        self.superadmin.groups.add(self.group_superadmins)

        # 3. Utilisateur Admin
        self.admin = CustomUser.objects.create_user(
            email='admin@dairatu.sn',
            password='TestPassword123!',
            first_name='Simple',
            last_name='Admin',
            is_staff=True
        )
        self.admin.groups.add(self.group_admins)

        # 4. Utilisateur Membre standard
        self.member_user = CustomUser.objects.create_user(
            email='membre@dairatu.sn',
            password='TestPassword123!',
            first_name='Moussa',
            last_name='Diop'
        )
        self.member_user.groups.add(self.group_members)

        # 5. Membre de test
        self.test_member = Member.objects.create(
            matricule='DM-2026-0099',
            first_name='Ousmane',
            last_name='Ndiaye',
            gender=GenderChoices.MALE,
            situation=SituationChoices.STUDENT
        )

        self.list_url = reverse('users-list')

    def test_anonymous_and_member_access_denied(self):
        """Un utilisateur anonyme ou membre ordinaire ne peut pas accéder à /users/."""
        # Anonyme -> 401
        res = self.client.get(self.list_url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

        # Membre -> 403
        self.client.force_authenticate(user=self.member_user)
        res = self.client.get(self.list_url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_list_users(self):
        """Un administrateur peut lister les utilisateurs."""
        self.client.force_authenticate(user=self.admin)
        res = self.client.get(self.list_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # DRF DefaultRouter peut paginer ou renvoyer un array direct
        data = res.data.get('results', res.data) if isinstance(res.data, dict) else res.data
        self.assertTrue(len(data) >= 3)

    def test_admin_can_create_member_user_and_attach_member(self):
        """Un admin peut créer un utilisateur membre et le lier à une fiche existante."""
        self.client.force_authenticate(user=self.admin)
        payload = {
            'email': 'nouveau@dairatu.sn',
            'password': 'NouveauPassword123!',
            'first_name': 'Amadou',
            'last_name': 'Sy',
            'role': 'member',
            'member_id': str(self.test_member.id)
        }
        res = self.client.post(self.list_url, data=payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        new_user = CustomUser.objects.get(email='nouveau@dairatu.sn')
        self.test_member.refresh_from_db()
        self.assertEqual(self.test_member.user, new_user)

        # Vérification de l'audit log
        audit_entry = AuditLog.objects.filter(entity='User', entity_id=str(new_user.id), action=AuditActionChoices.CREATE).first()
        self.assertIsNotNone(audit_entry)
        self.assertEqual(audit_entry.user, self.admin)

    def test_admin_cannot_promote_to_superadmin(self):
        """Un simple administrateur ne peut JAMAIS créer ou promouvoir un superadmin."""
        self.client.force_authenticate(user=self.admin)
        payload = {
            'email': 'fake_super@dairatu.sn',
            'password': 'Password123!',
            'role': 'superadmin'
        }
        res = self.client.post(self.list_url, data=payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_superadmin_can_create_superadmin(self):
        """Un superadmin a le pouvoir d'élever un autre compte au rang de superadmin."""
        self.client.force_authenticate(user=self.superadmin)
        payload = {
            'email': 'second_super@dairatu.sn',
            'password': 'Password123!',
            'role': 'superadmin'
        }
        res = self.client.post(self.list_url, data=payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        new_super = CustomUser.objects.get(email='second_super@dairatu.sn')
        self.assertTrue(new_super.is_superuser)

    def test_update_and_detach_member(self):
        """Mise à jour d'un compte utilisateur et détachement de la fiche membre."""
        self.test_member.user = self.member_user
        self.test_member.save()

        self.client.force_authenticate(user=self.admin)
        detail_url = reverse('users-detail', kwargs={'pk': self.member_user.id})

        # Détacher le membre en envoyant member_id=None
        res = self.client.patch(detail_url, data={'member_id': None}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        self.test_member.refresh_from_db()
        self.assertIsNone(self.test_member.user)

    def test_delete_user_never_deletes_member(self):
        """INVARIANT CRITIQUE : Supprimer un compte utilisateur ne supprime JAMAIS le membre associé !"""
        self.test_member.user = self.member_user
        self.test_member.save()

        member_id = self.test_member.id
        self.client.force_authenticate(user=self.admin)
        detail_url = reverse('users-detail', kwargs={'pk': self.member_user.id})

        res = self.client.delete(detail_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # L'utilisateur est supprimé
        self.assertFalse(CustomUser.objects.filter(id=self.member_user.id).exists())

        # Le membre EXISTE TOUJOURS intact
        self.assertTrue(Member.objects.filter(id=member_id).exists())
        reloaded_member = Member.objects.get(id=member_id)
        self.assertIsNone(reloaded_member.user)

    def test_cannot_delete_self(self):
        """Un administrateur ne peut pas supprimer son propre compte."""
        self.client.force_authenticate(user=self.admin)
        detail_url = reverse('users-detail', kwargs={'pk': self.admin.id})
        res = self.client.delete(detail_url)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reset_password(self):
        """Réinitialisation du mot de passe avec audit."""
        self.client.force_authenticate(user=self.admin)
        reset_url = reverse('users-reset-password', kwargs={'pk': self.member_user.id})
        res = self.client.post(reset_url, data={'new_password': 'BrandNewPassword123!'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # L'utilisateur peut se connecter avec le nouveau mot de passe
        login_res = self.client.post(reverse('auth_login'), {
            'email': self.member_user.email,
            'password': 'BrandNewPassword123!'
        })
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
