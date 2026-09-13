from django.contrib.auth.models import Group
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase, APIClient

from apps.accounts.models import CustomUser
from apps.members.models import Member, Contact, GenderChoices, SituationChoices, MemberStatusChoices
from apps.network.models import (
    SkillCategory,
    Skill,
    MemberSkill,
    SkillLevelChoices,
    ServiceCatalog,
    MemberService,
    ServiceTypeChoices,
    ContactModeChoices,
    MemberAvailability,
    AvailabilityStatusChoices,
    MemberRelation,
    RelationTypeChoices,
    RelationStatusChoices,
)
from common.constants import UserRole


class NetworkAPITests(APITestCase):
    """
    Tests de la matrice RBAC, des endpoints REST et du moteur de recherche multicritère apps.network.
    """

    def setUp(self):
        # Groupes RBAC
        self.group_members, _ = Group.objects.get_or_create(name=UserRole.MEMBER)
        self.group_admins, _ = Group.objects.get_or_create(name=UserRole.ADMIN)

        # Utilisateur Membre A (Propriétaire de member_a)
        self.user_a = CustomUser.objects.create_user(
            email='ibrahima@dairatu.sn',
            password='TestPassword123!',
            first_name='Ibrahima',
            last_name='Aïdara'
        )
        self.user_a.groups.add(self.group_members)
        self.member_a = Member.objects.create(
            user=self.user_a,
            first_name='Ibrahima',
            last_name='Aïdara',
            gender=GenderChoices.MALE,
            situation=SituationChoices.EMPLOYEE,
            status=MemberStatusChoices.ACTIVE,
        )
        self.contact_a = Contact.objects.create(
            member=self.member_a,
            city='Dakar',
            phone='+221770000001',
            is_primary=True,
            phone_visible_to_members=True
        )

        # Utilisateur Membre B (Tiers)
        self.user_b = CustomUser.objects.create_user(
            email='khadija@dairatu.sn',
            password='TestPassword123!',
            first_name='Khadija',
            last_name='Sidibé'
        )
        self.user_b.groups.add(self.group_members)
        self.member_b = Member.objects.create(
            user=self.user_b,
            first_name='Khadija',
            last_name='Sidibé',
            gender=GenderChoices.FEMALE,
            situation=SituationChoices.ENTREPRENEUR,
            status=MemberStatusChoices.ACTIVE,
        )
        self.contact_b = Contact.objects.create(
            member=self.member_b,
            city='Thiès',
            phone='+221770000002',
            is_primary=True,
            phone_visible_to_members=False
        )

        # Utilisateur Administrateur
        self.admin_user = CustomUser.objects.create_user(
            email='admin@dairatu.sn',
            password='TestPassword123!',
            first_name='Admin',
            last_name='General'
        )
        self.admin_user.groups.add(self.group_admins)

        # Référentiels
        self.cat_tech = SkillCategory.objects.create(name='Architecture & BTP')
        self.skill_arch = Skill.objects.create(category=self.cat_tech, name='Architecture bioclimatique')
        self.service_cat = ServiceCatalog.objects.create(name='Conseil Architectural')

    def _client_auth(self, user):
        client = APIClient()
        client.force_authenticate(user=user)
        return client

    # -------------------------------------------------------------------------
    # 1. Tests Référentiels
    # -------------------------------------------------------------------------

    def test_referentials_unauthorized_for_anonymous_and_ok_for_members(self):
        anon = APIClient()
        res_anon = anon.get('/api/v1/network/skills/')
        self.assertEqual(res_anon.status_code, status.HTTP_401_UNAUTHORIZED)

        client_a = self._client_auth(self.user_a)
        res_a = client_a.get('/api/v1/network/skills/')
        self.assertEqual(res_a.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(res_a.data.get('results', res_a.data)), 1)

    # -------------------------------------------------------------------------
    # 2. RBAC Compétences (Skill) & Validation is_verified
    # -------------------------------------------------------------------------

    def test_member_can_declare_skill_but_cannot_self_verify(self):
        client_a = self._client_auth(self.user_a)

        # Tentative d'auto-déclaration avec is_verified=True forcée
        payload = {
            'member': str(self.member_a.id),
            'skill': str(self.skill_arch.id),
            'level': 'EXPERT',
            'years_experience': 7,
            'is_verified': True  # Doit être ignoré par le backend
        }
        res = client_a.post('/api/v1/network/member-skills/', payload)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertFalse(res.data['is_verified'])

        ms_id = res.data['id']

        # Le membre tente d'appeler l'action /verify/ -> 403 Forbidden
        res_verify_member = client_a.post(f'/api/v1/network/member-skills/{ms_id}/verify/')
        self.assertEqual(res_verify_member.status_code, status.HTTP_403_FORBIDDEN)

        # L'administrateur valide la compétence -> 200 OK
        admin_client = self._client_auth(self.admin_user)
        res_verify_admin = admin_client.post(f'/api/v1/network/member-skills/{ms_id}/verify/')
        self.assertEqual(res_verify_admin.status_code, status.HTTP_200_OK)
        self.assertTrue(res_verify_admin.data['is_verified'])
        self.assertEqual(res_verify_admin.data['verified_by_email'], self.admin_user.email)

    def test_third_party_cannot_modify_or_delete_other_member_skill(self):
        # Création de la compétence par member_a
        ms = MemberSkill.objects.create(
            member=self.member_a,
            skill=self.skill_arch,
            level=SkillLevelChoices.ADVANCED
        )

        client_b = self._client_auth(self.user_b)
        res_patch = client_b.patch(f'/api/v1/network/member-skills/{ms.id}/', {'level': 'BEGINNER'})
        self.assertEqual(res_patch.status_code, status.HTTP_403_FORBIDDEN)

        res_del = client_b.delete(f'/api/v1/network/member-skills/{ms.id}/')
        self.assertEqual(res_del.status_code, status.HTTP_403_FORBIDDEN)

    # -------------------------------------------------------------------------
    # 3. Services & contact_mode
    # -------------------------------------------------------------------------

    def test_member_can_publish_service_with_contact_mode(self):
        client_a = self._client_auth(self.user_a)
        payload = {
            'member': str(self.member_a.id),
            'service': str(self.service_cat.id),
            'title': 'Consultation plans et permis',
            'description': 'Assistance architecturale pour projets de la communauté',
            'service_type': 'DAHIRAH_RATE',
            'terms': 'Gratuit pour le siège Dahirah, -20% pour membres',
            'contact_mode': 'WHATSAPP'
        }
        res = client_a.post('/api/v1/network/member-services/', payload)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['contact_mode'], 'WHATSAPP')

    # -------------------------------------------------------------------------
    # 4. Disponibilité & Engagements
    # -------------------------------------------------------------------------

    def test_availability_management(self):
        client_a = self._client_auth(self.user_a)
        avail = MemberAvailability.objects.create(member=self.member_a)

        # Mise à jour de sa propre disponibilité
        res = client_a.patch(f'/api/v1/network/member-availability/{avail.id}/', {
            'status': 'AVAILABLE',
            'open_for_mentoring': True,
            'open_for_dahirah_events': True,
            'weekly_hours_available': 4,
            'preferred_contact_method': 'WhatsApp'
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['status'], 'AVAILABLE')
        self.assertTrue(res.data['open_for_mentoring'])

    # -------------------------------------------------------------------------
    # 5. Relations inter-membres & Approbation administrative
    # -------------------------------------------------------------------------

    def test_relation_declaration_and_admin_approval(self):
        client_a = self._client_auth(self.user_a)
        payload = {
            'from_member': str(self.member_a.id),
            'to_member': str(self.member_b.id),
            'relation_type': 'MENTOR',
            'notes': 'Accompagnement professionnel'
        }
        res = client_a.post('/api/v1/network/member-relations/', payload)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['status'], 'PENDING')
        rel_id = res.data['id']

        # Member A tente d'approuver sa propre relation -> 403 Forbidden
        res_app_member = client_a.post(f'/api/v1/network/member-relations/{rel_id}/approve/')
        self.assertEqual(res_app_member.status_code, status.HTTP_403_FORBIDDEN)

        # Admin approuve la relation -> 200 OK
        admin_client = self._client_auth(self.admin_user)
        res_app_admin = admin_client.post(f'/api/v1/network/member-relations/{rel_id}/approve/')
        self.assertEqual(res_app_admin.status_code, status.HTTP_200_OK)
        self.assertEqual(res_app_admin.data['status'], 'APPROVED')
        self.assertEqual(res_app_admin.data['approved_by_email'], self.admin_user.email)

    # -------------------------------------------------------------------------
    # 6. Carrefour Professionnel Discovery View
    # -------------------------------------------------------------------------

    def test_discovery_filtering_by_city_skill_and_mentoring(self):
        client_a = self._client_auth(self.user_a)

        # Attacher compétence et disponibilité mentorat à member_a
        MemberSkill.objects.create(member=self.member_a, skill=self.skill_arch)
        MemberAvailability.objects.create(
            member=self.member_a,
            status=AvailabilityStatusChoices.AVAILABLE,
            open_for_mentoring=True
        )

        # 1. Filtre par ville 'Dakar' -> retourne member_a
        res_dakar = client_a.get('/api/v1/network/discovery/?city=Dakar')
        self.assertEqual(res_dakar.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(res_dakar.data['count'], 1)

        # 2. Filtre par compétence 'Architecture' -> retourne member_a
        res_skill = client_a.get('/api/v1/network/discovery/?skill=Architecture')
        self.assertEqual(res_skill.status_code, status.HTTP_200_OK)
        self.assertEqual(res_skill.data['count'], 1)
        self.assertEqual(res_skill.data['results'][0]['matricule'], self.member_a.matricule)

        # 3. Filtre par mentorat -> retourne member_a
        res_mentor = client_a.get('/api/v1/network/discovery/?mentoring=true')
        self.assertEqual(res_mentor.status_code, status.HTTP_200_OK)
        self.assertEqual(res_mentor.data['count'], 1)
