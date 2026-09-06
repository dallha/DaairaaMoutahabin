# 📖 Documentation - Dāʾiratu Al-Mutahābbīna Fillāhi (SaaS)

Bienvenue dans la documentation officielle de la **Plateforme d'Administration & Gestion Communautaire v2.0**. Ce document présente l'architecture, les fonctionnalités et les règles de gestion du SaaS.

## 🎯 Vue d'ensemble
Le SaaS est conçu pour moderniser et centraliser la gestion de la Dahirah "Dāʾiratu Al-Mutahābbīna Fillāhi". Il offre un écosystème complet intégrant des tableaux de bord analytiques, une gestion avancée des membres (avec pagination côté serveur) et une cartographie des compétences, le tout dans un environnement hautement sécurisé.

---

## 🏗️ Architecture & Technologies
- **Frontend** : React 18+ avec Vite, TypeScript.
- **Styling** : Tailwind CSS (utilitaires) pour un design adaptatif, élégant et "Anti-Slop".
- **Icônes** : Lucide React.
- **Backend / Base de données** : Firebase Firestore (NoSQL) avec des règles de sécurité strictes (`firestore.rules`).
- **Déploiement** : Conteneurs Cloud Run.

---

## 🔐 Contrôle d'Accès Basé sur les Rôles (RBAC)
Le système est divisé en 4 niveaux d'accès stricts. La sécurité est garantie tant au niveau de l'interface utilisateur (React) qu'au niveau du backend (Firestore).

1. **SUPER_ADMIN (Cheikh Seck / Fondateurs)**
   - Accès total à toutes les données.
   - **Seul rôle autorisé à supprimer (`delete`)** des fiches membres.
   - Gestion des permissions globales et accès aux journaux d'audit.

2. **ADMIN (Mahmoud Ndiaye / Secrétariat)**
   - Accès aux tableaux de bord et à l'annuaire complet.
   - Droit de création (`create`) et de modification (`update`) des membres.
   - Ne peut pas supprimer de membres.

3. **MEMBER (Membres de la Dahirah)**
   - Accès à leur propre tableau de bord personnel.
   - Droit de lecture/modification restreint **uniquement à leur propre profil** (`request.auth.uid == resource.data.uid`).
   - Consultation de l'annuaire public/communautaire.

4. **PUBLIC (Visiteurs)**
   - Accès exclusif à la Landing Page (Porte d'entrée SaaS).
   - Soumission de formulaires de contact/adhésion.

---

## 🧩 Modules Principaux

### 1. Gateway & Authentification (`/views/PublicLanding.tsx`, `/views/LoginView.tsx`)
- Expérience immersive plein écran (`min-h-screen`).
- Pas de distraction de navigation : l'utilisateur doit se connecter ou consulter les informations publiques.
- Redirection intelligente : Les utilisateurs `ADMIN` et `SUPER_ADMIN` sont automatiquement redirigés vers le tableau de bord d'administration pour fluidifier l'expérience.

### 2. Tableaux de Bord Administrateur (`/views/AdminDashboard.tsx`)
- **Indicateurs Clés (KPIs)** : Nombre total de membres, alertes de qualité des données, croissance.
- **Analytique** : Graphiques de répartition (Recharts) par profession, ville ou âge.

### 3. Gestion des Membres (`/views/AdminMembersList.tsx`)
- **Performance** : Pagination côté serveur via Firestore (`limit`, `startAfter`) pour supporter un nombre illimité de membres sans impact sur la mémoire du navigateur.
- **Interface Hybride** : Affichage en mode "Tableau de données" avec animations d'élévation sur grand écran, et en mode "Cartes" optimisé pour le tactile sur mobile.
- **Fonctions** : Importation CSV, exportation, activation/suspension des comptes.

### 4. Profil & Formulaire (`/views/MemberProfileView.tsx`, `/views/MemberFormModal.tsx`)
- Cartographie détaillée : Informations personnelles, professionnelles (Taxonomies), contact, et statut dans la Dahirah.
- Mode Édition dynamique en fonction du rôle.

### 5. Audit & Traçabilité (`/views/ActivityLogView.tsx`)
- Journalisation de toutes les actions (Création, modification, changement de statut, suppressions).
- Historique inaltérable stocké en base de données.

---

## 📂 Structure du Code Source (Aperçu)

```text
/src
 ├── /components       # Composants d'interface réutilisables (Header, Sidebar, Toast...)
 ├── /data             # Données mockées (temporaires) ou configurations statiques
 ├── /i18n             # Traductions et support multilingue (Français / Arabe)
 ├── /services         # Logique métier et appels API/Firestore (memberService, auditService)
 ├── /types            # Interfaces et Types TypeScript globaux
 ├── /views            # Pages et écrans principaux du SaaS
 ├── App.tsx           # Routeur principal, Layout de base et gestion du State Global
 └── index.css         # Styles globaux et configuration Tailwind
```

---

## 🔄 Flux de Données (Data Flow)
1. Les actions utilisateur déclenchent les fonctions dans `/services/`.
2. Le composant `App.tsx` gère l'état global et propage les données (ex: `members`, `currentUser`) via les props.
3. Les services (ex: `getMembers`) incluent la logique de requêtage Firestore. Les erreurs de permissions déclenchent des notifications via le système de Toast.

---

## ✨ Principes de Design
- **Anti-Slop** : Typographie raffinée, couleurs neutres chaudes, animations subtiles (Hover élévation), forte utilisation de l'espace négatif.
- **Mobile-First Data** : Les tableaux complexes se transforment en cartes sur mobile pour garantir la lisibilité et l'accessibilité des zones de clics.
