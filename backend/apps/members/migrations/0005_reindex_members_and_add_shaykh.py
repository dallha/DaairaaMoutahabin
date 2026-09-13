import re
import uuid
from django.db import migrations

SHAYKH_MEMBER_UUID = uuid.UUID('018e0000-0000-7000-8000-000000000001')


def reindex_and_add_shaykh(apps, schema_editor):
    Member = apps.get_model('members', 'Member')
    CustomUser = apps.get_model('accounts', 'CustomUser')
    MatriculeSequence = apps.get_model('members', 'MatriculeSequence')

    # 1. Décalage transactionnel descendant des 34 membres existants (34 -> 35, 33 -> 34, ..., 1 -> 2)
    # Ce parcours en ordre inverse garantit l'absence totale de collision sur la contrainte UNIQUE(matricule).
    members = list(Member.objects.filter(matricule__startswith='DAMF-'))
    user = CustomUser.objects.filter(email='nouroubaba@gmail.com').first()

    if not members and not user:
        # Environnement de test ou base vierge sans membres
        return

    def get_seq(m):
        match = re.search(r'DAMF-(\d+)$', m.matricule or '')
        return int(match.group(1)) if match else 0

    members_sorted = sorted(members, key=get_seq, reverse=True)
    for member in members_sorted:
        seq = get_seq(member)
        if seq >= 1:
            member.matricule = f"DAMF-{seq + 1:04d}"
            member.save(update_fields=['matricule'])

    # 2. Rattachement du compte existant nouroubaba@gmail.com
    user = CustomUser.objects.filter(email='nouroubaba@gmail.com').first()

    # 3. Création du profil Member institutionnel pour le Shaykh en DAMF-0001
    shaykh = Member.objects.filter(id=SHAYKH_MEMBER_UUID).first()
    if not shaykh:
        shaykh = Member.objects.filter(matricule='DAMF-0001').first()

    if not shaykh:
        Member.objects.create(
            id=SHAYKH_MEMBER_UUID,
            matricule='DAMF-0001',
            first_name='Shaykh Muhammad Nūruddin',
            last_name='Ibn Shaykh Muhammadul Amīn Ñas',
            gender='M',
            situation='OTHER',
            status='ACTIVE',
            visibility_level='PUBLIC',
            user=user,
            notes='Guide spirituel et fondateur institutionnel de la Dahirah.'
        )
    else:
        shaykh.matricule = 'DAMF-0001'
        if user and not shaykh.user:
            shaykh.user = user
        shaykh.save()

    # 4. Actualisation du compteur de séquence à 35 (le prochain sera DAMF-0036)
    seq_record = MatriculeSequence.objects.filter(prefix='DAMF').first()
    if seq_record:
        seq_record.last_sequence = 35
        seq_record.save(update_fields=['last_sequence'])
    else:
        MatriculeSequence.objects.create(prefix='DAMF', last_sequence=35)


def reverse_reindex_and_remove_shaykh(apps, schema_editor):
    Member = apps.get_model('members', 'Member')
    MatriculeSequence = apps.get_model('members', 'MatriculeSequence')

    # 1. Suppression exclusive du profil Shaykh créé par cette migration (identifié par UUID)
    Member.objects.filter(id=SHAYKH_MEMBER_UUID).delete()

    # 2. Réindexation ascendante des membres (2 -> 1, 3 -> 2, ..., 35 -> 34)
    members = list(Member.objects.filter(matricule__startswith='DAMF-'))

    def get_seq(m):
        match = re.search(r'DAMF-(\d+)$', m.matricule or '')
        return int(match.group(1)) if match else 0

    members_sorted = sorted(members, key=get_seq)
    for member in members_sorted:
        seq = get_seq(member)
        if seq >= 2:
            member.matricule = f"DAMF-{seq - 1:04d}"
            member.save(update_fields=['matricule'])

    # 3. Restauration de la séquence à 34
    seq_record = MatriculeSequence.objects.filter(prefix='DAMF').first()
    if seq_record:
        seq_record.last_sequence = 34
        seq_record.save(update_fields=['last_sequence'])


class Migration(migrations.Migration):

    dependencies = [
        ('members', '0004_migrate_matricule_to_damf'),
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(
            reindex_and_add_shaykh,
            reverse_code=reverse_reindex_and_remove_shaykh,
        ),
    ]
