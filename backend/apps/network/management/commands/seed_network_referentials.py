from django.core.management.base import BaseCommand
from apps.network.models import SkillCategory, Skill, ServiceCatalog


class Command(BaseCommand):
    help = "Initialise de façon idempotente les référentiels de compétences et le catalogue de services."

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Initialisation des référentiels de compétences..."))

        REFERENTIALS = [
            (
                "Informatique & Numérique", 1,
                [
                    "Développement Web & Mobile",
                    "Graphisme, UI/UX & Design",
                    "Gestion de données & Analyse",
                    "Maintenance & Réseaux Informatiques",
                    "Marketing Digital & E-Commerce",
                ]
            ),
            (
                "Gestion, Finance & Droit", 2,
                [
                    "Comptabilité Générale & Analytique",
                    "Gestion de Projets & Coordination",
                    "Droit des Affaires & Contrats",
                    "Ressources Humaines & Recrutement",
                    "Audit & Contrôle de Gestion",
                ]
            ),
            (
                "Santé & Bien-être", 3,
                [
                    "Soins Infirmiers & Premiers Secours",
                    "Pharmacie & Conseil Médical",
                    "Médecine Générale",
                    "Nutrition & Diététique",
                ]
            ),
            (
                "Artisanat, BTP & Technique", 4,
                [
                    "Couture Traditionnelle & Stylisme",
                    "Architecture & Conception Technique",
                    "Électricité & Énergies Renouvelables",
                    "Bâtiment & Travaux Publics (BTP)",
                    "Logistique & Transport",
                ]
            ),
            (
                "Éducation, Langues & Spiritualité", 5,
                [
                    "Enseignement Coranique & Tajwîd",
                    "Soutien Scolaire & Tutorat",
                    "Traduction Arabe - Français",
                    "Voix Off & Communication Orale",
                    "Animation Pédagogique",
                ]
            ),
            (
                "Commerce & Activités Libérales", 6,
                [
                    "Commerce de Gros & Détail",
                    "Vente en Ligne & Négoce",
                    "Restauration & Services Traiteur",
                    "Événementiel & Cérémonies",
                ]
            ),
        ]

        created_skills = 0
        created_cats = 0

        for cat_name, order, skills in REFERENTIALS:
            cat, c_created = SkillCategory.objects.get_or_create(
                name=cat_name,
                defaults={'display_order': order}
            )
            if c_created:
                created_cats += 1

            for s_name in skills:
                _, s_created = Skill.objects.get_or_create(
                    category=cat,
                    name=s_name,
                    defaults={'is_active': True}
                )
                if s_created:
                    created_skills += 1

        SERVICES = [
            ("Conseil & Accompagnement Professionnel", "Consultations d'experts pour projets personnels et professionnels.", 1),
            ("Création Graphique & Identité Visuelle", "Logos, affiches, chartes graphiques pour disciples.", 2),
            ("Soutien Scolaire, Tutorat & Mentorat", "Accompagnement bénévole des élèves et étudiants.", 3),
            ("Prestation Couture, Confection & Stylisme", "Création de tenues traditionnelles et modernes.", 4),
            ("Assistance Juridique, Fiscale & Administrative", "Orientation juridique pour entrepreneurs et membres.", 5),
            ("Maintenance & Solutions Informatiques", "Dépannage matériel, développement d'outils et hébergement.", 6),
            ("Bénévolat & Mobilisation Événementielle Dahirah", "Mise à disposition de compétences pour les Gamou, Ziarra et conférences.", 7),
        ]

        created_services = 0
        for s_title, s_desc, s_order in SERVICES:
            _, s_c = ServiceCatalog.objects.get_or_create(
                name=s_title,
                defaults={'description': s_desc, 'display_order': s_order}
            )
            if s_c:
                created_services += 1

        self.stdout.write(self.style.SUCCESS(
            f"Succès : {created_cats} catégories, {created_skills} compétences, {created_services} services de catalogue initialisés."
        ))
