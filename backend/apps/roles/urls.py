from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import RoleViewSet, MemberRoleViewSet

router = DefaultRouter()
router.register(r'assignments', MemberRoleViewSet, basename='member-role')
router.register(r'', RoleViewSet, basename='role')

urlpatterns = [
    path('', include(router.urls)),
]
