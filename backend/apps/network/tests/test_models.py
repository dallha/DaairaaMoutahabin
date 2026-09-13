from django.test import TestCase
from django.db.utils import IntegrityError
from apps.accounts.models import CustomUser
from apps.members.models import Member, GenderChoices, SituationChoices, MemberStatusChoices
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


class NetworkModelsTests(TestCase):
    """
    Tests exhaustifs des modèles, contraintes et logiques métier de l'application apps.network.
    """

    def setUp(self):
        self.user = CustomUser.objects.create_user(
            email='admin@dairatu.sn',
            password='TestPassword123!',
            first_name='Admin',
            last_name='User'
        )
        self.member_a = Member.objects.create(
            first_name='Mamadou',
            last_name='Diallo',
            gender=GenderChoices.MALE,
            situation=SituationChoices.EMPLOYEE,
            status=MemberStatusChoices.ACTIVE,
        )
        self.member_b = Member.objects.create(
            first_name='Fatou',
            last_name='Diop',
            gender=GenderChoices.FEMALE,
            situation=SituationChoices.ENTREPRENEUR,
            status=MemberStatusChoices.ACTIVE,
        )

    def test_skill_and_category_creation_with_slug(self):
        cat = SkillCategory.objects.create(name='Informatique & Numérique')
        self.assertEqual(cat.slug, 'informatique-numerique')

        skill = Skill.objects.create(category=cat, name='Développement Django')
        self.assertEqual(skill.slug, 'developpement-django')
        self.assertTrue(skill.is_active)

    def test_member_skill_declaration_and_verification(self):
        cat = SkillCategory.objects.create(name='Gestion & Finance')
        skill = Skill.objects.create(category=cat, name='Comptabilité Générale')

        # 1. Déclaration initiale : non vérifiée par défaut
        ms = MemberSkill.objects.create(
            member=self.member_a,
            skill=skill,
            level=SkillLevelChoices.ADVANCED,
            years_experience=5,
        )
        self.assertFalse(ms.is_verified)
        self.assertIsNone(ms.verified_by)
        self.assertIsNone(ms.verified_at)

        # 2. Validation administrative
        ms.is_verified = True
        ms.verified_by = self.user
        ms.save()
        self.assertTrue(ms.is_verified)
        self.assertEqual(ms.verified_by, self.user)

        # 3. Contrainte d'unicité : un membre ne peut pas associer deux fois la même compétence
        with self.assertRaises(IntegrityError):
            MemberSkill.objects.create(
                member=self.member_a,
                skill=skill,
                level=SkillLevelChoices.BEGINNER
            )

    def test_member_service_contact_mode(self):
        catalog = ServiceCatalog.objects.create(name='Infographie & Design')
        service = MemberService.objects.create(
            member=self.member_b,
            service=catalog,
            title='Création de logo et identité visuelle',
            description='Conception de chartes graphiques pour disciples',
            service_type=ServiceTypeChoices.DAHIRAH_RATE,
            terms='30% de remise sur devis standard',
            contact_mode=ContactModeChoices.WHATSAPP,
        )
        self.assertTrue(service.is_active)
        self.assertEqual(service.contact_mode, ContactModeChoices.WHATSAPP)

    def test_member_availability_defaults_to_not_specified(self):
        # La disponibilité doit impérativement démarrer sur NOT_SPECIFIED (non renseigné)
        avail = MemberAvailability.objects.create(member=self.member_a)
        self.assertEqual(avail.status, AvailabilityStatusChoices.NOT_SPECIFIED)
        self.assertFalse(avail.open_for_mentoring)
        self.assertFalse(avail.open_for_dahirah_events)

    def test_member_relation_approval_workflow_and_constraints(self):
        # 1. Déclaration : PENDING par défaut
        rel = MemberRelation.objects.create(
            from_member=self.member_a,
            to_member=self.member_b,
            relation_type=RelationTypeChoices.MENTOR,
        )
        self.assertEqual(rel.status, RelationStatusChoices.PENDING)
        self.assertIsNone(rel.approved_by)

        # 2. Approbation administrative
        rel.status = RelationStatusChoices.APPROVED
        rel.approved_by = self.user
        rel.save()
        self.assertEqual(rel.status, RelationStatusChoices.APPROVED)

        # 3. Contrainte anti-auto-relation : from_member != to_member
        with self.assertRaises(IntegrityError):
            MemberRelation.objects.create(
                from_member=self.member_a,
                to_member=self.member_a,
                relation_type=RelationTypeChoices.SPONSOR
            )
