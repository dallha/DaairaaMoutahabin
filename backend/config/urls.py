"""
URL configuration for Dāʾiratu Al-Mutahābbīna Fillāhi backend.

NOTE: Aucun endpoint API métier n'est créé en Phase 2 conformément aux directives strictes.
"""

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/auth/', include('apps.accounts.urls')),
    path('api/v1/members/', include('apps.members.urls')),
    path('api/v1/contacts/', include('apps.members.contact_urls')),
    path('api/v1/professions/', include('apps.professions.urls')),
    path('api/v1/education/', include('apps.education.urls')),
]
