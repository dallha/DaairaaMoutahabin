import io
import os
import uuid
import logging
from PIL import Image, ImageOps, UnidentifiedImageError
from PIL.Image import DecompressionBombError

from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db import transaction
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from apps.members.models import Member
from apps.members.models_media import MemberMedia, MediaTypeChoices

logger = logging.getLogger(__name__)

# Protection absolue contre les Decompression Bombs
Image.MAX_IMAGE_PIXELS = 50_000_000

# Limites strictes V1.2.4
MAX_RAW_UPLOAD_BYTES = 10 * 1024 * 1024       # 10 Mo max en entrée brute pour prévenir le DoS
MAX_TARGET_BYTES = 2 * 1024 * 1024           # 2 Mo max requis par la politique Dahirah
MAX_DIMENSION = 1600                         # 1600x1600 px max
ALLOWED_FORMATS = {'JPEG', 'PNG', 'WEBP', 'MPO'}
MIME_MAP = {
    'JPEG': 'image/jpeg',
    'PNG': 'image/png',
    'WEBP': 'image/webp',
    'MPO': 'image/jpeg',
}


def validate_and_inspect_image(uploaded_file):
    """
    Validation de sécurité rigoureuse du fichier image :
    1. Contrôle de taille brute avant chargement mémoire.
    2. Inspection binaire réelle des magic bytes via Pillow (ne fait jamais confiance au header HTTP).
    3. Protection contre les Decompression Bombs.
    4. Validation du format d'image intrinsèque (JPEG, PNG, WebP, MPO smartphones).
    5. Pour les conteneurs multi-images MPO (iPhone Portrait/HDR), extraction de l'image principale.
    """
    if uploaded_file.size > MAX_RAW_UPLOAD_BYTES:
        raise ValidationError(_("Le fichier excède la limite maximale autorisée de 10 Mo avant traitement."))

    try:
        # Lecture du début du flux pour inspecter les magic bytes
        image = Image.open(uploaded_file)
        image_format = (image.format or '').upper()
    except DecompressionBombError:
        raise ValidationError(_("Image rejetée : résolution excessive non autorisée (protection anti-bomb)."))
    except (UnidentifiedImageError, IOError, Exception) as e:
        logger.warning(f"Rejet fichier non valide ou corrompu : {e}")
        raise ValidationError(_("Le fichier fourni n'est pas une image valide ou est corrompu."))

    if image_format not in ALLOWED_FORMATS:
        raise ValidationError(
            _("Format %(format)s non supporté. Seuls JPEG, PNG, WebP et MPO sont autorisés.") % {'format': image_format}
        )

    # Si conteneur multi-images MPO (smartphones iPhone Portrait/Live), extraction sécurisée de la frame principale
    if image_format == 'MPO':
        try:
            image.seek(0)
        except Exception as e:
            logger.debug(f"Impossible de positionner sur la première frame MPO : {e}")
        # Détacher la photo principale du conteneur multi-frames
        image = image.copy()

    return image, image_format


def process_image_pipeline(image, target_max_dimension=MAX_DIMENSION, target_max_bytes=MAX_TARGET_BYTES):
    """
    Pipeline de transformation d'image sécurisé :
    1. Normalisation de l'orientation d'après l'EXIF (photos smartphones).
    2. Purge totale des métadonnées EXIF (préservation de la vie privée / GPS).
    3. Normalisation de l'espace colorimétrique (RGB / RGBA).
    4. Redimensionnement adaptatif haute fidélité LANCZOS <= 1600x1600 px.
    5. Compression adaptative progressive en WebP garantissant <= 2 Mo.
    
    Retourne : (processed_bytes, width, height, mime_type, target_format)
    """
    # 1. Orientation automatique d'après EXIF
    try:
        image = ImageOps.exif_transpose(image)
    except Exception as e:
        logger.debug(f"Impossible de transposer EXIF : {e}")

    # 2. Gestion du mode de couleur
    # Si mode avec palette (P) ou CMYK, conversion en RGB ou RGBA
    if image.mode in ('RGBA', 'LA') or (image.mode == 'P' and 'transparency' in image.info):
        image = image.convert('RGBA')
    elif image.mode != 'RGB':
        image = image.convert('RGB')

    # 3. Redimensionnement adaptatif LANCZOS si supérieur aux dimensions cibles
    orig_w, orig_h = image.size
    if orig_w > target_max_dimension or orig_h > target_max_dimension:
        image.thumbnail((target_max_dimension, target_max_dimension), Image.Resampling.LANCZOS)

    final_w, final_h = image.size

    # 4. Compression progressive en WebP (sans métadonnées EXIF)
    quality = 85
    buffer = io.BytesIO()

    while quality >= 40:
        buffer.seek(0)
        buffer.truncate()
        image.save(buffer, format='WEBP', quality=quality, method=6)
        size = buffer.tell()
        if size <= target_max_bytes:
            break
        quality -= 15  # 85 -> 70 -> 55 -> 40

    # Si la taille dépasse encore 2 Mo après réduction de qualité, on réduit l'échelle
    scale = 0.8
    while buffer.tell() > target_max_bytes and scale >= 0.4:
        new_w = max(100, int(final_w * scale))
        new_h = max(100, int(final_h * scale))
        scaled_img = image.resize((new_w, new_h), Image.Resampling.LANCZOS)
        buffer.seek(0)
        buffer.truncate()
        scaled_img.save(buffer, format='WEBP', quality=70, method=6)
        final_w, final_h = new_w, new_h
        scale -= 0.2

    final_bytes = buffer.getvalue()
    if len(final_bytes) > target_max_bytes:
        raise ValidationError(_("Impossible de compresser l'image en-deçà de 2 Mo."))

    return final_bytes, final_w, final_h, 'image/webp', 'WEBP'


def process_and_save_profile_photo(member: Member, uploaded_file) -> MemberMedia:
    """
    Orchestration complète du téléversement d'avatar pour un membre :
    - Validation MIME & magic bytes.
    - Purge EXIF & compression adaptative <= 2 Mo.
    - Transaction atomique : désactivation de l'ancien avatar courant + création du nouveau.
    - Synchronisation avec member.photo pour rétrocompatibilité.
    - Garantie stricte de l'unicité PostgreSQL d'un seul avatar actif par membre.
    """
    image, _ = validate_and_inspect_image(uploaded_file)
    processed_bytes, width, height, mime_type, target_ext = process_image_pipeline(image)

    # Génération d'un nom de fichier sécurisé et imprédictible
    timestamp = int(timezone.now().timestamp())
    random_token = uuid.uuid4().hex[:8]
    filename = f"{member.matricule}_{timestamp}_{random_token}.webp".lower()
    storage_path = f"members/photos/{filename}"

    content_file = ContentFile(processed_bytes, name=filename)

    with transaction.atomic():
        # Verrouillage et désactivation des anciens avatars du membre
        old_medias = list(
            MemberMedia.objects.filter(
                member=member,
                media_type=MediaTypeChoices.PROFILE_PHOTO,
                is_current_profile_photo=True
            ).select_for_update()
        )
        for old in old_medias:
            old.is_current_profile_photo = False
            old.save(update_fields=['is_current_profile_photo', 'updated_at'])

        # Enregistrement du nouveau média
        new_media = MemberMedia(
            member=member,
            media_type=MediaTypeChoices.PROFILE_PHOTO,
            mime_type=mime_type,
            size=len(processed_bytes),
            width=width,
            height=height,
            title=f"Photo de profil - {member.display_name}",
            is_current_profile_photo=True,
            metadata={
                'original_filename': getattr(uploaded_file, 'name', 'upload'),
                'target_format': target_ext,
                'compressed_at': timezone.now().isoformat(),
            }
        )
        new_media.file.save(filename, content_file, save=False)
        new_media.storage_key = new_media.file.name
        new_media.save()

        # Synchronisation du champ member.photo pour rétrocompatibilité totale
        member.photo = new_media.file
        member.save(update_fields=['photo', 'updated_at'])

    # Nettoyage physique des anciens fichiers d'avatar orphelins
    for old in old_medias:
        try:
            if old.file and old.file.name != new_media.file.name:
                default_storage.delete(old.file.name)
        except Exception as e:
            logger.warning(f"Impossible de supprimer physiquement l'ancien fichier orphelin {old.file.name}: {e}")

    logger.info(
        f"Avatar mis à jour avec succès pour {member.matricule}: "
        f"{width}x{height}, {len(processed_bytes)} octets, media_id={new_media.id}"
    )
    return new_media


def delete_profile_photo(member: Member) -> bool:
    """
    Suppression de la photo de profil courante d'un membre :
    - Transaction atomique réinitialisant l'avatar courant.
    - Suppression physique du fichier sous-jacent.
    - Synchronisation member.photo = None.
    """
    with transaction.atomic():
        current_medias = list(
            MemberMedia.objects.filter(
                member=member,
                media_type=MediaTypeChoices.PROFILE_PHOTO,
                is_current_profile_photo=True
            ).select_for_update()
        )
        for media in current_medias:
            media.is_current_profile_photo = False
            media.save(update_fields=['is_current_profile_photo', 'updated_at'])
            try:
                if media.file:
                    default_storage.delete(media.file.name)
            except Exception as e:
                logger.warning(f"Erreur lors de la suppression physique du média {media.id}: {e}")

        member.photo = None
        member.save(update_fields=['photo', 'updated_at'])

    logger.info(f"Avatar supprimé pour le membre {member.matricule}")
    return True
