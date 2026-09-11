from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from common.constants import UserRole
from apps.members.models import Member, GenderChoices, SituationChoices, MemberStatusChoices, VisibilityChoices
from apps.audit.models import AuditLog, AuditActionChoices

User = get_user_model()


class DashboardAPITestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.member_group = Group.objects.get_or_create(name=UserRole.MEMBER)[0]
        cls.admin_group = Group.objects.get_or_create(name=UserRole.ADMIN)[0]

        # User Member
        cls.user_member = User.objects.create_user(
            email='member.dash@dahira.sn',
            password='TestPassword123!',
            first_name='Modou',
            last_name='Fall',
            is_active=True
        )
        cls.user_member.groups.add(cls.member_group)

        # Membre actif 1 (étudiant)
        cls.member_1 = Member.objects.create(
            user=cls.user_member,
            first_name='Modou',
            last_name='Fall',
            gender=GenderChoices.MALE,
            situation=SituationChoices.STUDENT,
            status=MemberStatusChoices.ACTIVE
        )

        # Membre actif 2 (salarié)
        cls.member_2 = Member.objects.create(
            first_name='Awa',
            last_name='Thiam',
            gender=GenderChoices.FEMALE,
            situation=SituationChoices.EMPLOYEE,
            status=MemberStatusChoices.ACTIVE
        )

        # Membre archivé (soft deleted)
        cls.member_deleted = Member.all_objects.create(
            first_name='Ancien',
            last_name='Membre',
            gender=GenderChoices.MALE,
            situation=SituationChoices.RETIRED,
            status=MemberStatusChoices.INACTIVE,
            is_deleted=True
        )

        # User Admin
        cls.user_admin = User.objects.create_user(
            email='admin.dash@dahira.sn',
            password='TestPassword123!',
            first_name='Admin',
            last_name='Dahirah',
            is_active=True
        )
        cls.user_admin.groups.add(cls.admin_group)

        # Audit log
        AuditLog.objects.create(
            user=cls.user_admin,
            action=AuditActionChoices.CREATE,
            entity='Member',
            entity_id=str(cls.member_1.id)
        )

    def setUp(self):
        self.client = APIClient()

    def test_anonymous_cannot_access_dashboard(self):
        """Un utilisateur anonyme ne peut pas accéder aux métriques du tableau de bord."""
        res = self.client.get('/api/v1/dashboard/stats/')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_member_receives_community_metrics(self):
        """Un membre accède aux métriques d'ensemble sans les champs sensibles d'administration."""
        self.client.force_authenticate(user=self.user_member)
        res = self.client.get('/api/v1/dashboard/stats/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.data['data']

        self.assertEqual(data['metrics']['total_active_members'], 2)
        self.assertEqual(data['metrics']['total_students'], 1)
        self.assertEqual(data['metrics']['total_professionals'], 1)
        self.assertNotIn('total_archived_members', data['metrics'])
        self.assertNotIn('recent_audit_logs', data)

    def test_admin_receives_full_metrics_and_audit(self):
        """Un administrateur accède à l'ensemble complet incluant les archives et logs récents."""
        self.client.force_authenticate(user=self.user_admin)
        res = self.client.get('/api/v1/dashboard/stats/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.data['data']

        self.assertEqual(data['metrics']['total_active_members'], 2)
        self.assertEqual(data['metrics']['total_archived_members'], 1)
        self.assertIn('recent_audit_logs', data)
        self.assertGreaterEqual(len(data['recent_audit_logs']), 1)
