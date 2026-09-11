"""
Commande de migration idempotente des données Firestore vers PostgreSQL / Neon.
Supporte le mode simulation (--dry-run) et l'ingestion depuis export JSON.
"""

import json
import os
import re
from datetime import datetime
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.members.models import (
    Member, Contact, GenderChoices, SituationChoices, MemberStatusChoices, VisibilityChoices,
    validate_and_normalize_phone
)
from apps.professions.models import ProfessionCategory, Profession, MemberProfession
from apps.education.models import Education, EducationLevelChoices, EducationStatusChoices
from apps.roles.models import Role, MemberRole, RoleCategoryChoices
from apps.audit.services import log_audit_event
from apps.audit.models import AuditActionChoices

SITUATION_MAP = {
    'ELEVE': SituationChoices.PUPIL,
    'PUPIL': SituationChoices.PUPIL,
    'ETUDIANT': SituationChoices.STUDENT,
    'STUDENT': SituationChoices.STUDENT,
    'SALARIE': SituationChoices.EMPLOYEE,
    'EMPLOYEE': SituationChoices.EMPLOYEE,
    'ENTREPRENEUR': SituationChoices.ENTREPRENEUR,
    'INDEPENDANT': SituationChoices.FREELANCE,
    'FREELANCE': SituationChoices.FREELANCE,
    'RETRAITE': SituationChoices.RETIRED,
    'RETIRED': SituationChoices.RETIRED,
    'SANS_EMPLOI': SituationChoices.JOB_SEEKER,
    'JOB_SEEKER': SituationChoices.JOB_SEEKER,
    'AUTRE': SituationChoices.OTHER,
    'OTHER': SituationChoices.OTHER,
}

STATUS_MAP = {
    'ACTIF': MemberStatusChoices.ACTIVE,
    'ACTIVE': MemberStatusChoices.ACTIVE,
    'EN_ATTENTE': MemberStatusChoices.ACTIVE,
    'INACTIF': MemberStatusChoices.INACTIVE,
    'INACTIVE': MemberStatusChoices.INACTIVE,
    'SUSPENDU': MemberStatusChoices.SUSPENDED,
    'SUSPENDED': MemberStatusChoices.SUSPENDED,
}

LEVEL_MAP = {
    'BAC': EducationLevelChoices.BAC,
    'BACCALAUREAT': EducationLevelChoices.BAC,
    'LICENCE 1': EducationLevelChoices.LICENCE_1,
    'LICENCE_1': EducationLevelChoices.LICENCE_1,
    'LICENCE 2': EducationLevelChoices.LICENCE_2,
    'LICENCE_2': EducationLevelChoices.LICENCE_2,
    'LICENCE': EducationLevelChoices.LICENCE_3,
    'LICENCE 3': EducationLevelChoices.LICENCE_3,
    'LICENCE_3': EducationLevelChoices.LICENCE_3,
    'MASTER 1': EducationLevelChoices.MASTER_1,
    'MASTER_1': EducationLevelChoices.MASTER_1,
    'MASTER': EducationLevelChoices.MASTER_2,
    'MASTER 2': EducationLevelChoices.MASTER_2,
    'MASTER_2': EducationLevelChoices.MASTER_2,
    'DOCTORAT': EducationLevelChoices.DOCTORAT,
    'THESE': EducationLevelChoices.DOCTORAT,
    'BTS': EducationLevelChoices.BTS_DUT,
    'DUT': EducationLevelChoices.BTS_DUT,
    'BTS_DUT': EducationLevelChoices.BTS_DUT,
}


class Command(BaseCommand):
    help = "Migre les données exportées de Firestore vers PostgreSQL (Neon)."

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            type=str,
            help="Chemin vers le fichier JSON contenant l'export Firestore."
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help="Simule la migration sans enregistrer dans la base de données."
        )

    def handle(self, *args, **options):
        file_path = options.get('file')
        dry_run = options.get('dry_run', False)

        if not file_path:
            self.stdout.write(self.style.ERROR("Erreur: --file est obligatoire."))
            return

        if not os.path.exists(file_path):
            raise CommandError(f"Le fichier spécifié n'existe pas : {file_path}")

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                raw_data = json.load(f)
        except Exception as e:
            raise CommandError(f"Erreur lors de la lecture du fichier JSON : {e}")

        # Accepter soit une liste brute, soit un dictionnaire avec clé 'members'
        members_data = raw_data if isinstance(raw_data, list) else raw_data.get('members', [])

        self.stdout.write(self.style.MIGRATE_HEADING(
            f"=== DÉBUT MIGRATION FIRESTORE ➔ POSTGRESQL {'(SIMULATION)' if dry_run else ''} ==="
        ))
        self.stdout.write(f"Nombre de fiches membres détectées : {len(members_data)}")

        stats = {
            'members_created': 0,
            'members_updated': 0,
            'contacts_created': 0,
            'educations_created': 0,
            'professions_created': 0,
            'roles_created': 0,
            'errors': 0,
        }

        with transaction.atomic():
            for idx, item in enumerate(members_data, start=1):
                try:
                    self._process_member(item, stats, dry_run)
                except Exception as exc:
                    stats['errors'] += 1
                    self.stdout.write(self.style.WARNING(
                        f"[{idx}/{len(members_data)}] Erreur sur le membre {item.get('id', idx)}: {exc}"
                    ))

            if dry_run:
                transaction.set_rollback(True)
                self.stdout.write(self.style.SUCCESS("\n[DRY RUN] Simulation terminée avec succès. Aucun changement persistant."))
            else:
                log_audit_event(
                    action=AuditActionChoices.IMPORT,
                    entity='Database',
                    entity_id='firestore_migration',
                    new_values=stats
                )

        self._print_summary(stats, dry_run)

    def _process_member(self, item, stats, dry_run):
        # 1. Extraction et mapping identité
        first_name = item.get('prenom') or item.get('first_name', '').strip()
        last_name = item.get('nom') or item.get('last_name', '').strip()
        if not first_name or not last_name:
            raise ValueError("Prénom et Nom sont obligatoires.")

        arabic_name = item.get('nomArabe') or item.get('arabic_name')
        raw_gender = str(item.get('sexe') or item.get('gender', 'M')).upper()
        gender = GenderChoices.FEMALE if raw_gender in ['F', 'FEMME'] else GenderChoices.MALE

        raw_situation = str(item.get('situation', 'OTHER')).upper()
        situation = SITUATION_MAP.get(raw_situation, SituationChoices.OTHER)

        raw_status = str(item.get('statutCompte') or item.get('status', 'ACTIVE')).upper()
        status_choice = STATUS_MAP.get(raw_status, MemberStatusChoices.ACTIVE)

        privacy_settings = item.get('privacy', {})
        phone_visible = False
        if privacy_settings.get('showPhone') == 'MEMBRES' or item.get('phone_visible_to_members') is True:
            phone_visible = True

        birth_date = None
        if item.get('dateNaissance') or item.get('birth_date'):
            raw_bdate = item.get('dateNaissance') or item.get('birth_date')
            try:
                birth_date = datetime.strptime(str(raw_bdate)[:10], '%Y-%m-%d').date()
            except Exception:
                birth_date = None

        matricule = item.get('matricule')

        # Recherche ou création par matricule ou nom/prénom
        member = None
        if matricule:
            member = Member.objects.filter(matricule=matricule).first()
        if not member:
            member = Member.objects.filter(first_name__iexact=first_name, last_name__iexact=last_name).first()

        notes = item.get('notes') or item.get('notesInternes') or ''
        if arabic_name and arabic_name not in notes:
            notes = f"Nom en arabe: {arabic_name}\n{notes}".strip()

        if member:
            member.situation = situation
            member.status = status_choice
            if notes:
                member.notes = notes
            if birth_date:
                member.birth_date = birth_date
            if not dry_run:
                member.save()
            stats['members_updated'] += 1
        else:
            member = Member(
                first_name=first_name,
                last_name=last_name,
                gender=gender,
                birth_date=birth_date,
                situation=situation,
                status=status_choice,
                visibility_level=VisibilityChoices.INTERNAL,
                notes=notes or None
            )
            if matricule:
                member.matricule = matricule
            if not dry_run:
                member.save()
            stats['members_created'] += 1

        # 2. Contacts (téléphone principal & secondaire)
        phone_primary = item.get('telephone') or item.get('phone')
        if phone_primary:
            self._upsert_contact(
                member=member,
                raw_phone=phone_primary,
                is_primary=True,
                phone_visible=phone_visible,
                email=item.get('email'),
                city=item.get('ville', 'Dakar'),
                country=item.get('pays', 'Sénégal'),
                address=item.get('adresse'),
                stats=stats,
                dry_run=dry_run
            )

        phone_sec = item.get('telephoneSecondaire')
        if phone_sec:
            self._upsert_contact(
                member=member,
                raw_phone=phone_sec,
                is_primary=False,
                phone_visible=phone_visible,
                email=None,
                city=item.get('ville', 'Dakar'),
                country=item.get('pays', 'Sénégal'),
                address=None,
                stats=stats,
                dry_run=dry_run
            )

        # 3. Formations / Éducation
        formations = item.get('formations', [])
        for f in formations:
            self._process_formation(member, f, stats, dry_run)

        # 4. Professions
        professions = item.get('professions', [])
        for p in professions:
            self._process_profession(member, p, stats, dry_run)

        # 5. Fonctions Dahirah / Rôles
        fonctions = item.get('fonctionsDahirah', [])
        for fn in fonctions:
            self._process_role(member, fn, stats, dry_run)

    def _upsert_contact(self, member, raw_phone, is_primary, phone_visible, email, city, country, address, stats, dry_run):
        try:
            cleaned_phone = validate_and_normalize_phone(raw_phone, default_country='SN')
        except Exception:
            cleaned_phone = raw_phone.strip()

        if not dry_run:
            contact = Contact.objects.filter(member=member, phone=cleaned_phone).first()
            if not contact:
                if is_primary:
                    Contact.objects.filter(member=member, is_primary=True).update(is_primary=False)
                Contact.objects.create(
                    member=member,
                    phone=cleaned_phone,
                    phone_visible_to_members=phone_visible,
                    email=email,
                    city=city or 'Dakar',
                    country=country or 'Sénégal',
                    address=address,
                    is_primary=is_primary
                )
                stats['contacts_created'] += 1
        else:
            stats['contacts_created'] += 1

    def _process_formation(self, member, f_item, stats, dry_run):
        institution = f_item.get('etablissement') or f_item.get('institution') or 'Université / Institut'
        field = f_item.get('domaine') or f_item.get('field') or 'Général'
        raw_level = str(f_item.get('niveau') or f_item.get('level', 'OTHER')).upper().strip()
        level = LEVEL_MAP.get(raw_level, EducationLevelChoices.OTHER)
        diploma = f_item.get('diplome') or f_item.get('diploma')
        raw_annee = f_item.get('annee') or f_item.get('start_year', 2020)
        try:
            start_year = int(str(raw_annee)[:4])
        except Exception:
            start_year = 2020

        if not dry_run:
            Education.objects.get_or_create(
                member=member,
                institution=institution,
                field=field,
                level=level,
                defaults={
                    'diploma': diploma,
                    'start_year': start_year,
                    'status': EducationStatusChoices.COMPLETED
                }
            )
        stats['educations_created'] += 1

    def _process_profession(self, member, p_item, stats, dry_run):
        job_title = p_item.get('metier') or p_item.get('title') or 'Professionnel'
        category_name = p_item.get('secteur') or p_item.get('category') or 'Divers & Services'
        organization = p_item.get('activite') or p_item.get('organization')
        is_primary = p_item.get('isPrincipale', True)

        if not dry_run:
            cat, _ = ProfessionCategory.objects.get_or_create(name=category_name)
            prof, _ = Profession.objects.get_or_create(category=cat, name=job_title)
            MemberProfession.objects.get_or_create(
                member=member,
                profession=prof,
                is_current=True,
                defaults={
                    'title': job_title,
                    'organization': organization,
                    'is_primary': is_primary
                }
            )
        stats['professions_created'] += 1

    def _process_role(self, member, fn_item, stats, dry_run):
        role_title = fn_item.get('role') or fn_item.get('name') or 'Membre'
        role_code = re.sub(r'[^A-Z0-9_]', '_', role_title.upper().strip())[:40]

        if not dry_run:
            role, _ = Role.objects.get_or_create(
                code=role_code,
                defaults={
                    'name': role_title,
                    'category': RoleCategoryChoices.SPIRITUAL if 'ZAKIR' in role_code else RoleCategoryChoices.COMMUNITY
                }
            )
            MemberRole.objects.get_or_create(
                member=member,
                role=role,
                is_current=fn_item.get('isActif', True),
                defaults={'notes': fn_item.get('pole')}
            )
        stats['roles_created'] += 1

    def _print_summary(self, stats, dry_run):
        self.stdout.write("\n" + "=" * 50)
        self.stdout.write("BILAN DE LA MIGRATION FIRESTORE :")
        self.stdout.write(f"- Membres créés      : {stats['members_created']}")
        self.stdout.write(f"- Membres mis à jour : {stats['members_updated']}")
        self.stdout.write(f"- Contacts créés     : {stats['contacts_created']}")
        self.stdout.write(f"- Formations créées  : {stats['educations_created']}")
        self.stdout.write(f"- Métiers associés   : {stats['professions_created']}")
        self.stdout.write(f"- Fonctions Dahirah  : {stats['roles_created']}")
        self.stdout.write(f"- Erreurs rencontrées: {stats['errors']}")
        self.stdout.write("=" * 50 + "\n")
