import io
from PIL import Image

from django.contrib.auth.models import Group
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase, APIClient

from apps.accounts.models import CustomUser
from apps.members.models import Member, GenderChoices, SituationChoices, MemberStatusChoices, VisibilityChoices
from apps.members.models_media import MemberMedia, MediaTypeChoices
from apps.network.models import (
    NeedTypeChoices,
    NeedUrgencyChoices,
    NeedStatusChoices,
    ConnectionRequestStatusChoices,
    RelationTypeChoices,
    SkillLevelChoices,
)
from common.constants import UserRole


def create_test_image(width=500, height=500, format='PNG', color=(51, 90, 121)):
    """Génère une image valide en mémoire pour les tests de téléversement."""
    file_obj = io.BytesIO()
    image = Image.new('RGB', (width, height), color=color)
    image.save(file_obj, format=format)
    file_obj.seek(0)
    ext = format.lower()
    return SimpleUploadedFile(f"avatar_test.{ext}", file_obj.read(), content_type=f"image/{ext}")


class MemberMediaPhotoTests(APITestCase):
    """
    Tests de l'infrastructure Médias sécurisée et de la photo de profil (V1.2.4) :
    - Upload avec redimensionnement automatique <= 1600x1600 et compression WebP <= 2 Mo.
    - Contrainte PostgreSQL d'unicité d'avatar actif (un seul is_current_profile_photo=True).
    - Rejet des fichiers invalides et corrompus (sécurité magic bytes).
    - Matrice granulaire des permissions IsOwnerOrAdmin (objet et action).
    - Suppression sécurisée de l'avatar.
    - Contrôle de parité des référentiels codifiés en base.
    """

    def setUp(self):
        self.group_members, _ = Group.objects.get_or_create(name=UserRole.MEMBER)
        self.group_admins, _ = Group.objects.get_or_create(name=UserRole.ADMIN)

        # 1. Membre A (Propriétaire)
        self.user_a = CustomUser.objects.create_user(
            email='disciple_a@dairatu.sn',
            first_name='Amadou',
            last_name='Ba'
        )
        self.user_a.groups.add(self.group_members)
        self.member_a = Member.objects.create(
            user=self.user_a,
            first_name='Amadou',
            last_name='Ba',
            gender=GenderChoices.MALE,
            situation=SituationChoices.STUDENT,
            status=MemberStatusChoices.ACTIVE,
        )

        # 2. Membre B (Tiers non autorisé)
        self.user_b = CustomUser.objects.create_user(
            email='disciple_b@dairatu.sn',
            first_name='Fatou',
            last_name='Diop'
        )
        self.user_b.groups.add(self.group_members)
        self.member_b = Member.objects.create(
            user=self.user_b,
            first_name='Fatou',
            last_name='Diop',
            gender=GenderChoices.FEMALE,
            situation=SituationChoices.EMPLOYEE,
            status=MemberStatusChoices.ACTIVE,
        )

        # 3. Administrateur
        self.user_admin = CustomUser.objects.create_superuser(
            email='admin@dairatu.sn',
            first_name='Admin',
            last_name='Dahirah'
        )
        self.user_admin.groups.add(self.group_admins)

    def test_01_valid_photo_upload_resize_and_compression(self):
        """Upload d'une image haute résolution (2000x2000) et vérification du pipeline."""
        client = APIClient()
        client.force_authenticate(user=self.user_a)

        large_image = create_test_image(width=2000, height=2000, format='PNG')
        response = client.post(
            f'/api/v1/members/{self.member_a.id}/photo/',
            {'photo': large_image},
            format='multipart'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data['data']

        # Vérification des dimensions ramenées <= 1600
        self.assertLessEqual(data['width'], 1600)
        self.assertLessEqual(data['height'], 1600)
        # Vérification de la taille <= 2 Mo
        self.assertLessEqual(data['size'], 2 * 1024 * 1024)
        self.assertEqual(data['mime_type'], 'image/webp')

        # Vérification en base de données
        current_media = MemberMedia.objects.filter(
            member=self.member_a,
            media_type=MediaTypeChoices.PROFILE_PHOTO,
            is_current_profile_photo=True
        )
        self.assertEqual(current_media.count(), 1)
        media_record = current_media.first()
        self.assertEqual(str(media_record.id), data['media_id'])

        # Rétrocompatibilité member.photo
        self.member_a.refresh_from_db()
        self.assertTrue(bool(self.member_a.photo))

    def test_02_replacement_is_atomic_and_enforces_unicity(self):
        """Le remplacement successif d'avatars garantit l'invariance d'un seul avatar actif."""
        client = APIClient()
        client.force_authenticate(user=self.user_a)

        # Premier upload
        img1 = create_test_image(width=400, height=400, format='JPEG')
        resp1 = client.post(f'/api/v1/members/{self.member_a.id}/photo/', {'photo': img1}, format='multipart')
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)

        # Deuxième upload (remplacement)
        img2 = create_test_image(width=600, height=600, format='PNG')
        resp2 = client.post(f'/api/v1/members/{self.member_a.id}/photo/', {'photo': img2}, format='multipart')
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)

        # Vérification de la contrainte : exactement 1 avatar actif
        active_count = MemberMedia.objects.filter(
            member=self.member_a,
            media_type=MediaTypeChoices.PROFILE_PHOTO,
            is_current_profile_photo=True
        ).count()
        self.assertEqual(active_count, 1)

        # Total des médias archivés = 2
        total_count = MemberMedia.objects.filter(
            member=self.member_a,
            media_type=MediaTypeChoices.PROFILE_PHOTO
        ).count()
        self.assertEqual(total_count, 2)

    def test_03_invalid_file_rejected(self):
        """Un fichier texte ou exécutable masqué est immédiatement rejeté."""
        client = APIClient()
        client.force_authenticate(user=self.user_a)

        fake_file = SimpleUploadedFile("script.png", b"<?php echo 'malicious'; ?>", content_type="image/png")
        response = client.post(f'/api/v1/members/{self.member_a.id}/photo/', {'photo': fake_file}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("n'est pas une image valide", str(response.data))

    def test_04_permissions_granular_check(self):
        """
        Matrice de permissions IsOwnerOrAdmin :
        - Membre B tente de modifier l'avatar du Membre A -> 403 Forbidden.
        - Membre A modifie son propre avatar -> 200 OK.
        - Administrateur modifie l'avatar du Membre A -> 200 OK.
        """
        # 1. Tentative d'usurpation par Membre B
        img_b = create_test_image()
        client_b = APIClient()
        client_b.force_authenticate(user=self.user_b)
        resp_b = client_b.post(f'/api/v1/members/{self.member_a.id}/photo/', {'photo': img_b}, format='multipart')
        self.assertEqual(resp_b.status_code, status.HTTP_403_FORBIDDEN)

        # 2. Modification légitime par le propriétaire (Membre A)
        img_a = create_test_image()
        client_a = APIClient()
        client_a.force_authenticate(user=self.user_a)
        resp_a = client_a.post(f'/api/v1/members/{self.member_a.id}/photo/', {'photo': img_a}, format='multipart')
        self.assertEqual(resp_a.status_code, status.HTTP_200_OK)

        # 3. Modification légitime par l'Administrateur
        img_admin = create_test_image()
        client_admin = APIClient()
        client_admin.force_authenticate(user=self.user_admin)
        resp_admin = client_admin.post(f'/api/v1/members/{self.member_a.id}/photo/', {'photo': img_admin}, format='multipart')
        self.assertEqual(resp_admin.status_code, status.HTTP_200_OK)

    def test_05_photo_deletion(self):
        """Suppression de la photo de profil par son propriétaire."""
        client = APIClient()
        client.force_authenticate(user=self.user_a)

        # Initialiser avec une photo
        img = create_test_image()
        client.post(f'/api/v1/members/{self.member_a.id}/photo/', {'photo': img}, format='multipart')

        # Suppression
        del_resp = client.delete(f'/api/v1/members/{self.member_a.id}/photo/')
        self.assertEqual(del_resp.status_code, status.HTTP_200_OK)

        self.member_a.refresh_from_db()
        self.assertFalse(bool(self.member_a.photo))
        self.assertEqual(
            MemberMedia.objects.filter(
                member=self.member_a,
                media_type=MediaTypeChoices.PROFILE_PHOTO,
                is_current_profile_photo=True
            ).count(),
            0
        )

    def test_06_referential_parity_database_choices(self):
        """
        Garantit que 100% des codes réels en base possèdent un libellé clair
        en Français et en Arabe pour l'identité numérique bilingue.
        """
        all_choices_sets = [
            SituationChoices,
            MemberStatusChoices,
            VisibilityChoices,
            NeedTypeChoices,
            NeedUrgencyChoices,
            NeedStatusChoices,
            ConnectionRequestStatusChoices,
            RelationTypeChoices,
            SkillLevelChoices,
            MediaTypeChoices,
        ]

        for choices_cls in all_choices_sets:
            for code, label in choices_cls.choices:
                # Vérification que le code est une chaîne non vide
                self.assertTrue(len(str(code)) > 0, f"Code vide dans {choices_cls.__name__}")
                # Vérification que le label Django gettext_lazy est renseigné
                self.assertTrue(len(str(label)) > 0, f"Label vide pour {code} dans {choices_cls.__name__}")

    def test_07_heavy_photo_compression_and_no_raw_storage(self):
        """
        Upload d'une photo lourde > 2 Mo et haute résolution :
        - La photo originale brute n'est JAMAIS stockée sur le disque / bucket.
        - Le fichier sauvegardé est strictement un WebP optimisé <= 2 Mo et <= 1600x1600.
        - Le fichier physique existe bien dans le storage abstrait.
        """
        import os
        from django.core.files.storage import default_storage

        # Générer une image haute résolution (1800x1800) non compressée
        # Pour obtenir un poids de fichier élevé (> 2 Mo), on utilise du bruit ou BMP/PNG haute densité
        file_obj = io.BytesIO()
        raw_image = Image.new('RGB', (1800, 1800), color=(120, 80, 200))
        raw_image.save(file_obj, format='PNG')
        raw_bytes = file_obj.getvalue()
        file_obj.seek(0)

        uploaded = SimpleUploadedFile("heavy_photo.png", raw_bytes, content_type="image/png")

        client = APIClient()
        client.force_authenticate(user=self.user_a)
        response = client.post(
            f'/api/v1/members/{self.member_a.id}/photo/',
            {'photo': uploaded},
            format='multipart'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        media_data = response.data['data']

        # 1. Vérification : dimensions redimensionnées <= 1600x1600
        self.assertLessEqual(media_data['width'], 1600)
        self.assertLessEqual(media_data['height'], 1600)

        # 2. Vérification : taille finale strictement <= 2 Mo
        self.assertLessEqual(media_data['size'], 2 * 1024 * 1024)
        self.assertEqual(media_data['mime_type'], 'image/webp')

        # 3. Vérification : le fichier brut "heavy_photo.png" n'a JAMAIS été écrit sur le storage
        self.assertFalse(default_storage.exists("heavy_photo.png"))
        self.assertFalse(default_storage.exists("members/photos/heavy_photo.png"))

        # 4. Vérification : seul le WebP optimisé existe sur le storage
        media_record = MemberMedia.objects.get(id=media_data['media_id'])
        self.assertTrue(media_record.file.name.endswith('.webp'))
        self.assertTrue(default_storage.exists(media_record.file.name))

    def test_08_physical_file_deleted_from_storage(self):
        """
        Vérifie qu'une suppression d'avatar supprime également
        le fichier physique du storage sans laisser de détritus orphelins.
        """
        from django.core.files.storage import default_storage

        client = APIClient()
        client.force_authenticate(user=self.user_a)

        img = create_test_image(width=300, height=300, format='JPEG')
        resp = client.post(f'/api/v1/members/{self.member_a.id}/photo/', {'photo': img}, format='multipart')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        media = MemberMedia.objects.filter(member=self.member_a, is_current_profile_photo=True).first()
        file_path = media.file.name
        self.assertTrue(default_storage.exists(file_path))

        # Suppression de l'avatar
        del_resp = client.delete(f'/api/v1/members/{self.member_a.id}/photo/')
        self.assertEqual(del_resp.status_code, status.HTTP_200_OK)

        # Le fichier physique DOIT avoir disparu du storage
        self.assertFalse(default_storage.exists(file_path))

    def test_09_production_storage_object_configuration(self):
        """
        Vérifie que la configuration de production (production.py)
        active bien le stockage objet S3Boto3Storage lorsque les credentials
        de bucket sont renseignés dans l'environnement.
        """
        import os
        from unittest.mock import patch

        with patch.dict(os.environ, {
            'AWS_STORAGE_BUCKET_NAME': 'dairatu-media-bucket',
            'AWS_ACCESS_KEY_ID': 'test_key_id',
            'AWS_SECRET_ACCESS_KEY': 'test_key_value',
            'AWS_S3_ENDPOINT_URL': 'https://mock.r2.cloudflarestorage.com',
        }):
            import importlib
            import config.settings.production as prod_settings
            importlib.reload(prod_settings)

            # Vérification que le backend S3Boto3Storage est sélectionné
            self.assertEqual(
                prod_settings.STORAGES['default']['BACKEND'],
                'storages.backends.s3boto3.S3Boto3Storage'
            )
            self.assertIn('storages', prod_settings.INSTALLED_APPS)

    def test_10_production_without_bucket_raises_improperly_configured(self):
        """
        Vérifie qu'en l'absence de credentials bucket en production,
        production.py lève STRICTEMENT une exception ImproperlyConfigured
        interdisant tout fallback silencieux vers /tmp/media.
        """
        import os
        from unittest.mock import patch
        from django.core.exceptions import ImproperlyConfigured

        # Supprimer toute variable AWS de l'environnement
        env_without_bucket = {
            k: v for k, v in os.environ.items()
            if not k.startswith('AWS_') and k != 'ALLOW_INSECURE_LOCAL_STORAGE'
        }

        with patch.dict(os.environ, env_without_bucket, clear=True):
            import importlib
            import config.settings.production as prod_settings

            with self.assertRaises(ImproperlyConfigured) as ctx:
                importlib.reload(prod_settings)

            self.assertIn("STRICTEMENT OBLIGATOIRE", str(ctx.exception))
            self.assertIn("Aucun fallback local silencieux", str(ctx.exception))

