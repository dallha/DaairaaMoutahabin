import React, { useState } from 'react';
import {
  Bell,
  Globe,
  ShieldAlert,
  Shield,
  User,
  Users,
  Search,
  Menu,
  ChevronDown,
  LogOut,
  Sparkles
} from 'lucide-react';
import { UserRole, Language, Member } from '../types';
import { useTranslation } from '../i18n/translations';

interface HeaderProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  currentLang: Language;
  onLangChange?: (lang: Language) => void;
  onLanguageChange?: (lang: Language) => void;
  onOpenMobileMenu: () => void;
  onNavigate: (view: string) => void;
  currentMember?: Member;
  currentUserName?: string;
  qualityAlertsCount?: number;
  alertCount?: number;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onRoleChange,
  currentLang,
  onLangChange,
  onLanguageChange,
  onOpenMobileMenu,
  onNavigate,
  currentMember,
  currentUserName,
  qualityAlertsCount = 0,
  alertCount = 4,
  onLogout,
}) => {
  const t = useTranslation(currentLang);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleLanguageSelect = (lang: Language) => {
    if (onLanguageChange) onLanguageChange(lang);
    if (onLangChange) onLangChange(lang);
    setShowLangMenu(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onNavigate('directory');
    }
  };

  const roles: { role: UserRole; label: string; icon: React.ReactNode }[] = [
    { role: 'SUPER_ADMIN', label: t.roleSuperAdmin, icon: <ShieldAlert className="w-4 h-4 text-amber-600" /> },
    { role: 'ADMIN', label: t.roleAdmin, icon: <Shield className="w-4 h-4 text-[#335A79]" /> },
    { role: 'MEMBER', label: t.roleMember, icon: <User className="w-4 h-4 text-emerald-600" /> },
    { role: 'PUBLIC', label: t.rolePublic, icon: <Users className="w-4 h-4 text-stone-600" /> },
  ];

  const languages: { code: Language; label: string }[] = [
    { code: 'fr', label: 'Français' },
    { code: 'ar', label: 'العربية (RTL)' },
    { code: 'en', label: 'English' },
  ];

  const totalAlerts = qualityAlertsCount || alertCount;

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 lg:px-8 sticky top-0 z-40">
      {/* Left: Mobile Toggle & Editorial Section Title */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        <button
          id="mobile-menu-toggle-btn"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-full text-stone-600 hover:text-[#335A79] hover:bg-gray-100 transition"
          aria-label="Ouvrir le menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3">
          <h2 className="text-lg sm:text-xl font-serif italic text-[#335A79] tracking-tight">
            {currentRole === 'PUBLIC'
              ? "Portail Communautaire"
              : currentRole === 'MEMBER'
              ? "Espace Disciple & Fraternité"
              : "Vue d'ensemble de la Communauté"}
          </h2>
          <span className="hidden md:inline-block px-2 py-0.5 bg-gray-100 text-[10px] rounded uppercase font-bold tracking-tighter text-gray-500">
            Dahirah v1.0
          </span>
        </div>
      </div>

      {/* Right: Search Input, Notification, Language & Role Tools */}
      <div className="flex items-center space-x-3 sm:space-x-5">
        
        {/* Editorial Pill Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative hidden md:block">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un membre..."
            className="bg-[#F8F8F8] border border-gray-200 rounded-full py-1.5 pl-4 pr-9 text-xs w-48 lg:w-64 focus:outline-none focus:border-[#335A79] text-stone-900 placeholder:text-stone-400 transition"
          />
          <button
            type="submit"
            className="absolute right-2.5 top-2 text-stone-400 hover:text-[#335A79]"
            title="Rechercher"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Notification Bell with Gold Indicator */}
        <div className="relative">
          <button
            id="notifications-button"
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            className="p-2 hover:bg-gray-100 rounded-full relative transition"
            aria-label="Notifications"
          >
            {totalAlerts > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#816C07] rounded-full border-2 border-white" />
            )}
            <Bell className="w-5 h-5 text-gray-400 hover:text-gray-600 transition" />
          </button>

          {showNotifMenu && (
            <div
              id="notifications-dropdown-menu"
              className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-50 animate-in fade-in zoom-in-95"
            >
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <span className="text-xs font-serif italic text-[#335A79] text-sm">Notifications & Alertes</span>
                <span className="text-[10px] bg-amber-50 text-[#816C07] px-2 py-0.5 rounded-full font-bold border border-amber-200">
                  {totalAlerts} à traiter
                </span>
              </div>
              <div className="py-2.5 space-y-2 text-xs">
                <div
                  onClick={() => {
                    onNavigate('admin-members');
                    setShowNotifMenu(false);
                  }}
                  className="p-2.5 rounded-xl bg-[#F8F8F8] hover:bg-gray-100 border border-gray-100 cursor-pointer transition"
                >
                  <p className="font-bold text-stone-900">Fiches à compléter</p>
                  <p className="text-stone-500 text-[11px] mt-0.5">3 profils nécessitent une validation de coordonnées.</p>
                </div>
                <div
                  onClick={() => {
                    onNavigate('community-events');
                    setShowNotifMenu(false);
                  }}
                  className="p-2.5 rounded-xl bg-blue-50/50 hover:bg-blue-50 border border-blue-100 cursor-pointer transition"
                >
                  <p className="font-bold text-[#335A79]">Hadratu-l-Jumah</p>
                  <p className="text-stone-600 text-[11px] mt-0.5">Wazifa collective ce vendredi à 17h30.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Language Switcher */}
        <div className="relative">
          <button
            id="language-selector-button"
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-full hover:bg-gray-100 text-stone-600 transition text-xs font-medium"
            title="Langue"
          >
            <Globe className="w-4 h-4 text-stone-400" />
            <span className="uppercase text-[11px] font-bold">{currentLang}</span>
          </button>

          {showLangMenu && (
            <div
              id="language-dropdown-menu"
              className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-50"
            >
              {languages.map((l) => (
                <button
                  key={l.code}
                  onClick={() => handleLanguageSelect(l.code)}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-gray-50 transition ${
                    currentLang === l.code ? 'font-bold text-[#335A79] bg-gray-50' : 'text-stone-700'
                  }`}
                >
                  <span>{l.label}</span>
                  {currentLang === l.code && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#816C07]" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Demo Role Switcher Pill */}
        <div className="relative">
          <button
            id="role-selector-button"
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-full border border-gray-200 bg-[#F8F8F8] hover:bg-gray-100 transition text-xs font-medium text-stone-700 shadow-2xs"
            title={t.switchRole}
          >
            <span className="hidden lg:inline text-stone-400 font-normal">{t.currentRole}:</span>
            <span className="font-semibold text-[#335A79]">
              {roles.find((r) => r.role === currentRole)?.label.split(' ')[0]}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
          </button>

          {showRoleMenu && (
            <div
              id="role-dropdown-menu"
              className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in zoom-in-95"
            >
              <div className="px-4 py-1.5 text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                {t.switchRole}
              </div>
              {roles.map((item) => (
                <button
                  key={item.role}
                  onClick={() => {
                    onRoleChange(item.role);
                    setShowRoleMenu(false);
                  }}
                  className={`w-full text-left px-4 py-2 flex items-center justify-between hover:bg-gray-50 transition text-xs ${
                    currentRole === item.role ? 'bg-gray-50 font-bold text-[#335A79]' : 'text-stone-700'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {currentRole === item.role && (
                    <span className="w-2 h-2 rounded-full bg-[#816C07]" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User Profile Avatar */}
        <button
          id="user-profile-header-btn"
          onClick={() => onNavigate(currentRole === 'PUBLIC' ? 'login' : 'my-profile')}
          className="flex items-center space-x-2 p-1 rounded-full hover:bg-gray-100 transition"
          title="Profil"
        >
          <div className="w-8 h-8 rounded-full bg-[#335A79]/10 border border-[#335A79]/20 flex items-center justify-center text-[#335A79] font-bold text-[11px]">
            {currentRole === 'PUBLIC'
              ? 'VI'
              : currentRole === 'MEMBER'
              ? (currentMember ? `${currentMember.prenom[0]}${currentMember.nom[0]}` : 'KS')
              : 'CS'}
          </div>
          <span className="hidden xl:inline text-xs font-semibold text-stone-800">
            {currentRole === 'PUBLIC'
              ? 'Connexion'
              : currentRole === 'MEMBER'
              ? (currentMember ? `${currentMember.prenom} ${currentMember.nom}` : 'Khadija Sidibé')
              : (currentUserName ? currentUserName.split(' ')[0] : 'Cheikh Seck')}
          </span>
        </button>

      </div>
    </header>
  );
};
