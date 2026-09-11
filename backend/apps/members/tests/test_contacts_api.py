import uuid
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from common.constants import UserRole
from apps.members.models import Member, Contact, GenderChoices, SituationChoices, MemberStatusChoices, VisibilityChoices
from apps.audit.models import AuditLog, AuditActionChoices

User = get_user_model()


class ContactsAPITestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        # Création des groupes RBAC
        cls.member_group = Group.objects.get_or_create(name=UserRole.MEMBER)[0]
        cls.admin_group = Group.objects.get_or_create(name=UserRole.ADMIN)[0]
        cls.superadmin_group = Group.objects.get_or_create(name=UserRole.SUPERADMIN)[0]

        # Utilisateur 1 : Membre standard A
        cls.user_a = User.objects.create_user(
            email='member.a@dahira.sn',
            password='TestPassword123!',
            first_name='Moussa',
            last_name='Diop',
            is_active=True
        )
        cls.user_a.groups.add(cls.member_group)

        # Membre A
        cls.member_a = Member.objects.create(
            user=cls.user_a,
            first_name='Moussa',
            last_name='Diop',
            gender=GenderChoices.MALE,
            situation=SituationChoices.EMPLOYEE,
            status=MemberStatusChoices.ACTIVE,
            visibility_level=VisibilityChoices.INTERNAL
        )
        # Contact A (téléphone masqué par défaut)
        cls.contact_a = Contact.objects.create(
            member=cls.member_a,
            phone='+221771111111',
            phone_visible_to_members=False,
            email='moussa@dahira.sn',
            city='Dakar',
            is_primary=True
        )

        # Utilisateur 2 : Membre standard B
        cls.user_b = User.objects.create_user(
            email='member.b@dahira.sn',
            password='TestPassword123!',
            first_name='Fatou',
            last_name='Sow',
            is_active=True
        )
        cls.user_b.groups.add(cls.member_group)

        # Membre B (avec téléphone consenti)
        cls.member_b = Member.objects.create(
            user=cls.user_b,
            first_name='Fatou',
            last_name='Sow',
            gender=GenderChoices.FEMALE,
            situation=SituationChoices.STUDENT,
            status=MemberStatusChoices.ACTIVE,
            visibility_level=VisibilityChoices.INTERNAL
        )
        cls.contact_b = Contact.objects.create(
            member=cls.member_b,
            phone='+221772222222',
            phone_visible_to_members=True,
            email='fatou@dahira.sn',
            city='Saint-Louis',
            is_primary=True
        )

        # Utilisateur Admin
        cls.user_admin = User.objects.create_user(
            email='admin@dahira.sn',
            password='TestPassword123!',
            first_name='Amadou',
            last_name='Ndiaye',
            is_active=True
        )
        cls.user_admin.groups.add(cls.admin_group)

    def setUp(self):
        self.client = APIClient()

    def test_anonymous_cannot_access_contacts(self):
        """Un utilisateur non authentifié ne peut pas accéder à /api/v1/contacts/."""
        response = self.client.get('/api/v1/contacts/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_member_views_contacts_with_phone_privacy(self):
        """
        Un membre connecté :
        - voit son propre numéro même si phone_visible_to_members=False
        - ne voit PAS le numéro d'un tiers si phone_visible_to_members=False (reçoit None)
        - voit le numéro d'un tiers si phone_visible_to_members=True
        """
        self.client.force_authenticate(user=self.user_a)
        response = self.client.get('/api/v1/contacts/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', [])
        self.assertGreaterEqual(len(results), 2)

        contact_a_data = next((c for c in results if c['id'] == str(self.contact_a.id)), None)
        contact_b_data = next((c for c in results if c['id'] == str(self.contact_b.id)), None)

        self.assertIsNotNone(contact_a_data)
        self.assertIsNotNone(contact_b_data)

        # Propre contact de A -> visible
        self.assertEqual(contact_a_data['phone'], '+221771111111')
        # Contact de B avec consentement -> visible
        self.assertEqual(contact_b_data['phone'], '+221772222222')

        # Maintenant, vérifions depuis l'utilisateur B
        self.client.force_authenticate(user=self.user_b)
        response_b = self.client.get('/api/v1/contacts/')
        results_b = response_b.data.get('results', [])
        contact_a_seen_by_b = next((c for c in results_b if c['id'] == str(self.contact_a.id)), None)
        # B ne doit PAS voir le numéro de A car phone_visible_to_members=False
        self.assertIsNone(contact_a_seen_by_b['phone'])

    def test_admin_views_all_phones_regardless_of_consent(self):
        """Un administrateur voit tous les numéros en clair sans restriction."""
        self.client.force_authenticate(user=self.user_admin)
        response = self.client.get('/api/v1/contacts/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', [])
        contact_a_data = next((c for c in results if c['id'] == str(self.contact_a.id)), None)
        self.assertEqual(contact_a_data['phone'], '+221771111111')

    def test_member_cannot_create_contact_for_another_member(self):
        """Un membre standard ne peut pas créer un contact rattaché à un autre membre."""
        self.client.force_authenticate(user=self.user_a)
        payload = {
            'member': str(self.member_b.id),
            'phone': '773333333',
            'city': 'Thiès'
        }
        response = self.client.post('/api/v1/contacts/', payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_member_can_create_own_contact_and_normalizes_e164(self):
        """Un membre peut créer un contact secondaire pour son propre profil avec normalisation E.164."""
        self.client.force_authenticate(user=self.user_a)
        payload = {
            'member': str(self.member_a.id),
            'phone': '774444444',
            'phone_visible_to_members': False,
            'city': 'Dakar',
            'is_primary': False
        }
        response = self.client.post('/api/v1/contacts/', payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['success'])
        contact_data = response.data['data']
        self.assertEqual(contact_data['phone'], '+221774444444')
        self.assertFalse(contact_data['is_primary'])

        # Vérification de l'audit log
        audit_entry = AuditLog.objects.filter(entity='Contact', entity_id=contact_data['id']).first()
        self.assertIsNotNone(audit_entry)
        self.assertEqual(audit_entry.action, AuditActionChoices.CREATE)

    def test_member_cannot_update_or_delete_other_member_contact(self):
        """Un membre ne peut ni modifier ni supprimer le contact d'un autre membre."""
        self.client.force_authenticate(user=self.user_a)
        # Tentative d'update sur le contact de B
        response_update = self.client.patch(f'/api/v1/contacts/{self.contact_b.id}/', {'city': 'Kaolack'})
        self.assertEqual(response_update.status_code, status.HTTP_403_FORBIDDEN)

        # Tentative de suppression sur le contact de B
        response_delete = self.client.delete(f'/api/v1/contacts/{self.contact_b.id}/')
        self.assertEqual(response_delete.status_code, status.HTTP_403_FORBIDDEN)

    def test_member_can_update_own_contact_and_toggle_privacy(self):
        """Le propriétaire peut modifier son contact et basculer phone_visible_to_members."""
        self.client.force_authenticate(user=self.user_a)
        response = self.client.patch(f'/api/v1/contacts/{self.contact_a.id}/', {
            'phone_visible_to_members': True
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.contact_a.refresh_from_db()
        self.assertTrue(self.contact_a.phone_visible_to_members)

        # B peut maintenant voir le numéro de A
        self.client.force_authenticate(user=self.user_b)
        res = self.client.get(f'/api/v1/contacts/{self.contact_a.id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['data']['phone'], '+221771111111')

    def test_member_can_delete_own_contact(self):
        """Le propriétaire peut supprimer son propre contact secondaire."""
        # Créer un contact secondaire d'abord
        secondary = Contact.objects.create(
            member=self.member_a,
            phone='+221779999999',
            is_primary=False
        )
        self.client.force_authenticate(user=self.user_a)
        response = self.client.delete(f'/api/v1/contacts/{secondary.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Contact.objects.filter(id=secondary.id).exists())
