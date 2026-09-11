"""
Vues pour l'API Éducation / Formations.
"""

from rest_framework import viewsets, permissions, status, filters
from rest_framework.response import Response
from django.db.models import Q
from common.constants import UserRole
from common.pagination import StandardResultsSetPagination
from apps.audit.services import log_audit_event
from apps.audit.models import AuditActionChoices
from apps.members.models import VisibilityChoices
from .models import Education
from .serializers import EducationReadSerializer, EducationWriteSerializer


class IsEducationOwnerOrAdmin(permissions.BasePermission):
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


class EducationViewSet(viewsets.ModelViewSet):
    """CRUD pour le parcours éducatif et universitaire des membres."""
    permission_classes = [permissions.IsAuthenticated, IsEducationOwnerOrAdmin]
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.SearchFilter]
    search_fields = ['institution', 'field', 'diploma']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return EducationWriteSerializer
        return EducationReadSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Education.objects.none()

        is_admin = user.is_superuser or user.is_staff or user.groups.filter(name__in=[UserRole.ADMIN, UserRole.SUPERADMIN]).exists()

        if is_admin:
            qs = Education.objects.all()
        else:
            qs = Education.objects.filter(
                Q(member__user=user) |
                (
                    Q(member__is_deleted=False) &
                    Q(member__status='ACTIVE') &
                    ~Q(member__visibility_level=VisibilityChoices.RESTRICTED)
                )
            )

        qs = qs.select_related('member')

        member_id = self.request.query_params.get('member')
        if member_id:
            qs = qs.filter(member_id=member_id)

        level = self.request.query_params.get('level')
        if level:
            qs = qs.filter(level=level)

        edu_status = self.request.query_params.get('status')
        if edu_status:
            qs = qs.filter(status=edu_status)

        field_name = self.request.query_params.get('field')
        if field_name:
            qs = qs.filter(field__icontains=field_name)

        return qs.order_by('-start_year', '-level')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()

        log_audit_event(
            user=request.user,
            action=AuditActionChoices.CREATE,
            entity='Education',
            entity_id=str(instance.id),
            new_values={
                'member': str(instance.member_id),
                'institution': instance.institution,
                'field': instance.field,
                'level': instance.level,
                'status': instance.status,
                'start_year': instance.start_year,
            },
            request=request
        )

        read_serializer = EducationReadSerializer(instance, context={'request': request})
        return Response({
            'success': True,
            'message': "Formation enregistrée avec succès.",
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
            'institution': instance.institution,
            'field': instance.field,
            'level': instance.level,
            'status': instance.status,
            'end_year': instance.end_year
        }
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()

        log_audit_event(
            user=request.user,
            action=AuditActionChoices.UPDATE,
            entity='Education',
            entity_id=str(updated.id),
            old_values=old_values,
            new_values={
                'institution': updated.institution,
                'field': updated.field,
                'level': updated.level,
                'status': updated.status,
                'end_year': updated.end_year
            },
            request=request
        )

        read_serializer = EducationReadSerializer(updated, context={'request': request})
        return Response({
            'success': True,
            'message': "Formation mise à jour avec succès.",
            'data': read_serializer.data
        })

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance_id = str(instance.id)

        log_audit_event(
            user=request.user,
            action=AuditActionChoices.DELETE,
            entity='Education',
            entity_id=instance_id,
            old_values={
                'member': str(instance.member_id),
                'institution': instance.institution,
                'field': instance.field,
            },
            request=request
        )

        instance.delete()
        return Response({
            'success': True,
            'message': "Formation supprimée avec succès."
        }, status=status.HTTP_200_OK)
