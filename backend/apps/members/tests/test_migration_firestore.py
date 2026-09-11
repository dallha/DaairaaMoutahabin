import json
import os
import tempfile
from io import StringIO
from django.core.management import call_command
from django.test import TestCase

from apps.members.models import Member, Contact, GenderChoices, SituationChoices, MemberStatusChoices
from apps.education.models import Education, EducationLevelChoices
from apps.professions.models import MemberProfession, Profession
from apps.roles.models import MemberRole, Role
from apps.audit.models import AuditLog, AuditActionChoices


class FirestoreMigrationCommandTestCase(TestCase):
    def setUp(self):
        self.sample_firestore_data = [
            {
                "id": "firestore-doc-1",
                "matricule": "DM-2026-9001",
                "prenom": "Oumar",
                "nom": "Kane",
                "nomArabe": "عمر كان",
                "sexe": "M",
                "situation": "ETUDIANT",
                "statutCompte": "ACTIF",
                "telephone": "775551234",
                "telephoneSecondaire": "776661234",
                "email": "oumar.kane@dahira.sn",
                "ville": "Dakar",
                "pays": "Sénégal",
                "privacy": {
                    "showPhone": "MEMBRES"
                },
                "formations": [
                    {
                        "domaine": "Génie Logiciel",
                        "niveau": "Licence 3",
                        "etablissement": "ESP Dakar",
                        "diplome": "Licence Professionnelle",
                        "annee": "2023"
                    }
                ],
                "professions": [
                    {
                        "metier": "Développeur Web",
                        "secteur": "Technologies",
                        "activite": "Freelance",
                        "isPrincipale": True
                    }
                ],
                "fonctionsDahirah": [
                    {
                        "role": "Zakir",
                        "pole": "Pôle Spirituel",
                        "isActif": True
                    }
                ]
            }
        ]

        # Fichier temporaire JSON
        self.temp_file = tempfile.NamedTemporaryFile('w', delete=False, suffix='.json')
        json.dump(self.sample_firestore_data, self.temp_file)
        self.temp_file.close()

    def tearDown(self):
        if os.path.exists(self.temp_file.name):
            os.unlink(self.temp_file.name)

    def test_dry_run_simulation_leaves_db_untouched(self):
        """Le mode --dry-run simule sans persister de données."""
        out = StringIO()
        call_command('migrate_firestore_to_postgres', file=self.temp_file.name, dry_run=True, stdout=out)
        output = out.getvalue()
        self.assertIn("[DRY RUN]", output)
        self.assertEqual(Member.objects.filter(matricule="DM-2026-9001").count(), 0)

    def test_real_migration_creates_all_relational_entities(self):
        """La commande réelle crée les membres, contacts, formations, professions et rôles."""
        out = StringIO()
        call_command('migrate_firestore_to_postgres', file=self.temp_file.name, stdout=out)
        output = out.getvalue()
        self.assertIn("BILAN DE LA MIGRATION FIRESTORE", output)

        # Vérification Membre
        member = Member.objects.filter(matricule="DM-2026-9001").first()
        self.assertIsNotNone(member)
        self.assertEqual(member.first_name, "Oumar")
        self.assertEqual(member.last_name, "Kane")
        self.assertIn("عمر كان", member.notes)
        self.assertEqual(member.gender, GenderChoices.MALE)
        self.assertEqual(member.situation, SituationChoices.STUDENT)
        self.assertEqual(member.status, MemberStatusChoices.ACTIVE)

        # Vérification Contacts
        contacts = Contact.objects.filter(member=member)
        self.assertEqual(contacts.count(), 2)
        primary = contacts.get(is_primary=True)
        self.assertEqual(primary.phone, "+221775551234")
        self.assertTrue(primary.phone_visible_to_members)

        secondary = contacts.get(is_primary=False)
        self.assertEqual(secondary.phone, "+221776661234")

        # Vérification Formations
        educations = Education.objects.filter(member=member)
        self.assertEqual(educations.count(), 1)
        edu = educations.first()
        self.assertEqual(edu.level, EducationLevelChoices.LICENCE_3)
        self.assertEqual(edu.field, "Génie Logiciel")
        self.assertEqual(edu.institution, "ESP Dakar")

        # Vérification Métiers
        m_profs = MemberProfession.objects.filter(member=member)
        self.assertEqual(m_profs.count(), 1)
        self.assertEqual(m_profs.first().title, "Développeur Web")

        # Vérification Fonctions Dahirah
        m_roles = MemberRole.objects.filter(member=member)
        self.assertEqual(m_roles.count(), 1)
        self.assertEqual(m_roles.first().role.name, "Zakir")

        # Vérification Audit Log
        audit = AuditLog.objects.filter(action=AuditActionChoices.IMPORT).first()
        self.assertIsNotNone(audit)

    def test_idempotent_reexecution(self):
        """La réexécution de la migration met à jour sans provoquer de collisions ou doublons."""
        call_command('migrate_firestore_to_postgres', file=self.temp_file.name)
        initial_members_count = Member.objects.filter(matricule="DM-2026-9001").count()
        self.assertEqual(initial_members_count, 1)

        # Deuxième exécution
        out = StringIO()
        call_command('migrate_firestore_to_postgres', file=self.temp_file.name, stdout=out)
        self.assertEqual(Member.objects.filter(matricule="DM-2026-9001").count(), 1)
