import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ErrorBoundary } from '../components/ErrorBoundary';

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [currentLang, setCurrentLang] = useState<'FR' | 'AR' | 'EN'>('FR');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [moreDrawerOpen, setMoreDrawerOpen] = useState(false);

  // Fermeture automatique des tiroirs lors du changement de route
  useEffect(() => {
    setActionSheetOpen(false);
    setMoreDrawerOpen(false);
  }, [location.pathname]);

  // Écoute du raccourci clavier global '/' pour ouvrir la recherche et Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setProfileDropdownOpen(false);
        setActionSheetOpen(false);
        setMoreDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Génération dynamique du fil d'ariane à partir du chemin d'URL
  const pathnames = location.pathname.split('/').filter((x) => x);

  const getBreadcrumbLabel = (path: string, index: number) => {
    switch (path) {
      case 'dashboard':
        return 'Tableau de Bord';
      case 'members':
        return 'Membres';
      case 'network':
        return 'Carrefour Entraide';
      case 'new':
        return 'Nouvel Enrôlement';
      case 'edit':
        return 'Modification';
      case 'professions':
        return 'Professions';
      case 'categories':
        return 'Catégories';
      case 'education':
        return 'Éducation & Diplômes';
      case 'roles':
        return 'Rôles Dahirah';
      case 'audit':
        return 'Journal d’Audit';
      case 'users':
        return 'Utilisateurs & Permissions';
      case 'settings':
        return 'Paramètres';
      default:
        // Matricule ou identifiant (ex: DAM-2023-001)
        if (path.startsWith('DAM-') || path.startsWith('DM-') || index === 1) {
          return `Fiche ${path}`;
        }
        return path.charAt(0).toUpperCase() + path.slice(1);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const q = searchQuery.trim();
      setSearchOpen(false);
      setSearchQuery('');
      if (q.toUpperCase().startsWith('DAM-') || q.toUpperCase().startsWith('DM-')) {
        navigate(`/members/${q.toUpperCase()}`);
      } else {
        navigate(`/members?search=${encodeURIComponent(q)}`);
      }
    }
  };

  const getRoleBadgeLabel = (role?: string) => {
    switch (role) {
      case 'superadmin':
        return 'Super Admin';
      case 'admin':
        return 'Administrateur';
      case 'agent':
        return 'Agent Enrôleur';
      case 'member':
        return 'Membre / Disciple';
      default:
        return 'Authentifié';
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e14] text-[#e5e9f2] font-body-md flex flex-col antialiased selection:bg-[#f2ca50]/20 selection:text-[#f2ca50]">
      {/* 1. HEADER PERSISTANT */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-[#070b10]/90 backdrop-blur-xl border-b border-[#2b3547]/60 shadow-[0_4px_30px_rgba(0,0,0,0.85)]">
        <div className="h-20 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          
          {/* Logo & Emblème Officiel */}
          <Link to="/dashboard" className="flex items-center gap-3.5 group">
            <div className="relative flex items-center justify-center p-0.5 rounded-full bg-white border border-[#f2ca50]/50 shadow-[0_0_15px_rgba(242,202,80,0.25)] group-hover:scale-105 transition-transform duration-300">
              <img
                src="/logo.png"
                alt="Emblème Officiel Dāʾiratu Al-Mutahābbīna Fillāhi"
                className="w-11 h-11 rounded-full object-contain"
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-headline-sm text-base md:text-lg tracking-tight font-medium text-[#e5e9f2] group-hover:text-[#f2ca50] transition-colors">
                  Dāʾiratu Al-Mutahābbīna Fillāhi
                </span>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#f2ca50]/10 border border-[#f2ca50]/30 text-[11px] font-semibold text-[#f2ca50] tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f2ca50] animate-pulse"></span>
                  Phase 4D • En Ligne
                </span>
              </div>
              <span className="font-headline-sm text-xs text-[#f2ca50]/80 tracking-wide font-normal">
                دائرة المتحابين في الله <span className="text-[#9ca7b8] font-body-md">— Fraternité &amp; Savoir</span>
              </span>
            </div>
          </Link>

          {/* Outils & Actions Profil */}
          <div className="flex items-center gap-3 md:gap-4">
            {/* Raccourci Recherche '/' */}
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#111722] border border-[#2b3547] text-xs text-[#9ca7b8] hover:border-[#f2ca50]/50 hover:text-[#e5e9f2] transition"
              title="Rechercher un membre (Raccourci: /)"
            >
              <span className="material-symbols-outlined text-[17px] text-[#f2ca50]">search</span>
              <span>Rechercher...</span>
              <kbd className="px-1.5 py-0.5 rounded bg-[#1b2332] text-[10px] font-mono border border-[#2b3547]">
                /
              </kbd>
            </button>

            {/* Sélecteur de langue */}
            <div className="flex items-center gap-1 bg-[#111722] p-1 rounded-full border border-[#2b3547] text-xs font-label-md">
              <button
                onClick={() => setCurrentLang('FR')}
                className={`px-2 py-0.5 rounded-full transition ${currentLang === 'FR' ? 'bg-[#f2ca50] text-slate-950 font-bold' : 'text-[#9ca7b8] hover:text-[#e5e9f2]'}`}
              >
                FR
              </button>
              <button
                onClick={() => setCurrentLang('AR')}
                className={`px-2 py-0.5 rounded-full transition ${currentLang === 'AR' ? 'bg-[#f2ca50] text-slate-950 font-bold' : 'text-[#9ca7b8] hover:text-[#e5e9f2]'}`}
              >
                عربي
              </button>
            </div>

            {/* Menu Utilisateur */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2.5 pl-1.5 pr-3 py-1 rounded-full bg-[#151c28] border border-[#2b3547] shadow-sm hover:border-[#f2ca50]/40 transition cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#f2ca50] to-[#ffb95f] p-0.5 flex items-center justify-center text-slate-950 font-bold text-xs">
                  {user?.first_name ? user.first_name[0] : 'U'}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-semibold text-[#e5e9f2] leading-tight">
                    {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.email || 'Utilisateur'}
                  </span>
                  <span className="text-[10px] text-[#f2ca50] font-medium tracking-wide">
                    {getRoleBadgeLabel(user?.role)}
                  </span>
                </div>
                <span className="material-symbols-outlined text-[16px] text-[#9ca7b8]">
                  expand_more
                </span>
              </button>

              {/* Dropdown Déconnexion */}
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-xl bg-[#111722] border border-[#2b3547] shadow-2xl p-2 z-50 animate-fadeIn">
                  <div className="px-3 py-2 border-b border-[#2b3547]/50 text-xs">
                    <p className="text-[#9ca7b8]">Connecté en tant que</p>
                    <p className="font-semibold text-[#e5e9f2] truncate">{user?.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      logout();
                      navigate('/login');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 mt-1 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition font-medium"
                  >
                    <span className="material-symbols-outlined text-[16px]">logout</span>
                    <span>Se Déconnecter</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 2. ZONE DE CONTENU PRINCIPALE */}
      <main className="w-full pt-28 pb-36 px-4 sm:px-6 lg:px-8 max-w-[1440px] mx-auto flex-1">
        
        {/* Fil d'Ariane Dynamique (Breadcrumb) */}
        <nav aria-label="Fil d'Ariane" className="flex items-center gap-2 text-xs text-[#9ca7b8] mb-5 overflow-x-auto whitespace-nowrap">
          <Link to="/dashboard" className="flex items-center gap-1 hover:text-[#f2ca50] transition">
            <span className="material-symbols-outlined text-[15px]">home</span>
            <span>Accueil</span>
          </Link>
          {pathnames.map((name, index) => {
            const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
            const isLast = index === pathnames.length - 1;
            return (
              <React.Fragment key={routeTo}>
                <span className="text-[#2b3547]">•</span>
                {isLast ? (
                  <span className="font-semibold text-[#f2ca50]">{getBreadcrumbLabel(name, index)}</span>
                ) : (
                  <Link to={routeTo} className="hover:text-[#f2ca50] transition">
                    {getBreadcrumbLabel(name, index)}
                  </Link>
                )}
              </React.Fragment>
            );
          })}
        </nav>

        {/* Injection fluide de la vue active protégée par ErrorBoundary */}
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>

      {/* 3. FLOATING DOCK PERSISTANT (5 ANCRES MOBILE-FIRST) */}
      <aside className="fixed bottom-4 sm:bottom-6 left-0 right-0 z-40 pointer-events-none flex justify-center px-3 sm:px-4">
        <nav className="pointer-events-auto flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#080c12]/92 backdrop-blur-2xl border border-[#f2ca50]/30 shadow-[0_16px_40px_rgba(0,0,0,0.9)] ring-1 ring-[#f2ca50]/20">
          
          {/* 1. Accueil */}
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `group flex flex-col sm:flex-row items-center gap-0.5 sm:gap-2 px-2.5 sm:px-3.5 py-1 sm:py-2 rounded-full font-semibold text-[11px] sm:text-xs transition-all ${
                isActive
                  ? 'bg-[#f2ca50]/15 text-[#f2ca50] border border-[#f2ca50]/40 font-bold shadow-inner'
                  : 'text-[#9ca7b8] hover:text-[#f2ca50] hover:bg-[#1b2332]/60'
              }`
            }
          >
            <span className="material-symbols-outlined text-[19px]">speed</span>
            <span className="text-[10px] sm:text-xs">Accueil</span>
          </NavLink>

          {/* 2. Membres */}
          <NavLink
            to="/members"
            className={({ isActive }) =>
              `group flex flex-col sm:flex-row items-center gap-0.5 sm:gap-2 px-2.5 sm:px-3.5 py-1 sm:py-2 rounded-full font-semibold text-[11px] sm:text-xs transition-all ${
                isActive && !location.pathname.includes('/members/new')
                  ? 'bg-[#f2ca50]/15 text-[#f2ca50] border border-[#f2ca50]/40 font-bold shadow-inner'
                  : 'text-[#9ca7b8] hover:text-[#f2ca50] hover:bg-[#1b2332]/60'
              }`
            }
          >
            <span className="material-symbols-outlined text-[19px] group-hover:scale-110 transition-transform">group</span>
            <span className="text-[10px] sm:text-xs">Membres</span>
          </NavLink>

          {/* 3. Bouton Central (+) : Ouvre l'Action Sheet */}
          <div className="px-1 -my-2.5 sm:-my-3">
            <button
              onClick={() => {
                setMoreDrawerOpen(false);
                setActionSheetOpen((prev) => !prev);
              }}
              className="flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-b from-[#FFE494] via-[#f2ca50] to-[#c49726] text-[#2e2000] shadow-[0_0_22px_rgba(242,202,80,0.55)] hover:shadow-[0_0_30px_rgba(242,202,80,0.8)] hover:scale-105 active:scale-95 transition-all font-bold cursor-pointer"
              title="Actions Rapides"
            >
              <span className="material-symbols-outlined text-[24px] sm:text-[26px]">add</span>
            </button>
          </div>

          {/* 4. Réseau & Entraide */}
          <NavLink
            to="/network"
            className={({ isActive }) =>
              `group flex flex-col sm:flex-row items-center gap-0.5 sm:gap-2 px-2.5 sm:px-3.5 py-1 sm:py-2 rounded-full font-semibold text-[11px] sm:text-xs transition-all ${
                isActive
                  ? 'bg-[#f2ca50]/15 text-[#f2ca50] border border-[#f2ca50]/40 font-bold shadow-inner'
                  : 'text-[#9ca7b8] hover:text-[#f2ca50] hover:bg-[#1b2332]/60'
              }`
            }
          >
            <span className="material-symbols-outlined text-[19px] group-hover:scale-110 transition-transform">hub</span>
            <span className="text-[10px] sm:text-xs">Réseau</span>
          </NavLink>

          {/* 5. Plus (Modules & Administration) */}
          <button
            onClick={() => {
              setActionSheetOpen(false);
              setMoreDrawerOpen((prev) => !prev);
            }}
            className={`group flex flex-col sm:flex-row items-center gap-0.5 sm:gap-2 px-2.5 sm:px-3.5 py-1 sm:py-2 rounded-full font-semibold text-[11px] sm:text-xs transition-all cursor-pointer ${
              moreDrawerOpen
                ? 'bg-[#f2ca50]/15 text-[#f2ca50] border border-[#f2ca50]/40 font-bold shadow-inner'
                : 'text-[#9ca7b8] hover:text-[#f2ca50] hover:bg-[#1b2332]/60'
            }`}
            title="Tous les modules"
          >
            <span className="material-symbols-outlined text-[19px] group-hover:scale-110 transition-transform">grid_view</span>
            <span className="text-[10px] sm:text-xs">Plus</span>
          </button>
        </nav>
      </aside>

      {/* ACTION SHEET RAPIDE (DÉCLENCHÉ PAR (+)) */}
      {actionSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="fixed inset-0" onClick={() => setActionSheetOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-[#0e141e] border border-[#f2ca50]/40 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#2b3547]/60 pb-3">
              <div className="flex items-center gap-2 text-[#f2ca50] font-headline-sm text-base font-semibold">
                <span className="material-symbols-outlined text-[22px]">add_circle</span>
                <span>Actions Rapides</span>
              </div>
              <button
                onClick={() => setActionSheetOpen(false)}
                className="p-1.5 rounded-lg text-[#9ca7b8] hover:text-[#e5e9f2] hover:bg-[#1b2332] transition"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              {['admin', 'superadmin', 'agent'].includes(user?.role || '') && (
                <Link
                  to="/members/new"
                  onClick={() => setActionSheetOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-xl bg-[#151c28] hover:bg-[#1b2332] border border-[#2b3547]/50 hover:border-[#f2ca50]/50 transition group"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#f2ca50]/15 text-[#f2ca50] flex items-center justify-center group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-[22px]">person_add</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-[#e5e9f2] group-hover:text-[#f2ca50]">
                      + Enrôler un nouveau membre
                    </span>
                    <span className="text-[11px] text-[#9ca7b8]">Génération matricule séquentielle &amp; profil</span>
                  </div>
                </Link>
              )}

              {['admin', 'superadmin'].includes(user?.role || '') && (
                <Link
                  to="/users?action=create"
                  onClick={() => setActionSheetOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-xl bg-[#151c28] hover:bg-[#1b2332] border border-[#2b3547]/50 hover:border-blue-400/50 transition group"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-[22px]">manage_accounts</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-[#e5e9f2] group-hover:text-blue-400">
                      + Créer un compte utilisateur
                    </span>
                    <span className="text-[11px] text-[#9ca7b8]">Accès sécurisé et liaison à un membre</span>
                  </div>
                </Link>
              )}

              <Link
                to="/network"
                onClick={() => setActionSheetOpen(false)}
                className="flex items-center gap-3 p-3 rounded-xl bg-[#151c28] hover:bg-[#1b2332] border border-[#2b3547]/50 hover:border-emerald-400/50 transition group"
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-[22px]">handshake</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-[#e5e9f2] group-hover:text-emerald-400">
                    + Proposer service / compétence
                  </span>
                  <span className="text-[11px] text-[#9ca7b8]">Enrichir le carrefour d'entraide communautaire</span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ACTION DRAWER PLUS (MODULES & ADMINISTRATION) */}
      {moreDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="fixed inset-0" onClick={() => setMoreDrawerOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-[#0e141e] border border-[#f2ca50]/40 p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#2b3547]/60 pb-3">
              <div className="flex items-center gap-2 text-[#f2ca50] font-headline-sm text-base font-semibold">
                <span className="material-symbols-outlined text-[22px]">grid_view</span>
                <span>Modules &amp; Administration</span>
              </div>
              <button
                onClick={() => setMoreDrawerOpen(false)}
                className="p-1.5 rounded-lg text-[#9ca7b8] hover:text-[#e5e9f2] hover:bg-[#1b2332] transition"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <Link
                to="/education"
                onClick={() => setMoreDrawerOpen(false)}
                className="flex flex-col items-center justify-center text-center p-3 rounded-xl bg-[#151c28] hover:bg-[#1b2332] border border-[#2b3547]/50 hover:border-sky-400/50 transition group"
              >
                <span className="material-symbols-outlined text-[26px] text-sky-400 group-hover:scale-110 transition-transform mb-1">school</span>
                <span className="text-xs font-semibold text-[#e5e9f2]">Formations</span>
                <span className="text-[10px] text-[#9ca7b8]">Diplômes &amp; Écoles</span>
              </Link>

              <Link
                to="/professions"
                onClick={() => setMoreDrawerOpen(false)}
                className="flex flex-col items-center justify-center text-center p-3 rounded-xl bg-[#151c28] hover:bg-[#1b2332] border border-[#2b3547]/50 hover:border-amber-400/50 transition group"
              >
                <span className="material-symbols-outlined text-[26px] text-amber-400 group-hover:scale-110 transition-transform mb-1">work</span>
                <span className="text-xs font-semibold text-[#e5e9f2]">Métiers</span>
                <span className="text-[10px] text-[#9ca7b8]">Secteurs d'activité</span>
              </Link>

              <Link
                to="/professions/categories"
                onClick={() => setMoreDrawerOpen(false)}
                className="flex flex-col items-center justify-center text-center p-3 rounded-xl bg-[#151c28] hover:bg-[#1b2332] border border-[#2b3547]/50 hover:border-teal-400/50 transition group"
              >
                <span className="material-symbols-outlined text-[26px] text-teal-400 group-hover:scale-110 transition-transform mb-1">category</span>
                <span className="text-xs font-semibold text-[#e5e9f2]">Catégories</span>
                <span className="text-[10px] text-[#9ca7b8]">Taxonomie métiers</span>
              </Link>

              <Link
                to="/roles"
                onClick={() => setMoreDrawerOpen(false)}
                className="flex flex-col items-center justify-center text-center p-3 rounded-xl bg-[#151c28] hover:bg-[#1b2332] border border-[#2b3547]/50 hover:border-purple-400/50 transition group"
              >
                <span className="material-symbols-outlined text-[26px] text-purple-400 group-hover:scale-110 transition-transform mb-1">diversity_3</span>
                <span className="text-xs font-semibold text-[#e5e9f2]">Commissions</span>
                <span className="text-[10px] text-[#9ca7b8]">Fonctions Dahirah</span>
              </Link>

              {['admin', 'superadmin'].includes(user?.role || '') && (
                <Link
                  to="/users"
                  onClick={() => setMoreDrawerOpen(false)}
                  className="flex flex-col items-center justify-center text-center p-3 rounded-xl bg-[#151c28] hover:bg-[#1b2332] border border-[#2b3547]/50 hover:border-blue-400/50 transition group"
                >
                  <span className="material-symbols-outlined text-[26px] text-blue-400 group-hover:scale-110 transition-transform mb-1">manage_accounts</span>
                  <span className="text-xs font-semibold text-[#e5e9f2]">Utilisateurs</span>
                  <span className="text-[10px] text-[#9ca7b8]">Rôles &amp; Comptes</span>
                </Link>
              )}

              {['admin', 'superadmin'].includes(user?.role || '') && (
                <Link
                  to="/audit"
                  onClick={() => setMoreDrawerOpen(false)}
                  className="flex flex-col items-center justify-center text-center p-3 rounded-xl bg-[#151c28] hover:bg-[#1b2332] border border-[#2b3547]/50 hover:border-emerald-400/50 transition group"
                >
                  <span className="material-symbols-outlined text-[26px] text-emerald-400 group-hover:scale-110 transition-transform mb-1">verified_user</span>
                  <span className="text-xs font-semibold text-[#e5e9f2]">Journal d'Audit</span>
                  <span className="text-[10px] text-[#9ca7b8]">Traçabilité immuable</span>
                </Link>
              )}

              {user?.role === 'superadmin' && (
                <Link
                  to="/settings"
                  onClick={() => setMoreDrawerOpen(false)}
                  className="col-span-2 flex items-center justify-center gap-2 p-3 rounded-xl bg-[#151c28] hover:bg-[#1b2332] border border-[#2b3547]/50 hover:border-[#f2ca50]/50 transition group"
                >
                  <span className="material-symbols-outlined text-[20px] text-[#f2ca50]">settings</span>
                  <span className="text-xs font-semibold text-[#e5e9f2]">Paramètres Système &amp; Neon</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. MODAL DE RECHERCHE RAPIDE (Raccourci /) */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-[#111722] border border-[#f2ca50]/40 shadow-2xl overflow-hidden animate-fadeIn">
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-3 p-4 border-b border-[#2b3547]">
              <span className="material-symbols-outlined text-[#f2ca50] text-[22px]">search</span>
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Matricule (ex: DAM-2023-001) ou nom..."
                className="w-full bg-transparent text-[#e5e9f2] placeholder-[#788294] outline-none text-sm"
              />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="px-2 py-0.5 rounded bg-[#1b2332] text-xs text-[#9ca7b8] hover:text-[#e5e9f2]"
              >
                ESC
              </button>
            </form>
            <div className="p-3 text-[11px] text-[#788294] flex items-center justify-between">
              <span>Astuce : Entrez un matricule direct pour ouvrir la fiche</span>
              <kbd className="px-1.5 py-0.5 rounded bg-[#1b2332] border border-[#2b3547]">Entrée ↵</kbd>
            </div>
          </div>
        </div>
      )}

      {/* 5. FOOTER INSTITUTIONNEL */}
      <footer className="w-full border-t border-[#2b3547]/40 bg-[#06090e] py-6 text-center text-xs text-[#9ca7b8]/60 relative z-0">
        <p className="max-w-7xl mx-auto px-4">
          © 1446H Dāʾiratu Al-Mutahābbīna Fillāhi • Tous droits réservés • Excellence, Fraternité &amp; Savoir
        </p>
      </footer>
    </div>
  );
};
