"""
Vues analytiques et indicateurs pour le tableau de bord communautaire.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from django.db.models import Count

from common.constants import UserRole
from apps.members.models import Member, Contact, MemberStatusChoices, SituationChoices
from apps.professions.models import MemberProfession
from apps.education.models import Education
from apps.roles.models import MemberRole
from apps.audit.models import AuditLog


class DashboardStatsView(APIView):
    """
    Statistiques globales et distributions analytiques de la Dahirah.
    Accessible à tout membre authentifié, avec données confidentielles (archives, audit) réservées aux administrateurs.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        is_admin = user.is_superuser or user.is_staff or user.groups.filter(name__in=[UserRole.ADMIN, UserRole.SUPERADMIN]).exists()

        # Périmètre actif
        active_members = Member.objects.filter(is_deleted=False, status=MemberStatusChoices.ACTIVE)

        total_members = active_members.count()
        total_pupils = active_members.filter(situation=SituationChoices.PUPIL).count()
        total_students_univ = active_members.filter(situation=SituationChoices.STUDENT).count()
        total_learners = total_pupils + total_students_univ
        total_professionals = active_members.filter(
            situation__in=[SituationChoices.EMPLOYEE, SituationChoices.ENTREPRENEUR, SituationChoices.FREELANCE]
        ).count()
        total_job_seekers = active_members.filter(situation=SituationChoices.JOB_SEEKER).count()

        metrics = {
            'total_active_members': total_members,
            'total_learners': total_learners,
            'total_students': total_students_univ,
            'total_pupils': total_pupils,
            'total_professionals': total_professionals,
            'total_job_seekers': total_job_seekers,
        }

        if is_admin:
            metrics['total_archived_members'] = Member.all_objects.filter(is_deleted=True).count()
            metrics['total_inactive_members'] = Member.all_objects.filter(is_deleted=False, status=MemberStatusChoices.INACTIVE).count()
            metrics['total_contacts'] = Contact.objects.count()

        # Distribution par genre
        gender_data = list(
            active_members.values('gender')
            .annotate(count=Count('id'))
            .order_by('gender')
        )

        # Distribution par situation socio-professionnelle
        situation_data = list(
            active_members.values('situation')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        # Distribution par niveau d'études
        education_data = list(
            Education.objects.filter(member__is_deleted=False, member__status=MemberStatusChoices.ACTIVE)
            .values('level')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        # Top 5 des métiers exercés
        top_professions = list(
            MemberProfession.objects.filter(member__is_deleted=False, member__status=MemberStatusChoices.ACTIVE, is_current=True)
            .values('profession__name')
            .annotate(count=Count('id'))
            .order_by('-count')[:5]
        )

        # Top 5 des fonctions Dahirah actives
        top_roles = list(
            MemberRole.objects.filter(member__is_deleted=False, member__status=MemberStatusChoices.ACTIVE, is_current=True)
            .values('role__name', 'role__category')
            .annotate(count=Count('id'))
            .order_by('-count')[:5]
        )

        data = {
            'metrics': metrics,
            'gender_distribution': gender_data,
            'situation_distribution': situation_data,
            'education_distribution': education_data,
            'top_professions': top_professions,
            'top_roles': top_roles,
        }

        if is_admin:
            recent_logs = list(
                AuditLog.objects.all().order_by('-created_at')[:5].values(
                    'id', 'action', 'entity', 'entity_id', 'created_at', 'user__email'
                )
            )
            data['recent_audit_logs'] = recent_logs

        return Response({
            'success': True,
            'data': data
        })
