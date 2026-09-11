from django.urls import path
from .views import LoginView, RefreshTokenView, LogoutView, MeView, CsrfTokenView

urlpatterns = [
    path('login/', LoginView.as_view(), name='auth_login'),
    path('refresh/', RefreshTokenView.as_view(), name='auth_refresh'),
    path('logout/', LogoutView.as_view(), name='auth_logout'),
    path('me/', MeView.as_view(), name='auth_me'),
    path('csrf/', CsrfTokenView.as_view(), name='auth_csrf'),
]
