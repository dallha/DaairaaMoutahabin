from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from common.constants import UserRole
from apps.members.models import Member, GenderChoices, SituationChoices, MemberStatusChoices, VisibilityChoices
from apps.roles.models import Role, MemberRole, RoleCategoryChoices
from apps.audit.models import AuditLog, AuditActionChoices

User = get_user_model()


class RolesAPITestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.member_group = Group.objects.get_or_create(name=UserRole.MEMBER)[0]
        cls.admin_group = Group.objects.get_or_create(name=UserRole.ADMIN)[0]

        # User A & Member A
        cls.user_a = User.objects.create_user(
            email='moussa.role@dahira.sn',
            password='TestPassword123!',
            first_name='Moussa',
            last_name='Gueye',
            is_active=True
        )
        cls.user_a.groups.add(cls.member_group)
        cls.member_a = Member.objects.create(
            user=cls.user_a,
            first_name='Moussa',
            last_name='Gueye',
            gender=GenderChoices.MALE,
            situation=SituationChoices.EMPLOYEE,
            status=MemberStatusChoices.ACTIVE,
            visibility_level=VisibilityChoices.INTERNAL
        )

        # Admin
        cls.user_admin = User.objects.create_user(
            email='admin.role@dahira.sn',
            password='TestPassword123!',
            first_name='Amadou',
            last_name='Cisse',
            is_active=True
        )
        cls.user_admin.groups.add(cls.admin_group)

        # Rôle Zakir
        cls.role_zakir = Role.objects.create(
            code='ZAKIR',
            name='Zakir (Chantre spirituel)',
            category=RoleCategoryChoices.SPIRITUAL,
            rank=10
        )

        # Rôle Président
        cls.role_president = Role.objects.create(
            code='PRESIDENT',
            name='Président de la Dahirah',
            category=RoleCategoryChoices.EXECUTIVE,
            rank=1
        )

        # Assignation existante
        cls.assignment = MemberRole.objects.create(
            member=cls.member_a,
            role=cls.role_zakir,
            is_current=True
        )

    def setUp(self):
        self.client = APIClient()

    def test_anonymous_cannot_access_roles(self):
        """Un utilisateur non authentifié ne peut pas accéder aux rôles."""
        res = self.client.get('/api/v1/roles/')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_member_can_list_roles_and_assignments(self):
        """Un membre authentifié peut voir le référentiel des rôles et l'organigramme."""
        self.client.force_authenticate(user=self.user_a)
        res_roles = self.client.get('/api/v1/roles/')
        self.assertEqual(res_roles.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(res_roles.data['count'], 2)

        res_assignments = self.client.get('/api/v1/roles/assignments/')
        self.assertEqual(res_assignments.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(res_assignments.data['count'], 1)

    def test_member_cannot_create_role(self):
        """Un membre régulier ne peut pas créer un nouveau rôle dans le référentiel."""
        self.client.force_authenticate(user=self.user_a)
        res = self.client.post('/api/v1/roles/', {
            'code': 'TRESORIER',
            'name': 'Trésorier Général',
            'category': RoleCategoryChoices.EXECUTIVE
        })
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create_role(self):
        """Un administrateur peut créer un nouveau rôle dans le référentiel."""
        self.client.force_authenticate(user=self.user_admin)
        res = self.client.post('/api/v1/roles/', {
            'code': 'TRESORIER',
            'name': 'Trésorier Général',
            'category': RoleCategoryChoices.EXECUTIVE,
            'rank': 5
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['code'], 'TRESORIER')

    def test_member_cannot_assign_role(self):
        """Un membre ne peut pas s'auto-attribuer ou attribuer un rôle Dahirah (réservé admin)."""
        self.client.force_authenticate(user=self.user_a)
        res = self.client.post('/api/v1/roles/assignments/', {
            'member': str(self.member_a.id),
            'role': str(self.role_president.id),
            'is_current': True
        })
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_assign_update_and_delete_role(self):
        """L'administrateur peut nommer un membre à une fonction, mettre à jour son mandat et le supprimer."""
        self.client.force_authenticate(user=self.user_admin)
        # Création
        res_create = self.client.post('/api/v1/roles/assignments/', {
            'member': str(self.member_a.id),
            'role': str(self.role_president.id),
            'is_current': True,
            'notes': 'Élection AG 2026'
        })
        self.assertEqual(res_create.status_code, status.HTTP_201_CREATED)
        assignment_id = res_create.data['data']['id']

        # Audit check
        audit = AuditLog.objects.filter(entity='MemberRole', entity_id=assignment_id).first()
        self.assertIsNotNone(audit)
        self.assertEqual(audit.action, AuditActionChoices.CREATE)

        # Mise à jour
        res_update = self.client.patch(f'/api/v1/roles/assignments/{assignment_id}/', {
            'is_current': False,
            'notes': 'Fin de mandat'
        })
        self.assertEqual(res_update.status_code, status.HTTP_200_OK)

        # Suppression
        res_del = self.client.delete(f'/api/v1/roles/assignments/{assignment_id}/')
        self.assertEqual(res_del.status_code, status.HTTP_200_OK)
        self.assertFalse(MemberRole.objects.filter(id=assignment_id).exists())
