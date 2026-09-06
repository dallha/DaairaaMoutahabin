import React, { useState } from 'react';
import {
  Briefcase,
  Layers,
  GraduationCap,
  Award,
  Search,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  Ban,
  X,
  Sparkles
} from 'lucide-react';
import {
  ProfessionRef,
  CategoryRef,
  FormationRef,
  FonctionRef,
  Language
} from '../types';
import { useTranslation } from '../i18n/translations';

interface TaxonomiesViewProps {
  initialTab?: 'professions' | 'categories' | 'formations' | 'functions';
  professionsList: ProfessionRef[];
  categoriesList: CategoryRef[];
  formationsList: FormationRef[];
  functionsList: FonctionRef[];
  currentLang: Language;
  onUpdateProfessions: (data: ProfessionRef[]) => void;
  onUpdateCategories: (data: CategoryRef[]) => void;
  onUpdateFormations: (data: FormationRef[]) => void;
  onUpdateFunctions: (data: FonctionRef[]) => void;
  onNotify: (msg: string) => void;
}

export const TaxonomiesView: React.FC<TaxonomiesViewProps> = ({
  initialTab = 'professions',
  professionsList,
  categoriesList,
  formationsList,
  functionsList,
  currentLang,
  onUpdateProfessions,
  onUpdateCategories,
  onUpdateFormations,
  onUpdateFunctions,
  onNotify,
}) => {
  const t = useTranslation(currentLang);
  const [activeTab, setActiveTab] = useState<'professions' | 'categories' | 'formations' | 'functions'>(initialTab);
  const [search, setSearch] = useState('');

  // Add Item Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    if (activeTab === 'professions') {
      const newProf: ProfessionRef = {
        id: `prof-ref-${Date.now()}`,
        metier: newItemName,
        nom: newItemName,
        categorieId: newItemCategory || categoriesList[0]?.id || 'cat-general',
        categorieNom: categoriesList.find((c) => c.id === newItemCategory)?.nom || 'Général',
        description: newItemDesc || 'Profession répertoriée',
        statut: 'ACTIF',
        isActif: true
      };
      onUpdateProfessions([...professionsList, newProf]);
      onNotify(`Profession "${newItemName}" ajoutée avec succès au référentiel.`);
    } else if (activeTab === 'categories') {
      const newCat: CategoryRef = {
        id: `cat-${Date.now()}`,
        nom: newItemName,
        code: newItemName.slice(0, 4).toUpperCase(),
        iconName: 'Briefcase',
        description: newItemDesc || 'Secteur d’activité',
        isActif: true
      };
      onUpdateCategories([...categoriesList, newCat]);
      onNotify(`Catégorie "${newItemName}" ajoutée.`);
    } else if (activeTab === 'formations') {
      const newForm: FormationRef = {
        id: `form-ref-${Date.now()}`,
        domaine: newItemCategory || newItemName,
        nom: newItemName,
        niveau: newItemDesc || 'Licence / Master',
        niveaux: [newItemDesc || 'Licence / Master'],
        description: newItemDesc || 'Cursus académique ou religieux',
        isActif: true
      };
      onUpdateFormations([...formationsList, newForm]);
      onNotify(`Formation "${newItemName}" ajoutée.`);
    } else if (activeTab === 'functions') {
      const newFn: FonctionRef = {
        id: `fn-ref-${Date.now()}`,
        titre: newItemName,
        nom: newItemName,
        code: newItemName.slice(0, 4).toUpperCase(),
        pole: newItemCategory || 'Pôle Général',
        description: newItemDesc || 'Responsabilité statutaire',
        rang: functionsList.length + 1,
        isActif: true
      };
      onUpdateFunctions([...functionsList, newFn]);
      onNotify(`Fonction Dahirah "${newItemName}" créée.`);
    }

    setIsAddModalOpen(false);
    setNewItemName('');
    setNewItemCategory('');
    setNewItemDesc('');
  };

  const toggleProfessionStatus = (id: string) => {
    const updated = professionsList.map((p) => (p.id === id ? { ...p, isActif: !p.isActif } : p));
    onUpdateProfessions(updated);
  };

  const deleteProfession = (id: string) => {
    onUpdateProfessions(professionsList.filter((p) => p.id !== id));
    onNotify('Élément supprimé du référentiel.');
  };

  return (
    <div className="space-y-6 pb-16">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
              {t.navTaxonomies}
            </h1>
            <span className="text-xs bg-[#816C07]/10 text-[#816C07] px-2.5 py-0.5 rounded-full font-semibold">
              Tables Normalisées
            </span>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Administration des listes contrôlées pour les professions, domaines académiques et fonctions de la Dahirah
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-3.5 py-2 rounded-xl bg-[#335A79] hover:bg-[#223c52] text-white text-xs font-semibold shadow-2xs transition flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter un élément</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 overflow-x-auto scrollbar-none pb-1">
        <button
          onClick={() => setActiveTab('professions')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition border-b-2 whitespace-nowrap ${
            activeTab === 'professions'
              ? 'border-[#335A79] text-[#335A79] bg-white'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Professions ({professionsList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition border-b-2 whitespace-nowrap ${
            activeTab === 'categories'
              ? 'border-[#335A79] text-[#335A79] bg-white'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Catégories Professionnelles ({categoriesList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('formations')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition border-b-2 whitespace-nowrap ${
            activeTab === 'formations'
              ? 'border-[#335A79] text-[#335A79] bg-white'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Formations & Diplômes ({formationsList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('functions')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition border-b-2 whitespace-nowrap ${
            activeTab === 'functions'
              ? 'border-[#335A79] text-[#335A79] bg-white'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Fonctions Dahirah ({functionsList.length})</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filtrer la table courante..."
          className="w-full pl-10 pr-4 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#335A79] text-xs text-stone-900 bg-white"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* TAB 1: PROFESSIONS */}
      {activeTab === 'professions' && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Métier / Profession</th>
                <th className="py-3 px-4">Catégorie / Secteur</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Statut</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-700">
              {professionsList
                .filter((p) => (p.metier || p.nom || '').toLowerCase().includes(search.toLowerCase()) || (p.categorieNom || '').toLowerCase().includes(search.toLowerCase()))
                .map((prof) => (
                  <tr key={prof.id} className="hover:bg-stone-50/70 transition">
                    <td className="py-3 px-4 font-bold text-stone-900">
                      {prof.metier || prof.nom}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 rounded bg-stone-100 text-stone-700 font-medium text-[11px]">
                        {prof.categorieNom || 'Secteur'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-stone-500 text-[11px]">
                      {prof.description || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          prof.isActif
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-stone-100 text-stone-500 border-stone-200'
                        }`}
                      >
                        {prof.isActif ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => toggleProfessionStatus(prof.id)}
                          className={`p-1.5 rounded-lg transition ${
                            prof.isActif ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={prof.isActif ? 'Désactiver' : 'Activer'}
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteProfession(prof.id)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: CATÉGORIES */}
      {activeTab === 'categories' && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Nom du Secteur</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Statut</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-700">
              {categoriesList
                .filter((c) => c.nom.toLowerCase().includes(search.toLowerCase()))
                .map((cat) => (
                  <tr key={cat.id} className="hover:bg-stone-50/70 transition">
                    <td className="py-3 px-4 font-bold text-stone-900">
                      {cat.nom}
                    </td>
                    <td className="py-3 px-4 text-stone-600 text-[11px]">
                      {cat.description || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Actif
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onNotify('Modification de catégorie enregistrée.')}
                        className="p-1.5 rounded-lg text-stone-500 hover:text-[#335A79] hover:bg-stone-100"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: FORMATIONS */}
      {activeTab === 'formations' && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Intitulé de la formation</th>
                <th className="py-3 px-4">Domaine</th>
                <th className="py-3 px-4">Niveau de référence</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-700">
              {formationsList
                .filter((f) => (f.domaine || f.nom || '').toLowerCase().includes(search.toLowerCase()))
                .map((form) => (
                  <tr key={form.id} className="hover:bg-stone-50/70 transition">
                    <td className="py-3 px-4 font-bold text-stone-900">
                      {form.domaine || form.nom}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-700 font-medium text-[11px]">
                        {form.domaine}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-stone-600 font-medium text-[11px]">
                      {form.niveaux ? form.niveaux.join(', ') : form.niveau}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onNotify('Référentiel formation mis à jour.')}
                        className="p-1.5 rounded-lg text-stone-500 hover:text-[#335A79] hover:bg-stone-100"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: FONCTIONS DAHIRAH */}
      {activeTab === 'functions' && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Titre de la fonction</th>
                <th className="py-3 px-4">Pôle rattaché</th>
                <th className="py-3 px-4">Mission / Description</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-700">
              {functionsList
                .filter((fn) => (fn.titre || fn.nom || '').toLowerCase().includes(search.toLowerCase()) || fn.pole.toLowerCase().includes(search.toLowerCase()))
                .map((fn) => (
                  <tr key={fn.id} className="hover:bg-stone-50/70 transition">
                    <td className="py-3 px-4 font-bold text-stone-900">
                      {fn.titre || fn.nom}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 font-semibold text-[11px]">
                        {fn.pole}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-stone-600 text-[11px]">
                      {fn.description || 'Rôle statutaire de la Dahirah'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onNotify('Fonction Dahirah modifiée.')}
                        className="p-1.5 rounded-lg text-stone-500 hover:text-[#816C07] hover:bg-stone-100"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Item Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-stone-200 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h3 className="font-bold text-sm text-stone-900">
                Ajouter un élément au référentiel ({activeTab})
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-stone-700">Intitulé / Nom *</label>
                <input
                  type="text"
                  required
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="Ex: Chef de projet, Développeur Web..."
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#335A79]"
                />
              </div>

              {activeTab === 'professions' && (
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Catégorie / Secteur</label>
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white"
                  >
                    {categoriesList.map((c) => (
                      <option key={c.id} value={c.id}>{c.nom}</option>
                    ))}
                  </select>
                </div>
              )}

              {activeTab === 'functions' && (
                <div className="space-y-1">
                  <label className="font-medium text-stone-700">Pôle de rattachement</label>
                  <input
                    type="text"
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    placeholder="Ex: Pôle Spirituel, Pôle Santé..."
                    className="w-full px-3 py-2 rounded-lg border border-stone-300"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="font-medium text-stone-700">Description / Remarque</label>
                <textarea
                  rows={2}
                  value={newItemDesc}
                  onChange={(e) => setNewItemDesc(e.target.value)}
                  placeholder="Détails optionnels..."
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#335A79]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-stone-600 hover:text-stone-900"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#335A79] text-white rounded-lg font-semibold hover:bg-[#223c52]"
                >
                  Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
