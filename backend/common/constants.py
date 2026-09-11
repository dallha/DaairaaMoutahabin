"""
Constantes globales du système RBAC et de l'application Dāʾiratu Al-Mutahābbīna Fillāhi.
Centralise les identifiants de groupes et rôles pour éviter la dispersion de chaînes littérales.
"""


class UserRole:
    """Noms officiels des groupes RBAC natifs Django."""
    MEMBER = 'Membres'
    ADMIN = 'Administrateurs'
    SUPERADMIN = 'Super-Administrateurs'

    CHOICES = [
        (MEMBER, 'Membre'),
        (ADMIN, 'Administrateur'),
        (SUPERADMIN, 'Super-Administrateur'),
    ]

    ALL_ROLES = [MEMBER, ADMIN, SUPERADMIN]
