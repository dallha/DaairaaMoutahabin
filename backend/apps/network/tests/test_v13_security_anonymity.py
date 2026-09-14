import uuid
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from rest_framework.test import APIRequestFactory

from common.constants import UserRole
from apps.members.models import Member, Contact, GenderChoices, SituationChoices, MemberStatusChoices, VisibilityChoices
from apps.network.models import (
    MemberNeed,
    NeedTypeChoices,
    NeedUrgencyChoices,
    NeedStatusChoices,
    NeedVisibilityChoices,
    ConnectionRequest,
    ConnectionRequestStatusChoices,
)
from apps.network.serializers import MemberNeedSerializer, ConnectionRequestSerializer
from apps.members.serializers import MemberDirectorySerializer, MemberDetailSerializer

User = get_user_model()


class SecurityAnonymityTestCase(TestCase):
    """
    Validation rigoureuse de l'étanchéité de l'anonymat relatif,
    des autorisations DRF au niveau objet et de la protection des données personnelles.
    """

    def setUp(self):
        # 1. Rôles / Groupes
        self.admin_group, _ = Group.objects.get_or_create(name=UserRole.ADMIN)
        self.superadmin_group, _ = Group.objects.get_or_create(name=UserRole.SUPERADMIN)

        # 2. Utilisateurs
        self.user_author = User.objects.create_user(
            email='author@dahirah.org', password='AuthorPassword123'
        )
        self.user_peer = User.objects.create_user(
            email='peer@dahirah.org', password='PeerPassword123'
        )
        self.user_admin = User.objects.create_user(
            email='admin@dahirah.org', password='AdminPassword123', is_staff=True
        )
        self.user_admin.groups.add(self.admin_group)

        # 3. Fiches membres associées
        self.member_author = Member.objects.create(
            user=self.user_author,
            first_name='Moussa',
            last_name='Diop',
            gender=GenderChoices.MALE,
            situation=SituationChoices.STUDENT,
            status=MemberStatusChoices.ACTIVE,
            visibility_level=VisibilityChoices.PUBLIC,
        )
        self.contact_author = Contact.objects.create(
            member=self.member_author,
            phone='+221770000001',
            phone_visible_to_members=False, # Téléphone masqué aux pairs
            email='moussa.diop@dahirah.org',
            city='Dakar',
            is_primary=True,
        )

        self.member_peer = Member.objects.create(
            user=self.user_peer,
            first_name='Fatou',
            last_name='Ndiaye',
            gender=GenderChoices.FEMALE,
            situation=SituationChoices.EMPLOYEE,
            status=MemberStatusChoices.ACTIVE,
            visibility_level=VisibilityChoices.PUBLIC,
        )

        self.factory = APIRequestFactory()

    def test_01_anonymous_need_masks_uuid_and_name_for_peer(self):
        """Un pair ne doit recevoir NI le nom réel, NI le matricule, NI l'UUID membre."""
        need = MemberNeed.objects.create(
            member=self.member_author,
            need_type=NeedTypeChoices.ACADEMIC,
            title='Aide mémoire universitaire',
            description='Besoin urgent de relecture.',
            urgency_level=NeedUrgencyChoices.NORMAL,
            visibility_level=NeedVisibilityChoices.PUBLIC,
            is_anonymous=True,
        )

        # Requête émise par le pair
        request = self.factory.get('/api/v1/network/needs/')
        request.user = self.user_peer

        serializer = MemberNeedSerializer(need, context={'request': request})
        data = serializer.data

        # VÉRIFICATIONS SÉCURITÉ ABSOLUE
        self.assertIsNone(data['member'], "L'UUID membre ne doit pas fuiter pour un pair sur un besoin anonyme.")
        self.assertIsNone(data['member_matricule'], "Le matricule ne doit pas être exposé au pair.")
        self.assertEqual(data['member_name'], "Membre de la Dahirah (Anonyme)")
        self.assertTrue(data['is_anonymous'])

    def test_02_anonymous_need_shows_full_identity_to_admin(self):
        """L'administrateur conserve la pleine traçabilité et visibilité institutionnelle."""
        need = MemberNeed.objects.create(
            member=self.member_author,
            need_type=NeedTypeChoices.LEGAL_ADMIN,
            title='Conseil statutaire',
            description='Question administrative.',
            is_anonymous=True,
        )

        request = self.factory.get('/api/v1/network/needs/')
        request.user = self.user_admin

        serializer = MemberNeedSerializer(need, context={'request': request})
        data = serializer.data

        self.assertEqual(str(data['member']), str(self.member_author.id))
        self.assertEqual(data['member_matricule'], self.member_author.matricule)
        self.assertEqual(data['member_name'], self.member_author.display_name)

    def test_03_anonymous_need_shows_author_their_own_identity(self):
        """Le demandeur voit sa propre demande avec l'indication explicite de l'anonymisation."""
        need = MemberNeed.objects.create(
            member=self.member_author,
            need_type=NeedTypeChoices.JOB_SEARCH,
            title='Recherche opportunité',
            description='Recherche de stage confidentielle.',
            is_anonymous=True,
        )

        request = self.factory.get('/api/v1/network/needs/')
        request.user = self.user_author

        serializer = MemberNeedSerializer(need, context={'request': request})
        data = serializer.data

        self.assertEqual(str(data['member']), str(self.member_author.id))
        self.assertEqual(data['member_matricule'], self.member_author.matricule)
        self.assertIn("Vous - anonymisé", data['member_name'])

    def test_04_pending_connection_request_masks_requester_uuid_if_need_anonymous(self):
        """Une demande de mise en relation liée à un besoin anonyme ne doit pas révéler l'UUID du demandeur tant qu'elle est en attente."""
        need = MemberNeed.objects.create(
            member=self.member_author,
            need_type=NeedTypeChoices.COMMUNITY_AID,
            title='Assistance fraternelle',
            description='Entraide.',
            is_anonymous=True,
        )

        conn_req = ConnectionRequest.objects.create(
            need=need,
            requester=self.member_author,
            target_member=self.member_peer,
            status=ConnectionRequestStatusChoices.PENDING,
            message="Je sollicite votre assistance fraternelle.",
        )

        # Le pair sollicité consulte sa demande reçue
        request = self.factory.get('/api/v1/network/connection-requests/')
        request.user = self.user_peer

        serializer = ConnectionRequestSerializer(conn_req, context={'request': request})
        data = serializer.data

        self.assertIsNone(data['requester'], "L'UUID du demandeur doit être masqué tant que la demande est PENDING.")
        self.assertIsNone(data['requester_matricule'])
        self.assertEqual(data['requester_name'], "Membre de la Dahirah (Confidentiel)")

    def test_05_phone_number_privacy_masking_without_consent(self):
        """Le numéro de téléphone avec phone_visible_to_members=False doit être masqué aux pairs."""
        request = self.factory.get('/api/v1/members/')
        request.user = self.user_peer

        serializer = MemberDirectorySerializer(self.member_author, context={'request': request})
        data = serializer.data

        primary_contact = data.get('primary_contact')
        self.assertIsNotNone(primary_contact)
        self.assertIsNone(primary_contact['phone'], "Le téléphone doit être None pour un pair sans consentement.")
        self.assertIsNone(primary_contact['whatsapp'])

        # Pour l'administrateur, le téléphone doit être visible
        admin_req = self.factory.get('/api/v1/members/')
        admin_req.user = self.user_admin
        admin_serializer = MemberDirectorySerializer(self.member_author, context={'request': admin_req})
        admin_data = admin_serializer.data
        self.assertEqual(admin_data['primary_contact']['phone'], '+221770000001')
