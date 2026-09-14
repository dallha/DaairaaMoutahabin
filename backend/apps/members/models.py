import uuid
import re
import unicodedata
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from common.constants import UserRole
from .models_media import MemberMedia, MediaTypeChoices

try:
    import phonenumbers
    from phonenumbers import NumberParseException
    PHONENUMBERS_AVAILABLE = True
except ImportError:
    PHONENUMBERS_AVAILABLE = False


# ==============================================================================
# 1. GESTION DU SOFT DELETE & QUERYSET SÉCURISÉ
# ==============================================================================

class MemberQuerySet(models.QuerySet):
    """
    QuerySet personnalisé empêchant la suppression physique accidentelle en masse.
    Member.objects.filter(...).delete() effectue désormais un soft delete.
    """
    def delete(self):
        """Surcharge delete() sur le QuerySet pour effectuer un soft delete en masse."""
        return self.update(is_deleted=True, updated_at=timezone.now())

    def hard_delete(self):
        """Suppression physique définitive en masse, explicitement réservée à l'administration."""
        return super().delete()

    def restore(self):
        """Restauration en masse des membres archivés."""
        return self.update(is_deleted=False, updated_at=timezone.now())

    def alive(self):
        """Filtre les membres non supprimés."""
        return self.filter(is_deleted=False)

    def dead(self):
        """Filtre les membres supprimés logiquement."""
        return self.filter(is_deleted=True)


class ActiveMemberManager(models.Manager.from_queryset(MemberQuerySet)):
    """Manager par défaut excluant systématiquement les membres soft-deleted (is_deleted=True)."""
    def get_queryset(self):
        return super().get_queryset().filter(is_deleted=False)


class AllMemberManager(models.Manager.from_queryset(MemberQuerySet)):
    """Manager exhaustif incluant tous les membres (actifs et archivés) pour l'audit et l'administration."""
    def get_queryset(self):
        return super().get_queryset()


# ==============================================================================
# 2. COMPTEUR SÉQUENTIEL CONCURRENT-SAFE POUR MATRICULE
# ==============================================================================

class MatriculeSequence(models.Model):
    """
    Table de séquence dédiée garantissant l'absence totale de collision lors de la
    génération simultanée de matricules sous forte concurrence (PostgreSQL select_for_update).
    Format : DAMF-XXXX (numérotation séquentielle pérenne).
    """
    prefix = models.CharField(_('Préfixe institutionnel'), max_length=10, default='DAMF', unique=True)
    year = models.PositiveIntegerField(_('Année (historique)'), null=True, blank=True)
    last_sequence = models.PositiveIntegerField(_('Dernier numéro de séquence'), default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('Séquence Matricule')
        verbose_name_plural = _('Séquences Matricules')

    def __str__(self):
        return f"{self.prefix} : dernier numéro = {self.last_sequence:04d}"


# ==============================================================================
# 3. ENUMS & CHOIX MÉTIER
# ==============================================================================

class GenderChoices(models.TextChoices):
    MALE = 'M', _('Masculin')
    FEMALE = 'F', _('Féminin')


class SituationChoices(models.TextChoices):
    STUDENT = 'STUDENT', _('Étudiant')
    PUPIL = 'PUPIL', _('Élève')
    EMPLOYEE = 'EMPLOYEE', _('Salarié')
    ENTREPRENEUR = 'ENTREPRENEUR', _('Entrepreneur')
    FREELANCE = 'FREELANCE', _('Indépendant / Freelance')
    RETIRED = 'RETIRED', _('Retraité')
    JOB_SEEKER = 'JOB_SEEKER', _('En recherche d’emploi')
    OTHER = 'OTHER', _('Autre')


class MemberStatusChoices(models.TextChoices):
    ACTIVE = 'ACTIVE', _('Actif')
    INACTIVE = 'INACTIVE', _('Inactif')
    SUSPENDED = 'SUSPENDED', _('Suspendu')


class VisibilityChoices(models.TextChoices):
    PUBLIC = 'PUBLIC', _('Public (Annuaire ouvert)')
    INTERNAL = 'INTERNAL', _('Interne (Membres connectés uniquement)')
    RESTRICTED = 'RESTRICTED', _('Restreint (Administration uniquement)')


# ==============================================================================
# 4. MODÈLE MEMBER (NOYAU IDENTITÉ)
# ==============================================================================

class Member(models.Model):
    """
    Entité principale représentant un adhérent de la Dahirah.
    Sépare strictement l'identité et la situation civile des métiers, formations et fonctions cultuelles.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='member_profile',
        verbose_name=_('Compte utilisateur lié')
    )
    matricule = models.CharField(
        _('Matricule'),
        max_length=20,
        unique=True,
        db_index=True,
        help_text=_('Format concurrent-safe garanti : DAMF-XXXX (ex: DAMF-0001)')
    )
    first_name = models.CharField(_('Prénom'), max_length=100)
    last_name = models.CharField(_('Nom'), max_length=100, blank=True, default='')
    gender = models.CharField(_('Genre'), max_length=1, choices=GenderChoices.choices)
    birth_date = models.DateField(_('Date de naissance'), null=True, blank=True)
    situation = models.CharField(
        _('Situation'),
        max_length=30,
        choices=SituationChoices.choices,
        default=SituationChoices.OTHER
    )
    photo = models.ImageField(_('Photo'), upload_to='members/photos/', null=True, blank=True)
    status = models.CharField(
        _('Statut'),
        max_length=20,
        choices=MemberStatusChoices.choices,
        default=MemberStatusChoices.ACTIVE
    )
    visibility_level = models.CharField(
        _('Niveau de visibilité'),
        max_length=20,
        choices=VisibilityChoices.choices,
        default=VisibilityChoices.INTERNAL
    )
    is_founder = models.BooleanField(
        _('Fondateur / Guide Spirituel'),
        default=False,
        db_index=True,
        help_text=_('Priorité institutionnelle et protocolaire majeure.')
    )
    is_president = models.BooleanField(
        _('Président de la Dahirah'),
        default=False,
        db_index=True,
        help_text=_('Direction exécutive et organisationnelle de la Dahirah.')
    )
    institutional_priority = models.PositiveSmallIntegerField(
        _('Priorité protocolaire'),
        default=100,
        db_index=True,
        help_text=_('1 = Guide Spirituel / Fondateur, 2 = Président de la Dahirah, 100 = Membres ordinaires.')
    )
    canonical_name = models.CharField(
        _('Nom canonique de tri'),
        max_length=200,
        blank=True,
        default='',
        db_index=True,
        help_text=_('Nom complet normalisé sans accents pour le tri alphabétique strict A-Z.')
    )
    joined_at = models.DateField(_('Date d’adhésion'), default=timezone.now)
    notes = models.TextField(_('Notes internes'), blank=True, null=True)
    is_deleted = models.BooleanField(_('Supprimé (Soft Delete)'), default=False, db_index=True)
    created_at = models.DateTimeField(_('Créé le'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Modifié le'), auto_now=True)

    # Managers
    objects = ActiveMemberManager()
    all_objects = AllMemberManager()

    class Meta:
        verbose_name = _('Membre')
        verbose_name_plural = _('Membres')
        ordering = ['institutional_priority', 'canonical_name']
        indexes = [
            models.Index(fields=['institutional_priority', 'canonical_name'], name='idx_members_inst_canon'),
            models.Index(fields=['last_name', 'first_name'], name='idx_members_names'),
            models.Index(fields=['situation'], name='idx_members_situation'),
            models.Index(fields=['status', 'is_deleted'], name='idx_members_status_del'),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['is_founder'],
                condition=models.Q(is_founder=True, is_deleted=False),
                name='unique_active_founder_per_dahirah'
            ),
            models.UniqueConstraint(
                fields=['is_president'],
                condition=models.Q(is_president=True, is_deleted=False),
                name='unique_active_president_per_dahirah'
            ),
        ]

    @property
    def display_name(self) -> str:
        """Propriété calculée combinant prénom et nom (aucune colonne en base)."""
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def institutional_role_code(self) -> str:
        """Code institutionnel canonique pour le frontend (FOUNDER, PRESIDENT, MEMBER)."""
        if self.is_founder:
            return 'FOUNDER'
        if self.is_president:
            return 'PRESIDENT'
        return 'MEMBER'

    @property
    def institutional_role_name(self) -> str:
        """Libellé officiel du rôle institutionnel."""
        if self.is_founder:
            return str(_('Guide Spirituel & Fondateur'))
        if self.is_president:
            return str(_('Président de la Dahirah'))
        return str(_('Membre de la Dahirah'))

    @property
    def current_profile_photo(self):
        """Renvoie le média MemberMedia actif servant d'avatar pour le membre."""
        return self.media_files.filter(
            media_type=MediaTypeChoices.PROFILE_PHOTO,
            is_current_profile_photo=True
        ).first()

    def delete(self, using=None, keep_parents=False):
        """Suppression logique (Soft Delete) de l'instance."""
        self.is_deleted = True
        self.save(update_fields=['is_deleted', 'updated_at'])

    def restore(self):
        """Restauration d'un membre soft-deleted."""
        self.is_deleted = False
        self.save(update_fields=['is_deleted', 'updated_at'])

    def hard_delete(self):
        """Suppression physique définitive réservée à l'administration."""
        super().delete()

    @classmethod
    def generate_next_matricule(cls, prefix: str = 'DAMF', year: int = None) -> str:
        """
        Génère de manière atomique et thread-safe le prochain matricule officiel séquentiel.
        Format normalisé : DAMF-0001, DAMF-0002, etc.
        """
        with transaction.atomic():
            sequence_record, _ = MatriculeSequence.objects.select_for_update().get_or_create(
                prefix=prefix,
                defaults={'last_sequence': 0}
            )
            sequence_record.last_sequence += 1
            sequence_record.save(update_fields=['last_sequence', 'updated_at'])
            return f"{prefix}-{sequence_record.last_sequence:04d}"

    def clean(self):
        super().clean()
        if self.is_founder and self.is_president:
            raise ValidationError({
                'is_president': _('Le Guide Spirituel & Fondateur et le Président de la Dahirah sont deux entités distinctes.')
            })
        if self.is_founder:
            existing_founder = Member.all_objects.filter(is_founder=True, is_deleted=False).exclude(pk=self.pk)
            if existing_founder.exists():
                raise ValidationError({
                    'is_founder': _('Un seul membre de la Dahirah peut porter le statut de Fondateur (DAMF-0001).')
                })
            self.institutional_priority = 1
        elif self.is_president:
            existing_president = Member.all_objects.filter(is_president=True, is_deleted=False).exclude(pk=self.pk)
            if existing_president.exists():
                raise ValidationError({
                    'is_president': _('Un seul membre de la Dahirah peut être Président en exercice à la fois.')
                })
            self.institutional_priority = 2
        else:
            if self.institutional_priority in (1, 2):
                self.institutional_priority = 100

        if self.institutional_priority == 1 and not self.is_founder:
            raise ValidationError({
                'institutional_priority': _('La priorité protocolaire 1 est strictement réservée au Fondateur.')
            })
        if self.institutional_priority == 2 and not self.is_president:
            raise ValidationError({
                'institutional_priority': _('La priorité protocolaire 2 est strictement réservée au Président de la Dahirah.')
            })

    def save(self, *args, **kwargs):
        if hasattr(self.joined_at, 'date'):
            self.joined_at = self.joined_at.date()
        if not self.matricule:
            self.matricule = self.generate_next_matricule()
        full_name = f"{self.first_name} {self.last_name}".strip()
        norm = ''.join(c for c in unicodedata.normalize('NFD', full_name) if unicodedata.category(c) != 'Mn')
        self.canonical_name = norm.upper()

        if self.pk:
            orig = Member.all_objects.filter(pk=self.pk).values('is_founder', 'is_president', 'institutional_priority').first()
            if orig:
                if (orig['is_founder'] != self.is_founder or orig['is_president'] != self.is_president or orig['institutional_priority'] != self.institutional_priority) and not getattr(self, '_allow_institutional_override', False):
                    import logging
                    logger = logging.getLogger('security.governance')
                    logger.warning(
                        "SECURITY AUDIT: Tentative non autorisée de modification des attributs institutionnels du membre %s (PK: %s) : founder (%s -> %s), president (%s -> %s), priority (%s -> %s)",
                        self.matricule, self.pk, orig['is_founder'], self.is_founder, orig['is_president'], self.is_president, orig['institutional_priority'], self.institutional_priority
                    )
                    raise ValidationError(
                        _("Modification interdite : les attributs institutionnels (Fondateur, Président, Priorité) sont sacralisés et protégés.")
                    )

        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.display_name} ({self.matricule})"


# ==============================================================================
# 5. PIPELINE VALIDATION & NORMALISATION TÉLÉPHONIQUE (SÉNÉGAL / INTERNATIONAL)
# ==============================================================================

def validate_and_normalize_phone(raw_phone: str, default_country: str = 'SN') -> str:
    """
    Pipeline strict en 5 étapes :
    1. Nettoyage des espaces et séparateurs.
    2. Inférence de l'indicatif régional sénégalais (+221) si numéro local à 9 chiffres.
    3. Parsing syntaxique via phonenumbers (ou fallback regex ARTP Sénégal).
    4. Validation de la validité du numéro (longueur, opérateurs valides 70, 75, 76, 77, 78, 33...).
    5. Formatage E.164 officiel pour stockage en base. Rejet strict par ValidationError si invalide.
    """
    if not raw_phone:
        raise ValidationError(_("Le numéro de téléphone ne peut pas être vide."))

    cleaned = re.sub(r'[\s.\-_()]', '', raw_phone.strip())

    # Inférence automatique du préfixe sénégalais pour saisie locale à 9 chiffres
    if re.match(r'^[37]\d{8}$', cleaned):
        cleaned = f"+221{cleaned}"
    elif cleaned.startswith('00221'):
        cleaned = f"+{cleaned[2:]}"
    elif cleaned.startswith('221') and len(cleaned) == 12:
        cleaned = f"+{cleaned}"
    elif not cleaned.startswith('+'):
        cleaned = f"+{cleaned}"

    # Validation avec la bibliothèque phonenumbers si présente
    if PHONENUMBERS_AVAILABLE:
        try:
            parsed = phonenumbers.parse(cleaned, default_country)
        except NumberParseException as e:
            raise ValidationError(
                _("Format de numéro de téléphone invalide : %(error)s"),
                params={'error': str(e)}
            )

        if not phonenumbers.is_valid_number(parsed):
            raise ValidationError(
                _("Le numéro '%(phone)s' n'est pas un numéro valide selon les standards de télécommunication."),
                params={'phone': raw_phone}
            )

        return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)

    # Fallback robuste regex ARTP Sénégal (+221 suivi de 33, 70, 75, 76, 77, 78 + 7 chiffres)
    senegal_pattern = r'^\+221(33|70|75|76|77|78)\d{7}$'
    general_e164_pattern = r'^\+[1-9]\d{7,14}$'

    if cleaned.startswith('+221'):
        if not re.match(senegal_pattern, cleaned):
            raise ValidationError(
                _("Le numéro sénégalais '%(phone)s' est invalide (doit débuter par 70, 75, 76, 77, 78 ou 33 et contenir 9 chiffres)."),
                params={'phone': raw_phone}
            )
    else:
        if not re.match(general_e164_pattern, cleaned):
            raise ValidationError(
                _("Le numéro international '%(phone)s' ne respecte pas la norme E.164."),
                params={'phone': raw_phone}
            )

    return cleaned


# ==============================================================================
# 6. MODÈLE CONTACT
# ==============================================================================

class Contact(models.Model):
    """
    Coordonnées téléphoniques et postales des membres.
    Supporte plusieurs numéros par membre avec validation et normalisation E.164 strictes.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    member = models.ForeignKey(
        Member,
        on_delete=models.CASCADE,
        related_name='contacts',
        verbose_name=_('Membre')
    )
    phone = models.CharField(_('Téléphone'), max_length=30, blank=True, default='')
    phone_visible_to_members = models.BooleanField(
        _('Téléphone visible aux membres'),
        default=False,
        help_text=_("Consentement explicite pour afficher le téléphone aux membres.")
    )
    whatsapp = models.CharField(_('WhatsApp'), max_length=30, null=True, blank=True)
    email = models.EmailField(_('Email personnel'), null=True, blank=True)
    address = models.TextField(_('Adresse physique'), null=True, blank=True)
    city = models.CharField(_('Ville'), max_length=100, default='Dakar')
    country = models.CharField(_('Pays'), max_length=100, default='Sénégal')
    is_primary = models.BooleanField(_('Contact principal'), default=True)
    created_at = models.DateTimeField(_('Créé le'), auto_now_add=True)

    class Meta:
        verbose_name = _('Contact')
        verbose_name_plural = _('Contacts')
        ordering = ['-is_primary', '-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['member'],
                condition=models.Q(is_primary=True),
                name='unique_primary_contact_per_member'
            )
        ]

    def clean(self):
        """Validation stricte avant enregistrement."""
        super().clean()
        if self.phone:
            self.phone = validate_and_normalize_phone(self.phone, default_country='SN')
        if self.whatsapp:
            self.whatsapp = validate_and_normalize_phone(self.whatsapp, default_country='SN')

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.phone} ({'Principal' if self.is_primary else 'Secondaire'})"
