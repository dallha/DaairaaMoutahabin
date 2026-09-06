import React from 'react';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  FileSpreadsheet,
  Download,
  Briefcase,
  Layers,
  GraduationCap,
  Award,
  Calendar,
  CheckSquare,
  DollarSign,
  MessageSquare,
  ShieldCheck,
  History,
  Settings,
  BookOpen,
  Mail,
  Home,
  User,
  X,
  AlertCircle
} from 'lucide-react';
import { UserRole, Language } from '../types';
import { useTranslation } from '../i18n/translations';
import { canAccess } from '../utils/permissions';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  currentRole: UserRole;
  currentLang: Language;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  membersCount: number;
  qualityAlertsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  currentRole,
  currentLang,
  isOpenMobile,
  onCloseMobile,
  membersCount,
  qualityAlertsCount,
}) => {
  const t = useTranslation(currentLang);

  const handleNav = (view: string) => {
    onNavigate(view);
    onCloseMobile();
  };

  const isSuperAdmin = currentRole === 'SUPER_ADMIN';
  const isAdmin = currentRole === 'SUPER_ADMIN' || currentRole === 'ADMIN';
  const isMember = currentRole === 'MEMBER';
  const isPublic = currentRole === 'PUBLIC';

  const getNavItemClass = (isActive: boolean) =>
    `w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
      isActive
        ? 'bg-white/10 text-white border-l-2 border-[#816C07]'
        : 'text-white/70 hover:text-white hover:bg-white/5 opacity-80 hover:opacity-100'
    }`;

  const renderBullet = (isActive: boolean) =>
    isActive ? (
      <span className="w-2 h-2 rounded-full bg-[#816C07] flex-shrink-0" />
    ) : (
      <span className="w-2 h-2 rounded-full bg-transparent border border-white/40 flex-shrink-0" />
    );

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Editorial Sidebar Container */}
      <aside
        id="app-sidebar"
        className={`fixed top-0 bottom-0 z-50 w-64 bg-[#335A79] text-white flex flex-col border-r border-[#335A79]/30 transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full rtl:lg:translate-x-0'
        }`}
      >
        {/* Top Editorial Brand Header */}
        <div className="p-6 flex flex-col items-center border-b border-white/10 text-center relative">
          {isOpenMobile && (
            <button
              onClick={onCloseMobile}
              className="absolute top-4 right-4 p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 lg:hidden"
              aria-label="Fermer le menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          <div className="w-14 h-14 bg-[#816C07] text-white rounded-full flex items-center justify-center text-2xl font-serif mb-3 shadow-lg ring-2 ring-white/10">
            د
          </div>
          <h1 className="text-xs uppercase tracking-widest text-center leading-tight font-bold text-white/90">
            {t.appName}
          </h1>
          <p className="text-[10px] italic mt-1.5 text-[#F5E8A3] font-serif">
            {t.appSubtitle}
          </p>
        </div>

        {/* Navigation items */}
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-5">
          
          {/* SECTION 1: PORTAIL PUBLIC */}
          {isPublic && (
            <div>
              <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2 px-2">
                Navigation
              </div>
              <div className="space-y-1">
                <button
                  id="nav-public-home"
                  onClick={() => handleNav('public-home')}
                  className={getNavItemClass(currentView === 'public-home')}
                >
                  <div className="flex items-center space-x-3">
                    {renderBullet(currentView === 'public-home')}
                    <span>Accueil</span>
                  </div>
                  <Home className="w-3.5 h-3.5 opacity-50" />
                </button>
                <button
                  id="nav-public-presentation"
                  onClick={() => handleNav('public-presentation')}
                  className={getNavItemClass(currentView === 'public-presentation')}
                >
                  <div className="flex items-center space-x-3">
                    {renderBullet(currentView === 'public-presentation')}
                    <span>Institution & Dahirah</span>
                  </div>
                  <BookOpen className="w-3.5 h-3.5 opacity-50" />
                </button>
                <button
                  id="nav-public-contact"
                  onClick={() => handleNav('public-contact')}
                  className={getNavItemClass(currentView === 'public-contact')}
                >
                  <div className="flex items-center space-x-3">
                    {renderBullet(currentView === 'public-contact')}
                    <span>Contact & Adhésion</span>
                  </div>
                  <Mail className="w-3.5 h-3.5 opacity-50" />
                </button>
                <button
                  id="nav-directory-public"
                  onClick={() => handleNav('directory')}
                  className={getNavItemClass(currentView === 'directory')}
                >
                  <div className="flex items-center space-x-3">
                    {renderBullet(currentView === 'directory')}
                    <span>{t.navDirectory}</span>
                  </div>
                  <span className="text-[10px] bg-white/10 text-white/90 px-1.5 py-0.5 rounded-full">
                    {membersCount}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* SECTION 2: ESPACE MEMBRE */}
          {isMember && (
            <div>
              <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2 px-2">
                Espace Membre
              </div>
              <div className="space-y-1">
                <button
                  id="nav-member-dashboard"
                  onClick={() => handleNav('member-dashboard')}
                  className={getNavItemClass(currentView === 'member-dashboard')}
                >
                  <div className="flex items-center space-x-3">
                    {renderBullet(currentView === 'member-dashboard')}
                    <span>Tableau de bord</span>
                  </div>
                  <LayoutDashboard className="w-3.5 h-3.5 opacity-50" />
                </button>
                <button
                  id="nav-my-profile"
                  onClick={() => handleNav('my-profile')}
                  className={getNavItemClass(currentView === 'my-profile')}
                >
                  <div className="flex items-center space-x-3">
                    {renderBullet(currentView === 'my-profile')}
                    <span>{t.navMyProfile}</span>
                  </div>
                  <User className="w-3.5 h-3.5 opacity-50" />
                </button>
                <button
                  id="nav-directory-member"
                  onClick={() => handleNav('directory')}
                  className={getNavItemClass(currentView === 'directory')}
                >
                  <div className="flex items-center space-x-3">
                    {renderBullet(currentView === 'directory')}
                    <span>{t.navDirectory}</span>
                  </div>
                  <span className="text-[10px] bg-white/10 text-white/90 px-1.5 py-0.5 rounded-full">
                    {membersCount}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* SECTION 3: DASHBOARD & ANNUAIRE (ADMIN / SUPER ADMIN) */}
          {isAdmin && (
            <div>
              <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2 px-2">
                Navigation
              </div>
              <div className="space-y-1">
                <button
                  id="nav-admin-dashboard"
                  onClick={() => handleNav('admin-dashboard')}
                  className={getNavItemClass(currentView === 'admin-dashboard')}
                >
                  <div className="flex items-center space-x-3">
                    {renderBullet(currentView === 'admin-dashboard')}
                    <span>Tableau de bord</span>
                  </div>
                  <LayoutDashboard className="w-3.5 h-3.5 opacity-50" />
                </button>
                <button
                  id="nav-directory"
                  onClick={() => handleNav('directory')}
                  className={getNavItemClass(currentView === 'directory')}
                >
                  <div className="flex items-center space-x-3">
                    {renderBullet(currentView === 'directory')}
                    <span>{t.navDirectory}</span>
                  </div>
                  <span className="text-[10px] bg-white/10 text-white/90 px-1.5 py-0.5 rounded-full">
                    {membersCount}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* SECTION 4: GESTION DES MEMBRES (ADMIN ONLY) */}
          {isAdmin && (
            <div>
              <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2 px-2">
                {t.navMembersManagement}
              </div>
              <div className="space-y-1">
                <button
                  id="nav-admin-members"
                  onClick={() => handleNav('admin-members')}
                  className={getNavItemClass(currentView === 'admin-members')}
                >
                  <div className="flex items-center space-x-3">
                    {renderBullet(currentView === 'admin-members')}
                    <span>Registre des membres</span>
                  </div>
                  {qualityAlertsCount > 0 && (
                    <span className="text-[10px] bg-[#816C07] text-white px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <AlertCircle className="w-2.5 h-2.5" />
                      {qualityAlertsCount}
                    </span>
                  )}
                </button>

                <button
                  id="nav-add-member"
                  onClick={() => handleNav('add-member')}
                  className={getNavItemClass(currentView === 'add-member')}
                >
                  <div className="flex items-center space-x-3">
                    {renderBullet(currentView === 'add-member')}
                    <span>{t.navAddMember}</span>
                  </div>
                  <UserPlus className="w-3.5 h-3.5 opacity-50" />
                </button>

                <button
                  id="nav-import-csv"
                  onClick={() => handleNav('import-csv')}
                  className={getNavItemClass(currentView === 'import-csv')}
                >
                  <div className="flex items-center space-x-3">
                    {renderBullet(currentView === 'import-csv')}
                    <span>{t.navImportCsv}</span>
                  </div>
                  <FileSpreadsheet className="w-3.5 h-3.5 opacity-50" />
                </button>

                <button
                  id="nav-export"
                  onClick={() => handleNav('export')}
                  className={getNavItemClass(currentView === 'export')}
                >
                  <div className="flex items-center space-x-3">
                    {renderBullet(currentView === 'export')}
                    <span>{t.navExport}</span>
                  </div>
                  <Download className="w-3.5 h-3.5 opacity-50" />
                </button>
              </div>
            </div>
          )}

          {/* SECTION 5: RÉFÉRENTIELS (ADMIN ONLY) */}
          {isAdmin && (
            <div>
              <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2 px-2">
                Référentiels Pro
              </div>
              <div className="space-y-1">
                <button
                  id="nav-taxonomies-professions"
                  onClick={() => handleNav('taxonomies-professions')}
                  className={getNavItemClass(currentView === 'taxonomies-professions')}
                >
                  <div className="flex items-center space-x-3">
                    {renderBullet(currentView === 'taxonomies-professions')}
                    <span>{t.navProfessions}</span>
                  </div>
                  <Briefcase className="w-3.5 h-3.5 opacity-50" />
                </button>

                <button
                  id="nav-taxonomies-categories"
                  onClick={() => handleNav('taxonomies-categories')}
                  className={getNavItemClass(currentView === 'taxonomies-categories')}
                >
                  <div className="flex items-center space-x-3">
                    {renderBullet(currentView === 'taxonomies-categories')}
                    <span>{t.navCategories}</span>
                  </div>
                  <Layers className="w-3.5 h-3.5 opacity-50" />
                </button>

                <button
                  id="nav-taxonomies-formations"
                  onClick={() => handleNav('taxonomies-formations')}
                  className={getNavItemClass(currentView === 'taxonomies-formations')}
                >
                  <div className="flex items-center space-x-3">
                    {renderBullet(currentView === 'taxonomies-formations')}
                    <span>{t.navFormations}</span>
                  </div>
                  <GraduationCap className="w-3.5 h-3.5 opacity-50" />
                </button>

                <button
                  id="nav-taxonomies-functions"
                  onClick={() => handleNav('taxonomies-functions')}
                  className={getNavItemClass(currentView === 'taxonomies-functions')}
                >
                  <div className="flex items-center space-x-3">
                    {renderBullet(currentView === 'taxonomies-functions')}
                    <span>{t.navFunctions}</span>
                  </div>
                  <Award className="w-3.5 h-3.5 opacity-50" />
                </button>
              </div>
            </div>
          )}

          {/* SECTION 6: VIE COMMUNAUTAIRE */}
          <div>
            <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2 px-2 flex items-center justify-between">
              <span>{t.navCommunityLife}</span>
              <span className="text-[9px] bg-white/10 text-white/70 px-1.5 py-0.2 rounded font-normal">
                Évolutif
              </span>
            </div>
            <div className="space-y-1">
              <button
                id="nav-community-events"
                onClick={() => handleNav('community-events')}
                className={getNavItemClass(currentView === 'community-events')}
              >
                <div className="flex items-center space-x-3">
                  {renderBullet(currentView === 'community-events')}
                  <span>{t.navEvents}</span>
                </div>
                <Calendar className="w-3.5 h-3.5 opacity-50" />
              </button>

              <button
                id="nav-community-attendance"
                onClick={() => handleNav('community-attendance')}
                className={getNavItemClass(currentView === 'community-attendance')}
              >
                <div className="flex items-center space-x-3">
                  {renderBullet(currentView === 'community-attendance')}
                  <span>{t.navAttendance}</span>
                </div>
                <CheckSquare className="w-3.5 h-3.5 opacity-50" />
              </button>

              <button
                id="nav-community-contributions"
                onClick={() => handleNav('community-contributions')}
                className={getNavItemClass(currentView === 'community-contributions')}
              >
                <div className="flex items-center space-x-3">
                  {renderBullet(currentView === 'community-contributions')}
                  <span>{t.navContributions}</span>
                </div>
                <DollarSign className="w-3.5 h-3.5 opacity-50" />
              </button>

              <button
                id="nav-community-communications"
                onClick={() => handleNav('community-communications')}
                className={getNavItemClass(currentView === 'community-communications')}
              >
                <div className="flex items-center space-x-3">
                  {renderBullet(currentView === 'community-communications')}
                  <span>{t.navCommunications}</span>
                </div>
                <MessageSquare className="w-3.5 h-3.5 opacity-50" />
              </button>
            </div>
          </div>

          {/* SECTION 7: ADMINISTRATION AVANCÉE (SUPER ADMIN ONLY) */}
          {isSuperAdmin && (
            <div>
              <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2 px-2">
                Administration
              </div>
              <div className="space-y-1">
                <button
                  id="nav-users-permissions"
                  onClick={() => handleNav('users-permissions')}
                  className={getNavItemClass(currentView === 'users-permissions')}
                >
                  <div className="flex items-center space-x-3">
                    {renderBullet(currentView === 'users-permissions')}
                    <span>{t.navUsersPermissions}</span>
                  </div>
                  <ShieldCheck className="w-3.5 h-3.5 opacity-50" />
                </button>

                <button
                  id="nav-activity-log"
                  onClick={() => handleNav('activity-log')}
                  className={getNavItemClass(currentView === 'activity-log')}
                >
                  <div className="flex items-center space-x-3">
                    {renderBullet(currentView === 'activity-log')}
                    <span>{t.navActivityLog}</span>
                  </div>
                  <History className="w-3.5 h-3.5 opacity-50" />
                </button>

                <button
                  id="nav-settings"
                  onClick={() => handleNav('settings')}
                  className={getNavItemClass(currentView === 'settings')}
                >
                  <div className="flex items-center space-x-3">
                    {renderBullet(currentView === 'settings')}
                    <span>{t.navSettings}</span>
                  </div>
                  <Settings className="w-3.5 h-3.5 opacity-50" />
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Editorial User Profile Card at Bottom */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center space-x-3 bg-white/5 p-2.5 rounded-xl border border-white/10">
            <div className="w-8 h-8 rounded-full bg-[#816C07] text-white flex items-center justify-center text-xs font-serif font-bold flex-shrink-0 shadow-xs">
              {currentRole === 'SUPER_ADMIN' ? 'SA' : currentRole === 'ADMIN' ? 'AD' : currentRole === 'MEMBER' ? 'MB' : 'VI'}
            </div>
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-xs font-semibold truncate text-white">
                {currentRole === 'SUPER_ADMIN' ? 'Admin Principal' : currentRole === 'ADMIN' ? 'Mahmoud Ndiaye' : currentRole === 'MEMBER' ? 'Khadija Sidibé' : 'Visiteur Public'}
              </p>
              <p className="text-[10px] text-white/60 truncate">
                {currentRole === 'SUPER_ADMIN' ? t.roleSuperAdmin : currentRole === 'ADMIN' ? t.roleAdmin : currentRole === 'MEMBER' ? t.roleMember : t.rolePublic}
              </p>
            </div>
          </div>
        </div>

      </aside>
    </>
  );
};
