from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import ProfessionCategoryViewSet, ProfessionViewSet, MemberProfessionViewSet

router = DefaultRouter()
router.register(r'categories', ProfessionCategoryViewSet, basename='profession-category')
router.register(r'member-professions', MemberProfessionViewSet, basename='member-profession')
router.register(r'', ProfessionViewSet, basename='profession')

urlpatterns = [
    path('', include(router.urls)),
]
