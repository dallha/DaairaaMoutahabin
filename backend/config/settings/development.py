"""
Development settings for Dāʾiratu Al-Mutahābbīna Fillāhi backend.
"""

from .base import *

DEBUG = True

ALLOWED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', 'testserver']

# Database : hérite de base.py (PostgreSQL si DATABASE_URL est défini, sinon SQLite de secours)
# La configuration est gérée centralement dans base.py via dj-database-url

# CORS pour Next.js en développement local
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
]
CORS_ALLOW_CREDENTIALS = True

# Password validation simplifiée en dev
AUTH_PASSWORD_VALIDATORS = []
