"""
Vues pour l'API Professions.
"""

from rest_framework import viewsets, permissions, status, filters
from rest_framework.response import Response
from django.db.models import Q
from common.constants import UserRole
from common.pagination import StandardResultsSetPagination
from apps.audit.services import log_audit_event
from apps.audit.models import AuditActionChoices
from apps.members.models import VisibilityChoices
from .models import ProfessionCategory, Profession, MemberProfession
from .serializers import (
    ProfessionCategorySerializer,
    ProfessionSerializer,
    MemberProfessionReadSerializer,
    MemberProfessionWriteSerializer
)


class IsAdminOrReadOnly(permissions.BasePermission):
    """Accès lecture pour les membres authentifiés, écriture réservée aux administrateurs."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_superuser or request.user.is_staff or request.user.groups.filter(name__in=[UserRole.ADMIN, UserRole.SUPERADMIN]).exists()


class IsMemberProfessionOwnerOrAdmin(permissions.BasePermission):
    """Accès complet pour les administrateurs ; propriétaire uniquement pour les modifications."""
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        user = request.user
        is_admin = user.is_superuser or user.is_staff or user.groups.filter(name__in=[UserRole.ADMIN, UserRole.SUPERADMIN]).exists()
        if is_admin:
            return True

        is_owner = obj.member and obj.member.user_id == user.id

        if request.method in permissions.SAFE_METHODS:
            if obj.member.is_deleted or obj.member.status != 'ACTIVE':
                return is_owner
            if obj.member.visibility_level == VisibilityChoices.RESTRICTED:
                return is_owner
            return True

        return is_owner


class ProfessionCategoryViewSet(viewsets.ModelViewSet):
    """CRUD pour les catégories professionnelles."""
    queryset = ProfessionCategory.objects.all()
    serializer_class = ProfessionCategorySerializer
    permission_classes = [IsAdminOrReadOnly]
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        return response


class ProfessionViewSet(viewsets.ModelViewSet):
    """CRUD pour le référentiel des métiers."""
    queryset = Profession.objects.select_related('category').all()
    serializer_class = ProfessionSerializer
    permission_classes = [IsAdminOrReadOnly]
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'description']

    def get_queryset(self):
        qs = super().get_queryset()
        category_id = self.request.query_params.get('category')
        if category_id:
            qs = qs.filter(category_id=category_id)

        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            if is_active.lower() in ['true', '1']:
                qs = qs.filter(is_active=True)
            elif is_active.lower() in ['false', '0']:
                qs = qs.filter(is_active=False)

        return qs


class MemberProfessionViewSet(viewsets.ModelViewSet):
    """CRUD pour les professions exercées par les membres."""
    permission_classes = [permissions.IsAuthenticated, IsMemberProfessionOwnerOrAdmin]
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.SearchFilter]
    search_fields = ['title', 'organization']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return MemberProfessionWriteSerializer
        return MemberProfessionReadSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return MemberProfession.objects.none()

        is_admin = user.is_superuser or user.is_staff or user.groups.filter(name__in=[UserRole.ADMIN, UserRole.SUPERADMIN]).exists()

        if is_admin:
            qs = MemberProfession.objects.all()
        else:
            qs = MemberProfession.objects.filter(
                Q(member__user=user) |
                (
                    Q(member__is_deleted=False) &
                    Q(member__status='ACTIVE') &
                    ~Q(member__visibility_level=VisibilityChoices.RESTRICTED)
                )
            )

        qs = qs.select_related('member', 'profession', 'profession__category')

        member_id = self.request.query_params.get('member')
        if member_id:
            qs = qs.filter(member_id=member_id)

        profession_id = self.request.query_params.get('profession')
        if profession_id:
            qs = qs.filter(profession_id=profession_id)

        is_current = self.request.query_params.get('is_current')
        if is_current is not None:
            if is_current.lower() in ['true', '1']:
                qs = qs.filter(is_current=True)
            elif is_current.lower() in ['false', '0']:
                qs = qs.filter(is_current=False)

        return qs.order_by('-is_primary', '-is_current')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()

        log_audit_event(
            user=request.user,
            action=AuditActionChoices.CREATE,
            entity='MemberProfession',
            entity_id=str(instance.id),
            new_values={
                'member': str(instance.member_id),
                'profession': str(instance.profession_id),
                'title': instance.title,
                'organization': instance.organization
            },
            request=request
        )

        read_serializer = MemberProfessionReadSerializer(instance, context={'request': request})
        return Response({
            'success': True,
            'message': "Profession associée avec succès.",
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
            'title': instance.title,
            'organization': instance.organization,
            'is_current': instance.is_current,
            'is_primary': instance.is_primary
        }
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()

        log_audit_event(
            user=request.user,
            action=AuditActionChoices.UPDATE,
            entity='MemberProfession',
            entity_id=str(updated.id),
            old_values=old_values,
            new_values={
                'title': updated.title,
                'organization': updated.organization,
                'is_current': updated.is_current,
                'is_primary': updated.is_primary
            },
            request=request
        )

        read_serializer = MemberProfessionReadSerializer(updated, context={'request': request})
        return Response({
            'success': True,
            'message': "Profession mise à jour avec succès.",
            'data': read_serializer.data
        })

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance_id = str(instance.id)

        log_audit_event(
            user=request.user,
            action=AuditActionChoices.DELETE,
            entity='MemberProfession',
            entity_id=instance_id,
            old_values={
                'member': str(instance.member_id),
                'title': instance.title,
            },
            request=request
        )

        instance.delete()
        return Response({
            'success': True,
            'message': "Profession supprimée avec succès."
        }, status=status.HTTP_200_OK)
