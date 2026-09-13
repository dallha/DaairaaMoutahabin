from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LoginView,
    RefreshTokenView,
    LogoutView,
    MeView,
    CsrfTokenView,
    UserManagementViewSet,
)

router = DefaultRouter()
router.register(r'users', UserManagementViewSet, basename='users')

urlpatterns = [
    path('login/', LoginView.as_view(), name='auth_login'),
    path('refresh/', RefreshTokenView.as_view(), name='auth_refresh'),
    path('logout/', LogoutView.as_view(), name='auth_logout'),
    path('me/', MeView.as_view(), name='auth_me'),
    path('csrf/', CsrfTokenView.as_view(), name='auth_csrf'),
    path('', include(router.urls)),
]

