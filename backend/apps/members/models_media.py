import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _


class MediaTypeChoices(models.TextChoices):
    PROFILE_PHOTO = 'PROFILE_PHOTO', _('Photo de profil')
    ACTIVITY_PHOTO = 'ACTIVITY_PHOTO', _("Photo d'activité")
    DOCUMENT = 'DOCUMENT', _('Document justificatif')
    EVENT_PHOTO = 'EVENT_PHOTO', _("Photo d'événement")


class MemberMedia(models.Model):
    """
    Entité pérenne pour le stockage des médias associés à un membre.
    Conformité architecturale :
    - PostgreSQL ne stocke aucun fichier binaire (BYTEA/BLOB).
    - Uniquement les métadonnées, dimensions et clés de stockage sont conservées.
    - Contrainte d'unicité stricte garantissant qu'un membre ne possède jamais
      plus d'un avatar actif (is_current_profile_photo=True).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    member = models.ForeignKey(
        'members.Member',
        on_delete=models.CASCADE,
        related_name='media_files',
        verbose_name=_('Membre')
    )
    media_type = models.CharField(
        _('Type de média'),
        max_length=30,
        choices=MediaTypeChoices.choices,
        default=MediaTypeChoices.PROFILE_PHOTO
    )
    file = models.FileField(
        _('Fichier'),
        upload_to='members/photos/'
    )
    storage_key = models.CharField(
        _('Clé de stockage objet'),
        max_length=255,
        blank=True
    )
    mime_type = models.CharField(
        _('Type MIME'),
        max_length=100
    )
    size = models.PositiveIntegerField(
        _('Taille (octets)'),
        help_text=_('Taille physique du fichier en octets (garantie <= 2 Mo pour les photos).')
    )
    width = models.PositiveIntegerField(
        _('Largeur (px)'),
        null=True,
        blank=True
    )
    height = models.PositiveIntegerField(
        _('Hauteur (px)'),
        null=True,
        blank=True
    )
    title = models.CharField(
        _('Titre / Légende'),
        max_length=200,
        blank=True
    )
    is_current_profile_photo = models.BooleanField(
        _('Avatar actif'),
        default=False
    )
    metadata = models.JSONField(
        _('Métadonnées'),
        default=dict,
        blank=True
    )
    created_at = models.DateTimeField(
        _('Date d’enregistrement'),
        auto_now_add=True
    )
    updated_at = models.DateTimeField(
        _('Date de mise à jour'),
        auto_now=True
    )

    class Meta:
        verbose_name = _('Média de membre')
        verbose_name_plural = _('Médias des membres')
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['member'],
                condition=models.Q(media_type='PROFILE_PHOTO', is_current_profile_photo=True),
                name='unique_current_profile_photo_per_member'
            )
        ]

    def __str__(self):
        return f"{self.member.matricule} - {self.get_media_type_display()} ({self.id})"
