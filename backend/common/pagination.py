"""
Classes de pagination standard pour Django REST Framework.
"""

from rest_framework.pagination import PageNumberPagination


class StandardResultsSetPagination(PageNumberPagination):
    """Pagination standardisée avec contrôle de la taille de page par le client."""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100
