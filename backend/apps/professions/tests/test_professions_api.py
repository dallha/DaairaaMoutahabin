from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from common.constants import UserRole
from apps.members.models import Member, GenderChoices, SituationChoices, MemberStatusChoices, VisibilityChoices
from apps.professions.models import ProfessionCategory, Profession, MemberProfession
from apps.audit.models import AuditLog, AuditActionChoices

User = get_user_model()


class ProfessionsAPITestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.member_group = Group.objects.get_or_create(name=UserRole.MEMBER)[0]
        cls.admin_group = Group.objects.get_or_create(name=UserRole.ADMIN)[0]

        # User A & Member A
        cls.user_a = User.objects.create_user(
            email='moussa.prof@dahira.sn',
            password='TestPassword123!',
            first_name='Moussa',
            last_name='Sall',
            is_active=True
        )
        cls.user_a.groups.add(cls.member_group)
        cls.member_a = Member.objects.create(
            user=cls.user_a,
            first_name='Moussa',
            last_name='Sall',
            gender=GenderChoices.MALE,
            situation=SituationChoices.EMPLOYEE,
            status=MemberStatusChoices.ACTIVE,
            visibility_level=VisibilityChoices.INTERNAL
        )

        # User B & Member B
        cls.user_b = User.objects.create_user(
            email='fatou.prof@dahira.sn',
            password='TestPassword123!',
            first_name='Fatou',
            last_name='Ndiaye',
            is_active=True
        )
        cls.user_b.groups.add(cls.member_group)
        cls.member_b = Member.objects.create(
            user=cls.user_b,
            first_name='Fatou',
            last_name='Ndiaye',
            gender=GenderChoices.FEMALE,
            situation=SituationChoices.EMPLOYEE,
            status=MemberStatusChoices.ACTIVE,
            visibility_level=VisibilityChoices.INTERNAL
        )

        # Admin
        cls.user_admin = User.objects.create_user(
            email='admin.prof@dahira.sn',
            password='TestPassword123!',
            first_name='Amadou',
            last_name='Diallo',
            is_active=True
        )
        cls.user_admin.groups.add(cls.admin_group)

        # Catégorie & Profession de test
        cls.category = ProfessionCategory.objects.create(name='Technologies de l Information', display_order=1)
        cls.profession = Profession.objects.create(
            category=cls.category,
            name='Ingénieur Logiciel',
            description='Conception et développement d applications'
        )

        # MemberProfession pour B
        cls.member_b_prof = MemberProfession.objects.create(
            member=cls.member_b,
            profession=cls.profession,
            title='Tech Lead',
            organization='Orange',
            is_primary=True,
            is_current=True
        )

    def setUp(self):
        self.client = APIClient()

    def test_anonymous_cannot_access_professions(self):
        """Un utilisateur anonyme ne peut pas accéder aux professions."""
        response = self.client.get('/api/v1/professions/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_member_can_list_categories_and_professions(self):
        """Un membre authentifié peut lister les catégories et les professions."""
        self.client.force_authenticate(user=self.user_a)
        res_cat = self.client.get('/api/v1/professions/categories/')
        self.assertEqual(res_cat.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(res_cat.data['count'], 1)

        res_prof = self.client.get('/api/v1/professions/')
        self.assertEqual(res_prof.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(res_prof.data['count'], 1)

    def test_member_cannot_create_category_or_profession(self):
        """Un membre régulier ne peut pas créer de catégorie ou de profession."""
        self.client.force_authenticate(user=self.user_a)
        res_cat = self.client.post('/api/v1/professions/categories/', {'name': 'Santé'})
        self.assertEqual(res_cat.status_code, status.HTTP_403_FORBIDDEN)

        res_prof = self.client.post('/api/v1/professions/', {
            'category': str(self.category.id),
            'name': 'Médecin Généraliste'
        })
        self.assertEqual(res_prof.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create_category_and_profession(self):
        """Un administrateur peut créer une catégorie et une profession."""
        self.client.force_authenticate(user=self.user_admin)
        res_cat = self.client.post('/api/v1/professions/categories/', {'name': 'Santé', 'display_order': 2})
        self.assertEqual(res_cat.status_code, status.HTTP_201_CREATED)

        res_prof = self.client.post('/api/v1/professions/', {
            'category': res_cat.data['id'],
            'name': 'Médecin Généraliste'
        })
        self.assertEqual(res_prof.status_code, status.HTTP_201_CREATED)

    def test_member_cannot_associate_profession_to_another_member(self):
        """Un membre ne peut pas associer un métier au profil d'un autre membre."""
        self.client.force_authenticate(user=self.user_a)
        payload = {
            'member': str(self.member_b.id),
            'profession': str(self.profession.id),
            'title': 'Consultant',
            'organization': 'Free'
        }
        res = self.client.post('/api/v1/professions/member-professions/', payload)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_member_can_associate_profession_to_own_profile(self):
        """Un membre peut associer un métier à son propre profil."""
        self.client.force_authenticate(user=self.user_a)
        payload = {
            'member': str(self.member_a.id),
            'profession': str(self.profession.id),
            'title': 'Architecte Cloud',
            'organization': 'Google',
            'is_primary': True,
            'is_current': True
        }
        res = self.client.post('/api/v1/professions/member-professions/', payload)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res.data['success'])
        m_prof_id = res.data['data']['id']

        # Vérification audit log
        audit = AuditLog.objects.filter(entity='MemberProfession', entity_id=m_prof_id).first()
        self.assertIsNotNone(audit)
        self.assertEqual(audit.action, AuditActionChoices.CREATE)

    def test_member_cannot_modify_or_delete_other_member_profession(self):
        """Un membre ne peut ni modifier ni supprimer le métier d'un autre membre."""
        self.client.force_authenticate(user=self.user_a)
        # Update
        res_up = self.client.patch(f'/api/v1/professions/member-professions/{self.member_b_prof.id}/', {
            'title': 'Hacker'
        })
        self.assertEqual(res_up.status_code, status.HTTP_403_FORBIDDEN)

        # Delete
        res_del = self.client.delete(f'/api/v1/professions/member-professions/{self.member_b_prof.id}/')
        self.assertEqual(res_del.status_code, status.HTTP_403_FORBIDDEN)

    def test_member_can_update_and_delete_own_profession(self):
        """Le membre peut modifier et supprimer son propre enregistrement."""
        own_prof = MemberProfession.objects.create(
            member=self.member_a,
            profession=self.profession,
            title='Junior Dev',
            organization='Startup',
            is_primary=False,
            is_current=False
        )
        self.client.force_authenticate(user=self.user_a)
        # Modification
        res_up = self.client.patch(f'/api/v1/professions/member-professions/{own_prof.id}/', {
            'title': 'Senior Dev'
        })
        self.assertEqual(res_up.status_code, status.HTTP_200_OK)
        own_prof.refresh_from_db()
        self.assertEqual(own_prof.title, 'Senior Dev')

        # Suppression
        res_del = self.client.delete(f'/api/v1/professions/member-professions/{own_prof.id}/')
        self.assertEqual(res_del.status_code, status.HTTP_200_OK)
        self.assertFalse(MemberProfession.objects.filter(id=own_prof.id).exists())
