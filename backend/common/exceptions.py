"""
Gestionnaire personnalisé d'exceptions pour l'API REST respectant l'enveloppe standardisée.
"""

from rest_framework import exceptions, status
from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    """
    Encapsule les erreurs dans un format JSON standardisé :
    {
        "success": False,
        "status_code": 400,
        "error_code": "ERROR_CODE",
        "message": "Message explicite",
        "errors": {...}
    }
    """
    response = exception_handler(exc, context)

    if response is not None:
        status_code = response.status_code
        error_code = getattr(exc, 'default_code', 'ERROR')
        if hasattr(error_code, 'upper'):
            error_code = error_code.upper()
        else:
            error_code = 'ERROR'

        # Détermination du message explicite
        message = "Une erreur est survenue lors du traitement de la requête."
        if isinstance(response.data, dict):
            if 'detail' in response.data:
                message = str(response.data['detail'])
                errors = response.data
            else:
                message = "Des erreurs de validation ont été détectées."
                errors = response.data
        elif isinstance(response.data, list):
            message = "Des erreurs ont été détectées."
            errors = {'non_field_errors': response.data}
        else:
            errors = {'detail': str(response.data)}

        # Code d'erreur spécialisé selon status_code si default_code est générique
        if status_code == status.HTTP_401_UNAUTHORIZED:
            error_code = 'AUTHENTICATION_REQUIRED'
        elif status_code == status.HTTP_403_FORBIDDEN:
            if 'CSRF' in message:
                error_code = 'CSRF_FAILED'
            else:
                error_code = 'PERMISSION_DENIED'
        elif status_code == status.HTTP_404_NOT_FOUND:
            error_code = 'NOT_FOUND'
        elif status_code == status.HTTP_400_BAD_REQUEST and error_code == 'ERROR':
            error_code = 'VALIDATION_ERROR'

        response.data = {
            'success': False,
            'status_code': status_code,
            'error_code': error_code,
            'message': message,
            'errors': errors
        }

    return response

