from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from common.constants import UserRole
from apps.members.models import Member, GenderChoices, SituationChoices, MemberStatusChoices, VisibilityChoices
from apps.education.models import Education, EducationLevelChoices, EducationStatusChoices
from apps.audit.models import AuditLog, AuditActionChoices

User = get_user_model()


class EducationAPITestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.member_group = Group.objects.get_or_create(name=UserRole.MEMBER)[0]
        cls.admin_group = Group.objects.get_or_create(name=UserRole.ADMIN)[0]

        # User A & Member A
        cls.user_a = User.objects.create_user(
            email='moussa.edu@dahira.sn',
            password='TestPassword123!',
            first_name='Moussa',
            last_name='Ba',
            is_active=True
        )
        cls.user_a.groups.add(cls.member_group)
        cls.member_a = Member.objects.create(
            user=cls.user_a,
            first_name='Moussa',
            last_name='Ba',
            gender=GenderChoices.MALE,
            situation=SituationChoices.STUDENT,
            status=MemberStatusChoices.ACTIVE,
            visibility_level=VisibilityChoices.INTERNAL
        )

        # User B & Member B
        cls.user_b = User.objects.create_user(
            email='fatou.edu@dahira.sn',
            password='TestPassword123!',
            first_name='Fatou',
            last_name='Kane',
            is_active=True
        )
        cls.user_b.groups.add(cls.member_group)
        cls.member_b = Member.objects.create(
            user=cls.user_b,
            first_name='Fatou',
            last_name='Kane',
            gender=GenderChoices.FEMALE,
            situation=SituationChoices.STUDENT,
            status=MemberStatusChoices.ACTIVE,
            visibility_level=VisibilityChoices.INTERNAL
        )

        # Education pour B
        cls.edu_b = Education.objects.create(
            member=cls.member_b,
            institution='UCAD',
            field='Informatique',
            level=EducationLevelChoices.LICENCE_3,
            status=EducationStatusChoices.COMPLETED,
            start_year=2021,
            end_year=2024
        )

    def setUp(self):
        self.client = APIClient()

    def test_anonymous_cannot_access_education(self):
        """Un utilisateur non authentifié ne peut pas accéder aux formations."""
        res = self.client.get('/api/v1/education/')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_member_can_list_and_filter_education(self):
        """Un membre peut lister les formations des membres visibles et les filtrer."""
        self.client.force_authenticate(user=self.user_a)
        res = self.client.get('/api/v1/education/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(res.data['count'], 1)

        # Filtre par niveau
        res_filter = self.client.get(f'/api/v1/education/?level={EducationLevelChoices.LICENCE_3}')
        self.assertEqual(res_filter.status_code, status.HTTP_200_OK)
        self.assertEqual(res_filter.data['count'], 1)

    def test_member_cannot_create_education_for_another_member(self):
        """Un membre ne peut pas ajouter une formation au dossier d'un autre membre."""
        self.client.force_authenticate(user=self.user_a)
        payload = {
            'member': str(self.member_b.id),
            'institution': 'ESP',
            'field': 'Génie Logiciel',
            'level': EducationLevelChoices.MASTER_1,
            'start_year': 2024
        }
        res = self.client.post('/api/v1/education/', payload)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_member_can_create_own_education(self):
        """Un membre peut créer une formation sur son propre profil."""
        self.client.force_authenticate(user=self.user_a)
        payload = {
            'member': str(self.member_a.id),
            'institution': 'UGB',
            'field': 'Mathématiques Appliquées',
            'level': EducationLevelChoices.LICENCE_2,
            'status': EducationStatusChoices.IN_PROGRESS,
            'start_year': 2023
        }
        res = self.client.post('/api/v1/education/', payload)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res.data['success'])
        edu_id = res.data['data']['id']

        # Vérification audit log
        audit = AuditLog.objects.filter(entity='Education', entity_id=edu_id).first()
        self.assertIsNotNone(audit)
        self.assertEqual(audit.action, AuditActionChoices.CREATE)

    def test_education_year_validation(self):
        """L'année de fin ne peut pas précéder l'année de début."""
        self.client.force_authenticate(user=self.user_a)
        payload = {
            'member': str(self.member_a.id),
            'institution': 'UGB',
            'field': 'Physique',
            'level': EducationLevelChoices.LICENCE_1,
            'start_year': 2024,
            'end_year': 2020  # Invalide
        }
        res = self.client.post('/api/v1/education/', payload)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('end_year', str(res.data))

    def test_member_cannot_modify_or_delete_other_member_education(self):
        """Un membre ne peut pas modifier ou supprimer la formation d'un autre membre."""
        self.client.force_authenticate(user=self.user_a)
        # Update
        res_up = self.client.patch(f'/api/v1/education/{self.edu_b.id}/', {'institution': 'Infiltrator'})
        self.assertEqual(res_up.status_code, status.HTTP_403_FORBIDDEN)

        # Delete
        res_del = self.client.delete(f'/api/v1/education/{self.edu_b.id}/')
        self.assertEqual(res_del.status_code, status.HTTP_403_FORBIDDEN)

    def test_member_can_update_and_delete_own_education(self):
        """Un membre peut modifier et supprimer sa propre formation."""
        own_edu = Education.objects.create(
            member=self.member_a,
            institution='CESAG',
            field='Gestion',
            level=EducationLevelChoices.LICENCE_1,
            start_year=2022
        )
        self.client.force_authenticate(user=self.user_a)
        # Update
        res_up = self.client.patch(f'/api/v1/education/{own_edu.id}/', {'level': EducationLevelChoices.LICENCE_2})
        self.assertEqual(res_up.status_code, status.HTTP_200_OK)
        own_edu.refresh_from_db()
        self.assertEqual(own_edu.level, EducationLevelChoices.LICENCE_2)

        # Delete
        res_del = self.client.delete(f'/api/v1/education/{own_edu.id}/')
        self.assertEqual(res_del.status_code, status.HTTP_200_OK)
        self.assertFalse(Education.objects.filter(id=own_edu.id).exists())
