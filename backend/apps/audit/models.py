import uuid
from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class AuditActionChoices(models.TextChoices):
    CREATE = 'CREATE', _('Création')
    UPDATE = 'UPDATE', _('Modification')
    DELETE = 'DELETE', _('Suppression (Soft Delete)')
    RESTORE = 'RESTORE', _('Restauration')
    HARD_DELETE = 'HARD_DELETE', _('Suppression Physique')
    IMPORT = 'IMPORT', _('Importation')
    EXPORT = 'EXPORT', _('Exportation')
    LOGIN = 'LOGIN', _('Connexion')


class AuditLog(models.Model):
    """
    Journal d'audit et traçabilité des actions sensibles.
    L'enregistrement sera orchestré par un middleware / service de contexte lors de la phase Audit/API.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
        verbose_name=_('Auteur de l’action')
    )
    action = models.CharField(
        _('Action effectuée'),
        max_length=20,
        choices=AuditActionChoices.choices
    )
    entity = models.CharField(
        _('Entité concernée'),
        max_length=50,
        help_text=_('Ex: Member, Contact, Profession, Role...')
    )
    entity_id = models.CharField(
        _('Identifiant de l’entité'),
        max_length=64,
        help_text=_('UUID ou clé de l’objet ciblé')
    )
    old_values = models.JSONField(_('Anciennes valeurs'), null=True, blank=True)
    new_values = models.JSONField(_('Nouvelles valeurs'), null=True, blank=True)
    ip_address = models.GenericIPAddressField(_('Adresse IP'), null=True, blank=True)
    created_at = models.DateTimeField(_('Date et heure de l’événement'), auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = _('Journal d’audit')
        verbose_name_plural = _('Journaux d’audit')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['entity', 'entity_id'], name='idx_audit_entity_target'),
            models.Index(fields=['action', 'created_at'], name='idx_audit_action_date'),
        ]

    def __str__(self):
        user_str = self.user.email if self.user else "Système / Anonyme"
        return f"[{self.created_at:%Y-%m-%d %H:%M}] {user_str} - {self.action} sur {self.entity} ({self.entity_id})"
