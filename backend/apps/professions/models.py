import uuid
from django.db import models
from django.utils.text import slugify
from django.utils.translation import gettext_lazy as _


class ProfessionCategory(models.Model):
    """
    Catégorie macro-économique des métiers (ex: Santé, Éducation, Commerce, Tech, Artisanat...).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(_('Nom de la catégorie'), max_length=100, unique=True)
    slug = models.SlugField(_('Slug'), max_length=100, unique=True, blank=True)
    display_order = models.PositiveSmallIntegerField(_('Ordre d’affichage'), default=0)

    class Meta:
        verbose_name = _('Catégorie de profession')
        verbose_name_plural = _('Catégories de professions')
        ordering = ['display_order', 'name']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Profession(models.Model):
    """
    Référentiel des métiers standardisés.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    category = models.ForeignKey(
        ProfessionCategory,
        on_delete=models.PROTECT,
        related_name='professions',
        verbose_name=_('Catégorie')
    )
    name = models.CharField(_('Intitulé du métier'), max_length=150, unique=True)
    slug = models.SlugField(_('Slug'), max_length=150, unique=True, blank=True)
    description = models.TextField(_('Description'), blank=True, null=True)
    is_active = models.BooleanField(_('Actif'), default=True)

    class Meta:
        verbose_name = _('Profession / Métier')
        verbose_name_plural = _('Professions / Métiers')
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.category.name})"


class MemberProfession(models.Model):
    """
    Association N:M entre un membre et un ou plusieurs métiers.
    Permet de gérer les profils pluri-actifs sans bricolage textuel dans une seule colonne.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    member = models.ForeignKey(
        'members.Member',
        on_delete=models.CASCADE,
        related_name='professions',
        verbose_name=_('Membre')
    )
    profession = models.ForeignKey(
        Profession,
        on_delete=models.PROTECT,
        related_name='member_professions',
        verbose_name=_('Profession référencée')
    )
    title = models.CharField(
        _('Intitulé libre du poste / activité'),
        max_length=150,
        help_text=_('Ex: Développeur Full-Stack, Directrice de publication, Gérant')
    )
    organization = models.CharField(
        _('Structure / Entreprise'),
        max_length=150,
        blank=True,
        null=True,
        help_text=_('Nom de l’entreprise ou Indépendant')
    )
    is_primary = models.BooleanField(_('Profession principale'), default=True)
    is_current = models.BooleanField(_('En cours'), default=True)
    start_date = models.DateField(_('Date de début'), null=True, blank=True)
    end_date = models.DateField(_('Date de fin'), null=True, blank=True)

    class Meta:
        verbose_name = _('Profession exercée par le membre')
        verbose_name_plural = _('Professions exercées par les membres')
        ordering = ['-is_primary', '-is_current']
        constraints = [
            models.UniqueConstraint(
                fields=['member', 'profession', 'is_current'],
                name='unique_current_member_profession'
            )
        ]

    def __str__(self):
        return f"{self.member.display_name} - {self.title}"
