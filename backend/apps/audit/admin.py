from django.contrib import admin
from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'user', 'action', 'entity', 'entity_id', 'ip_address')
    list_filter = ('action', 'entity', 'created_at')
    search_fields = ('entity', 'entity_id', 'user__email', 'ip_address')
    ordering = ('-created_at',)
    readonly_fields = ('id', 'user', 'action', 'entity', 'entity_id', 'old_values', 'new_values', 'ip_address', 'created_at')

    def has_add_permission(self, request):
        """Le journal d'audit est en lecture seule : pas d'ajout manuel."""
        return False

    def has_delete_permission(self, request, obj=None):
        """Protection contre la suppression des traces d'audit."""
        return False

    def has_change_permission(self, request, obj=None):
        """Protection contre l'altération des logs d'audit."""
        return False
