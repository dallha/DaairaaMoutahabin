import uuid
from django.conf import settings
from django.db import models
from django.utils.text import slugify
from django.utils.translation import gettext_lazy as _


# ==============================================================================
# 1. RÉFÉRENTIELS ET COMPÉTENCES (SKILLS)
# ==============================================================================

class SkillCategory(models.Model):
    """
    Catégorie thématique de compétences (ex: Informatique & Numérique, Gestion & Finance, Droit, etc.).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(_('Nom de la catégorie'), max_length=100, unique=True)
    slug = models.SlugField(_('Slug'), max_length=100, unique=True, blank=True)
    display_order = models.PositiveSmallIntegerField(_('Ordre d’affichage'), default=0)

    class Meta:
        verbose_name = _('Catégorie de compétence')
        verbose_name_plural = _('Catégories de compétences')
        ordering = ['display_order', 'name']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Skill(models.Model):
    """
    Compétence normalisée (ex: Développement Web, Droit du travail, Infographie, Pédagogie, Comptabilité).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    category = models.ForeignKey(
        SkillCategory,
        on_delete=models.PROTECT,
        related_name='skills',
        verbose_name=_('Catégorie')
    )
    name = models.CharField(_('Nom de la compétence'), max_length=120, unique=True)
    slug = models.SlugField(_('Slug'), max_length=120, unique=True, blank=True)
    is_active = models.BooleanField(_('Actif'), default=True)

    class Meta:
        verbose_name = _('Compétence')
        verbose_name_plural = _('Compétences')
        ordering = ['category__display_order', 'name']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.category.name})"


class SkillLevelChoices(models.TextChoices):
    BEGINNER = 'BEGINNER', _('Débutant / Notions')
    INTERMEDIATE = 'INTERMEDIATE', _('Intermédiaire / Pratiquant')
    ADVANCED = 'ADVANCED', _('Avancé / Confirmé')
    EXPERT = 'EXPERT', _('Expert / Référent')


class MemberSkill(models.Model):
    """
    Association M:N entre un membre et une compétence avec niveau de maîtrise
    et traçabilité de validation administrative.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    member = models.ForeignKey(
        'members.Member',
        on_delete=models.CASCADE,
        related_name='skills',
        verbose_name=_('Membre')
    )
    skill = models.ForeignKey(
        Skill,
        on_delete=models.PROTECT,
        related_name='member_skills',
        verbose_name=_('Compétence')
    )
    level = models.CharField(
        _('Niveau de maîtrise'),
        max_length=20,
        choices=SkillLevelChoices.choices,
        default=SkillLevelChoices.INTERMEDIATE
    )
    years_experience = models.PositiveSmallIntegerField(
        _('Années d’expérience'),
        null=True,
        blank=True
    )
    is_verified = models.BooleanField(
        _('Compétence validée administrativement'),
        default=False,
        help_text=_('Vérifié par un référent ou administrateur de la Dahirah')
    )
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_skills',
        verbose_name=_('Validé par')
    )
    verified_at = models.DateTimeField(
        _('Validé le'),
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(_('Déclaré le'), auto_now_add=True)

    class Meta:
        verbose_name = _('Compétence du membre')
        verbose_name_plural = _('Compétences des membres')
        ordering = ['-is_verified', 'skill__name']
        constraints = [
            models.UniqueConstraint(fields=['member', 'skill'], name='unique_member_skill')
        ]

    def __str__(self):
        status_str = " (Vérifié)" if self.is_verified else ""
        return f"{self.member} - {self.skill.name} [{self.get_level_display()}]{status_str}"


# ==============================================================================
# 2. SERVICES & ENTRAIDE COMMUNAUTAIRE
# ==============================================================================

class ServiceTypeChoices(models.TextChoices):
    VOLUNTEER = 'VOLUNTEER', _('Entraide Communautaire & Bénévolat')
    DAHIRAH_RATE = 'DAHIRAH_RATE', _('Prestation Pro (Tarif Préférentiel Dahirah)')
    STANDARD = 'STANDARD', _('Prestation Commerciale Standard')
    MENTORSHIP = 'MENTORSHIP', _('Mentorat & Partage d’expérience')


class ContactModeChoices(models.TextChoices):
    INTERNAL_MESSAGE = 'INTERNAL_MESSAGE', _('Message interne')
    WHATSAPP = 'WHATSAPP', _('WhatsApp')
    PHONE = 'PHONE', _('Appel téléphonique')
    OTHER = 'OTHER', _('Autre mode convenu')


class ServiceCatalog(models.Model):
    """
    Catalogue standard des types de services (ex: Conseil Juridique, Graphisme, Couture, Plomberie, etc.).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(_('Intitulé du service'), max_length=150, unique=True)
    description = models.TextField(_('Description générale'), blank=True, null=True)
    display_order = models.PositiveSmallIntegerField(_('Ordre d’affichage'), default=0)

    class Meta:
        verbose_name = _('Service du catalogue')
        verbose_name_plural = _('Catalogue des services')
        ordering = ['display_order', 'name']

    def __str__(self):
        return self.name


class MemberService(models.Model):
    """
    Offre concrète de service ou d'entraide proposée par un membre aux disciples.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    member = models.ForeignKey(
        'members.Member',
        on_delete=models.CASCADE,
        related_name='services_offered',
        verbose_name=_('Membre prestataire / proposant')
    )
    service = models.ForeignKey(
        ServiceCatalog,
        on_delete=models.PROTECT,
        related_name='member_services',
        verbose_name=_('Type de service')
    )
    title = models.CharField(_('Titre de l’offre'), max_length=150)
    description = models.TextField(_('Détails & Périmètre'))
    service_type = models.CharField(
        _('Modalité d’entraide'),
        max_length=20,
        choices=ServiceTypeChoices.choices,
        default=ServiceTypeChoices.DAHIRAH_RATE
    )
    terms = models.CharField(
        _('Conditions ou tarif Dahirah'),
        max_length=200,
        blank=True,
        null=True,
        help_text=_('Ex: Gratuit pour étudiants, remise de 30% sur devis standard')
    )
    contact_mode = models.CharField(
        _('Mode de contact privilégié'),
        max_length=20,
        choices=ContactModeChoices.choices,
        default=ContactModeChoices.INTERNAL_MESSAGE,
        help_text=_('Protège les coordonnées personnelles du membre')
    )
    is_active = models.BooleanField(_('Offre active'), default=True)
    created_at = models.DateTimeField(_('Créé le'), auto_now_add=True)

    class Meta:
        verbose_name = _('Offre de service membre')
        verbose_name_plural = _('Offres de services membres')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} par {self.member} ({self.get_service_type_display()})"


# ==============================================================================
# 3. DISPONIBILITÉ & ENGAGEMENT DU MEMBRE
# ==============================================================================

class AvailabilityStatusChoices(models.TextChoices):
    NOT_SPECIFIED = 'NOT_SPECIFIED', _('Non renseigné')
    AVAILABLE = 'AVAILABLE', _('Disponible')
    LIMITED = 'LIMITED', _('Disponibilité partielle')
    BUSY = 'BUSY', _('Très peu disponible')
    UNAVAILABLE = 'UNAVAILABLE', _('Non disponible actuellement')


class MemberAvailability(models.Model):
    """
    Profil de disponibilité d'un membre pour les sollicitations et l'entraide de la communauté.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    member = models.OneToOneField(
        'members.Member',
        on_delete=models.CASCADE,
        related_name='availability',
        verbose_name=_('Membre')
    )
    status = models.CharField(
        _('Statut de disponibilité'),
        max_length=20,
        choices=AvailabilityStatusChoices.choices,
        default=AvailabilityStatusChoices.NOT_SPECIFIED
    )
    open_for_mentoring = models.BooleanField(
        _('Ouvert au mentorat d’élèves / étudiants'),
        default=False
    )
    open_for_dahirah_events = models.BooleanField(
        _('Mobilisable pour les événements & Gamou/Ziarra'),
        default=False
    )
    open_for_pro_help = models.BooleanField(
        _('Disponible pour conseil pro entre disciples'),
        default=False
    )
    open_for_volunteer = models.BooleanField(
        _('Prêt pour des missions bénévoles d’intérêt Dahirah'),
        default=False
    )
    weekly_hours_available = models.PositiveSmallIntegerField(
        _('Heures estimées par semaine'),
        null=True,
        blank=True
    )
    preferred_contact_method = models.CharField(
        _('Méthode de contact préférée'),
        max_length=50,
        blank=True,
        default="Message interne"
    )
    notes = models.TextField(_('Précisions de disponibilité'), blank=True, null=True)
    updated_at = models.DateTimeField(_('Mis à jour le'), auto_now=True)

    class Meta:
        verbose_name = _('Disponibilité du membre')
        verbose_name_plural = _('Disponibilités des membres')

    def __str__(self):
        return f"Disponibilité de {self.member} : {self.get_status_display()}"


# ==============================================================================
# 4. RÉSEAU RELATIONNEL INTER-MEMBRES
# ==============================================================================

class RelationTypeChoices(models.TextChoices):
    SPONSOR = 'SPONSOR', _('Parrain / Marraine d’intégration')
    MENTOR = 'MENTOR', _('Mentor / Accompagnateur')
    COLLABORATOR = 'COLLABORATOR', _('Collaborateur / Associé')
    FRATERNAL = 'FRATERNAL', _('Lien Fraternel / Recommandation')


class RelationStatusChoices(models.TextChoices):
    PENDING = 'PENDING', _('En attente de validation')
    APPROVED = 'APPROVED', _('Validé / Confirmé')
    REJECTED = 'REJECTED', _('Refusé')


class MemberRelation(models.Model):
    """
    Lien relationnel inter-membres (distinct des fonctions statutaires MemberRole de la Dahirah).
    Soumis à un statut d'approbation administrative pour préserver l'intégrité institutionnelle.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    from_member = models.ForeignKey(
        'members.Member',
        on_delete=models.CASCADE,
        related_name='initiated_relations',
        verbose_name=_('Membre source')
    )
    to_member = models.ForeignKey(
        'members.Member',
        on_delete=models.CASCADE,
        related_name='received_relations',
        verbose_name=_('Membre cible')
    )
    relation_type = models.CharField(
        _('Nature de la relation'),
        max_length=20,
        choices=RelationTypeChoices.choices
    )
    status = models.CharField(
        _('Statut de validation'),
        max_length=20,
        choices=RelationStatusChoices.choices,
        default=RelationStatusChoices.PENDING
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_relations',
        verbose_name=_('Validé par')
    )
    approved_at = models.DateTimeField(
        _('Validé le'),
        null=True,
        blank=True
    )
    notes = models.CharField(_('Note ou contexte'), max_length=200, blank=True, null=True)
    created_at = models.DateTimeField(_('Déclaré le'), auto_now_add=True)

    class Meta:
        verbose_name = _('Relation inter-membres')
        verbose_name_plural = _('Relations inter-membres')
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['from_member', 'to_member', 'relation_type'],
                name='unique_member_relation'
            ),
            models.CheckConstraint(
                check=~models.Q(from_member=models.F('to_member')),
                name='prevent_self_relation'
            )
        ]

    def __str__(self):
        return f"{self.from_member} ➔ {self.to_member} ({self.get_relation_type_display()} - {self.get_status_display()})"


# ==============================================================================
# 5. BESOINS & RECHERCHE D'ENTRAIDE COMMUNAUTAIRE (MEMBER NEED)
# ==============================================================================

class NeedTypeChoices(models.TextChoices):
    MENTORSHIP = 'MENTORSHIP', _('Recherche de mentorat')
    INTERNSHIP = 'INTERNSHIP', _('Recherche de stage')
    JOB_SEARCH = 'JOB_SEARCH', _('Recherche d’emploi')
    PRO_SERVICE = 'PRO_SERVICE', _('Prestation / Artisan de confiance')
    LEGAL_ADMIN = 'LEGAL_ADMIN', _('Conseil juridique ou administratif')
    ACADEMIC = 'ACADEMIC', _('Aide scolaire & universitaire')
    COMMUNITY_AID = 'COMMUNITY_AID', _('Entraide fraternelle')
    OTHER = 'OTHER', _('Autre besoin')


class NeedUrgencyChoices(models.TextChoices):
    NORMAL = 'NORMAL', _('Normal')
    HIGH = 'HIGH', _('Prioritaire')
    CRITICAL = 'CRITICAL', _('Urgent')


class NeedStatusChoices(models.TextChoices):
    OPEN = 'OPEN', _('Ouvert')
    IN_PROGRESS = 'IN_PROGRESS', _('En cours de traitement')
    RESOLVED = 'RESOLVED', _('Résolu / Pourvu')
    EXPIRED = 'EXPIRED', _('Expiré')
    CANCELLED = 'CANCELLED', _('Annulé')


class NeedVisibilityChoices(models.TextChoices):
    PUBLIC = 'PUBLIC', _('Visible à tous les membres connectés')
    INTERNAL = 'INTERNAL', _('Visible uniquement au réseau ciblé')
    RESTRICTED_ADMIN = 'RESTRICTED_ADMIN', _('Confidentiel (Administration uniquement)')


class MemberNeed(models.Model):
    """
    Expression d'un besoin ou d'une demande d'entraide formulée par un membre.
    Articulée avec MemberService et MemberSkill pour animer les mises en relation dans /network.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    member = models.ForeignKey(
        'members.Member',
        on_delete=models.CASCADE,
        related_name='needs',
        verbose_name=_('Membre demandeur')
    )
    need_type = models.CharField(
        _('Type de besoin'),
        max_length=30,
        choices=NeedTypeChoices.choices,
        default=NeedTypeChoices.OTHER
    )
    title = models.CharField(_('Intitulé de la demande'), max_length=150)
    description = models.TextField(_('Détails & Précisions'))
    urgency_level = models.CharField(
        _('Degré d’urgence'),
        max_length=20,
        choices=NeedUrgencyChoices.choices,
        default=NeedUrgencyChoices.NORMAL
    )
    status = models.CharField(
        _('Statut'),
        max_length=20,
        choices=NeedStatusChoices.choices,
        default=NeedStatusChoices.OPEN
    )
    visibility_level = models.CharField(
        _('Visibilité'),
        max_length=25,
        choices=NeedVisibilityChoices.choices,
        default=NeedVisibilityChoices.PUBLIC
    )
    is_anonymous = models.BooleanField(
        _('Anonymiser auprès des pairs'),
        default=False,
        help_text=_('Masque le nom du membre pour les autres adhérents, mais reste obligatoirement visible aux administrateurs.')
    )
    expires_at = models.DateTimeField(_('Date d’expiration'), null=True, blank=True)
    resolved_at = models.DateTimeField(_('Date de résolution'), null=True, blank=True)
    created_at = models.DateTimeField(_('Créé le'), auto_now_add=True)
    updated_at = models.DateTimeField(_('Modifié le'), auto_now=True)

    class Meta:
        verbose_name = _('Besoin / Demande d’entraide')
        verbose_name_plural = _('Besoins / Demandes d’entraide')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'need_type'], name='idx_needs_status_type'),
            models.Index(fields=['urgency_level'], name='idx_needs_urgency'),
            models.Index(fields=['expires_at'], name='idx_needs_expires'),
        ]

    def clean(self):
        super().clean()
        from django.utils import timezone
        # Règle métier : RESOLVED => resolved_at obligatoire
        if self.status == NeedStatusChoices.RESOLVED:
            if not self.resolved_at:
                self.resolved_at = timezone.now()
        elif self.status in [NeedStatusChoices.OPEN, NeedStatusChoices.IN_PROGRESS]:
            self.resolved_at = None

        if self.status == NeedStatusChoices.EXPIRED:
            if not self.expires_at:
                self.expires_at = timezone.now()

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"[{self.get_need_type_display()}] {self.title} - {self.get_status_display()}"

