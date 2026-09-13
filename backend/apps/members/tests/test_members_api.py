from django.contrib.auth.models import Group
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import CustomUser
from apps.audit.models import AuditLog, AuditActionChoices
from apps.members.models import Contact, Member, MemberStatusChoices, VisibilityChoices, GenderChoices, SituationChoices
from common.constants import UserRole


class MembersAPITests(APITestCase):
    """
    Suite de tests exhaustive pour la Phase 4C-1 (Members API) :
    1. Consultation liste & détail selon profil (visiteur, membre, propriétaire, admin, superadmin)
    2. Masquage serveur strict du téléphone (phone_visible_to_members)
    3. Création (POST) et matrice RBAC
    4. Modification (PATCH) propriétaire vs admin vs membre tiers
    5. Suppression logique (Soft delete DELETE)
    6. Restauration de membre archivé (/restore/)
    7. Suppression physique sécurisée (/hard_delete/)
    8. Recherche & pagination (défaut 20, max 100)
    9. Exclusion garantie des données confidentielles (notes, audit) pour les non-admins
    """

    def setUp(self):
        # Groupes RBAC
        self.group_members, _ = Group.objects.get_or_create(name=UserRole.MEMBER)
        self.group_admins, _ = Group.objects.get_or_create(name=UserRole.ADMIN)
        self.group_superadmins, _ = Group.objects.get_or_create(name=UserRole.SUPERADMIN)

        # Utilisateur Membre 1 (propriétaire de member_1)
        self.member_user = CustomUser.objects.create_user(
            email='moussa@dairatu.sn',
            password='TestPassword123!',
            first_name='Moussa',
            last_name='Diop'
        )
        self.member_user.groups.add(self.group_members)

        # Utilisateur Membre 2 (propriétaire de member_2)
        self.other_member_user = CustomUser.objects.create_user(
            email='fatou@dairatu.sn',
            password='TestPassword123!',
            first_name='Fatou',
            last_name='Sow'
        )
        self.other_member_user.groups.add(self.group_members)

        # Utilisateur Administrateur
        self.admin_user = CustomUser.objects.create_user(
            email='admin@dairatu.sn',
            password='TestPassword123!',
            first_name='Aïcha',
            last_name='Ba'
        )
        self.admin_user.groups.add(self.group_admins)

        # Utilisateur Super-Administrateur
        self.super_user = CustomUser.objects.create_superuser(
            email='superadmin@dairatu.sn',
            password='TestPassword123!',
            first_name='Cheikh',
            last_name='Fall'
        )
        self.super_user.groups.add(self.group_superadmins)

        # 1. Membre Public (téléphone masqué aux membres car phone_visible_to_members=False)
        self.member_public = Member.objects.create(
            user=self.member_user,
            first_name='Moussa',
            last_name='Diop',
            gender=GenderChoices.MALE,
            situation=SituationChoices.EMPLOYEE,
            status=MemberStatusChoices.ACTIVE,
            visibility_level=VisibilityChoices.PUBLIC,
            notes='Dossier civil à jour.'
        )
        self.contact_public = Contact.objects.create(
            member=self.member_public,
            phone='+221771234567',
            phone_visible_to_members=False,
            is_primary=True,
            city='Dakar'
        )

        # 2. Membre Interne (téléphone consenti : phone_visible_to_members=True)
        self.member_internal = Member.objects.create(
            user=self.other_member_user,
            first_name='Fatou',
            last_name='Sow',
            gender=GenderChoices.FEMALE,
            situation=SituationChoices.ENTREPRENEUR,
            status=MemberStatusChoices.ACTIVE,
            visibility_level=VisibilityChoices.INTERNAL,
            notes='Cotisations à jour, secrétaire adjointe.'
        )
        self.contact_internal = Contact.objects.create(
            member=self.member_internal,
            phone='+221789876543',
            phone_visible_to_members=True,
            is_primary=True,
            city='Thiès'
        )

        # 3. Membre Restreint (invisible pour membres normaux et visiteurs)
        self.member_restricted = Member.objects.create(
            first_name='Ibrahima',
            last_name='Ndiaye',
            gender=GenderChoices.MALE,
            situation=SituationChoices.STUDENT,
            status=MemberStatusChoices.ACTIVE,
            visibility_level=VisibilityChoices.RESTRICTED,
            notes='En attente de validation du bureau.'
        )
        self.contact_restricted = Contact.objects.create(
            member=self.member_restricted,
            phone='+221765554433',
            phone_visible_to_members=False,
            is_primary=True,
            city='Saint-Louis'
        )

        # 4. Membre Soft-Deleted
        self.member_deleted = Member.all_objects.create(
            first_name='Ancien',
            last_name='Membre',
            gender=GenderChoices.MALE,
            situation=SituationChoices.OTHER,
            status=MemberStatusChoices.INACTIVE,
            visibility_level=VisibilityChoices.PUBLIC,
            is_deleted=True,
            notes='Démissionnaire en 2024.'
        )

    def _auth_client(self, user):
        client = APIClient()
        token = RefreshToken.for_user(user).access_token
        client.cookies['access_token'] = str(token)
        return client

    # -------------------------------------------------------------------------
    # 1. Tests de Consultation & Visibilité
    # -------------------------------------------------------------------------

    def test_visitor_get_members_list_public_only(self):
        """Visiteur anonyme : voit uniquement les profils publics actifs, sans contact."""
        res = self.client.get('/api/v1/members/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['success'])
        results = res.data['results']
        matricules = [m['matricule'] for m in results]

        self.assertIn(self.member_public.matricule, matricules)
        self.assertNotIn(self.member_internal.matricule, matricules)
        self.assertNotIn(self.member_restricted.matricule, matricules)
        self.assertNotIn(self.member_deleted.matricule, matricules)
        # Pas de contacts dans le serializer public
        self.assertNotIn('contacts', results[0])
        self.assertNotIn('notes', results[0])

    def test_member_get_members_list_annuaire(self):
        """Membre connecté : voit profils publics et internes, mais pas restreints ni supprimés."""
        client = self._auth_client(self.member_user)
        res = client.get('/api/v1/members/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data['results']
        matricules = [m['matricule'] for m in results]

        self.assertIn(self.member_public.matricule, matricules)
        self.assertIn(self.member_internal.matricule, matricules)
        self.assertNotIn(self.member_restricted.matricule, matricules)
        self.assertNotIn(self.member_deleted.matricule, matricules)
        # Notes confidentielles absentes
        self.assertNotIn('notes', results[0])

    def test_phone_visibility_consent_enforcement(self):
        """
        Contrôle serveur du téléphone :
        - Fatou (phone_visible_to_members=True) ➔ téléphone visible pour Moussa
        - Moussa (phone_visible_to_members=False) ➔ téléphone masqué (None) pour Fatou
        """
        # Fatou regarde la fiche de Moussa
        client_fatou = self._auth_client(self.other_member_user)
        res_moussa = client_fatou.get(f'/api/v1/members/{self.member_public.id}/')
        self.assertEqual(res_moussa.status_code, status.HTTP_200_OK)
        contact_moussa = res_moussa.data['contacts'][0]
        self.assertIsNone(contact_moussa['phone'])  # Masqué car pas de consentement

        # Moussa regarde la fiche de Fatou
        client_moussa = self._auth_client(self.member_user)
        res_fatou = client_moussa.get(f'/api/v1/members/{self.member_internal.id}/')
        self.assertEqual(res_fatou.status_code, status.HTTP_200_OK)
        contact_fatou = res_fatou.data['contacts'][0]
        self.assertEqual(contact_fatou['phone'], '+221789876543')  # Visible avec consentement

        # Moussa regarde sa propre fiche (propriétaire) ➔ téléphone toujours visible
        res_self = client_moussa.get(f'/api/v1/members/{self.member_public.id}/')
        self.assertEqual(res_self.data['contacts'][0]['phone'], '+221771234567')

    def test_admin_get_members_list_and_details_all(self):
        """Administrateur : voit tous les profils (actifs par défaut, avec notes et numéros complets)."""
        client = self._auth_client(self.admin_user)
        res = client.get('/api/v1/members/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        matricules = [m['matricule'] for m in res.data['results']]

        self.assertIn(self.member_public.matricule, matricules)
        self.assertIn(self.member_internal.matricule, matricules)
        self.assertIn(self.member_restricted.matricule, matricules)
        self.assertNotIn(self.member_deleted.matricule, matricules)

        # Consultation détaillée incluant les notes internes
        detail_res = client.get(f'/api/v1/members/{self.member_internal.id}/')
        self.assertEqual(detail_res.status_code, status.HTTP_200_OK)
        self.assertIn('notes', detail_res.data)
        self.assertEqual(detail_res.data['notes'], 'Cotisations à jour, secrétaire adjointe.')

    # -------------------------------------------------------------------------
    # 2. Tests de Création (POST) & RBAC
    # -------------------------------------------------------------------------

    def test_create_member_visitor_returns_unauthorized(self):
        """Visiteur : rejet 401 sur création."""
        data = {'first_name': 'Aliou', 'last_name': 'Diallo', 'gender': 'M'}
        res = self.client.post('/api/v1/members/', data, format='json')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_member_member_returns_forbidden(self):
        """Membre normal : rejet 403 sur création."""
        client = self._auth_client(self.member_user)
        data = {'first_name': 'Aliou', 'last_name': 'Diallo', 'gender': 'M'}
        res = client.post('/api/v1/members/', data, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_member_admin_success_with_audit(self):
        """Administrateur : création réussie avec matricule automatique et audit log."""
        client = self._auth_client(self.admin_user)
        data = {
            'first_name': 'Aliou',
            'last_name': 'Diallo',
            'gender': 'M',
            'situation': 'STUDENT',
            'status': 'ACTIVE',
            'visibility_level': 'INTERNAL',
            'notes': 'Nouvel adhérent Dakar.'
        }
        res = client.post('/api/v1/members/', data, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        new_id = res.data['id']
        member = Member.objects.get(id=new_id)

        self.assertTrue(member.matricule.startswith('DAMF-'))
        self.assertEqual(member.first_name, 'Aliou')

        # Vérification AuditLog
        audit = AuditLog.objects.filter(entity='Member', entity_id=str(new_id), action=AuditActionChoices.CREATE).first()
        self.assertIsNotNone(audit)
        self.assertEqual(audit.user, self.admin_user)

    # -------------------------------------------------------------------------
    # 3. Tests de Modification (PATCH)
    # -------------------------------------------------------------------------

    def test_patch_owner_success_on_allowed_fields(self):
        """Propriétaire : modification autorisée de sa situation et son prénom."""
        client = self._auth_client(self.member_user)
        res = client.patch(f'/api/v1/members/{self.member_public.id}/', {
            'situation': SituationChoices.FREELANCE,
            'first_name': 'Moussa Elhadji'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.member_public.refresh_from_db()
        self.assertEqual(self.member_public.situation, SituationChoices.FREELANCE)
        self.assertEqual(self.member_public.first_name, 'Moussa Elhadji')

    def test_patch_owner_forbidden_on_administrative_fields(self):
        """Propriétaire : tentative de modifier ses notes ou son statut ➔ Rejet 400."""
        client = self._auth_client(self.member_user)
        res = client.patch(f'/api/v1/members/{self.member_public.id}/', {
            'notes': 'Tentative de modification illégale',
            'status': MemberStatusChoices.SUSPENDED
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_patch_member_on_other_member_returns_forbidden(self):
        """Membre normal : tentative de modifier la fiche d'un autre membre ➔ Rejet 403."""
        client = self._auth_client(self.member_user)
        res = client.patch(f'/api/v1/members/{self.member_internal.id}/', {
            'first_name': 'Hack'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_patch_admin_success_on_any_member(self):
        """Administrateur : modification autorisée sur tous les champs et tous les membres."""
        client = self._auth_client(self.admin_user)
        res = client.patch(f'/api/v1/members/{self.member_public.id}/', {
            'notes': 'Note administrative révisée par le bureau.',
            'status': MemberStatusChoices.ACTIVE
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.member_public.refresh_from_db()
        self.assertEqual(self.member_public.notes, 'Note administrative révisée par le bureau.')

    # -------------------------------------------------------------------------
    # 4. Tests de Soft Delete, Restauration & Hard Delete
    # -------------------------------------------------------------------------

    def test_delete_member_by_regular_member_returns_forbidden(self):
        """Membre : tentative de suppression ➔ Rejet 403."""
        client = self._auth_client(self.member_user)
        res = client.delete(f'/api/v1/members/{self.member_public.id}/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_member_by_admin_performs_soft_delete(self):
        """Administrateur : suppression logique (is_deleted=True), membre invisible pour membres normaux."""
        client = self._auth_client(self.admin_user)
        res = client.delete(f'/api/v1/members/{self.member_internal.id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['success'])

        self.member_internal.refresh_from_db()
        self.assertTrue(self.member_internal.is_deleted)

        # Vérification qu'il devient invisible dans l'annuaire des membres
        client_member = self._auth_client(self.member_user)
        annuaire_res = client_member.get('/api/v1/members/')
        matricules = [m['matricule'] for m in annuaire_res.data['results']]
        self.assertNotIn(self.member_internal.matricule, matricules)

        # Vérification AuditLog
        audit = AuditLog.objects.filter(entity='Member', entity_id=str(self.member_internal.id), action=AuditActionChoices.DELETE).first()
        self.assertIsNotNone(audit)

    def test_restore_member_by_admin_success(self):
        """Administrateur : restauration d'un membre archivé (/restore/) réussie avec audit."""
        client = self._auth_client(self.admin_user)
        res = client.post(f'/api/v1/members/{self.member_deleted.id}/restore/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data['success'])

        self.member_deleted.refresh_from_db()
        self.assertFalse(self.member_deleted.is_deleted)

        # Vérification AuditLog
        audit = AuditLog.objects.filter(entity='Member', entity_id=str(self.member_deleted.id), action=AuditActionChoices.RESTORE).first()
        self.assertIsNotNone(audit)

    def test_hard_delete_by_admin_returns_forbidden(self):
        """Administrateur normal : suppression physique définitive ➔ Rejet 403."""
        client = self._auth_client(self.admin_user)
        res = client.delete(f'/api/v1/members/{self.member_deleted.id}/hard_delete/', {
            'confirm_hard_delete': True
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_hard_delete_by_superadmin_success_with_confirmation_and_audit(self):
        """Super-Administrateur : suppression physique avec confirmation explicite et audit préalable."""
        client = self._auth_client(self.super_user)
        target_id = str(self.member_deleted.id)

        # 1. Sans confirmation explicite ➔ Rejet 400
        res_no_confirm = client.delete(f'/api/v1/members/{target_id}/hard_delete/', format='json')
        self.assertEqual(res_no_confirm.status_code, status.HTTP_400_BAD_REQUEST)

        # 2. Avec confirmation confirm_hard_delete=true ➔ Succès 200
        res_confirm = client.delete(f'/api/v1/members/{target_id}/hard_delete/', {
            'confirm_hard_delete': True
        }, format='json')
        self.assertEqual(res_confirm.status_code, status.HTTP_200_OK)

        # Vérification de la suppression physique définitive en base
        self.assertFalse(Member.all_objects.filter(id=target_id).exists())

        # Vérification AuditLog écrit avant suppression
        audit = AuditLog.objects.filter(entity='Member', entity_id=target_id, action=AuditActionChoices.HARD_DELETE).first()
        self.assertIsNotNone(audit)
        self.assertEqual(audit.user, self.super_user)

    # -------------------------------------------------------------------------
    # 5. Tests de Recherche & Pagination
    # -------------------------------------------------------------------------

    def test_search_members_by_name_and_matricule(self):
        """Recherche ?search= sur nom, prénom ou matricule."""
        client = self._auth_client(self.admin_user)

        res_name = client.get(f'/api/v1/members/?search=Moussa')
        self.assertEqual(res_name.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_name.data['results']), 1)
        self.assertEqual(res_name.data['results'][0]['matricule'], self.member_public.matricule)

        res_mat = client.get(f'/api/v1/members/?search={self.member_internal.matricule}')
        self.assertEqual(res_mat.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_mat.data['results']), 1)
        self.assertEqual(res_mat.data['results'][0]['matricule'], self.member_internal.matricule)

    def test_pagination_and_page_size_max_limit(self):
        """Pagination : défaut 20, max_page_size plafonné à 100."""
        client = self._auth_client(self.admin_user)
        res = client.get('/api/v1/members/?page_size=50')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('count', res.data)
        self.assertIn('total_pages', res.data)
        self.assertIn('current_page', res.data)
        self.assertEqual(res.data['page_size'], 50)

        # Plafonnement si page_size > 100
        res_capped = client.get('/api/v1/members/?page_size=200')
        self.assertEqual(res_capped.status_code, status.HTTP_200_OK)
        self.assertEqual(res_capped.data['page_size'], 100)

    def test_retrieve_member_by_matricule_direct_lookup(self):
        """Vérifie que GET /api/v1/members/{matricule}/ résout nativement la fiche membre."""
        client = self._auth_client(self.admin_user)
        matricule = self.member_public.matricule
        res = client.get(f'/api/v1/members/{matricule}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['matricule'], matricule)
        self.assertEqual(str(res.data['id']), str(self.member_public.id))

    def test_filter_by_situation_learner_and_professional(self):
        """Vérifie le filtre ?situation=LEARNER agrégé et ?situation=PROFESSIONAL."""
        client = self._auth_client(self.admin_user)

        # Créer un élève et un étudiant
        pupil = Member.objects.create(
            first_name='Adji',
            last_name='Diop',
            gender=GenderChoices.FEMALE,
            situation=SituationChoices.PUPIL,
            status=MemberStatusChoices.ACTIVE,
        )
        student = Member.objects.create(
            first_name='Bintou',
            last_name='Coulibaly',
            gender=GenderChoices.FEMALE,
            situation=SituationChoices.STUDENT,
            status=MemberStatusChoices.ACTIVE,
        )

        # 1. Filtre agrégé LEARNER -> doit renvoyer à la fois pupil et student
        res_learner = client.get('/api/v1/members/?situation=LEARNER')
        self.assertEqual(res_learner.status_code, status.HTTP_200_OK)
        ids_learner = [m['id'] for m in res_learner.data['results']]
        self.assertIn(str(pupil.id), ids_learner)
        self.assertIn(str(student.id), ids_learner)
        self.assertNotIn(str(self.member_public.id), ids_learner)

        # 2. Filtre spécifique STUDENT
        res_student = client.get('/api/v1/members/?situation=STUDENT')
        self.assertEqual(res_student.status_code, status.HTTP_200_OK)
        ids_student = [m['id'] for m in res_student.data['results']]
        self.assertIn(str(student.id), ids_student)
        self.assertNotIn(str(pupil.id), ids_student)

        # 3. Filtre PROFESSIONAL -> doit renvoyer EMPLOYEE (member_public) et ENTREPRENEUR (member_internal)
        res_prof = client.get('/api/v1/members/?situation=PROFESSIONAL')
        self.assertEqual(res_prof.status_code, status.HTTP_200_OK)
        ids_prof = [m['id'] for m in res_prof.data['results']]
        self.assertIn(str(self.member_public.id), ids_prof)
        self.assertIn(str(self.member_internal.id), ids_prof)
        self.assertNotIn(str(pupil.id), ids_prof)
