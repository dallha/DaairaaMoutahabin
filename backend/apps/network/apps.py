from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class NetworkConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.network'
    verbose_name = _('Réseau, Compétences & Entraide')
