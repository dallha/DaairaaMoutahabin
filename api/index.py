import os
import sys
import logging
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent / 'backend'
sys.path.insert(0, str(backend_dir))

# Configure production settings for Vercel Serverless
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.production')

from django.core.wsgi import get_wsgi_application

# Vercel Serverless Python runtime looks for `app` WSGI callable
app = get_wsgi_application()

# Execute pending database migrations automatically in production
try:
    from django.core.management import call_command
    call_command('migrate', interactive=False)
except Exception as exc:
    logging.getLogger('django').warning(f"Auto-migration on startup: {exc}")

