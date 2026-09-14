import React, { useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileCode,
  ShieldCheck,
  CheckCircle2,
  Filter,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Member, CategoryRef, Language } from '../types';
import { useTranslation } from '../i18n/translations';

interface ExportViewProps {
  members: Member[];
  categories: CategoryRef[];
  currentLang: Language;
  onNotify: (msg: string) => void;
}

export const ExportView: React.FC<ExportViewProps> = ({
  members,
  categories,
  currentLang,
  onNotify,
}) => {
  const t = useTranslation(currentLang);
  const [format, setFormat] = useState<'CSV' | 'JSON' | 'EXCEL'>('CSV');
  const [sectorFilter, setSectorFilter] = useState('ALL');
  const [includePrivate, setIncludePrivate] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const filtered = members.filter((m) => {
    if (sectorFilter === 'ALL') return true;
    return m.professions.some((p) => p.secteur.toLowerCase().includes(sectorFilter.toLowerCase()));
  });

  const handleDownload = () => {
    let content = '';
    let mimeType = 'text/plain';
    let ext = 'txt';

    if (format === 'JSON') {
      const dataToExport = filtered.map((m) => ({
        matricule: m.matricule,
        prenom: m.prenom,
        nom: m.nom,
        sexe: m.sexe,
        situation: m.situation,
        telephone: includePrivate ? m.telephone : '[MASQUÉ]',
        email: includePrivate ? m.email : '[MASQUÉ]',
        ville: m.ville,
        pays: m.pays,
        professions: m.professions.map((p) => ({ metier: p.metier, secteur: p.secteur, principale: p.isPrincipale })),
        fonctionsDahirah: m.fonctionsDahirah.map((f) => f.role),
        dateInscription: m.dateInscription
      }));
      content = JSON.stringify(dataToExport, null, 2);
      mimeType = 'application/json';
      ext = 'json';
    } else {
      // CSV Export
      const headers = ['Matricule', 'Prenom', 'Nom', 'Sexe', 'Situation', 'Professions', 'Fonction_Dahirah', 'Ville', 'Pays', 'Telephone', 'Email'];
      const rows = filtered.map((m) => [
        `"${m.matricule}"`,
        `"${m.prenom}"`,
        `"${m.nom || ''}"`,
        `"${m.sexe}"`,
        `"${m.situation}"`,
        `"${m.professions.map((p) => p.metier).join('; ')}"`,
        `"${m.fonctionsDahirah.map((f) => f.role).join('; ')}"`,
        `"${m.ville}"`,
        `"${m.pays}"`,
        includePrivate ? `"${m.telephone || ''}"` : '"[MASQUE]"',
        includePrivate ? `"${m.email || ''}"` : '"[MASQUE]"'
      ]);
      content = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      mimeType = 'text/csv';
      ext = format === 'EXCEL' ? 'csv' : 'csv';
    }

    // Trigger browser download via blob
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `dahirah_al_mutahabbina_membres_${new Date().toISOString().split('T')[0]}.${ext}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportSuccess(true);
    onNotify(`Export de ${filtered.length} membres généré avec succès.`);
    setTimeout(() => setExportSuccess(false), 4000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
          <Download className="w-5 h-5 text-[#335A79]" />
          <span>Centre d’Exportation des Données</span>
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
          Générez des extractions complètes ou ciblées de l’annuaire de la Dahirah
        </p>
      </div>

      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-stone-200 shadow-2xs space-y-6">
        
        {/* Format Selection */}
        <div className="space-y-3">
          <label className="font-bold text-sm text-stone-900 block">
            1. Format du fichier d’export :
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'CSV', label: 'CSV Universel', desc: 'Pour Excel, Google Sheets ou LibreOffice', icon: FileSpreadsheet },
              { id: 'EXCEL', label: 'Feuille Tableur', desc: 'Structure tabulaire avec en-têtes', icon: FileSpreadsheet },
              { id: 'JSON', label: 'JSON Structuré', desc: 'Format de données universel', icon: FileCode },
            ].map((fmt) => {
              const Icon = fmt.icon;
              return (
                <label
                  key={fmt.id}
                  className={`p-4 rounded-xl border cursor-pointer transition space-y-2 ${
                    format === fmt.id
                      ? 'border-[#335A79] bg-[#335A79]/5 ring-1 ring-[#335A79]'
                      : 'border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Icon className={`w-5 h-5 ${format === fmt.id ? 'text-[#335A79]' : 'text-stone-400'}`} />
                    <input
                      type="radio"
                      name="export-format"
                      value={fmt.id}
                      checked={format === fmt.id}
                      onChange={() => setFormat(fmt.id as any)}
                      className="text-[#335A79] focus:ring-[#335A79]"
                    />
                  </div>
                  <div>
                    <p className="font-bold text-xs text-stone-900">{fmt.label}</p>
                    <p className="text-[11px] text-stone-500">{fmt.desc}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Filters Selection */}
        <div className="space-y-3 pt-2 border-t border-stone-100">
          <label className="font-bold text-sm text-stone-900 block">
            2. Périmètre de l’export :
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-medium text-stone-700">Filtrer par secteur d’activité</label>
              <select
                value={sectorFilter}
                onChange={(e) => setSectorFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white"
              >
                <option value="ALL">Tous les secteurs ({members.length} membres)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.nom}>{c.nom}</option>
                ))}
              </select>
            </div>

            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between">
              <div>
                <p className="font-semibold text-stone-900">Membres concernés</p>
                <p className="text-[11px] text-stone-500">Selon les filtres appliqués</p>
              </div>
              <span className="font-bold text-base text-[#335A79]">
                {filtered.length} fiches
              </span>
            </div>
          </div>
        </div>

        {/* Privacy check */}
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 text-xs space-y-2">
          <div className="flex items-center gap-2 text-amber-900 font-bold">
            <ShieldCheck className="w-4 h-4 text-[#816C07]" />
            <span>Respect des niveaux de confidentialité des membres</span>
          </div>
          <p className="text-[11px] text-stone-600">
            Par défaut, les téléphones et emails sont masqués conformément au RGPD et aux préférences déclarées par chaque adhérent.
          </p>
          <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includePrivate}
              onChange={(e) => setIncludePrivate(e.target.checked)}
              className="rounded text-[#335A79] focus:ring-[#335A79]"
            />
            <span className="font-semibold text-stone-900">
              Dérogation administrative : Exporter l’intégralité des coordonnées brutes
            </span>
          </label>
        </div>

        {/* Download action button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-stone-500">
            Fichier généré côté client sans transit tiers.
          </div>

          <button
            onClick={handleDownload}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#335A79] hover:bg-[#223c52] text-white text-xs font-semibold shadow-xs transition flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Générer et télécharger l’export ({filtered.length})</span>
          </button>
        </div>

        {exportSuccess && (
          <div className="p-3 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Téléchargement initié avec succès dans votre navigateur.</span>
          </div>
        )}

      </div>

    </div>
  );
};
