"""
Service centralisé de journalisation d'audit immuable.
"""

from .models import AuditLog, AuditActionChoices


def log_audit_event(
    user=None,
    action=AuditActionChoices.UPDATE,
    entity='Member',
    entity_id='',
    old_values=None,
    new_values=None,
    request=None
):
    """
    Crée une entrée d'audit inaltérable avec capture de l'utilisateur et de l'IP.
    """
    ip_address = None
    if request:
        if user is None and hasattr(request, 'user') and getattr(request.user, 'is_authenticated', False):
            user = request.user
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip_address = x_forwarded_for.split(',')[0].strip()
        else:
            ip_address = request.META.get('REMOTE_ADDR')

    # Garantir que seul un utilisateur authentifié est lié
    actual_user = user if (user and getattr(user, 'is_authenticated', False)) else None

    return AuditLog.objects.create(
        user=actual_user,
        action=action,
        entity=entity,
        entity_id=str(entity_id),
        old_values=old_values,
        new_values=new_values,
        ip_address=ip_address
    )
