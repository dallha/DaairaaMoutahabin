"""
Production settings for Dāʾiratu Al-Mutahābbīna Fillāhi backend deployed on Vercel.
"""

from .base import *
import os

DEBUG = os.environ.get('DJANGO_DEBUG', 'False').lower() in ('true', '1')

SECRET_KEY = os.environ.get(
    'DJANGO_SECRET_KEY',
    'django-insecure-dairatu-mutahabbina-prod-secret-key-2026'
)

# Hôtes autorisés (Vercel et local)
allowed_hosts_raw = os.environ.get('DJANGO_ALLOWED_HOSTS', '.vercel.app,localhost,127.0.0.1')
ALLOWED_HOSTS = [h.strip() for h in allowed_hosts_raw.split(',') if h.strip()]
if '*' in ALLOWED_HOSTS:
    ALLOWED_HOSTS = ['*']

# Reverse proxy SSL Vercel
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_SSL_REDIRECT = False  # Vercel gère le forçage HTTPS au niveau Edge CDN
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True

# CSRF Trusted Origins pour requêtes POST sécurisées
CSRF_TRUSTED_ORIGINS = [
    'https://*.vercel.app',
    'https://moutahabina.vercel.app',
]

# CORS restreint
cors_env = os.environ.get('CORS_ALLOWED_ORIGINS')
if cors_env:
    CORS_ALLOWED_ORIGINS = [origin.strip() for origin in cors_env.split(',') if origin.strip()]
else:
    CORS_ALLOWED_ORIGINS = [
        'https://moutahabina.vercel.app',
        'http://localhost:3000',
        'http://localhost:5173',
    ]
CORS_ALLOW_CREDENTIALS = True
