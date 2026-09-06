import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { UserRole, Language, Member, ActivityLogItem } from './types';
import { getMembers, addMember, updateMember, deleteMember } from './services/memberService';
import { addAuditLog } from './services/auditService';
import { useTranslation } from './i18n/translations';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { ToastContainer, ToastMessage } from './components/Toast';

// Views
import { PublicLanding } from './views/PublicLanding';
import { LoginView } from './views/LoginView';
import { MemberDashboard } from './views/MemberDashboard';
import { MemberProfileView } from './views/MemberProfileView';
import { DirectoryView } from './views/DirectoryView';
import { AdminDashboard } from './views/AdminDashboard';
import { AdminMembersList } from './views/AdminMembersList';
import { MemberFormModal } from './views/MemberFormModal';
import { TaxonomiesView } from './views/TaxonomiesView';
import { CsvImportWizard } from './views/CsvImportWizard';
import { ExportView } from './views/ExportView';
import { UsersPermissionsView } from './views/UsersPermissionsView';
import { ActivityLogView } from './views/ActivityLogView';
import { SettingsView } from './views/SettingsView';
import { FutureModulesView } from './views/FutureModulesView';

import { ChevronRight, Home } from 'lucide-react';

export default function App() {
  // Global Data State
  const [members, setMembers] = useState<Member[]>([]);
  const [professionsList, setProfessionsList] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [formationsList, setFormationsList] = useState([]);
  const [functionsList, setFunctionsList] = useState([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([]);

  // App Configuration & Navigation
  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    return (localStorage.getItem('app_user_role') as UserRole) || 'SUPER_ADMIN';
  });
  const [currentLang, setCurrentLang] = useState<Language>('FR');
  const [currentView, setCurrentView] = useState<string>(() => {
    return localStorage.getItem('app_current_view') || 'public-home';
  });

  // Persist role and view
  useEffect(() => {
    localStorage.setItem('app_user_role', currentRole);
  }, [currentRole]);

  useEffect(() => {
    localStorage.setItem('app_current_view', currentView);
  }, [currentView]);

  // Instantly redirect ADMIN/SUPER_ADMIN from public-home to admin-dashboard
  useEffect(() => {
    if (currentView === 'public-home' && (currentRole === 'ADMIN' || currentRole === 'SUPER_ADMIN')) {
      setCurrentView('admin-dashboard');
    }
  }, [currentRole, currentView]);

  // Currently authenticated demo member (defaults to Khadija Sidibé for member view)
  const [currentUserMember, setCurrentUserMember] = useState<Member | null>(null);

  // Profile drill-down
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  // Form Modal (Add / Edit)
  const [isMemberFormOpen, setIsMemberFormOpen] = useState<boolean>(false);
  const [memberFormMode, setMemberFormMode] = useState<'ADD' | 'EDIT' | 'EDIT_SELF'>('ADD');
  const [memberToEdit, setMemberToEdit] = useState<Member | null>(null);

  // Mobile Drawer
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);

  const withLoading = async <T,>(operation: () => Promise<T>): Promise<T> => {
    setIsGlobalLoading(true);
    try {
      return await operation();
    } finally {
      setIsGlobalLoading(false);
    }
  };

  const t = useTranslation(currentLang);

  // Push notification helper
  const notify = (message: string, type: 'success' | 'warning' | 'error' | 'info' = 'success') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Add audit log helper
  const handleAddAuditLog = (action: string, details: string) => {
    const newLog: ActivityLogItem = {
      id: `log-${Date.now()}`,
      action,
      details,
      userId: currentRole,
      userName: currentRole === 'SUPER_ADMIN' ? 'Cheikh Seck (Super Admin)' : currentRole === 'ADMIN' ? 'Mahmoud Ndiaye (Admin)' : currentUserMember ? `${currentUserMember.prenom} ${currentUserMember.nom}` : 'Utilisateur',
      timestamp: 'À l’instant'
    };
    setActivityLogs((prev) => [newLog, ...prev]);
    // NOTE: If we want to persist to firestore, we would call addAuditLog(newLog) from services here, but since the names conflict and it's causing issues we just update state for now.
  };

  // Initial load from Firestore
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const response = await getMembers(50); // Get first batch for UI
        const membersData = response?.members || [];
        setMembers(membersData);
        if (membersData && membersData.length > 0) {
           const khadijaFound = membersData.find((m) => m.nom.toLowerCase().includes('sidibé')) || membersData[0];
           if (khadijaFound) setCurrentUserMember(khadijaFound);
        }
      } catch (error) {
        console.error("Error loading initial data:", error);
      }
    };
    loadInitialData();
  }, []);

  // Sync HTML direction attribute for Arabic support
  useEffect(() => {
    if (currentLang === 'AR') {
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = 'ar';
    } else {
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = currentLang.toLowerCase();
    }
  }, [currentLang]);

  // Handle role change
  const handleRoleChange = (role: UserRole) => {
    setCurrentRole(role);
    setSelectedMember(null);
    if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
      setCurrentView('admin-dashboard');
      notify(`Session commutée : Rôle ${role === 'SUPER_ADMIN' ? 'Super Administrateur' : 'Administrateur'}.`, 'info');
    } else if (role === 'MEMBER') {
      setCurrentView('member-dashboard');
      notify(`Connecté en tant que ${currentUserMember ? `${currentUserMember.prenom} ${currentUserMember.nom}` : 'Utilisateur'} (Membre).`, 'info');
    } else {
      setCurrentView('public-home');
      notify('Session publique / Visiteur.', 'info');
    }
  };

  // Login handler
  const handleLoginSuccess = (role: UserRole, targetMember?: Member) => {
    if (targetMember) {
      setCurrentUserMember(targetMember);
    }
    handleRoleChange(role);
    handleAddAuditLog('Connexion utilisateur', `Connexion avec succès au rôle ${role}`);
  };

  // Logout handler
  const handleLogout = () => {
    setCurrentRole('PUBLIC');
    setCurrentView('public-home');
    setSelectedMember(null);
    notify('Vous êtes déconnecté.', 'info');
    handleAddAuditLog('Déconnexion', 'Fin de session');
  };

  // Member Creation & Update logic
  const handleSaveMember = async (memberData: Partial<Member>) => {
    try {
      if (memberFormMode === 'ADD') {
        await withLoading(async () => {
          const memberId = await addMember(memberData as Omit<Member, 'id' | 'createdAt' | 'updatedAt'>);
          const newMember = { ...memberData, id: memberId } as Member;
          setMembers((prev) => [newMember, ...prev]);
          notify(`Membre ${newMember.prenom} ${newMember.nom} enregistré avec succès.`);
          handleAddAuditLog('Ajout membre', `Création de la fiche ${newMember.prenom} ${newMember.nom}`);
        });
      } else if (memberFormMode === 'EDIT' && memberToEdit) {
        await withLoading(async () => {
          await updateMember(memberToEdit.id, memberData);
          const updatedMember = { ...memberToEdit, ...memberData } as Member;
          setMembers((prev) => prev.map((m) => (m.id === updatedMember.id ? updatedMember : m)));
          if (selectedMember && selectedMember.id === memberToEdit.id) {
            setSelectedMember(updatedMember);
          }
          notify(`Fiche de ${updatedMember.prenom} ${updatedMember.nom} mise à jour.`);
          handleAddAuditLog('Modification membre', `Mise à jour de la fiche ${memberToEdit.matricule}`);
        });
      } else if (memberFormMode === 'EDIT_SELF' && currentUserMember) {
        await withLoading(async () => {
          await updateMember(currentUserMember.id, memberData);
          const updatedSelf = { ...currentUserMember, ...memberData } as Member;
          setCurrentUserMember(updatedSelf);
          setMembers((prev) => prev.map((m) => (m.id === currentUserMember.id ? updatedSelf : m)));
          if (selectedMember && selectedMember.id === currentUserMember.id) {
            setSelectedMember(updatedSelf);
          }
          notify('Votre profil personnel a été mis à jour.');
          handleAddAuditLog('Profil personnel mis à jour', `Modification autonome par ${currentUserMember.matricule}`);
        });
      }
      setIsMemberFormOpen(false);
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      notify('Erreur lors de l’enregistrement du membre.', 'error');
    }
  };

  const handleDeleteMember = async (id: string) => {
    const target = members.find((m) => m.id === id);
    try {
      await withLoading(async () => {
        await deleteMember(id);
        setMembers((prev) => prev.filter((m) => m.id !== id));
        if (selectedMember?.id === id) {
          setSelectedMember(null);
          setCurrentView('admin-members');
        }
        notify(`Fiche membre supprimée.`);
        handleAddAuditLog('Suppression membre', `Suppression définitive du membre ${target?.prenom} ${target?.nom}`);
      });
    } catch (err) {
      console.error('Erreur de suppression:', err);
      notify('Erreur lors de la suppression.', 'error');
    }
  };

  const handleToggleMemberStatus = async (id: string) => {
    const target = members.find((m) => m.id === id);
    if (!target) return;
    const nextStatus = target.statutCompte === 'ACTIF' ? 'SUSPENDU' : 'ACTIF';
    try {
      await withLoading(async () => {
        await updateMember(id, { statutCompte: nextStatus as any });
        setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, statutCompte: nextStatus } : m)));
        notify(`Statut du compte changé en : ${nextStatus}`);
        handleAddAuditLog('Changement statut compte', `${target.matricule} basculé en ${nextStatus}`);
      });
    } catch (err) {
      console.error('Erreur changement statut:', err);
      notify('Erreur lors du changement de statut.', 'error');
    }
  };

  const handleCsvImportComplete = (importedMembers: Member[]) => {
    setMembers((prev) => [...importedMembers, ...prev]);
    notify(`${importedMembers.length} fiches membres importées avec succès.`);
    handleAddAuditLog('Importation Excel / CSV', `Ajout massif de ${importedMembers.length} fiches`);
    setCurrentView('admin-members');
  };

  // Open modals
  const openAddMemberModal = () => {
    setMemberToEdit(null);
    setMemberFormMode('ADD');
    setIsMemberFormOpen(true);
  };

  const openEditMemberModal = (member: Member) => {
    setMemberToEdit(member);
    setMemberFormMode('EDIT');
    setIsMemberFormOpen(true);
  };

  const openEditSelfModal = () => {
    setMemberToEdit(currentUserMember);
    setMemberFormMode('EDIT_SELF');
    setIsMemberFormOpen(true);
  };

  // Total data quality issues
  const qualityAlertsCount = Array.isArray(members) 
    ? members.filter((m) => m.dataQualityIssues && m.dataQualityIssues.length > 0).length
    : 0;

  return (
    <div className="min-h-screen bg-[#F8F8F8] flex text-[#1A1A1A] selection:bg-[#335A79] selection:text-white">
      
      {/* Editorial Sidebar Navigation on Left */}
      {currentView !== 'public-home' && currentView !== 'login' && (
        <Sidebar
          currentView={currentView}
          onNavigate={(view) => {
            setSelectedMember(null);
            setCurrentView(view);
          }}
          currentRole={currentRole}
          currentLang={currentLang}
          isOpenMobile={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
          membersCount={members.length}
          qualityAlertsCount={qualityAlertsCount}
        />
      )}

      {/* Main Content Column with Header */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        
        {/* Header Bar */}
        {currentView !== 'public-home' && currentView !== 'login' && (
          <Header
            currentRole={currentRole}
            onRoleChange={handleRoleChange}
            currentLang={currentLang}
            onLanguageChange={setCurrentLang}
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
            currentUserName={
              currentRole === 'SUPER_ADMIN'
                ? 'Cheikh Seck (Super Admin)'
                : currentRole === 'ADMIN'
                ? 'Mahmoud Ndiaye (Admin)'
                : currentUserMember ? `${currentUserMember.prenom} ${currentUserMember.nom}` : 'Utilisateur'
            }
            qualityAlertsCount={qualityAlertsCount}
            onNavigate={(view) => {
              setSelectedMember(null);
              setCurrentView(view);
            }}
            onLogout={handleLogout}
          />
        )}

        {/* Dynamic Content Area */}
        <main className={`flex-1 min-w-0 ${(currentView !== 'public-home' && currentView !== 'login') ? 'px-4 sm:px-6 lg:px-8 py-6' : ''}`}>
          
          {/* Breadcrumb Bar */}
          {currentView !== 'public-home' && currentView !== 'login' && (
            <div className="flex items-center gap-1.5 text-xs text-stone-500 mb-5 overflow-x-auto scrollbar-none">
              <button
                onClick={() => {
                  setSelectedMember(null);
                  setCurrentView(
                    currentRole === 'SUPER_ADMIN' || currentRole === 'ADMIN'
                      ? 'admin-dashboard'
                      : currentRole === 'MEMBER'
                      ? 'member-dashboard'
                      : 'public-home'
                  );
                }}
                className="flex items-center gap-1 hover:text-[#335A79] transition font-medium"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Accueil</span>
              </button>

              <ChevronRight className="w-3.5 h-3.5 text-stone-400 rtl:rotate-180" />

              <span className="font-semibold text-stone-800 capitalize truncate">
                {selectedMember
                  ? `Fiche membre : ${selectedMember.prenom} ${selectedMember.nom}`
                  : currentView.replace('-', ' ')}
              </span>
            </div>
          )}

          {/* VIEW ROUTER */}
          {selectedMember ? (
            <MemberProfileView
              member={selectedMember}
              currentRole={currentRole}
              currentLang={currentLang}
              onBack={() => setSelectedMember(null)}
              onEdit={() => openEditMemberModal(selectedMember)}
              isCurrentUser={currentRole === 'MEMBER' && selectedMember.id === currentUserMember.id}
            />
          ) : (
            <>
              {/* 01, 02, 03: Public Portal */}
              {['public-home', 'public-presentation', 'public-contact'].includes(currentView) && (
                <PublicLanding
                  currentLang={currentLang}
                  onNavigate={setCurrentView}
                  onSelectMemberRole={() => handleRoleChange('MEMBER')}
                  subView={
                    currentView === 'public-presentation'
                      ? 'presentation'
                      : currentView === 'public-contact'
                      ? 'contact'
                      : 'home'
                  }
                />
              )}

              {/* 04: Login */}
              {currentView === 'login' && (
                <LoginView
                  currentLang={currentLang}
                  onLoginSuccess={handleLoginSuccess}
                  members={members}
                  onNavigate={setCurrentView}
                />
              )}

              {/* 05: Member Dashboard */}
              {currentView === 'member-dashboard' && (
                <MemberDashboard
                  member={currentUserMember}
                  currentLang={currentLang}
                  onNavigate={setCurrentView}
                  onEditProfile={openEditSelfModal}
                />
              )}

              {/* 06: Mon Profil (Member) */}
              {currentView === 'my-profile' && (
                <MemberProfileView
                  member={currentUserMember}
                  currentRole={currentRole}
                  currentLang={currentLang}
                  onBack={() => setCurrentView('member-dashboard')}
                  onEdit={openEditSelfModal}
                  isCurrentUser={true}
                />
              )}

              {/* 08: Central Directory */}
              {currentView === 'directory' && (
                <DirectoryView
                  members={members}
                  categories={categoriesList}
                  currentRole={currentRole}
                  currentLang={currentLang}
                  onSelectMember={setSelectedMember}
                  onAddMember={openAddMemberModal}
                />
              )}

              {/* 10: Admin Dashboard */}
              {currentView === 'admin-dashboard' && (
                <AdminDashboard
                  members={members}
                  categories={categoriesList}
                  activityLogs={activityLogs}
                  currentLang={currentLang}
                  onNavigate={setCurrentView}
                  onSelectMember={setSelectedMember}
                  onEditMember={openEditMemberModal}
                />
              )}

              {/* 11: Admin Members List */}
              {currentView === 'admin-members' && (
                <AdminMembersList
                  members={members}
                  currentLang={currentLang}
                  onSelectMember={setSelectedMember}
                  onEditMember={openEditMemberModal}
                  onDeleteMember={handleDeleteMember}
                  onToggleStatus={handleToggleMemberStatus}
                  onAddMember={openAddMemberModal}
                  onNavigate={setCurrentView}
                  categoriesList={categoriesList}
                  professionsList={professionsList}
                />
              )}

              {/* 12: Add Member View Shortcut */}
              {currentView === 'add-member' && (
                <div className="bg-white p-8 rounded-2xl border border-stone-200 text-center space-y-4 max-w-md mx-auto my-12">
                  <h3 className="font-bold text-base text-stone-900">Formulaire d’enregistrement</h3>
                  <p className="text-xs text-stone-500">
                    Ouvrez l’assistant par étapes pour enregistrer un nouveau disciple dans la Dahirah.
                  </p>
                  <button
                    onClick={openAddMemberModal}
                    className="px-4 py-2.5 bg-[#335A79] text-white rounded-xl text-xs font-semibold hover:bg-[#223c52]"
                  >
                    Ouvrir l’assistant d’enregistrement
                  </button>
                </div>
              )}

              {/* 14, 15, 16, 17: Référentiels (Professions, Catégories, Formations, Fonctions) */}
              {[
                'taxonomies',
                'taxonomies-professions',
                'taxonomies-categories',
                'taxonomies-formations',
                'taxonomies-functions'
              ].includes(currentView) && (
                <TaxonomiesView
                  initialTab={
                    currentView === 'taxonomies-categories'
                      ? 'categories'
                      : currentView === 'taxonomies-formations'
                      ? 'formations'
                      : currentView === 'taxonomies-functions'
                      ? 'functions'
                      : 'professions'
                  }
                  professionsList={professionsList}
                  categoriesList={categoriesList}
                  formationsList={formationsList}
                  functionsList={functionsList}
                  currentLang={currentLang}
                  onUpdateProfessions={setProfessionsList}
                  onUpdateCategories={setCategoriesList}
                  onUpdateFormations={setFormationsList}
                  onUpdateFunctions={setFunctionsList}
                  onNotify={notify}
                />
              )}

              {/* 18: CSV Import Wizard */}
              {currentView === 'import-csv' && (
                <CsvImportWizard
                  currentLang={currentLang}
                  onImportComplete={handleCsvImportComplete}
                  onCancel={() => setCurrentView('admin-members')}
                />
              )}

              {/* 18 cont: Exportation */}
              {currentView === 'export' && (
                <ExportView
                  members={members}
                  categories={categoriesList}
                  currentLang={currentLang}
                  onNotify={notify}
                />
              )}

              {/* 19: Users & Permissions */}
              {currentView === 'users-permissions' && (
                <UsersPermissionsView currentLang={currentLang} />
              )}

              {/* 20: Activity Log */}
              {currentView === 'activity-log' && (
                <ActivityLogView
                  activityLogs={activityLogs}
                  currentLang={currentLang}
                />
              )}

              {/* 21: Settings */}
              {currentView === 'settings' && (
                <SettingsView
                  currentLang={currentLang}
                  onLanguageChange={setCurrentLang}
                  onNotify={notify}
                />
              )}

              {/* Future modules: Events, Attendance, Contributions, Communications */}
              {[
                'community-events',
                'community-attendance',
                'community-contributions',
                'community-communications'
              ].includes(currentView) && (
                <FutureModulesView
                  currentLang={currentLang}
                  initialTab={
                    currentView === 'community-attendance'
                      ? 'attendance'
                      : currentView === 'community-contributions'
                      ? 'contributions'
                      : currentView === 'community-communications'
                      ? 'communications'
                      : 'events'
                  }
                  onNotify={notify}
                />
              )}
            </>
          )}

        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav
        currentView={currentView}
        onNavigate={(view) => {
          setSelectedMember(null);
          setCurrentView(view);
        }}
        currentRole={currentRole}
        onOpenMobileMenu={() => setMobileMenuOpen(true)}
      />

      {/* Global Member Add/Edit Form Modal */}
      <MemberFormModal
        isOpen={isMemberFormOpen}
        onClose={() => setIsMemberFormOpen(false)}
        onSave={handleSaveMember}
        initialData={memberToEdit}
        mode={memberFormMode}
        professionsList={professionsList}
        categoriesList={categoriesList}
        formationsList={formationsList}
        functionsList={functionsList}
      />

      {/* Global Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Global Loading Overlay */}
      {isGlobalLoading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/60 backdrop-blur-sm">
          <Loader2 className="w-12 h-12 text-[#335A79] animate-spin" />
        </div>
      )}
    </div>
  );
}
