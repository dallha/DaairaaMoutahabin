"""
Vues pour l'API Contacts.
"""

from rest_framework import viewsets, permissions, status, filters
from rest_framework.response import Response
from django.db.models import Q
from common.constants import UserRole
from common.pagination import StandardResultsSetPagination
from apps.audit.services import log_audit_event
from apps.audit.models import AuditActionChoices
from .models import Contact, Member, VisibilityChoices
from .contact_serializers import ContactReadSerializer, ContactWriteSerializer


class IsContactOwnerOrAdmin(permissions.BasePermission):
    """
    Permission stricte pour les contacts :
    - Administrateurs : accès complet lecture et écriture.
    - Membres :
        * Lecture autorisée si le membre associé n'est pas restreint et non supprimé.
        * Écriture (POST/PUT/PATCH/DELETE) autorisée UNIQUEMENT pour ses propres coordonnées.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        user = request.user
        is_admin = user.is_superuser or user.is_staff or user.groups.filter(name__in=[UserRole.ADMIN, UserRole.SUPERADMIN]).exists()
        if is_admin:
            return True

        # Propriétaire
        is_owner = obj.member and obj.member.user_id == user.id

        if request.method in permissions.SAFE_METHODS:
            # Membre actif et non supprimé et visibilité autorisée
            if obj.member.is_deleted or obj.member.status != 'ACTIVE':
                return is_owner
            if obj.member.visibility_level == VisibilityChoices.RESTRICTED:
                return is_owner
            return True

        return is_owner


class ContactViewSet(viewsets.ModelViewSet):
    """
    API CRUD pour la gestion des contacts des adhérents.
    """
    permission_classes = [permissions.IsAuthenticated, IsContactOwnerOrAdmin]
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.SearchFilter]
    search_fields = ['phone', 'email', 'city', 'country']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ContactWriteSerializer
        return ContactReadSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Contact.objects.none()

        is_admin = user.is_superuser or user.is_staff or user.groups.filter(name__in=[UserRole.ADMIN, UserRole.SUPERADMIN]).exists()

        if is_admin:
            qs = Contact.objects.all().select_related('member')
        else:
            # Membre standard : ne voit que les contacts des profils autorisés ou le sien
            qs = Contact.objects.filter(
                Q(member__user=user) |
                (
                    Q(member__is_deleted=False) &
                    Q(member__status='ACTIVE') &
                    ~Q(member__visibility_level=VisibilityChoices.RESTRICTED)
                )
            ).select_related('member')

        # Filtrage par membre spécifique
        member_id = self.request.query_params.get('member')
        if member_id:
            qs = qs.filter(member_id=member_id)

        # Filtrage par is_primary
        is_primary = self.request.query_params.get('is_primary')
        if is_primary is not None:
            if is_primary.lower() in ['true', '1']:
                qs = qs.filter(is_primary=True)
            elif is_primary.lower() in ['false', '0']:
                qs = qs.filter(is_primary=False)

        return qs.order_by('-is_primary', '-created_at')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        contact = serializer.save()

        log_audit_event(
            user=request.user,
            action=AuditActionChoices.CREATE,
            entity='Contact',
            entity_id=str(contact.id),
            new_values={
                'member': str(contact.member_id),
                'phone': contact.phone,
                'phone_visible_to_members': contact.phone_visible_to_members,
                'is_primary': contact.is_primary,
            },
            request=request
        )

        read_serializer = ContactReadSerializer(contact, context={'request': request})
        return Response({
            'success': True,
            'message': "Contact créé avec succès.",
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
            'phone': instance.phone,
            'phone_visible_to_members': instance.phone_visible_to_members,
            'is_primary': instance.is_primary,
            'email': instance.email
        }
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        contact = serializer.save()

        log_audit_event(
            user=request.user,
            action=AuditActionChoices.UPDATE,
            entity='Contact',
            entity_id=str(contact.id),
            old_values=old_values,
            new_values={
                'phone': contact.phone,
                'phone_visible_to_members': contact.phone_visible_to_members,
                'is_primary': contact.is_primary,
                'email': contact.email
            },
            request=request
        )

        read_serializer = ContactReadSerializer(contact, context={'request': request})
        return Response({
            'success': True,
            'message': "Contact mis à jour avec succès.",
            'data': read_serializer.data
        })

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        contact_id = str(instance.id)
        member_id = str(instance.member_id)

        log_audit_event(
            user=request.user,
            action=AuditActionChoices.DELETE,
            entity='Contact',
            entity_id=contact_id,
            old_values={
                'member': member_id,
                'phone': instance.phone,
                'is_primary': instance.is_primary
            },
            request=request
        )

        instance.delete()
        return Response({
            'success': True,
            'message': "Contact supprimé avec succès."
        }, status=status.HTTP_200_OK)
