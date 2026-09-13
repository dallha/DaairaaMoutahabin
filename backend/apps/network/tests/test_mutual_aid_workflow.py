import uuid
from django.contrib.auth.models import Group
from django.core.exceptions import ValidationError
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase, APIClient

from apps.accounts.models import CustomUser
from apps.members.models import Member, GenderChoices, SituationChoices, MemberStatusChoices
from apps.professions.models import ProfessionCategory, Profession, MemberProfession
from apps.network.models import (
    SkillCategory,
    Skill,
    MemberSkill,
    SkillLevelChoices,
    MemberAvailability,
    MemberNeed,
    NeedTypeChoices,
    NeedStatusChoices,
    ConnectionRequest,
    ConnectionRequestStatusChoices,
    MemberRelation,
    RelationTypeChoices,
    RelationStatusChoices,
)
from apps.network.services import find_need_matches, accept_connection_request, decline_connection_request
from common.constants import UserRole


class MutualAidWorkflowTests(APITestCase):
    """
    Test de bout en bout du cycle d'entraide confraternelle (V1.2.3) :
    1. Gouvernance : Invariant d'unicité et protection des champs institutionnels du Shaykh.
    2. Création d'un besoin (MemberNeed).
    3. Matching déterministe et explicable (Compétences, Métiers, Disponibilités).
    4. Demande formelle de mise en relation (ConnectionRequest) avec respect de l'anonymat.
    5. Acceptation transactionnelle atomique (création sans doublon de MemberRelation et transition d'état).
    6. Résolution du besoin.
    7. Répercussion sur le Baromètre d'Impact du Dashboard (taux de prise en charge et de résolution).
    """

    def setUp(self):
        self.group_members, _ = Group.objects.get_or_create(name=UserRole.MEMBER)
        self.group_admins, _ = Group.objects.get_or_create(name=UserRole.ADMIN)

        # 1. Shaykh (DAMF-0001, Fondateur)
        self.user_shaykh = CustomUser.objects.create_superuser(
            email='shaykh@dairatu.sn',
            password='PassShaykh123!',
            first_name='Shaykh',
            last_name='Muhammad Nūruddin'
        )
        self.shaykh = Member.objects.create(
            user=self.user_shaykh,
            first_name='Shaykh',
            last_name='Muhammad Nūruddin',
            gender=GenderChoices.MALE,
            situation=SituationChoices.FREELANCE,
            status=MemberStatusChoices.ACTIVE,
            is_founder=True,
            institutional_priority=1,
        )

        # 2. Disciple Demandeur (Fatou)
        self.user_fatou = CustomUser.objects.create_user(
            email='fatou@dairatu.sn',
            password='TestPassword123!',
            first_name='Fatou',
            last_name='Sarr'
        )
        self.user_fatou.groups.add(self.group_members)
        self.fatou = Member.objects.create(
            user=self.user_fatou,
            first_name='Fatou',
            last_name='Sarr',
            gender=GenderChoices.FEMALE,
            situation=SituationChoices.STUDENT,
            status=MemberStatusChoices.ACTIVE,
        )

        # 3. Disciple Ressource / Aidant (Babacar - Juriste)
        self.user_babacar = CustomUser.objects.create_user(
            email='babacar@dairatu.sn',
            password='TestPassword123!',
            first_name='Babacar',
            last_name='Diallo'
        )
        self.user_babacar.groups.add(self.group_members)
        self.babacar = Member.objects.create(
            user=self.user_babacar,
            first_name='Babacar',
            last_name='Diallo',
            gender=GenderChoices.MALE,
            situation=SituationChoices.EMPLOYEE,
            status=MemberStatusChoices.ACTIVE,
        )

        # Configurer les compétences et métier de Babacar
        prof_cat = ProfessionCategory.objects.create(name='Droit et Justice')
        prof_droit = Profession.objects.create(name='Juriste Conseil', category=prof_cat)
        MemberProfession.objects.create(member=self.babacar, profession=prof_droit, is_current=True)

        skill_cat = SkillCategory.objects.create(name='Juridique')
        self.skill_droit = Skill.objects.create(name='Droit des contrats', category=skill_cat)
        MemberSkill.objects.create(member=self.babacar, skill=self.skill_droit, level=SkillLevelChoices.ADVANCED)

        MemberAvailability.objects.create(
            member=self.babacar,
            status='AVAILABLE',
            open_for_mentoring=True,
            open_for_pro_help=True
        )

        # 4. Administrateur Facilitateur
        self.user_admin = CustomUser.objects.create_superuser(
            email='admin@dairatu.sn',
            password='AdminPassword123!',
            first_name='Admin',
            last_name='Dahirah'
        )

    def test_01_governance_founder_protection(self):
        """Vérifie l'impossibilité d'élever un autre membre au statut de Fondateur (invariant d'unicité)."""
        another_member = Member(
            first_name='Alioune',
            last_name='Badara',
            gender=GenderChoices.MALE,
            situation=SituationChoices.EMPLOYEE,
            is_founder=True
        )
        with self.assertRaises(ValidationError):
            another_member.clean()

    def test_02_governance_unauthorized_mutation_blocked(self):
        """Vérifie que la modification directe des attributs institutionnels est bloquée."""
        self.fatou.is_founder = True
        with self.assertRaises(ValidationError):
            self.fatou.save()

    def test_03_matching_engine_explainability(self):
        """Vérifie que le moteur d'appariement calcule un score transparent et des explications claires."""
        need = MemberNeed.objects.create(
            member=self.fatou,
            need_type=NeedTypeChoices.LEGAL_ADMIN,
            title="Besoin de relecture contrat de bail",
            description="Recherche un frère ou une sœur juriste pour relire un contrat.",
            status=NeedStatusChoices.OPEN
        )

        matches = find_need_matches(need)
        self.assertTrue(len(matches) >= 1)
        babacar_match = next((m for m in matches if m['member_id'] == str(self.babacar.id)), None)
        self.assertIsNotNone(babacar_match)
        # Score : au moins Compétence (+40) + Métier (+30) + Disponibilité (+10)
        self.assertTrue(babacar_match['score'] >= 70)
        self.assertTrue(any("Compétence" in r or "Métier" in r for r in babacar_match['match_reasons']))

    def test_04_full_mutual_aid_cycle(self):
        """
        Scénario complet :
        Besoin -> Suggestion API -> Demande de mise en relation -> Acceptation atomique -> Relation -> Résolution -> Baromètre Dashboard.
        """
        client = APIClient()

        # Étape 1 : Fatou publie un besoin anonyme auprès des pairs
        need = MemberNeed.objects.create(
            member=self.fatou,
            need_type=NeedTypeChoices.MENTORSHIP,
            title="Recherche mentorat en développement de carrière",
            description="Besoin d'un accompagnement fraternel.",
            is_anonymous=True,
            status=NeedStatusChoices.OPEN
        )

        # Étape 2 : Consultation des correspondances via l'endpoint API
        client.force_authenticate(user=self.user_fatou)
        match_resp = client.get(f'/api/v1/network/member-needs/{need.id}/matches/')
        self.assertEqual(match_resp.status_code, status.HTTP_200_OK)
        self.assertTrue(len(match_resp.data['results']) >= 1)

        # Étape 3 : Création d'une demande de mise en relation
        create_req_resp = client.post('/api/v1/network/connection-requests/', {
            'need': str(need.id),
            'target_member': str(self.babacar.id),
            'message': "As-salamu alaykum, je sollicite votre accompagnement."
        })
        self.assertEqual(create_req_resp.status_code, status.HTTP_201_CREATED)
        req_id = create_req_resp.data['id']

        # Vérification de l'anonymat pour Babacar avant acceptation
        client.force_authenticate(user=self.user_babacar)
        view_req_resp = client.get(f'/api/v1/network/connection-requests/{req_id}/')
        self.assertEqual(view_req_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(view_req_resp.data['requester_name'], "Membre de la Dahirah (Confidentiel)")

        # Étape 4 : Babacar accepte la demande (transaction atomique)
        accept_resp = client.post(f'/api/v1/network/connection-requests/{req_id}/accept/')
        self.assertEqual(accept_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(accept_resp.data['status'], ConnectionRequestStatusChoices.ACCEPTED)

        # Vérification post-acceptation :
        # - L'identité de Fatou est maintenant révélée
        # - Une MemberRelation a été créée automatiquement
        # - Le besoin est passé à IN_PROGRESS
        view_req_after = client.get(f'/api/v1/network/connection-requests/{req_id}/')
        self.assertEqual(view_req_after.data['requester_name'], self.fatou.display_name)
        self.assertIsNotNone(view_req_after.data['resulting_relation_id'])

        need.refresh_from_db()
        self.assertEqual(need.status, NeedStatusChoices.IN_PROGRESS)

        # Vérification anti-doublon : ré-accepter ne duplique pas
        accept_resp_dup = client.post(f'/api/v1/network/connection-requests/{req_id}/accept/')
        self.assertEqual(accept_resp_dup.status_code, status.HTTP_200_OK)
        self.assertEqual(
            MemberRelation.objects.filter(from_member=self.fatou, to_member=self.babacar).count(),
            1
        )

        # Étape 5 : Résolution de l'entraide par Fatou
        client.force_authenticate(user=self.user_fatou)
        resolve_resp = client.post(f'/api/v1/network/member-needs/{need.id}/resolve/')
        self.assertEqual(resolve_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resolve_resp.data['status'], NeedStatusChoices.RESOLVED)

        # Étape 6 : Contrôle de l'impact sur le Dashboard
        client.force_authenticate(user=self.user_admin)
        dash_resp = client.get('/api/v1/dashboard/stats/')
        self.assertEqual(dash_resp.status_code, status.HTTP_200_OK)
        impact = dash_resp.data['data']['impact_metrics']
        self.assertEqual(impact['needs_total'], 1)
        self.assertEqual(impact['needs_resolved'], 1)
        self.assertEqual(impact['relations_active'], 1)
        self.assertEqual(impact['support_rate'], 100.0)
        self.assertEqual(impact['resolution_rate'], 100.0)
