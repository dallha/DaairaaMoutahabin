from django.db.models import Q
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.members.models import Member, MemberStatusChoices
from common.pagination import StandardResultsSetPagination
from .models import (
    SkillCategory,
    Skill,
    MemberSkill,
    ServiceCatalog,
    MemberService,
    MemberAvailability,
    MemberRelation,
    RelationStatusChoices,
    MemberNeed,
    NeedVisibilityChoices,
    NeedStatusChoices,
    ConnectionRequest,
    ConnectionRequestStatusChoices,
)
from .permissions import IsAdminUserRole, IsOwnerOrAdmin
from .serializers import (
    SkillCategorySerializer,
    SkillSerializer,
    MemberSkillSerializer,
    ServiceCatalogSerializer,
    MemberServiceSerializer,
    MemberAvailabilitySerializer,
    MemberRelationSerializer,
    NetworkMemberCardSerializer,
    MemberNeedSerializer,
    ConnectionRequestSerializer,
)
from .services import (
    find_need_matches,
    accept_connection_request,
    decline_connection_request,
)


class SkillCategoryViewSet(viewsets.ModelViewSet):
    queryset = SkillCategory.objects.all().order_by('display_order', 'name')
    serializer_class = SkillCategorySerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [IsAdminUserRole()]


class SkillViewSet(viewsets.ModelViewSet):
    queryset = Skill.objects.filter(is_active=True).select_related('category')
    serializer_class = SkillSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [IsAdminUserRole()]

    def get_queryset(self):
        qs = super().get_queryset()
        category = self.request.query_params.get('category')
        search = self.request.query_params.get('search')
        if category:
            qs = qs.filter(Q(category__slug=category) | Q(category__name__iexact=category))
        if search:
            qs = qs.filter(name__icontains=search)
        return qs


class ServiceCatalogViewSet(viewsets.ModelViewSet):
    queryset = ServiceCatalog.objects.all().order_by('display_order', 'name')
    serializer_class = ServiceCatalogSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [IsAdminUserRole()]


class MemberSkillViewSet(viewsets.ModelViewSet):
    queryset = MemberSkill.objects.all().select_related('member', 'skill', 'skill__category')
    serializer_class = MemberSkillSerializer
    permission_classes = [IsOwnerOrAdmin]

    def get_queryset(self):
        qs = super().get_queryset()
        member_param = self.request.query_params.get('member')
        if member_param:
            qs = qs.filter(Q(member__matricule=member_param) | Q(member__id=member_param))
        return qs

    def perform_create(self, serializer):
        # Assurer que is_verified reste False pour un utilisateur non-admin
        user = self.request.user
        is_admin = bool(
            user.is_superuser or user.is_staff or
            user.groups.filter(name__in=['admin', 'superadmin']).exists()
        )
        if not is_admin:
            serializer.save(is_verified=False, verified_by=None, verified_at=None)
        else:
            serializer.save()

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUserRole])
    def verify(self, request, pk=None):
        """Action administrative de certification d'une compétence."""
        instance = self.get_object()
        instance.is_verified = True
        instance.verified_by = request.user
        instance.verified_at = timezone.now()
        instance.save(update_fields=['is_verified', 'verified_by', 'verified_at'])
        return Response(self.get_serializer(instance).data)


class MemberServiceViewSet(viewsets.ModelViewSet):
    queryset = MemberService.objects.all().select_related('member', 'service')
    serializer_class = MemberServiceSerializer
    permission_classes = [IsOwnerOrAdmin]

    def get_queryset(self):
        qs = super().get_queryset()
        member_param = self.request.query_params.get('member')
        if member_param:
            qs = qs.filter(Q(member__matricule=member_param) | Q(member__id=member_param))
        return qs


class MemberAvailabilityViewSet(viewsets.ModelViewSet):
    queryset = MemberAvailability.objects.all().select_related('member')
    serializer_class = MemberAvailabilitySerializer
    permission_classes = [IsOwnerOrAdmin]

    def get_queryset(self):
        qs = super().get_queryset()
        member_param = self.request.query_params.get('member')
        if member_param:
            qs = qs.filter(Q(member__matricule=member_param) | Q(member__id=member_param))
        return qs


class MemberRelationViewSet(viewsets.ModelViewSet):
    queryset = MemberRelation.objects.all().select_related('from_member', 'to_member', 'approved_by')
    serializer_class = MemberRelationSerializer
    permission_classes = [IsOwnerOrAdmin]

    def get_queryset(self):
        qs = super().get_queryset()
        member_param = self.request.query_params.get('member')
        if member_param:
            qs = qs.filter(
                Q(from_member__matricule=member_param) | Q(from_member__id=member_param) |
                Q(to_member__matricule=member_param) | Q(to_member__id=member_param)
            )
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        is_admin = bool(
            user.is_superuser or user.is_staff or
            user.groups.filter(name__in=['admin', 'superadmin']).exists()
        )
        if not is_admin:
            serializer.save(status=RelationStatusChoices.PENDING, approved_by=None, approved_at=None)
        else:
            serializer.save()

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUserRole])
    def approve(self, request, pk=None):
        """Action administrative d'approbation d'une relation."""
        instance = self.get_object()
        instance.status = RelationStatusChoices.APPROVED
        instance.approved_by = request.user
        instance.approved_at = timezone.now()
        instance.save(update_fields=['status', 'approved_by', 'approved_at'])
        return Response(self.get_serializer(instance).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUserRole])
    def reject(self, request, pk=None):
        """Action administrative de refus d'une relation."""
        instance = self.get_object()
        instance.status = RelationStatusChoices.REJECTED
        instance.approved_by = request.user
        instance.approved_at = timezone.now()
        instance.save(update_fields=['status', 'approved_by', 'approved_at'])
        return Response(self.get_serializer(instance).data)


class MemberNeedViewSet(viewsets.ModelViewSet):
    """
    Gestion des besoins et demandes d'entraide formulées par les disciples.
    Supporte le filtrage par type, statut, urgence, et applique les restrictions de visibilité.
    """
    queryset = MemberNeed.objects.all().select_related('member')
    serializer_class = MemberNeedSerializer
    permission_classes = [IsOwnerOrAdmin]

    def get_queryset(self):
        user = self.request.user
        is_admin = bool(
            user.is_superuser or user.is_staff or
            user.groups.filter(name__in=['admin', 'superadmin', 'Super-Administrateurs', 'Administrateurs']).exists()
        )
        qs = super().get_queryset()

        member_param = self.request.query_params.get('member')
        if member_param:
            qs = qs.filter(Q(member__matricule=member_param) | Q(member__id=member_param))

        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)

        need_type = self.request.query_params.get('type')
        if need_type:
            qs = qs.filter(need_type=need_type)

        urgency = self.request.query_params.get('urgency')
        if urgency:
            qs = qs.filter(urgency_level=urgency)

        # Les utilisateurs ordinaires ne voient pas les besoins confidentiels administration
        # à moins d'en être le demandeur
        if not is_admin:
            if hasattr(user, 'member_profile') and user.member_profile:
                qs = qs.filter(
                    ~Q(visibility_level=NeedVisibilityChoices.RESTRICTED_ADMIN) |
                    Q(member=user.member_profile)
                )
            else:
                qs = qs.exclude(visibility_level=NeedVisibilityChoices.RESTRICTED_ADMIN)

        return qs

    @action(detail=True, methods=['post'], permission_classes=[IsOwnerOrAdmin])
    def resolve(self, request, pk=None):
        """Marque une demande d'entraide comme pourvue / résolue."""
        need = self.get_object()
        need.status = NeedStatusChoices.RESOLVED
        need.resolved_at = timezone.now()
        need.save(update_fields=['status', 'resolved_at', 'updated_at'])
        return Response(self.get_serializer(need).data)

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def matches(self, request, pk=None):
        """Moteur d'appariement confraternel déterministe avec motifs explicatifs."""
        need = self.get_object()
        matches = find_need_matches(need)
        return Response({
            'need_id': str(need.id),
            'count': len(matches),
            'results': matches
        })


class ConnectionRequestViewSet(viewsets.ModelViewSet):
    """
    Gestion des propositions et demandes de mise en relation d'entraide.
    """
    queryset = ConnectionRequest.objects.all().select_related(
        'need', 'requester', 'target_member', 'facilitator', 'resulting_relation'
    )
    serializer_class = ConnectionRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        is_admin = bool(
            user.is_superuser or user.is_staff or
            user.groups.filter(name__in=['admin', 'superadmin', 'Super-Administrateurs', 'Administrateurs']).exists()
        )
        qs = super().get_queryset()

        if not is_admin:
            if hasattr(user, 'member_profile') and user.member_profile:
                qs = qs.filter(
                    Q(requester=user.member_profile) | Q(target_member=user.member_profile)
                )
            else:
                return qs.none()

        need_id = self.request.query_params.get('need')
        if need_id:
            qs = qs.filter(need_id=need_id)

        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)

        return qs

    def perform_create(self, serializer):
        user = self.request.user
        is_admin = bool(
            user.is_superuser or user.is_staff or
            user.groups.filter(name__in=['admin', 'superadmin', 'Super-Administrateurs', 'Administrateurs']).exists()
        )
        requester = serializer.validated_data.get('requester')
        
        if is_admin:
            if hasattr(user, 'member_profile') and user.member_profile and requester == user.member_profile:
                serializer.save(facilitator=None)
            else:
                serializer.save(facilitator=user)
        else:
            if hasattr(user, 'member_profile') and user.member_profile:
                serializer.save(requester=user.member_profile, facilitator=None)
            else:
                raise serializers.ValidationError("Compte utilisateur non rattaché à une fiche membre.")

    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        """Acceptation transactionnelle atomique d'une demande de mise en relation."""
        instance = self.get_object()
        is_admin = bool(
            request.user.is_superuser or request.user.is_staff or
            request.user.groups.filter(name__in=['admin', 'superadmin', 'Super-Administrateurs', 'Administrateurs']).exists()
        )
        if not is_admin:
            if not (hasattr(request.user, 'member_profile') and request.user.member_profile == instance.target_member):
                return Response(
                    {"detail": "Seul le membre sollicité ou un administrateur peut accepter cette demande."},
                    status=status.HTTP_403_FORBIDDEN
                )

        try:
            accepted_req = accept_connection_request(instance.id, user=request.user)
            return Response(self.get_serializer(accepted_req).data)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def decline(self, request, pk=None):
        """Refus confraternel d'une demande de mise en relation."""
        instance = self.get_object()
        is_admin = bool(
            request.user.is_superuser or request.user.is_staff or
            request.user.groups.filter(name__in=['admin', 'superadmin', 'Super-Administrateurs', 'Administrateurs']).exists()
        )
        if not is_admin:
            if not (hasattr(request.user, 'member_profile') and request.user.member_profile == instance.target_member):
                return Response(
                    {"detail": "Seul le membre sollicité ou un administrateur peut décliner cette demande."},
                    status=status.HTTP_403_FORBIDDEN
                )

        try:
            declined_req = decline_connection_request(instance.id)
            return Response(self.get_serializer(declined_req).data)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class NetworkDiscoveryView(APIView):
    """
    Moteur de recherche et d'exploration multicritère pour le Carrefour Professionnel (/network).
    Filtres combinables :
    - intent : MENTORSHIP, SERVICE, PRO_HELP, JOB_INTERNSHIP
    - available_only : 'true' ou '1'
    - sector : Catégorie de métier (ex: 'sante', 'commerce', 'informatique')
    - profession : Nom ou fragment du métier
    - skill : Nom ou fragment de compétence
    - service_type : VOLUNTEER, DAHIRAH_RATE, MENTORSHIP, STANDARD
    - city : Ville de résidence
    - availability : AVAILABLE, LIMITED, etc.
    - mentoring : 'true' pour filtrer les volontaires mentorat
    - pro_help : 'true' pour entraide professionnelle
    - search : Recherche globale sur nom, prénom, compétences, métiers
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = Member.objects.filter(is_deleted=False, status=MemberStatusChoices.ACTIVE).distinct()

        intent = request.query_params.get('intent')
        available_only = request.query_params.get('available_only')
        sector = request.query_params.get('sector')
        profession = request.query_params.get('profession')
        skill = request.query_params.get('skill')
        service_type = request.query_params.get('service_type')
        city = request.query_params.get('city')
        availability = request.query_params.get('availability')
        mentoring = request.query_params.get('mentoring')
        pro_help = request.query_params.get('pro_help')
        search = request.query_params.get('search')

        # Portes d'entrée intentionnelles
        if intent == 'MENTORSHIP':
            qs = qs.filter(availability__open_for_mentoring=True)
        elif intent == 'SERVICE':
            qs = qs.filter(services_offered__is_active=True)
        elif intent == 'PRO_HELP':
            qs = qs.filter(availability__open_for_pro_help=True)
        elif intent == 'JOB_INTERNSHIP':
            qs = qs.filter(situation__in=['EMPLOYEE', 'ENTREPRENEUR', 'FREELANCE'])

        if available_only and available_only.lower() in ['true', '1']:
            qs = qs.filter(availability__status='AVAILABLE')

        if sector:
            qs = qs.filter(professions__profession__category__slug=sector)
        if profession:
            qs = qs.filter(professions__profession__name__icontains=profession)
        if skill:
            qs = qs.filter(skills__skill__name__icontains=skill)
        if service_type:
            qs = qs.filter(services_offered__service_type=service_type, services_offered__is_active=True)
        if city:
            qs = qs.filter(contacts__city__icontains=city)
        if availability:
            qs = qs.filter(availability__status=availability)
        if mentoring and mentoring.lower() == 'true':
            qs = qs.filter(availability__open_for_mentoring=True)
        if pro_help and pro_help.lower() == 'true':
            qs = qs.filter(availability__open_for_pro_help=True)

        if search:
            qs = qs.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(matricule__icontains=search) |
                Q(professions__title__icontains=search) |
                Q(professions__organization__icontains=search) |
                Q(skills__skill__name__icontains=search)
            )

        # Préchargement optimisé pour éviter le problème N+1
        qs = qs.prefetch_related(
            'contacts',
            'professions__profession',
            'skills__skill',
            'services_offered',
        ).select_related('availability')

        serializer = NetworkMemberCardSerializer(qs, many=True, context={'request': request})
        return Response({
            'count': qs.count(),
            'results': serializer.data
        })
