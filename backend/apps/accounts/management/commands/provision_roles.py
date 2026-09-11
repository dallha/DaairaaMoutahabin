"""
Commande de provisioning des Groupes et Permissions RBAC natifs Django.
S'exécute après les migrations initiales pour initialiser les groupes :
- Super-Administrateurs
- Administrateurs
- Membres
"""

from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from common.constants import UserRole


class Command(BaseCommand):
    help = "Initialise et provisionne les groupes RBAC et leurs permissions métier."

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Début du provisioning des rôles RBAC..."))

        # 1. Groupe Membres
        group_members, created = Group.objects.get_or_create(name=UserRole.MEMBER)
        # Permissions de consultation de base
        member_perms = Permission.objects.filter(
            codename__in=[
                'view_member',
                'view_contact',
                'view_profession',
                'view_professioncategory',
                'view_memberprofession',
                'view_education',
                'view_role',
                'view_memberrole',
            ]
        )
        group_members.permissions.set(member_perms)
        self.stdout.write(self.style.SUCCESS(f"Groupe '{UserRole.MEMBER}' provisionné ({member_perms.count()} permissions)."))

        # 2. Groupe Administrateurs
        group_admins, created = Group.objects.get_or_create(name=UserRole.ADMIN)
        # CRUD complet sur le métier + consultation des logs d'audit
        admin_perms = Permission.objects.filter(
            content_type__app_label__in=['members', 'professions', 'education', 'roles']
        ) | Permission.objects.filter(
            content_type__app_label='audit',
            codename='view_auditlog'
        )
        group_admins.permissions.set(admin_perms)
        self.stdout.write(self.style.SUCCESS(f"Groupe '{UserRole.ADMIN}' provisionné ({admin_perms.count()} permissions)."))

        # 3. Groupe Super-Administrateurs
        group_superadmins, created = Group.objects.get_or_create(name=UserRole.SUPERADMIN)
        all_perms = Permission.objects.all()
        group_superadmins.permissions.set(all_perms)
        self.stdout.write(self.style.SUCCESS(f"Groupe 'Super-Administrateurs' provisionné ({all_perms.count()} permissions)."))

        self.stdout.write(self.style.SUCCESS("Provisioning RBAC terminé avec succès."))
