#!/usr/bin/env python3
"""
Script d'exécution explicite des migrations Django sur Neon PostgreSQL.
Découplé du runtime serverless Vercel : à exécuter en phase de pré-déploiement ou de maintenance.
"""

import os
import sys
from pathlib import Path

root_dir = Path(__file__).resolve().parent.parent
backend_dir = root_dir / 'backend'
sys.path.insert(0, str(backend_dir))

if not os.environ.get('DATABASE_URL'):
    env_file = backend_dir / '.env'
    if env_file.exists():
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    if k.strip() == 'DATABASE_URL':
                        os.environ['DATABASE_URL'] = v.strip()
                        break

if not os.environ.get('DATABASE_URL'):
    print("❌ ERREUR: DATABASE_URL introuvable dans l'environnement ou backend/.env")
    sys.exit(1)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')

import django
django.setup()

from django.core.management import call_command

print("=" * 65)
print("🚀 MIGRATION EXPLICITE NEON POSTGRESQL (DÉCOUPLÉE DE VERCEL RUNTIME)")
print("=" * 65)

try:
    call_command('migrate', interactive=False)
    print("✅ Toutes les migrations sont appliquées avec succès.")
except Exception as e:
    print(f"❌ Erreur lors de la migration : {e}")
    sys.exit(1)
