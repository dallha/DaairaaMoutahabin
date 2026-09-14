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

# -----------------------------------------------------------------------------
# Stockage Objet Découplé (S3, Cloudflare R2, Supabase Storage)
# Neon PostgreSQL ne stocke AUCUN binaire ; les médias sont acheminés
# vers le stockage objet distant (ou /tmp sécurisé en serverless Vercel).
# -----------------------------------------------------------------------------
AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
AWS_STORAGE_BUCKET_NAME = os.environ.get('AWS_STORAGE_BUCKET_NAME')
AWS_S3_ENDPOINT_URL = os.environ.get('AWS_S3_ENDPOINT_URL')  # Requis pour Cloudflare R2, Supabase S3, MinIO
AWS_S3_REGION_NAME = os.environ.get('AWS_S3_REGION_NAME', 'auto')
AWS_S3_CUSTOM_DOMAIN = os.environ.get('AWS_S3_CUSTOM_DOMAIN')  # CDN personnalisé ou pub-xxx.r2.dev
AWS_DEFAULT_ACL = None  # Bucket Owner Enforced
AWS_QUERYSTRING_AUTH = False
AWS_S3_FILE_OVERWRITE = False

from django.core.exceptions import ImproperlyConfigured

if AWS_STORAGE_BUCKET_NAME and AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY:
    if 'storages' not in INSTALLED_APPS:
        INSTALLED_APPS = list(INSTALLED_APPS) + ['storages']

    STORAGES = {
        "default": {
            "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
            "OPTIONS": {
                "location": "media",
            },
        },
        "staticfiles": {
            "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
        },
    }
elif os.environ.get('ALLOW_INSECURE_LOCAL_STORAGE', 'False').lower() in ('true', '1'):
    # Bypass explicite strictement réservé aux tests d'intégration locaux ou CI
    storage_location = "/tmp/media" if os.environ.get('VERCEL') else str(MEDIA_ROOT)
    STORAGES = {
        "default": {
            "BACKEND": "django.core.files.storage.FileSystemStorage",
            "OPTIONS": {
                "location": storage_location,
                "base_url": "/media/",
            },
        },
        "staticfiles": {
            "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
        },
    }
else:
    raise ImproperlyConfigured(
        "CRITICAL ERROR (V1.2.4 Architecture Rule) : En environnement de production (config.settings.production), "
        "le stockage objet cloud distant (AWS_STORAGE_BUCKET_NAME, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY) "
        "est STRICTEMENT OBLIGATOIRE. Aucun fallback local silencieux (/tmp/media) n'est toléré en production "
        "pour préserver la durabilité et la souveraineté des médias confraternels."
    )

