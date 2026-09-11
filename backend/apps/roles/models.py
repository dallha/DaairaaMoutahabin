import uuid
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class RoleCategoryChoices(models.TextChoices):
    SPIRITUAL = 'SPIRITUAL', _('Charge Spirituelle & Cultuelle (ex: Zakir)')
    EXECUTIVE = 'EXECUTIVE', _('Bureau Exécutif (Présidence, Secrétariat, Trésorerie)')
    COMMISSION = 'COMMISSION', _('Commission Spécialisée (Communication, Organisation, Social)')
    COMMUNITY = 'COMMUNITY', _('Membres & Collèges')


class Role(models.Model):
    """
    Référentiel des responsabilités et fonctions au sein de la Dahirah.
    Permet d'isoler des fonctions comme "Zakir" qui ne doivent jamais être saisies comme des métiers.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(
        _('Code unique'),
        max_length=50,
        unique=True,
        help_text=_('Ex: ZAKIR, PRESIDENT, TRESORIER, SECRETAIRE_GENERAL, COMMUNICATION')
    )
    name = models.CharField(_('Nom de la fonction'), max_length=100)
    category = models.CharField(
        _('Catégorie de rôle'),
        max_length=30,
        choices=RoleCategoryChoices.choices,
        default=RoleCategoryChoices.COMMUNITY
    )
    description = models.TextField(_('Description de la charge'), blank=True, null=True)
    rank = models.PositiveSmallIntegerField(
        _('Rang protocolaire'),
        default=100,
        help_text=_('Pour l’ordre d’affichage dans l’organigramme (les plus petits en premier)')
    )

    class Meta:
        verbose_name = _('Fonction / Rôle Dahirah')
        verbose_name_plural = _('Fonctions / Rôles Dahirah')
        ordering = ['rank', 'name']

    def __str__(self):
        return f"{self.name} ({self.get_category_display()})"


class MemberRole(models.Model):
    """
    Attribution d'une fonction ou d'un mandat au sein de la Dahirah à un membre, avec historique.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    member = models.ForeignKey(
        'members.Member',
        on_delete=models.CASCADE,
        related_name='dairah_roles',
        verbose_name=_('Membre')
    )
    role = models.ForeignKey(
        Role,
        on_delete=models.PROTECT,
        related_name='assignments',
        verbose_name=_('Fonction / Rôle')
    )
    start_date = models.DateField(_('Date de début de fonction'), default=timezone.now)
    end_date = models.DateField(_('Date de fin de fonction'), null=True, blank=True)
    is_current = models.BooleanField(_('Fonction actuelle'), default=True)
    notes = models.TextField(_('Observations / Décret / Mandat'), blank=True, null=True)

    class Meta:
        verbose_name = _('Attribution de fonction Dahirah')
        verbose_name_plural = _('Attributions de fonctions Dahirah')
        ordering = ['-is_current', 'role__rank', '-start_date']
        indexes = [
            models.Index(fields=['is_current', 'role'], name='idx_mrole_current_role'),
        ]

    def __str__(self):
        status_str = "Actuel" if self.is_current else "Ancien mandat"
        return f"{self.member.display_name} ➔ {self.role.name} ({status_str})"
