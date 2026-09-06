import React from 'react';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  User,
  Calendar,
  Menu,
  Home
} from 'lucide-react';
import { UserRole } from '../types';

interface BottomNavProps {
  currentView: string;
  onNavigate: (view: string) => void;
  currentRole: UserRole;
  onOpenMobileMenu: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentView,
  onNavigate,
  currentRole,
  onOpenMobileMenu,
}) => {
  const isAdmin = currentRole === 'SUPER_ADMIN' || currentRole === 'ADMIN';
  const isMember = currentRole === 'MEMBER';

  return (
    <nav
      id="mobile-bottom-navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200 px-2 py-1.5 shadow-lg"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        
        {/* Home / Dashboard */}
        <button
          id="btn-bottom-home"
          onClick={() => onNavigate(isAdmin ? 'admin-dashboard' : isMember ? 'member-dashboard' : 'public-home')}
          className={`flex flex-col items-center justify-center p-1.5 rounded-lg text-[10px] font-medium transition ${
            ['admin-dashboard', 'member-dashboard', 'public-home'].includes(currentView)
              ? 'text-[#335A79] font-semibold'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          {isAdmin || isMember ? <LayoutDashboard className="w-5 h-5 mb-0.5" /> : <Home className="w-5 h-5 mb-0.5" />}
          <span>Accueil</span>
        </button>

        {/* Directory */}
        <button
          id="btn-bottom-directory"
          onClick={() => onNavigate('directory')}
          className={`flex flex-col items-center justify-center p-1.5 rounded-lg text-[10px] font-medium transition ${
            currentView === 'directory'
              ? 'text-[#335A79] font-semibold'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span>Annuaire</span>
        </button>

        {/* Center Action: Add Member (admin) or My Profile (member) or Sign In (public) */}
        {isAdmin ? (
          <button
            id="btn-bottom-add"
            onClick={() => onNavigate('add-member')}
            className="flex flex-col items-center justify-center -mt-4 bg-[#335A79] text-white p-2.5 rounded-full shadow-md hover:bg-[#223c52] transition ring-4 ring-white"
            aria-label="Ajouter un membre"
          >
            <UserPlus className="w-5 h-5" />
          </button>
        ) : isMember ? (
          <button
            id="btn-bottom-profile"
            onClick={() => onNavigate('my-profile')}
            className={`flex flex-col items-center justify-center p-1.5 rounded-lg text-[10px] font-medium transition ${
              currentView === 'my-profile'
                ? 'text-[#335A79] font-semibold'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <User className="w-5 h-5 mb-0.5" />
            <span>Mon Profil</span>
          </button>
        ) : null}

        {/* Events / Vie Com */}
        <button
          id="btn-bottom-events"
          onClick={() => onNavigate('community-events')}
          className={`flex flex-col items-center justify-center p-1.5 rounded-lg text-[10px] font-medium transition ${
            currentView === 'community-events'
              ? 'text-[#335A79] font-semibold'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          <Calendar className="w-5 h-5 mb-0.5" />
          <span>Activités</span>
        </button>

        {/* More / Menu Drawer */}
        <button
          id="btn-bottom-menu"
          onClick={onOpenMobileMenu}
          className="flex flex-col items-center justify-center p-1.5 rounded-lg text-[10px] font-medium text-stone-500 hover:text-stone-800"
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span>Menu</span>
        </button>

      </div>
    </nav>
  );
};
