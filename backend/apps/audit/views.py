"""
Vues pour l'API du journal d'audit immuable.
"""

from rest_framework import viewsets, permissions, filters
from common.constants import UserRole
from common.pagination import StandardResultsSetPagination
from .models import AuditLog
from .serializers import AuditLogSerializer


class IsAdminUserOrSuperAdmin(permissions.BasePermission):
    """Accès strictement réservé aux Administrateurs et Super-Administrateurs."""
    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        return user.is_superuser or user.is_staff or user.groups.filter(name__in=[UserRole.ADMIN, UserRole.SUPERADMIN]).exists()


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API en consultation seule pour le journal d'audit et la traçabilité immuable.
    Aucune modification ou suppression n'est permise sur ces enregistrements.
    """
    queryset = AuditLog.objects.select_related('user').all().order_by('-created_at')
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdminUserOrSuperAdmin]
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.SearchFilter]
    search_fields = ['entity', 'entity_id', 'user__email']

    def get_queryset(self):
        qs = super().get_queryset()

        action = self.request.query_params.get('action')
        if action:
            qs = qs.filter(action=action)

        entity = self.request.query_params.get('entity')
        if entity:
            qs = qs.filter(entity=entity)

        entity_id = self.request.query_params.get('entity_id')
        if entity_id:
            qs = qs.filter(entity_id=entity_id)

        user_id = self.request.query_params.get('user')
        if user_id:
            qs = qs.filter(user_id=user_id)

        return qs
