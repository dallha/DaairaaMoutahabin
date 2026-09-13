import logging
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

from apps.members.models import Member, MemberStatusChoices
from .models import (
    MemberNeed,
    NeedStatusChoices,
    NeedTypeChoices,
    ConnectionRequest,
    ConnectionRequestStatusChoices,
    MemberRelation,
    RelationTypeChoices,
    RelationStatusChoices,
)

logger = logging.getLogger(__name__)


def find_need_matches(need: MemberNeed, limit: int = 10) -> list[dict]:
    """
    Moteur d'appariement confraternel déterministe et explicable.
    
    Barème de scoring transparent :
    - Compétence correspondante (+40)
    - Métier correspondant (+30)
    - Offre de service communautaire active (+20)
    - Disponibilité confirmée (+10)
    - Disponibilité spécifique mentorat / entraide (+10)
    
    Retourne la liste des membres pertinents avec les motifs textuels explicatifs.
    """
    candidates_qs = (
        Member.objects.filter(is_deleted=False, status=MemberStatusChoices.ACTIVE)
        .exclude(id=need.member_id)
        .prefetch_related('skills__skill', 'professions__profession', 'services_offered', 'contacts')
        .select_related('availability')
    )

    title_words = [w.lower() for w in need.title.split() if len(w) > 2]
    desc_words = [w.lower() for w in need.description.split() if len(w) > 3]
    all_keywords = set(title_words + desc_words)

    matches = []

    for candidate in candidates_qs:
        score = 0
        reasons = []

        # 1. Vérification des compétences (Score max +40)
        candidate_skills = candidate.skills.all()
        matching_skills = []
        for ms in candidate_skills:
            skill_name_lower = ms.skill.name.lower()
            if any(kw in skill_name_lower or skill_name_lower in kw for kw in all_keywords):
                matching_skills.append(ms.skill.name)
        
        if matching_skills:
            score += 40
            reasons.append(f"Compétence : {', '.join(matching_skills[:2])}")

        # 2. Vérification du métier / profession (Score max +30)
        candidate_profs = candidate.professions.all()
        matching_profs = []
        for cp in candidate_profs:
            if cp.profession:
                prof_name_lower = cp.profession.name.lower()
                if any(kw in prof_name_lower or prof_name_lower in kw for kw in all_keywords):
                    matching_profs.append(cp.profession.name)
            if cp.title:
                title_lower = cp.title.lower()
                if any(kw in title_lower or title_lower in kw for kw in all_keywords):
                    if cp.title not in matching_profs:
                        matching_profs.append(cp.title)

        # Correspondance contextuelle selon le type de besoin
        if not matching_profs:
            if need.need_type == NeedTypeChoices.LEGAL_ADMIN:
                legal_profs = [cp.profession.name for cp in candidate_profs if cp.profession and any(w in cp.profession.name.lower() for w in ['droit', 'juriste', 'avocat', 'notaire'])]
                if legal_profs:
                    matching_profs.extend(legal_profs)
            elif need.need_type == NeedTypeChoices.ACADEMIC:
                acad_profs = [cp.profession.name for cp in candidate_profs if cp.profession and any(w in cp.profession.name.lower() for w in ['enseignant', 'professeur', 'chercheur', 'docteur', 'formateur'])]
                if acad_profs:
                    matching_profs.extend(acad_profs)

        if matching_profs:
            score += 30
            reasons.append(f"Métier : {matching_profs[0]}")

        # 3. Vérification des services Dahirah actifs (Score max +20)
        candidate_services = candidate.services_offered.filter(is_active=True)
        matching_services = []
        for srv in candidate_services:
            srv_title_lower = srv.title.lower()
            if any(kw in srv_title_lower or srv_title_lower in kw for kw in all_keywords):
                matching_services.append(srv.title)
        
        if matching_services:
            score += 20
            reasons.append(f"Offre Dahirah : {matching_services[0]}")
        elif candidate_services.exists() and need.need_type == NeedTypeChoices.PRO_SERVICE:
            score += 15
            reasons.append(f"Propose {candidate_services.count()} service(s) actif(s)")

        # 4. Vérification de la disponibilité (Score max +20)
        avail = getattr(candidate, 'availability', None)
        if avail:
            if avail.status == 'AVAILABLE':
                score += 10
                reasons.append("Disponibilité confirmée")
            
            if need.need_type == NeedTypeChoices.MENTORSHIP and avail.open_for_mentoring:
                score += 10
                reasons.append("Volontaire pour mentorat")
            elif avail.open_for_pro_help:
                score += 10
                reasons.append("Ouvert à l'entraide pro")

        # Rétention si affinité prouvée
        if score > 0:
            contact = candidate.contacts.filter(is_primary=True).first() or candidate.contacts.first()
            primary_prof = candidate.professions.filter(is_primary=True).first() or candidate.professions.first()
            
            matches.append({
                'member_id': str(candidate.id),
                'matricule': candidate.matricule,
                'display_name': candidate.display_name,
                'gender': candidate.gender,
                'city': contact.city if contact else 'Dakar',
                'primary_profession': primary_prof.profession.name if (primary_prof and primary_prof.profession) else None,
                'score': score,
                'match_reasons': reasons,
                'availability_status': avail.status if avail else 'NOT_SPECIFIED',
                'open_for_mentoring': avail.open_for_mentoring if avail else False,
            })

    matches.sort(key=lambda m: m['score'], reverse=True)
    return matches[:limit]


@transaction.atomic
def accept_connection_request(connection_request_id, user=None) -> ConnectionRequest:
    """
    Validation transactionnelle concurremment sûre d'une demande de mise en relation.
    
    Garanties :
    - SELECT FOR UPDATE : prévient les conditions de course et double-clics.
    - Transaction atomique : création de la relation, changement d'état de la demande
      et passage du besoin en cours (IN_PROGRESS) exécutés en un bloc indivisible.
    - Anti-doublon strict sur MemberRelation.
    """
    req = ConnectionRequest.objects.select_for_update().get(id=connection_request_id)
    
    if req.status == ConnectionRequestStatusChoices.ACCEPTED:
        return req

    if req.status in [ConnectionRequestStatusChoices.DECLINED, ConnectionRequestStatusChoices.CANCELLED]:
        raise ValidationError(_("Impossible d'accepter une demande qui a été déclinée ou annulée."))

    # Déterminer la nature de la relation
    if req.need and req.need.need_type == NeedTypeChoices.MENTORSHIP:
        relation_type = RelationTypeChoices.MENTOR
    else:
        relation_type = RelationTypeChoices.FRATERNAL

    # Création idempotente de la relation inter-membres
    relation, _ = MemberRelation.objects.get_or_create(
        from_member=req.requester,
        to_member=req.target_member,
        relation_type=relation_type,
        defaults={
            'status': RelationStatusChoices.APPROVED,
            'approved_by': user if (user and user.is_authenticated) else None,
            'approved_at': timezone.now(),
            'notes': f"Accompagnement issu du besoin : {req.need.title}" if req.need else "Mise en relation directe acceptée"
        }
    )

    req.resulting_relation = relation
    req.status = ConnectionRequestStatusChoices.ACCEPTED
    req.responded_at = timezone.now()
    req.save(update_fields=['status', 'resulting_relation', 'responded_at'])

    # Mise à jour du besoin lié
    if req.need and req.need.status == NeedStatusChoices.OPEN:
        req.need.status = NeedStatusChoices.IN_PROGRESS
        req.need.save(update_fields=['status', 'updated_at'])

    logger.info(
        "Connexion confraternelle scellée : %s ➔ %s (Requête %s, Relation %s)",
        req.requester.matricule, req.target_member.matricule, req.id, relation.id
    )

    return req


@transaction.atomic
def decline_connection_request(connection_request_id) -> ConnectionRequest:
    """Refus confraternel d'une demande de mise en relation."""
    req = ConnectionRequest.objects.select_for_update().get(id=connection_request_id)
    if req.status == ConnectionRequestStatusChoices.ACCEPTED:
        raise ValidationError(_("Impossible de décliner une demande déjà acceptée."))

    req.status = ConnectionRequestStatusChoices.DECLINED
    req.responded_at = timezone.now()
    req.save(update_fields=['status', 'responded_at'])
    return req
