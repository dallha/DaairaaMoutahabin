import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../services/apiConfig';
import { useAuth } from '../context/AuthContext';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/audit/logs/`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setLogs(Array.isArray(data) ? data : data.results || []))
      .catch(() => setLogs([]))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="p-5 rounded-2xl bg-[#151c28]/90 border border-[#2b3547]/60 shadow-xl">
        <h1 className="font-headline-lg text-2xl font-semibold text-[#e5e9f2] flex items-center gap-2">
          <span className="material-symbols-outlined text-[#f2ca50] text-[26px]">verified_user</span>
          Journal d'Audit Immuable &amp; Sécurité
        </h1>
        <p className="text-xs text-[#9ca7b8] mt-1">
          Traçabilité stricte de chaque création, modification et suppression physique sur PostgreSQL Neon.
        </p>
      </div>

      <div className="rounded-2xl bg-[#151c28]/90 border border-[#2b3547]/60 shadow-xl overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-xs font-body-md">
            <thead>
              <tr className="bg-[#111722] text-[#9ca7b8] text-[11px] font-bold uppercase tracking-wider border-b border-[#2b3547]/40">
                <th className="py-3 px-5">Action</th>
                <th className="py-3 px-4">Entité</th>
                <th className="py-3 px-4">Identifiant Cible</th>
                <th className="py-3 px-4">Utilisateur / Auteur</th>
                <th className="py-3 px-5 text-right">Date &amp; Heure</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2b3547]/20">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-[#9ca7b8]">Chargement du journal d'audit...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-[#9ca7b8]">Aucun événement d'audit enregistré pour le moment.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#1b2332]/50 transition">
                    <td className="py-3 px-5">
                      <span className="px-2 py-0.5 rounded-full bg-[#f2ca50]/15 text-[#f2ca50] font-bold text-[11px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#e5e9f2]">{log.entity}</td>
                    <td className="py-3 px-4 text-[#9ca7b8] font-mono text-[11px]">{log.entity_id || '-'}</td>
                    <td className="py-3 px-4 text-[#e5e9f2]">{log.user?.email || log.user_email || 'Système'}</td>
                    <td className="py-3 px-5 text-right text-[#9ca7b8] font-mono text-[11px]">{log.created_at || 'À l’instant'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const UserManagementPage: React.FC = () => {
  return (
    <div className="flex flex-col gap-6">
      <div className="p-5 rounded-2xl bg-[#151c28]/90 border border-[#2b3547]/60 shadow-xl">
        <h1 className="font-headline-lg text-2xl font-semibold text-[#e5e9f2] flex items-center gap-2">
          <span className="material-symbols-outlined text-[#f2ca50] text-[26px]">manage_accounts</span>
          Gestion des Utilisateurs &amp; Privilèges
        </h1>
        <p className="text-xs text-[#9ca7b8] mt-1">Espace réservé exclusivement au Super-Administrateur.</p>
      </div>

      <div className="p-6 rounded-2xl bg-[#151c28]/90 border border-[#2b3547]/60 shadow-xl text-xs space-y-3">
        <p className="text-[#9ca7b8]">Comptes d'accès autorisés, assignation de rôles et audit des sessions actives.</p>
        <div className="p-4 rounded-xl bg-[#111722] border border-[#2b3547]/40">
          <p className="font-semibold text-[#f2ca50]">Rôles système :</p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-[#9ca7b8]">
            <li><strong className="text-[#e5e9f2]">superadmin</strong> : Contrôle total, suppression physique irréversible, journal d'audit</li>
            <li><strong className="text-[#e5e9f2]">admin</strong> : Gestion des membres, modifications, soft-delete et restauration</li>
            <li><strong className="text-[#e5e9f2]">agent</strong> : Enrôlement et consultation annuaire</li>
            <li><strong className="text-[#e5e9f2]">member</strong> : Consultation de son profil et de l'annuaire interne restreint</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export const SystemSettingsPage: React.FC = () => {
  return (
    <div className="flex flex-col gap-6">
      <div className="p-5 rounded-2xl bg-[#151c28]/90 border border-[#2b3547]/60 shadow-xl">
        <h1 className="font-headline-lg text-2xl font-semibold text-[#e5e9f2] flex items-center gap-2">
          <span className="material-symbols-outlined text-[#f2ca50] text-[26px]">settings</span>
          Paramètres &amp; Infrastructure Système
        </h1>
        <p className="text-xs text-[#9ca7b8] mt-1">Configuration du cluster Neon PostgreSQL et intégrité applicative.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-[#151c28]/90 border border-[#2b3547]/60 text-xs space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-bold">
            <span className="material-symbols-outlined text-[18px]">dns</span>
            <span>Cluster PostgreSQL Neon</span>
          </div>
          <p className="text-[#9ca7b8]">Statut : <span className="text-emerald-400 font-bold">Connecté &amp; Opérationnel</span></p>
          <p className="text-[#9ca7b8]">Host : <span className="font-mono text-[#e5e9f2]">ep-holy-butterfly-...aws.neon.tech</span></p>
          <p className="text-[#9ca7b8]">Mode SSL : <span className="font-mono text-[#e5e9f2]">require</span></p>
        </div>

        <div className="p-5 rounded-2xl bg-[#151c28]/90 border border-[#2b3547]/60 text-xs space-y-2">
          <div className="flex items-center gap-2 text-[#f2ca50] font-bold">
            <span className="material-symbols-outlined text-[18px]">cloud</span>
            <span>Distribution Vercel SPA</span>
          </div>
          <p className="text-[#9ca7b8]">Stack : <span className="text-[#e5e9f2] font-semibold">React 19 + Vite 6 + React Router v7</span></p>
          <p className="text-[#9ca7b8]">Deep Linking : <span className="text-emerald-400 font-bold">Actif (F5 fallback index.html)</span></p>
          <p className="text-[#9ca7b8]">Headers de Sécurité : <span className="text-emerald-400 font-bold">DENY, nosniff, strict-origin</span></p>
        </div>
      </div>
    </div>
  );
};

export const NotFoundPage: React.FC = () => {
  return (
    <div className="py-24 max-w-lg mx-auto text-center flex flex-col items-center gap-4">
      <div className="w-16 h-16 rounded-full bg-[#f2ca50]/10 text-[#f2ca50] flex items-center justify-center">
        <span className="material-symbols-outlined text-[36px]">travel_explore</span>
      </div>
      <h1 className="font-headline-lg text-4xl font-bold text-[#f2ca50]">404</h1>
      <h2 className="font-headline-sm text-lg font-semibold text-[#e5e9f2]">Page Introuvable</h2>
      <p className="text-xs text-[#9ca7b8]">
        L'adresse demandée ne correspond à aucune route répertoriée de la plateforme Dāʾiratu.
      </p>
      <Link
        to="/dashboard"
        className="mt-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#e9c349] to-[#f2ca50] text-slate-950 font-bold text-xs shadow-md hover:brightness-110 transition"
      >
        Retourner au Tableau de Bord
      </Link>
    </div>
  );
};
