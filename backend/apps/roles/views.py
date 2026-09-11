"""
Vues pour l'API Rôles et Fonctions Dahirah.
"""

from rest_framework import viewsets, permissions, status, filters
from rest_framework.response import Response
from django.db.models import Q
from common.constants import UserRole
from common.pagination import StandardResultsSetPagination
from apps.audit.services import log_audit_event
from apps.audit.models import AuditActionChoices
from apps.members.models import VisibilityChoices
from .models import Role, MemberRole
from .serializers import RoleSerializer, MemberRoleReadSerializer, MemberRoleWriteSerializer


class IsAdminOrReadOnly(permissions.BasePermission):
    """Lecture autorisée aux membres authentifiés, écriture réservée aux administrateurs."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_superuser or request.user.is_staff or request.user.groups.filter(name__in=[UserRole.ADMIN, UserRole.SUPERADMIN]).exists()


class RoleViewSet(viewsets.ModelViewSet):
    """CRUD pour le référentiel des fonctions et charges au sein de la Dahirah."""
    queryset = Role.objects.all().order_by('rank', 'name')
    serializer_class = RoleSerializer
    permission_classes = [IsAdminOrReadOnly]
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'code', 'description']

    def get_queryset(self):
        qs = super().get_queryset()
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category=category)
        return qs


class MemberRoleViewSet(viewsets.ModelViewSet):
    """
    CRUD pour l'attribution des fonctions aux membres (Bureau, Zakir, Commissions...).
    La nomination et la révocation des charges sont des prérogatives administratives exclusives.
    """
    permission_classes = [IsAdminOrReadOnly]
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.SearchFilter]
    search_fields = ['notes', 'role__name', 'member__first_name', 'member__last_name']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return MemberRoleWriteSerializer
        return MemberRoleReadSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return MemberRole.objects.none()

        is_admin = user.is_superuser or user.is_staff or user.groups.filter(name__in=[UserRole.ADMIN, UserRole.SUPERADMIN]).exists()

        if is_admin:
            qs = MemberRole.objects.all()
        else:
            qs = MemberRole.objects.filter(
                Q(member__user=user) |
                (
                    Q(member__is_deleted=False) &
                    Q(member__status='ACTIVE') &
                    ~Q(member__visibility_level=VisibilityChoices.RESTRICTED)
                )
            )

        qs = qs.select_related('member', 'role')

        member_id = self.request.query_params.get('member')
        if member_id:
            qs = qs.filter(member_id=member_id)

        role_id = self.request.query_params.get('role')
        if role_id:
            qs = qs.filter(role_id=role_id)

        role_category = self.request.query_params.get('category')
        if role_category:
            qs = qs.filter(role__category=role_category)

        is_current = self.request.query_params.get('is_current')
        if is_current is not None:
            if is_current.lower() in ['true', '1']:
                qs = qs.filter(is_current=True)
            elif is_current.lower() in ['false', '0']:
                qs = qs.filter(is_current=False)

        return qs.order_by('-is_current', 'role__rank', '-start_date')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()

        log_audit_event(
            user=request.user,
            action=AuditActionChoices.CREATE,
            entity='MemberRole',
            entity_id=str(instance.id),
            new_values={
                'member': str(instance.member_id),
                'role': str(instance.role_id),
                'start_date': str(instance.start_date),
                'is_current': instance.is_current,
            },
            request=request
        )

        read_serializer = MemberRoleReadSerializer(instance, context={'request': request})
        return Response({
            'success': True,
            'message': "Attribution de fonction enregistrée avec succès.",
            'data': read_serializer.data
        }, status=status.HTTP_201_CREATED)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({
            'success': True,
            'data': serializer.data
        })

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        old_values = {
            'is_current': instance.is_current,
            'end_date': str(instance.end_date) if instance.end_date else None,
            'notes': instance.notes
        }
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()

        log_audit_event(
            user=request.user,
            action=AuditActionChoices.UPDATE,
            entity='MemberRole',
            entity_id=str(updated.id),
            old_values=old_values,
            new_values={
                'is_current': updated.is_current,
                'end_date': str(updated.end_date) if updated.end_date else None,
                'notes': updated.notes
            },
            request=request
        )

        read_serializer = MemberRoleReadSerializer(updated, context={'request': request})
        return Response({
            'success': True,
            'message': "Fonction mise à jour avec succès.",
            'data': read_serializer.data
        })

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance_id = str(instance.id)

        log_audit_event(
            user=request.user,
            action=AuditActionChoices.DELETE,
            entity='MemberRole',
            entity_id=instance_id,
            old_values={
                'member': str(instance.member_id),
                'role': str(instance.role.name),
            },
            request=request
        )

        instance.delete()
        return Response({
            'success': True,
            'message': "Attribution de fonction supprimée avec succès."
        }, status=status.HTTP_200_OK)
