"""
Classes de permissions pour Django REST Framework basées sur le système RBAC natif de Django.
"""

from rest_framework import permissions
from common.constants import UserRole


class IsSuperAdminUser(permissions.BasePermission):
    """
    Accès réservé exclusivement aux Super-Administrateurs système :
    - Utilisateur avec is_superuser=True
    - Ou membre du groupe 'Super-Administrateurs'
    """
    def has_permission(self, request, view):
        if not bool(request.user and request.user.is_authenticated):
            return False
        return bool(
            request.user.is_superuser or
            request.user.groups.filter(name=UserRole.SUPERADMIN).exists()
        )


class IsAdminUserRole(permissions.BasePermission):
    """
    Accès réservé aux Administrateurs de la communauté :
    - Membre du groupe 'Administrateurs' ou 'Super-Administrateurs'
    - Ou utilisateur avec is_staff=True
    - Ou Superutilisateur
    """
    def has_permission(self, request, view):
        if not bool(request.user and request.user.is_authenticated):
            return False
        return bool(
            request.user.is_superuser or
            request.user.is_staff or
            request.user.groups.filter(name__in=[UserRole.ADMIN, UserRole.SUPERADMIN]).exists()
        )


class IsMemberUserRole(permissions.BasePermission):
    """Accès pour tout adhérent membre authentifié (ayant un compte et le groupe 'Membres', 'Administrateurs' ou 'Super-Administrateurs')."""
    def has_permission(self, request, view):
        if not bool(request.user and request.user.is_authenticated):
            return False
        return bool(
            request.user.is_superuser or
            request.user.groups.filter(name__in=UserRole.ALL_ROLES).exists()
        )


class IsAdminOrReadOnly(permissions.BasePermission):
    """Lecture ouverte aux membres connectés, modifications réservées aux administrateurs."""
    def has_permission(self, request, view):
        if not bool(request.user and request.user.is_authenticated):
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(
            request.user.is_superuser or
            request.user.is_staff or
            request.user.groups.filter(name__in=[UserRole.ADMIN, UserRole.SUPERADMIN]).exists()
        )


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Autorise le propriétaire de l'objet (ou un administrateur) à modifier la ressource.
    Fonctionne avec un objet ayant un attribut 'user' ou 'member.user'.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if not bool(request.user and request.user.is_authenticated):
            return False
        # Les administrateurs et super-administrateurs ont tous les droits
        if (request.user.is_superuser or
                request.user.is_staff or
                request.user.groups.filter(name__in=[UserRole.ADMIN, UserRole.SUPERADMIN]).exists()):
            return True

        # Propriétaire direct
        target_user = getattr(obj, 'user', None)
        if target_user is None and hasattr(obj, 'member'):
            target_user = getattr(obj.member, 'user', None)

        return target_user == request.user


class CanHardDelete(permissions.BasePermission):
    """
    Permission ultra-restreinte réservée aux Super-Administrateurs pour la suppression physique.
    Accepte is_superuser=True OU l'appartenance au groupe Super-Administrateurs.
    """
    def has_permission(self, request, view):
        if not bool(request.user and request.user.is_authenticated):
            return False
        return bool(
            request.user.is_superuser or
            request.user.groups.filter(name=UserRole.SUPERADMIN).exists()
        )
