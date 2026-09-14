"""
Vues de l'API Membres avec filtrage de sécurité serveur, soft-delete, restore et hard-delete.
"""

import uuid
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.core.exceptions import ValidationError
from django_filters.rest_framework import DjangoFilterBackend
import django_filters

from apps.audit.models import AuditActionChoices
from apps.audit.services import log_audit_event
from common.constants import UserRole
from common.pagination import StandardResultsSetPagination
from common.permissions import CanHardDelete, IsAdminUserRole, IsOwnerOrAdmin, IsSuperAdminUser
from .models import Member, MemberStatusChoices, SituationChoices, VisibilityChoices
from .services.media_service import process_and_save_profile_photo, delete_profile_photo
from .serializers import (
    MemberAdminSerializer,
    MemberCreateSerializer,
    MemberDetailSerializer,
    MemberDirectorySerializer,
    MemberPublicSerializer,
    MemberUpdateSerializer,
)


class MemberFilterSet(DjangoFilterBackend.filterset_base if hasattr(DjangoFilterBackend, 'filterset_base') else django_filters.FilterSet):
    situation = django_filters.CharFilter(method='filter_situation')

    class Meta:
        model = Member
        fields = ['gender', 'situation', 'status', 'visibility_level', 'matricule']

    def filter_situation(self, queryset, name, value):
        if not value:
            return queryset
        val = value.upper().strip()
        MAPPING = {
            'LEARNER': [SituationChoices.STUDENT, SituationChoices.PUPIL],
            'APPRENANT': [SituationChoices.STUDENT, SituationChoices.PUPIL],
            'STUDENT': [SituationChoices.STUDENT],
            'ETUDIANT': [SituationChoices.STUDENT],
            'PUPIL': [SituationChoices.PUPIL],
            'ELEVE': [SituationChoices.PUPIL],
            'PROFESSIONAL': [SituationChoices.EMPLOYEE, SituationChoices.ENTREPRENEUR, SituationChoices.FREELANCE],
            'PROFESSIONNEL': [SituationChoices.EMPLOYEE, SituationChoices.ENTREPRENEUR, SituationChoices.FREELANCE],
        }
        if val in MAPPING:
            return queryset.filter(situation__in=MAPPING[val])
        if val in [c.value for c in SituationChoices]:
            return queryset.filter(situation=val)
        return queryset.filter(situation=value)


class MemberViewSet(viewsets.ModelViewSet):
    """
    ViewSet complet pour la gestion des adhérents :
    - GET    /api/v1/members/              (liste paginée, recherche, filtres)
    - GET    /api/v1/members/{id}/         (détail selon profil)
    - POST   /api/v1/members/              (création admin)
    - PATCH  /api/v1/members/{id}/         (modification admin ou propriétaire)
    - DELETE /api/v1/members/{id}/         (soft delete admin)
    - POST   /api/v1/members/{id}/restore/ (restauration admin)
    - DELETE /api/v1/members/{id}/hard_delete/ (suppression physique superadmin)
    """
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = MemberFilterSet
    search_fields = ['first_name', 'last_name', 'matricule', 'canonical_name']
    ordering_fields = ['institutional_priority', 'canonical_name', 'created_at', 'joined_at']
    ordering = ['institutional_priority', 'canonical_name']

    def get_object(self):
        """
        Résolution transparente par UUID (id) ou par matricule unique (ex: DAMF-0001).
        Permet le deep linking direct /members/:id.
        """
        queryset = self.filter_queryset(self.get_queryset())
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        lookup_val = self.kwargs[lookup_url_kwarg]

        try:
            uuid.UUID(str(lookup_val))
            filter_kwargs = {self.lookup_field: lookup_val}
        except (ValueError, AttributeError):
            filter_kwargs = {'matricule': lookup_val}

        obj = get_object_or_404(queryset, **filter_kwargs)
        self.check_object_permissions(self.request, obj)
        return obj

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [AllowAny]
        elif self.action == 'create':
            permission_classes = [IsAdminUserRole]
        elif self.action in ['update', 'partial_update', 'photo']:
            permission_classes = [IsOwnerOrAdmin]
        elif self.action in ['destroy', 'restore']:
            permission_classes = [IsAdminUserRole]
        elif self.action == 'hard_delete':
            permission_classes = [CanHardDelete]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    def _is_admin_user(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return False
        return bool(
            user.is_superuser or
            user.is_staff or
            user.groups.filter(name__in=[UserRole.ADMIN, UserRole.SUPERADMIN]).exists()
        )

    def get_queryset(self):
        user = self.request.user
        include_deleted = self.request.query_params.get('include_deleted', 'false').lower() == 'true'
        only_deleted = self.request.query_params.get('is_deleted', 'false').lower() == 'true'

        # 1. Administrateurs et Super-Administrateurs
        if self._is_admin_user():
            if only_deleted:
                return Member.all_objects.filter(is_deleted=True)
            elif include_deleted:
                return Member.all_objects.all()
            return Member.objects.all()

        # 2. Utilisateurs Membres authentifiés
        if user and user.is_authenticated:
            # Voit les membres actifs publics et internes, plus sa propre fiche quel que soit son niveau
            return Member.objects.filter(
                Q(status=MemberStatusChoices.ACTIVE, visibility_level__in=[VisibilityChoices.PUBLIC, VisibilityChoices.INTERNAL]) |
                Q(user=user)
            ).distinct()

        # 3. Visiteurs anonymes (uniquement les membres actifs à visibilité publique)
        return Member.objects.filter(
            status=MemberStatusChoices.ACTIVE,
            visibility_level=VisibilityChoices.PUBLIC
        )

    def get_serializer_class(self):
        if self.action == 'create':
            return MemberCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return MemberUpdateSerializer

        user = self.request.user
        if self._is_admin_user():
            return MemberAdminSerializer

        if self.action == 'list':
            if user and user.is_authenticated:
                return MemberDirectorySerializer
            return MemberPublicSerializer

        # retrieve
        if user and user.is_authenticated:
            return MemberDetailSerializer
        return MemberPublicSerializer

    def perform_create(self, serializer):
        member = serializer.save()
        log_audit_event(
            user=self.request.user,
            action=AuditActionChoices.CREATE,
            entity='Member',
            entity_id=str(member.id),
            new_values=serializer.data,
            request=self.request
        )

    def perform_update(self, serializer):
        instance = self.get_object()
        old_values = MemberDetailSerializer(instance, context={'request': self.request}).data
        member = serializer.save()
        new_values = MemberDetailSerializer(member, context={'request': self.request}).data
        log_audit_event(
            user=self.request.user,
            action=AuditActionChoices.UPDATE,
            entity='Member',
            entity_id=str(member.id),
            old_values=old_values,
            new_values=new_values,
            request=self.request
        )

    def destroy(self, request, *args, **kwargs):
        """Soft delete standard : marque le membre comme supprimé (is_deleted=True)."""
        instance = self.get_object()
        member_id = str(instance.id)

        # Enregistrement de l'audit de suppression logique
        log_audit_event(
            user=request.user,
            action=AuditActionChoices.DELETE,
            entity='Member',
            entity_id=member_id,
            old_values={'is_deleted': False, 'status': instance.status},
            new_values={'is_deleted': True},
            request=request
        )

        instance.delete()
        return Response({
            'success': True,
            'message': 'Membre archivé avec succès (suppression logique).'
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='restore')
    def restore(self, request, pk=None):
        """Restauration d'un membre préalablement archivé (réservé aux administrateurs)."""
        try:
            member = Member.all_objects.get(pk=pk)
        except Member.DoesNotExist:
            return Response({
                'success': False,
                'status_code': 404,
                'error_code': 'NOT_FOUND',
                'message': 'Membre introuvable.',
                'errors': {'detail': 'Aucun membre ne correspond à cet identifiant.'}
            }, status=status.HTTP_404_NOT_FOUND)

        if not member.is_deleted:
            return Response({
                'success': False,
                'status_code': 400,
                'error_code': 'ALREADY_ACTIVE',
                'message': 'Ce membre est déjà actif et non supprimé.',
                'errors': {'is_deleted': False}
            }, status=status.HTTP_400_BAD_REQUEST)

        member.restore()

        log_audit_event(
            user=request.user,
            action=AuditActionChoices.RESTORE,
            entity='Member',
            entity_id=str(member.id),
            old_values={'is_deleted': True},
            new_values={'is_deleted': False},
            request=request
        )

        return Response({
            'success': True,
            'message': 'Membre restauré avec succès.',
            'data': MemberDetailSerializer(member, context={'request': request}).data
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['delete'], url_path='hard_delete')
    def hard_delete(self, request, pk=None):
        """
        Suppression physique irréversible, strictement réservée au Super-Administrateur.
        Exige une confirmation explicite dans le payload JSON : {"confirm_hard_delete": true}.
        """
        confirm = request.data.get('confirm_hard_delete') if isinstance(request.data, dict) else False
        if confirm is not True:
            return Response({
                'success': False,
                'status_code': 400,
                'error_code': 'CONFIRMATION_REQUIRED',
                'message': 'La suppression physique définitive exige le paramètre explicite confirm_hard_delete=true.',
                'errors': {'confirm_hard_delete': 'Requis et doit valoir true.'}
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            member = Member.all_objects.get(pk=pk)
        except Member.DoesNotExist:
            return Response({
                'success': False,
                'status_code': 404,
                'error_code': 'NOT_FOUND',
                'message': 'Membre introuvable.',
                'errors': {'detail': 'Aucun membre ne correspond à cet identifiant.'}
            }, status=status.HTTP_404_NOT_FOUND)

        member_id = str(member.id)
        old_data = MemberAdminSerializer(member, context={'request': request}).data

        # Enregistrement préalable de l'audit avant suppression irréversible
        log_audit_event(
            user=request.user,
            action=AuditActionChoices.HARD_DELETE,
            entity='Member',
            entity_id=member_id,
            old_values=old_data,
            new_values=None,
            request=request
        )

        member.hard_delete()

        return Response({
            'success': True,
            'message': 'Membre définitivement supprimé de la base de données.'
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post', 'delete'], url_path='photo', parser_classes=[MultiPartParser, FormParser, JSONParser])
    def photo(self, request, pk=None):
        """
        Gestion sécurisée de la photo de profil / avatar :
        - POST   : Téléversement / remplacement avec compression progressive <= 2 Mo,
                   redimensionnement <= 1600x1600 px, purge EXIF et transaction atomique.
        - DELETE : Suppression de l'avatar et purge physique du fichier.
        Contrôle d'accès strict IsOwnerOrAdmin :
        - Le disciple ne peut modifier que sa propre photo.
        - L'administrateur et super-administrateur peuvent gérer tous les profils.
        """
        instance = self.get_object()

        if request.method == 'POST':
            file_obj = request.FILES.get('photo') or request.FILES.get('file')
            if not file_obj:
                return Response({
                    'success': False,
                    'status_code': 400,
                    'error_code': 'FILE_MISSING',
                    'message': "Aucun fichier photo fourni dans le champ 'photo' ou 'file'.",
                    'errors': {'photo': ["Un fichier image est requis."]}
                }, status=status.HTTP_400_BAD_REQUEST)

            try:
                media = process_and_save_profile_photo(instance, file_obj)
            except ValidationError as e:
                return Response({
                    'success': False,
                    'status_code': 400,
                    'error_code': 'VALIDATION_ERROR',
                    'message': str(e.message if hasattr(e, 'message') else e),
                    'errors': {'photo': [str(e.message if hasattr(e, 'message') else e)]}
                }, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                return Response({
                    'success': False,
                    'status_code': 400,
                    'error_code': 'PROCESSING_ERROR',
                    'message': f"Erreur de traitement de l'image : {str(e)}",
                    'errors': {'photo': [str(e)]}
                }, status=status.HTTP_400_BAD_REQUEST)

            photo_url = request.build_absolute_uri(media.file.url) if request else media.file.url

            log_audit_event(
                user=request.user,
                action=AuditActionChoices.UPDATE,
                entity='Member',
                entity_id=str(instance.id),
                old_values={'photo': instance.photo.name if instance.photo else None},
                new_values={'photo': media.file.name, 'media_id': str(media.id)},
                request=request
            )

            return Response({
                'success': True,
                'message': "Photo de profil mise à jour avec succès.",
                'data': {
                    'media_id': str(media.id),
                    'photo_url': photo_url,
                    'width': media.width,
                    'height': media.height,
                    'size': media.size,
                    'mime_type': media.mime_type,
                }
            }, status=status.HTTP_200_OK)

        elif request.method == 'DELETE':
            old_photo = instance.photo.name if instance.photo else None
            delete_profile_photo(instance)

            log_audit_event(
                user=request.user,
                action=AuditActionChoices.UPDATE,
                entity='Member',
                entity_id=str(instance.id),
                old_values={'photo': old_photo},
                new_values={'photo': None},
                request=request
            )

            return Response({
                'success': True,
                'message': "Photo de profil supprimée avec succès.",
                'data': {
                    'photo_url': None
                }
            }, status=status.HTTP_200_OK)
