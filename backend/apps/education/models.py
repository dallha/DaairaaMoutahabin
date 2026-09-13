import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _


class EducationLevelChoices(models.TextChoices):
    BAC = 'BAC', _('Baccalauréat')
    LICENCE_1 = 'LICENCE_1', _('Licence 1')
    LICENCE_2 = 'LICENCE_2', _('Licence 2')
    LICENCE_3 = 'LICENCE_3', _('Licence 3')
    MASTER_1 = 'MASTER_1', _('Master 1')
    MASTER_2 = 'MASTER_2', _('Master 2')
    DOCTORAT = 'DOCTORAT', _('Doctorat / Thèse')
    BTS_DUT = 'BTS_DUT', _('BTS / DUT')
    OTHER = 'OTHER', _('Autre cursus / Certificat')


class EducationStatusChoices(models.TextChoices):
    IN_PROGRESS = 'IN_PROGRESS', _('En cours')
    COMPLETED = 'COMPLETED', _('Diplômé / Terminé')
    ABANDONED = 'ABANDONED', _('Interrompu')


class Education(models.Model):
    """
    Parcours d'études et de formation des membres.
    Permet les analyses statistiques fines (étudiants par niveau, par filière, par établissement).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    member = models.ForeignKey(
        'members.Member',
        on_delete=models.CASCADE,
        related_name='educations',
        verbose_name=_('Membre')
    )
    institution = models.CharField(
        _('Établissement / Université'),
        max_length=150,
        help_text=_('Ex: UCAD, UGB, ESP, CESAG, Université Virtuelle...')
    )
    field = models.CharField(
        _('Domaine / Filière d’études'),
        max_length=150,
        help_text=_('Ex: Droit, Médecine, Génie Industriel, Diplomatie, Géographie...')
    )
    level = models.CharField(
        _('Niveau d’études'),
        max_length=30,
        choices=EducationLevelChoices.choices,
        default=EducationLevelChoices.LICENCE_3
    )
    diploma = models.CharField(
        _('Intitulé du diplôme'),
        max_length=150,
        blank=True,
        null=True
    )
    status = models.CharField(
        _('Statut de la formation'),
        max_length=20,
        choices=EducationStatusChoices.choices,
        default=EducationStatusChoices.IN_PROGRESS
    )
    start_year = models.PositiveSmallIntegerField(_('Année de début'), null=True, blank=True)
    end_year = models.PositiveSmallIntegerField(_('Année de fin (ou prévue)'), null=True, blank=True)

    class Meta:
        verbose_name = _('Formation / Études')
        verbose_name_plural = _('Formations / Études')
        ordering = ['-start_year', '-level']
        indexes = [
            models.Index(fields=['field', 'level'], name='idx_edu_field_level'),
        ]

    def __str__(self):
        return f"{self.member.display_name} - {self.get_level_display()} en {self.field} ({self.institution})"
