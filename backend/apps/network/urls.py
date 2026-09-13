from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SkillCategoryViewSet,
    SkillViewSet,
    ServiceCatalogViewSet,
    MemberSkillViewSet,
    MemberServiceViewSet,
    MemberAvailabilityViewSet,
    MemberRelationViewSet,
    MemberNeedViewSet,
    NetworkDiscoveryView,
)

router = DefaultRouter()
router.register(r'skill-categories', SkillCategoryViewSet, basename='skill-categories')
router.register(r'skills', SkillViewSet, basename='skills')
router.register(r'services-catalog', ServiceCatalogViewSet, basename='services-catalog')
router.register(r'member-skills', MemberSkillViewSet, basename='member-skills')
router.register(r'member-services', MemberServiceViewSet, basename='member-services')
router.register(r'member-availability', MemberAvailabilityViewSet, basename='member-availability')
router.register(r'member-relations', MemberRelationViewSet, basename='member-relations')
router.register(r'member-needs', MemberNeedViewSet, basename='member-needs')

urlpatterns = [
    path('discovery/', NetworkDiscoveryView.as_view(), name='network-discovery'),
    path('', include(router.urls)),
]
