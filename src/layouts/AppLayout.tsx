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

  // Écoute du raccourci clavier global '/' pour ouvrir la recherche
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setProfileDropdownOpen(false);
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
        // Matricule ou identifiant (ex: DM-2026-0001)
        if (path.startsWith('DM-') || index === 1) {
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
      if (q.toUpperCase().startsWith('DM-')) {
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

      {/* 3. FLOATING DOCK PERSISTANT (NAVIGATION BASSE) */}
      <aside className="fixed bottom-6 left-0 right-0 z-50 pointer-events-none flex justify-center px-4">
        <nav className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-full bg-[#080c12]/90 backdrop-blur-2xl border border-[#f2ca50]/30 shadow-[0_16px_40px_rgba(0,0,0,0.9)] ring-1 ring-[#f2ca50]/20">
          
          {/* Dashboard */}
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `group flex items-center gap-2 px-3.5 py-2 rounded-full font-semibold text-xs transition-all ${
                isActive
                  ? 'bg-[#f2ca50]/15 text-[#f2ca50] border border-[#f2ca50]/40 font-bold shadow-inner'
                  : 'text-[#9ca7b8] hover:text-[#f2ca50] hover:bg-[#1b2332]/60'
              }`
            }
          >
            <span className="material-symbols-outlined text-[19px]">speed</span>
            <span>Dashboard</span>
          </NavLink>

          {/* Membres */}
          <NavLink
            to="/members"
            className={({ isActive }) =>
              `group flex items-center gap-2 px-3.5 py-2 rounded-full font-semibold text-xs transition-all ${
                isActive && !location.pathname.includes('/members/new')
                  ? 'bg-[#f2ca50]/15 text-[#f2ca50] border border-[#f2ca50]/40 font-bold shadow-inner'
                  : 'text-[#9ca7b8] hover:text-[#f2ca50] hover:bg-[#1b2332]/60'
              }`
            }
          >
            <span className="material-symbols-outlined text-[19px] group-hover:scale-110 transition-transform">group</span>
            <span className="hidden sm:inline">Membres</span>
          </NavLink>

          {/* Bouton Central Surélevé : Nouvel Enrôlement */}
          <div className="px-1 -my-3">
            <Link
              to="/members/new"
              className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-b from-[#FFE494] via-[#f2ca50] to-[#c49726] text-[#2e2000] shadow-[0_0_22px_rgba(242,202,80,0.55)] hover:shadow-[0_0_30px_rgba(242,202,80,0.8)] hover:scale-105 active:scale-95 transition-all font-bold"
              title="Nouvel Enrôlement Membre"
            >
              <span className="material-symbols-outlined text-[26px]">person_add</span>
            </Link>
          </div>

          {/* Référentiels */}
          <NavLink
            to="/professions"
            className={({ isActive }) =>
              `group flex items-center gap-2 px-3.5 py-2 rounded-full font-semibold text-xs transition-all ${
                isActive
                  ? 'bg-[#f2ca50]/15 text-[#f2ca50] border border-[#f2ca50]/40 font-bold shadow-inner'
                  : 'text-[#9ca7b8] hover:text-[#f2ca50] hover:bg-[#1b2332]/60'
              }`
            }
          >
            <span className="material-symbols-outlined text-[19px] group-hover:scale-110 transition-transform">bookmarks</span>
            <span className="hidden sm:inline">Référentiels</span>
          </NavLink>

          {/* Journal d'Audit & Sécurité */}
          <NavLink
            to="/audit"
            className={({ isActive }) =>
              `group flex items-center gap-2 px-3.5 py-2 rounded-full font-semibold text-xs transition-all ${
                isActive
                  ? 'bg-[#f2ca50]/15 text-[#f2ca50] border border-[#f2ca50]/40 font-bold shadow-inner'
                  : 'text-[#9ca7b8] hover:text-[#f2ca50] hover:bg-[#1b2332]/60'
              }`
            }
          >
            <span className="material-symbols-outlined text-[19px] group-hover:scale-110 transition-transform">verified_user</span>
            <span className="hidden sm:inline">Sécurité</span>
          </NavLink>

          {/* Paramètres */}
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `group flex items-center gap-2 px-3.5 py-2 rounded-full font-semibold text-xs transition-all ${
                isActive
                  ? 'bg-[#f2ca50]/15 text-[#f2ca50] border border-[#f2ca50]/40 font-bold shadow-inner'
                  : 'text-[#9ca7b8] hover:text-[#f2ca50] hover:bg-[#1b2332]/60'
              }`
            }
          >
            <span className="material-symbols-outlined text-[19px] group-hover:scale-110 transition-transform">settings</span>
            <span className="hidden sm:inline">Paramètres</span>
          </NavLink>
        </nav>
      </aside>

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
                placeholder="Matricule (ex: DM-2026-0001) ou nom..."
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
