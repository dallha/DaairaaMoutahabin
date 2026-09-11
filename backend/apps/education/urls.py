from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import EducationViewSet

router = DefaultRouter()
router.register(r'', EducationViewSet, basename='education')

urlpatterns = [
    path('', include(router.urls)),
]
