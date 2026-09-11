"""
URL configuration for Dāʾiratu Al-Mutahābbīna Fillāhi backend.

NOTE: Aucun endpoint API métier n'est créé en Phase 2 conformément aux directives strictes.
"""

from django.contrib import admin
from django.urls import path

urlpatterns = [
    path('admin/', admin.site.urls),
]
