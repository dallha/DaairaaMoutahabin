"""
Gestionnaire personnalisé d'exceptions pour l'API REST.
"""

from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    """Encapsule les erreurs dans un format JSON standardisé."""
    response = exception_handler(exc, context)

    if response is not None:
        response.data = {
            'success': False,
            'status_code': response.status_code,
            'errors': response.data
        }

    return response
