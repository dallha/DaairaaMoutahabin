from rest_framework import permissions
from common.constants import UserRole


class IsAdminUserRole(permissions.BasePermission):
    """
    Autorise uniquement les utilisateurs dotés des rôles ADMIN ou SUPERADMIN,
    ou les superusers / staff Django.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return bool(
            request.user.is_superuser or
            request.user.is_staff or
            request.user.groups.filter(name__in=[UserRole.ADMIN, UserRole.SUPERADMIN]).exists()
        )


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Autorise le propriétaire du profil membre (lié par user) ou un administrateur.
    Les autres membres ont un accès en lecture seule.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        user = request.user
        is_admin = bool(
            user.is_superuser or
            user.is_staff or
            user.groups.filter(name__in=[UserRole.ADMIN, UserRole.SUPERADMIN]).exists()
        )
        if is_admin:
            return True

        # Résolution du membre propriétaire selon l'objet manipulé
        target_member = None
        if hasattr(obj, 'member'):
            target_member = obj.member
        elif hasattr(obj, 'from_member'):
            target_member = obj.from_member
        elif hasattr(obj, 'user'):
            target_member = obj

        if target_member and target_member.user == user:
            return True

        return False
