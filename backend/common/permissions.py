"""
Classes de permissions pour Django REST Framework basées sur les groupes et permissions natifs de Django.
"""

from rest_framework import permissions


class IsSuperAdminUser(permissions.BasePermission):
    """Permission réservée aux super-administrateurs Django (is_superuser)."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)


class IsAdminOrReadOnly(permissions.BasePermission):
    """Lecture ouverte aux membres connectés, écriture réservée aux administrateurs (groupe 'Administrateurs' ou staff)."""
    def has_permission(self, request, view):
        if not bool(request.user and request.user.is_authenticated):
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(
            request.user.is_staff or
            request.user.groups.filter(name='Administrateurs').exists()
        )
