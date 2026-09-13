import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../services/apiConfig';
import { getAuthHeaders } from '../services/authService';

export const ProfessionsListPage: React.FC = () => {
  const [professions, setProfessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/professions/`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setProfessions(Array.isArray(data) ? data : data.results || []))
      .catch(() => setProfessions([]))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#151c28]/90 border border-[#2b3547]/60 shadow-xl">
        <div>
          <h1 className="font-headline-lg text-2xl font-semibold text-[#e5e9f2] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#f2ca50] text-[26px]">work</span>
            Référentiel des Métiers &amp; Professions
          </h1>
          <p className="text-xs text-[#9ca7b8] mt-1">Classification officielle des corps de métiers de la communauté.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/professions/categories" className="px-3 py-1.5 rounded-xl bg-[#242e40] text-[#f2ca50] text-xs font-semibold hover:bg-[#1b2332] transition">
            Voir Catégories
          </Link>
        </div>
      </div>

      <div className="rounded-2xl bg-[#151c28]/90 border border-[#2b3547]/60 shadow-xl overflow-hidden p-5">
        {isLoading ? (
          <div className="py-12 text-center text-[#9ca7b8]">Chargement des professions...</div>
        ) : professions.length === 0 ? (
          <div className="py-12 text-center text-[#9ca7b8]">Aucune profession référencée pour le moment.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {professions.map((p) => (
              <div key={p.id} className="p-3.5 rounded-xl bg-[#111722] border border-[#2b3547]/50 text-xs">
                <p className="font-semibold text-[#e5e9f2]">{p.name}</p>
                <p className="text-[#9ca7b8] text-[11px] mt-0.5">{p.category_name || p.category || 'Corps de métier'}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const TaxonomyCategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/professions/categories/`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setCategories(Array.isArray(data) ? data : data.results || []))
      .catch(() => setCategories([]))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#151c28]/90 border border-[#2b3547]/60 shadow-xl">
        <div>
          <h1 className="font-headline-lg text-2xl font-semibold text-[#e5e9f2] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#f2ca50] text-[26px]">category</span>
            Catégories Professionnelles &amp; Secteurs
          </h1>
          <p className="text-xs text-[#9ca7b8] mt-1">Secteurs d'activité socio-professionnels.</p>
        </div>
        <Link to="/professions" className="text-xs text-[#f2ca50] hover:underline font-semibold">
          Retour aux Professions
        </Link>
      </div>

      <div className="rounded-2xl bg-[#151c28]/90 border border-[#2b3547]/60 shadow-xl p-5">
        {isLoading ? (
          <div className="py-12 text-center text-[#9ca7b8]">Chargement...</div>
        ) : categories.length === 0 ? (
          <div className="py-12 text-center text-[#9ca7b8]">Aucune catégorie trouvée.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {categories.map((c) => (
              <div key={c.id} className="p-4 rounded-xl bg-[#111722] border border-[#2b3547]/50 text-xs">
                <p className="font-semibold text-[#e5e9f2]">{c.name}</p>
                <p className="text-[#9ca7b8] text-[11px] mt-1">{c.description || 'Secteur d’activité'}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const EducationReferentialPage: React.FC = () => {
  return (
    <div className="flex flex-col gap-6">
      <div className="p-5 rounded-2xl bg-[#151c28]/90 border border-[#2b3547]/60 shadow-xl">
        <h1 className="font-headline-lg text-2xl font-semibold text-[#e5e9f2] flex items-center gap-2">
          <span className="material-symbols-outlined text-[#f2ca50] text-[26px]">school</span>
          Référentiel Éducation &amp; Diplômes
        </h1>
        <p className="text-xs text-[#9ca7b8] mt-1">Grades académiques et formations théologiques/coraniques.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {['Baccalauréat', 'Licence (L3)', 'Master (M2)', 'Doctorat (PhD)', 'Daara & Mémorisation Coran', 'Brevet de Technicien', 'Certificat d’Aptitude', 'Autre'].map((lvl, idx) => (
          <div key={idx} className="p-4 rounded-xl bg-[#151c28] border border-[#2b3547]/50 text-xs flex items-center gap-3">
            <span className="material-symbols-outlined text-[#f2ca50]">workspace_premium</span>
            <span className="font-semibold text-[#e5e9f2]">{lvl}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const DahirahRolesPage: React.FC = () => {
  const [roles, setRoles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/roles/`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setRoles(Array.isArray(data) ? data : data.results || []))
      .catch(() => setRoles([]))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="p-5 rounded-2xl bg-[#151c28]/90 border border-[#2b3547]/60 shadow-xl">
        <h1 className="font-headline-lg text-2xl font-semibold text-[#e5e9f2] flex items-center gap-2">
          <span className="material-symbols-outlined text-[#f2ca50] text-[26px]">bookmark_manager</span>
          Fonctions Statutaires &amp; Commissions Dahirah
        </h1>
        <p className="text-xs text-[#9ca7b8] mt-1">Organigramme ecclésiastique et commissions permanentes.</p>
      </div>

      <div className="rounded-2xl bg-[#151c28]/90 border border-[#2b3547]/60 shadow-xl p-5">
        {isLoading ? (
          <div className="py-12 text-center text-[#9ca7b8]">Chargement...</div>
        ) : roles.length === 0 ? (
          <div className="py-12 text-center text-[#9ca7b8]">Aucune commission configurée.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {roles.map((r) => (
              <div key={r.id} className="p-4 rounded-xl bg-[#111722] border border-[#2b3547]/50 text-xs">
                <p className="font-semibold text-[#e5e9f2]">{r.name}</p>
                <p className="text-[#f2ca50] text-[11px] mt-0.5">{r.category || 'Commission'}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
