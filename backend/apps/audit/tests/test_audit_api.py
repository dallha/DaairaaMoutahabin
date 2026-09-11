from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from common.constants import UserRole
from apps.audit.models import AuditLog, AuditActionChoices

User = get_user_model()


class AuditAPITestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.member_group = Group.objects.get_or_create(name=UserRole.MEMBER)[0]
        cls.admin_group = Group.objects.get_or_create(name=UserRole.ADMIN)[0]

        # User Member
        cls.user_member = User.objects.create_user(
            email='member.aud@dahira.sn',
            password='TestPassword123!',
            first_name='Audit',
            last_name='Member',
            is_active=True
        )
        cls.user_member.groups.add(cls.member_group)

        # User Admin
        cls.user_admin = User.objects.create_user(
            email='admin.aud@dahira.sn',
            password='TestPassword123!',
            first_name='Audit',
            last_name='Admin',
            is_active=True
        )
        cls.user_admin.groups.add(cls.admin_group)

        # Création de quelques logs
        cls.log_1 = AuditLog.objects.create(
            user=cls.user_admin,
            action=AuditActionChoices.CREATE,
            entity='Member',
            entity_id='uuid-test-123',
            new_values={'first_name': 'Moussa'}
        )
        cls.log_2 = AuditLog.objects.create(
            user=cls.user_admin,
            action=AuditActionChoices.HARD_DELETE,
            entity='Member',
            entity_id='uuid-test-456',
            old_values={'matricule': 'DM-2026-0001'}
        )

    def setUp(self):
        self.client = APIClient()

    def test_anonymous_cannot_access_audit(self):
        """Un utilisateur non authentifié reçoit 401."""
        res = self.client.get('/api/v1/audit/')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_member_cannot_access_audit(self):
        """Un membre normal reçoit 403 Forbidden."""
        self.client.force_authenticate(user=self.user_member)
        res = self.client.get('/api/v1/audit/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_list_and_filter_audit_logs(self):
        """Un administrateur peut lister les journaux d'audit et filtrer par action."""
        self.client.force_authenticate(user=self.user_admin)
        res = self.client.get('/api/v1/audit/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(res.data['count'], 2)

        # Filtre sur HARD_DELETE
        res_filter = self.client.get(f'/api/v1/audit/?action={AuditActionChoices.HARD_DELETE}')
        self.assertEqual(res_filter.status_code, status.HTTP_200_OK)
        self.assertEqual(res_filter.data['count'], 1)
        self.assertEqual(res_filter.data['results'][0]['entity_id'], 'uuid-test-456')

    def test_audit_is_strictly_read_only(self):
        """Les logs d'audit sont immuables : interdiction de POST, PUT, DELETE (405)."""
        self.client.force_authenticate(user=self.user_admin)
        res_post = self.client.post('/api/v1/audit/', {'action': 'HACK'})
        self.assertEqual(res_post.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

        res_del = self.client.delete(f'/api/v1/audit/{self.log_1.id}/')
        self.assertEqual(res_del.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
