import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ProtectedRoute, PublicRoute, RoleGuard } from './routes/RouteGuards';
import { AppLayout } from './layouts/AppLayout';

import { LoginPage } from './pages/LoginPage';
import { DashboardOverviewPage } from './pages/DashboardOverviewPage';
import { MembersDirectoryPage } from './pages/MembersDirectoryPage';
import { MemberDetailPage } from './pages/MemberDetailPage';
import { MemberCreatePage } from './pages/MemberCreatePage';
import { MemberEditPage } from './pages/MemberEditPage';
import {
  ProfessionsListPage,
  TaxonomyCategoriesPage,
  EducationReferentialPage,
  DahirahRolesPage,
} from './pages/ReferentialsPages';
import {
  AuditLogsPage,
  UserManagementPage,
  SystemSettingsPage,
  NotFoundPage,
} from './pages/AdminPages';
import { NetworkDirectoryPage } from './pages/NetworkDirectoryPage';

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Route d'Authentification Publique */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              }
            />

            {/* Redirection de la racine vers le Dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Ensemble des routes protégées enveloppées par AppLayout */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              {/* Tableau de Bord */}
              <Route path="/dashboard" element={<DashboardOverviewPage />} />

              {/* Annuaire & Fiches Individuelles */}
              <Route path="/members" element={<MembersDirectoryPage />} />
              <Route path="/network" element={<NetworkDirectoryPage />} />
              <Route
                path="/members/new"
                element={
                  <RoleGuard allowed={['admin', 'superadmin', 'agent']}>
                    <MemberCreatePage />
                  </RoleGuard>
                }
              />
              <Route
                path="/members/:id/edit"
                element={
                  <RoleGuard allowed={['admin', 'superadmin', 'agent', 'member']}>
                    <MemberEditPage />
                  </RoleGuard>
                }
              />
              <Route path="/members/:id" element={<MemberDetailPage />} />

              {/* Référentiels & Taxonomies Métiers (Canonical & Aliases) */}
              <Route
                path="/referentials/professions"
                element={
                  <RoleGuard allowed={['admin', 'superadmin']}>
                    <ProfessionsListPage />
                  </RoleGuard>
                }
              />
              <Route path="/professions" element={<Navigate to="/referentials/professions" replace />} />
              <Route
                path="/referentials/categories"
                element={
                  <RoleGuard allowed={['admin', 'superadmin']}>
                    <TaxonomyCategoriesPage />
                  </RoleGuard>
                }
              />
              <Route path="/professions/categories" element={<Navigate to="/referentials/categories" replace />} />
              <Route
                path="/referentials/education"
                element={
                  <RoleGuard allowed={['admin', 'superadmin']}>
                    <EducationReferentialPage />
                  </RoleGuard>
                }
              />
              <Route path="/education" element={<Navigate to="/referentials/education" replace />} />
              <Route
                path="/referentials/roles"
                element={
                  <RoleGuard allowed={['admin', 'superadmin']}>
                    <DahirahRolesPage />
                  </RoleGuard>
                }
              />
              <Route path="/roles" element={<Navigate to="/referentials/roles" replace />} />

              {/* Administration Avancée & Sécurité (Canonical & Aliases) */}
              <Route
                path="/admin/audit"
                element={
                  <RoleGuard allowed={['superadmin']}>
                    <AuditLogsPage />
                  </RoleGuard>
                }
              />
              <Route path="/audit" element={<Navigate to="/admin/audit" replace />} />
              <Route
                path="/admin/users"
                element={
                  <RoleGuard allowed={['superadmin']}>
                    <UserManagementPage />
                  </RoleGuard>
                }
              />
              <Route path="/users" element={<Navigate to="/admin/users" replace />} />
              <Route
                path="/admin/settings"
                element={
                  <RoleGuard allowed={['superadmin']}>
                    <SystemSettingsPage />
                  </RoleGuard>
                }
              />
              <Route path="/settings" element={<Navigate to="/admin/settings" replace />} />

              {/* Page 404 Interne */}
              <Route path="*" element={<NotFoundPage />} />
            </Route>

            {/* Redirection fallback racine */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}
