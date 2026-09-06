import React, { useState } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Download,
  FileText,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { Member, Language } from '../types';
import { useTranslation } from '../i18n/translations';

interface CsvImportWizardProps {
  currentLang: Language;
  onImportComplete: (newMembers: Member[]) => void;
  onCancel: () => void;
}

export const CsvImportWizard: React.FC<CsvImportWizardProps> = ({
  currentLang,
  onImportComplete,
  onCancel,
}) => {
  const t = useTranslation(currentLang);
  const [step, setStep] = useState<number>(1);
  const [fileName, setFileName] = useState<string | null>(null);

  // Simulated columns extracted from uploaded CSV
  const detectedCsvColumns = [
    'Nom complet',
    'Numéro Téléphone',
    'Email',
    'Profession exercée',
    'Secteur d’activité',
    'Ville',
    'Fonction Dahirah',
    'Niveau études'
  ];

  // Mapping state: maps system field -> csv column
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({
    prenomNom: 'Nom complet',
    telephone: 'Numéro Téléphone',
    email: 'Email',
    profession: 'Profession exercée',
    secteur: 'Secteur d’activité',
    ville: 'Ville',
    fonctionDahirah: 'Fonction Dahirah',
    formation: 'Niveau études'
  });

  // Simulated parsed rows for preview & validation
  const [parsedRows, setParsedRows] = useState([
    {
      rawName: 'Mouhamadou Bachir Cissé',
      telephone: '+221 77 345 67 89',
      email: 'm.bachir@senegal-trade.sn',
      profession: 'Responsable Logistique',
      secteur: 'Transport & Logistique',
      ville: 'Dakar',
      fonctionDahirah: 'Membre actif',
      status: 'VALID',
      issues: [] as string[]
    },
    {
      rawName: 'Fatoumata Binetou Kâ',
      telephone: '+221 78 123 45 67',
      email: 'f.ka@hopital-dakar.sn',
      profession: 'Sage-femme d’État',
      secteur: 'Santé & Médecine',
      ville: 'Thiès',
      fonctionDahirah: 'Commission Sociale',
      status: 'VALID',
      issues: [] as string[]
    },
    {
      rawName: 'Ibrahima', // Missing last name!
      telephone: '+221 70 999 88 77',
      email: '',
      profession: 'Tailleur & Brodeur',
      secteur: 'Artisanat & Couture',
      ville: 'Kaolack',
      fonctionDahirah: 'Membre',
      status: 'WARNING',
      issues: ['Nom de famille absent (champ unique "Ibrahima")']
    },
    {
      rawName: 'Cheikh Tidiane Diop',
      telephone: '', // Missing phone!
      email: 'tidiane.diop@orange.sn',
      profession: 'Ingénieur Télécoms',
      secteur: 'Numérique & Télécoms',
      ville: 'Dakar',
      fonctionDahirah: 'Zakir',
      status: 'WARNING',
      issues: ['Numéro de téléphone absent']
    },
    {
      rawName: 'Abdoulaye Niasse (Doublon)',
      telephone: '+221 77 820 11 22',
      email: 'abdoulaye.niasse@hadara.sn',
      profession: 'Chercheur en manuscrits',
      secteur: 'Éducation & Recherche',
      ville: 'Kaolack',
      fonctionDahirah: 'Secrétaire Général',
      status: 'ERROR',
      issues: ['Doublon détecté avec un membre existant dans le registre']
    }
  ]);

  const handleFileUpload = (name: string) => {
    setFileName(name);
    setStep(2); // Auto progress to mapping
  };

  const handleExecuteImport = () => {
    // Generate new valid members from parsed rows (excluding errors)
    const validRows = parsedRows.filter((r) => r.status !== 'ERROR');
    const newMembers: Member[] = validRows.map((r, i) => {
      const parts = r.rawName.split(' ');
      const prenom = parts.length > 1 ? parts.slice(0, -1).join(' ') : parts[0];
      const nom = parts.length > 1 ? parts[parts.length - 1] : '';

      return {
        id: `import-${Date.now()}-${i}`,
        matricule: `MUT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        prenom,
        nom,
        sexe: 'M',
        telephone: r.telephone,
        email: r.email || undefined,
        ville: r.ville,
        pays: 'Sénégal',
        situation: 'SALARIE',
        professions: [
          {
            id: `p-${Date.now()}-${i}`,
            metier: r.profession,
            secteur: r.secteur,
            isPrincipale: true
          }
        ],
        formations: [],
        fonctionsDahirah: [
          {
            id: `fn-${Date.now()}-${i}`,
            role: r.fonctionDahirah,
            isActif: true
          }
        ],
        privacy: {
          showPhone: 'MEMBRES',
          showEmail: 'MEMBRES',
          showAddress: 'ADMIN_ONLY',
          showProfessions: 'PUBLIC',
          showFormations: 'MEMBRES'
        },
        dataQualityIssues: r.issues.length > 0 ? r.issues : undefined,
        dateInscription: new Date().toISOString().split('T')[0],
        statutCompte: 'ACTIF'
      };
    });

    onImportComplete(newMembers);
    setStep(5);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-stone-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-[#816C07]" />
            <span>Assistant d’Importation Excel / CSV</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Migration de données, peuplement initial des fiches et détection d’anomalies
          </p>
        </div>

        <button
          onClick={onCancel}
          className="text-xs text-stone-500 hover:text-stone-800"
        >
          Fermer
        </button>
      </div>

      {/* Step Indicators */}
      <div className="grid grid-cols-5 gap-2 text-xs">
        {[
          { num: 1, label: '1. Fichier' },
          { num: 2, label: '2. Mapping' },
          { num: 3, label: '3. Contrôle' },
          { num: 4, label: '4. Aperçu' },
          { num: 5, label: '5. Rapport' },
        ].map((s) => (
          <div
            key={s.num}
            className={`p-2 rounded-xl text-center font-medium border ${
              step === s.num
                ? 'bg-[#335A79] text-white border-[#335A79] shadow-xs'
                : step > s.num
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-stone-50 text-stone-400 border-stone-200'
            }`}
          >
            {s.label}
          </div>
        ))}
      </div>

      {/* STEP 1: UPLOAD */}
      {step === 1 && (
        <div className="bg-white rounded-2xl p-8 border border-stone-200 shadow-2xs space-y-6">
          <div className="text-center max-w-md mx-auto space-y-2">
            <h3 className="font-bold text-base text-stone-900">
              Téléversez votre listing des disciples
            </h3>
            <p className="text-xs text-stone-500">
              Glissez-déposez votre fichier Excel (.xlsx, .xls) ou CSV (.csv). Le système détectera automatiquement la structure des colonnes.
            </p>
          </div>

          {/* Drag and Drop Zone */}
          <div
            onClick={() => handleFileUpload('membres_dahirah_registre_2026.xlsx')}
            className="border-2 border-dashed border-stone-300 hover:border-[#335A79] hover:bg-[#335A79]/5 rounded-2xl p-8 text-center cursor-pointer transition space-y-3"
          >
            <div className="w-12 h-12 rounded-xl bg-stone-100 text-stone-600 flex items-center justify-center mx-auto">
              <Upload className="w-6 h-6 text-[#335A79]" />
            </div>
            <div>
              <p className="font-semibold text-xs text-stone-800">
                Cliquez pour choisir un fichier ou déposez-le ici
              </p>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Formats acceptés : .xlsx, .csv (UTF-8) jusqu'à 25 Mo
              </p>
            </div>
            <span className="inline-block px-3 py-1 bg-white border border-stone-200 rounded-lg text-xs font-medium text-stone-700 shadow-2xs">
              Charger le fichier modèle de démonstration
            </span>
          </div>

          {/* Sample template download */}
          <div className="flex items-center justify-between p-4 bg-stone-50 rounded-xl border border-stone-200 text-xs">
            <div className="flex items-center gap-2 text-stone-600">
              <FileText className="w-4 h-4 text-[#816C07]" />
              <span>Besoin du gabarit type avec toutes les colonnes requises ?</span>
            </div>
            <button
              onClick={() => handleFileUpload('modele_officiel_dahirah.xlsx')}
              className="text-[#335A79] font-semibold hover:underline flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Télécharger le modèle CSV</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: MAPPING DES COLONNES */}
      {step === 2 && (
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-stone-900">
                Correspondance des colonnes (Mapping)
              </h3>
              <p className="text-xs text-stone-500">
                Fichier sélectionné : <span className="font-mono font-semibold text-stone-800">{fileName}</span>
              </p>
            </div>
            <span className="text-xs bg-emerald-50 text-emerald-800 font-semibold px-2 py-0.5 rounded-md">
              8 colonnes associées
            </span>
          </div>

          <div className="space-y-3 text-xs">
            {[
              { field: 'prenomNom', label: 'Prénom & Nom du membre *', desc: 'Champ d’identification principal' },
              { field: 'telephone', label: 'Téléphone WhatsApp *', desc: 'Coordonnée de contact privilégiée' },
              { field: 'email', label: 'Email', desc: 'Adresse électronique (optionnelle)' },
              { field: 'profession', label: 'Profession(s) / Métier', desc: 'Activité professionnelle exercée' },
              { field: 'secteur', label: 'Secteur / Domaine d’activité', desc: 'Classification sectorielle' },
              { field: 'ville', label: 'Ville de résidence', desc: 'Localisation géographique' },
              { field: 'fonctionDahirah', label: 'Fonction dans la Dahirah', desc: 'Rôle spirituel ou organisationnel' },
            ].map((item) => (
              <div key={item.field} className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center p-3 rounded-xl border border-stone-200 bg-stone-50/50">
                <div>
                  <p className="font-semibold text-stone-900">{item.label}</p>
                  <p className="text-[11px] text-stone-500">{item.desc}</p>
                </div>
                <select
                  value={columnMapping[item.field] || ''}
                  onChange={(e) => setColumnMapping({ ...columnMapping, [item.field]: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-stone-300 bg-white font-medium text-xs text-stone-800"
                >
                  <option value="">-- Sélectionner la colonne --</option>
                  {detectedCsvColumns.map((col) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-stone-200">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 border border-stone-200 rounded-xl text-xs font-medium text-stone-700 hover:bg-stone-50 flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Changer de fichier</span>
            </button>
            <button
              onClick={() => setStep(3)}
              className="px-4 py-2 bg-[#335A79] text-white rounded-xl text-xs font-semibold hover:bg-[#223c52] flex items-center gap-1.5 shadow-xs"
            >
              <span>Lancer la validation</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 & 4: VALIDATION ET PRÉVISUALISATION */}
      {(step === 3 || step === 4) && (
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-2xs space-y-6">
          <div>
            <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#816C07]" />
              <span>Contrôle Qualité & Prévisualisation des Lignes</span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Analyse automatisée : détection des doublons, des champs incomplets et des incohérences
            </p>
          </div>

          {/* Diagnostic summary badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
              <span className="text-[10px] text-stone-500 font-semibold block uppercase">Total lignes</span>
              <span className="text-lg font-bold text-stone-900">{parsedRows.length}</span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="text-[10px] text-emerald-800 font-semibold block uppercase">Prêts à importer</span>
              <span className="text-lg font-bold text-emerald-700">
                {parsedRows.filter((r) => r.status === 'VALID').length}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
              <span className="text-[10px] text-amber-800 font-semibold block uppercase">Avertissements</span>
              <span className="text-lg font-bold text-amber-700">
                {parsedRows.filter((r) => r.status === 'WARNING').length}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
              <span className="text-[10px] text-rose-800 font-semibold block uppercase">Bloquants / Doublons</span>
              <span className="text-lg font-bold text-rose-700">
                {parsedRows.filter((r) => r.status === 'ERROR').length}
              </span>
            </div>
          </div>

          {/* Table preview */}
          <div className="border border-stone-200 rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold text-[10px] uppercase">
                <tr>
                  <th className="py-2.5 px-3">Membre détecté</th>
                  <th className="py-2.5 px-3">Téléphone</th>
                  <th className="py-2.5 px-3">Profession & Secteur</th>
                  <th className="py-2.5 px-3">Diagnostic</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700">
                {parsedRows.map((r, idx) => (
                  <tr key={idx} className="hover:bg-stone-50/70">
                    <td className="py-2.5 px-3 font-semibold text-stone-900">
                      {r.rawName}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px]">
                      {r.telephone || <span className="text-amber-800 italic">Absent</span>}
                    </td>
                    <td className="py-2.5 px-3">
                      <span>{r.profession}</span>
                      <span className="text-stone-400 text-[10px] block">{r.secteur}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      {r.status === 'VALID' ? (
                        <span className="text-emerald-700 font-medium flex items-center gap-1 text-[11px]">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Conforme
                        </span>
                      ) : r.status === 'WARNING' ? (
                        <span className="text-amber-800 font-medium flex items-center gap-1 text-[11px]" title={r.issues.join(', ')}>
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          {r.issues[0]}
                        </span>
                      ) : (
                        <span className="text-rose-700 font-medium flex items-center gap-1 text-[11px]">
                          <AlertCircle className="w-3 h-3 text-rose-600" />
                          Ignoré : Doublon
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-stone-200">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 border border-stone-200 rounded-xl text-xs font-medium text-stone-700 hover:bg-stone-50 flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Retour au mapping</span>
            </button>
            <button
              onClick={handleExecuteImport}
              className="px-5 py-2.5 bg-[#335A79] text-white rounded-xl text-xs font-semibold hover:bg-[#223c52] flex items-center gap-1.5 shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Importer 4 fiches valides dans la base</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: RAPPORT FINAL D’IMPORTATION */}
      {step === 5 && (
        <div className="bg-white rounded-2xl p-8 border border-stone-200 shadow-2xs space-y-6 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="font-bold text-lg text-stone-900">
              Importation réussie avec succès
            </h3>
            <p className="text-xs text-stone-600">
              Les fiches conformes ont été injectées dans le registre de la Dahirah. Les fiches avec avertissements ont été étiquetées pour suivi administratif.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto text-xs">
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-medium">
              <span className="text-xl font-bold block">4</span>
              <span>Membres créés</span>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-medium">
              <span className="text-xl font-bold block">2</span>
              <span>Avertissements qualifiés</span>
            </div>
            <div className="p-3 rounded-xl bg-stone-100 border border-stone-200 text-stone-600 font-medium">
              <span className="text-xl font-bold block">1</span>
              <span>Doublon écarté</span>
            </div>
          </div>

          <div className="pt-4 flex justify-center gap-3">
            <button
              onClick={onCancel}
              className="px-5 py-2 rounded-xl bg-[#335A79] text-white text-xs font-semibold hover:bg-[#223c52] shadow-xs"
            >
              Accéder à l’annuaire mis à jour
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
