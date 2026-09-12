import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
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

export default function App() {
  return (
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
            <Route
              path="/members/new"
              element={
                <RoleGuard allowed={['admin', 'superadmin', 'agent']}>
                  <MemberCreatePage />
                </RoleGuard>
              }
            />
            <Route path="/members/:id" element={<MemberDetailPage />} />
            <Route
              path="/members/:id/edit"
              element={
                <RoleGuard allowed={['admin', 'superadmin', 'agent']}>
                  <MemberEditPage />
                </RoleGuard>
              }
            />

            {/* Référentiels Métiers & Commissions */}
            <Route path="/professions" element={<ProfessionsListPage />} />
            <Route path="/professions/categories" element={<TaxonomyCategoriesPage />} />
            <Route path="/education" element={<EducationReferentialPage />} />
            <Route path="/roles" element={<DahirahRolesPage />} />

            {/* Journal d'Audit & Administration */}
            <Route
              path="/audit"
              element={
                <RoleGuard allowed={['admin', 'superadmin']}>
                  <AuditLogsPage />
                </RoleGuard>
              }
            />
            <Route
              path="/users"
              element={
                <RoleGuard allowed={['superadmin']}>
                  <UserManagementPage />
                </RoleGuard>
              }
            />
            <Route
              path="/settings"
              element={
                <RoleGuard allowed={['superadmin']}>
                  <SystemSettingsPage />
                </RoleGuard>
              }
            />
          </Route>

          {/* Route 404 personnalisée */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
