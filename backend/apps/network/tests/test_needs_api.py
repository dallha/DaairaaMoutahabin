from django.contrib.auth.models import Group
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase, APIClient

from apps.accounts.models import CustomUser
from apps.members.models import Member, GenderChoices, SituationChoices, MemberStatusChoices
from apps.network.models import (
    MemberNeed,
    NeedTypeChoices,
    NeedUrgencyChoices,
    NeedStatusChoices,
    NeedVisibilityChoices,
)
from common.constants import UserRole


class MemberNeedAPITests(APITestCase):
    """
    Tests exhaustifs du modèle et de l'API MemberNeed :
    - Cycle de vie (OPEN -> IN_PROGRESS -> RESOLVED)
    - Gestion automatique des dates (resolved_at, expires_at)
    - Anonymat relatif : masqué pour les pairs, visible aux administrateurs
    - Action endpoint /resolve/
    """

    def setUp(self):
        self.group_members, _ = Group.objects.get_or_create(name=UserRole.MEMBER)
        self.group_admins, _ = Group.objects.get_or_create(name=UserRole.ADMIN)

        # 1. Membre Demandeur (Awa)
        self.user_awa = CustomUser.objects.create_user(
            email='awa@dairatu.sn',
            first_name='Awa',
            last_name='Badiane'
        )
        self.user_awa.groups.add(self.group_members)
        self.member_awa = Member.objects.create(
            user=self.user_awa,
            first_name='Awa',
            last_name='Badiane',
            gender=GenderChoices.FEMALE,
            situation=SituationChoices.STUDENT,
            status=MemberStatusChoices.ACTIVE,
        )

        # 2. Membre Observateur (Modou)
        self.user_modou = CustomUser.objects.create_user(
            email='modou@dairatu.sn',
            first_name='Modou',
            last_name='Biteye'
        )
        self.user_modou.groups.add(self.group_members)
        self.member_modou = Member.objects.create(
            user=self.user_modou,
            first_name='Modou',
            last_name='Biteye',
            gender=GenderChoices.MALE,
            situation=SituationChoices.EMPLOYEE,
            status=MemberStatusChoices.ACTIVE,
        )

        # 3. Administrateur
        self.user_admin = CustomUser.objects.create_superuser(
            email='admin@dairatu.sn',
            first_name='Admin',
            last_name='Gouvernance'
        )
        self.user_admin.groups.add(self.group_admins)

    def test_create_need_and_date_rules(self):
        """Création d'un besoin et respect des règles de cohérence de dates."""
        client = APIClient()
        client.force_authenticate(user=self.user_awa)

        payload = {
            'member': str(self.member_awa.id),
            'need_type': NeedTypeChoices.INTERNSHIP,
            'title': 'Recherche stage fin d études en Droit',
            'description': 'Étudiante en Master 2, je cherche un stage de 3 mois.',
            'urgency_level': NeedUrgencyChoices.HIGH,
            'visibility_level': NeedVisibilityChoices.PUBLIC,
            'is_anonymous': True,
        }
        res = client.post('/api/v1/network/member-needs/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        need_id = res.data['id']

        need = MemberNeed.objects.get(id=need_id)
        self.assertEqual(need.status, NeedStatusChoices.OPEN)
        self.assertIsNone(need.resolved_at)

        # Résolution du besoin via action endpoint
        res_resolve = client.post(f'/api/v1/network/member-needs/{need_id}/resolve/')
        self.assertEqual(res_resolve.status_code, status.HTTP_200_OK)
        need.refresh_from_db()
        self.assertEqual(need.status, NeedStatusChoices.RESOLVED)
        self.assertIsNotNone(need.resolved_at)

    def test_relative_anonymity_rule(self):
        """
        Un besoin anonymisé (is_anonymous=True) :
        - Masque l'identité du demandeur pour un pair (Modou).
        - Révèle l'identité complète pour un Administrateur.
        """
        need = MemberNeed.objects.create(
            member=self.member_awa,
            need_type=NeedTypeChoices.COMMUNITY_AID,
            title='Assistance discrète',
            description='Besoin d’aide ponctuelle.',
            is_anonymous=True,
            status=NeedStatusChoices.OPEN
        )

        # 1. Consultation par un pair (Modou)
        client_modou = APIClient()
        client_modou.force_authenticate(user=self.user_modou)
        res_modou = client_modou.get(f'/api/v1/network/member-needs/{need.id}/')
        self.assertEqual(res_modou.status_code, status.HTTP_200_OK)
        self.assertEqual(res_modou.data['member_name'], 'Membre de la Dahirah (Anonyme)')
        self.assertIsNone(res_modou.data['member_matricule'])

        # 2. Consultation par l'Administrateur
        client_admin = APIClient()
        client_admin.force_authenticate(user=self.user_admin)
        res_admin = client_admin.get(f'/api/v1/network/member-needs/{need.id}/')
        self.assertEqual(res_admin.status_code, status.HTTP_200_OK)
        self.assertEqual(res_admin.data['member_name'], 'Awa Badiane')
        self.assertEqual(res_admin.data['member_matricule'], self.member_awa.matricule)
