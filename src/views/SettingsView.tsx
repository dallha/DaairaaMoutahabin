import React, { useState } from 'react';
import {
  Settings,
  Globe,
  ShieldCheck,
  Server,
  Database,
  Save,
  CheckCircle2,
  Lock,
  Sparkles
} from 'lucide-react';
import { Language } from '../types';
import { useTranslation } from '../i18n/translations';

interface SettingsViewProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  onNotify: (msg: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentLang,
  onLanguageChange,
  onNotify,
}) => {
  const t = useTranslation(currentLang);
  const [appName, setAppName] = useState('Dāʾiratu Al-Mutahābbīna Fillāhi');
  const [appArabicName, setAppArabicName] = useState('دائرة المتحابين في الله');
  const [spiritualLeader, setSpiritualLeader] = useState('Shaykh Muhammad Nūruddin Ibn Shaykh Muhammadul Amīn Ñas');
  const [defaultPrivacyPhone, setDefaultPrivacyPhone] = useState('MEMBRES');
  const [defaultPrivacyEmail, setDefaultPrivacyEmail] = useState('MEMBRES');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onNotify('Paramètres institutionnels mis à jour avec succès.');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-[#335A79]" />
          <span>{t.navSettings}</span>
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
          Configuration générale, identité institutionnelle, langues et architecture technique
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* SECTION 1: IDENTITÉ DE LA DAHIRAH */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-2xs space-y-4">
          <div className="border-b border-stone-100 pb-3">
            <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#816C07]" />
              <span>Identité Officielle & Dénomination</span>
            </h3>
            <p className="text-xs text-stone-500">
              Titres affichés sur les entêtes, les fiches membres et les exports officiels
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-stone-700">Nom de la Dahirah (Latin)</label>
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#335A79]"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-stone-700">Nom en Arabe (Calligraphie)</label>
              <input
                type="text"
                value={appArabicName}
                onChange={(e) => setAppArabicName(e.target.value)}
                dir="rtl"
                className="w-full px-3 py-2 rounded-lg border border-stone-300 font-arabic-calligraphy text-base focus:outline-none focus:ring-2 focus:ring-[#335A79]"
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <label className="font-semibold text-stone-700">Guide Spirituel Référent</label>
              <input
                type="text"
                value={spiritualLeader}
                onChange={(e) => setSpiritualLeader(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#335A79]"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: LANGUES & LOCALISATION */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-2xs space-y-4">
          <div className="border-b border-stone-100 pb-3">
            <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#335A79]" />
              <span>Langue de l’Interface & RTL</span>
            </h3>
            <p className="text-xs text-stone-500">
              Basculez la langue principale du portail
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {[
              { id: 'FR', label: 'Français (Défaut)', desc: 'Interface occidentale LTR' },
              { id: 'AR', label: 'العربية (Arabe)', desc: 'Orientation native RTL' },
              { id: 'EN', label: 'English', desc: 'International LTR' },
            ].map((lang) => (
              <label
                key={lang.id}
                className={`p-3.5 rounded-xl border cursor-pointer transition text-xs flex-1 min-w-[160px] ${
                  currentLang === lang.id
                    ? 'border-[#335A79] bg-[#335A79]/5 ring-1 ring-[#335A79]'
                    : 'border-stone-200 hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-stone-900">{lang.label}</span>
                  <input
                    type="radio"
                    name="settings-lang"
                    value={lang.id}
                    checked={currentLang === lang.id}
                    onChange={() => onLanguageChange(lang.id as Language)}
                    className="text-[#335A79]"
                  />
                </div>
                <span className="text-[11px] text-stone-500">{lang.desc}</span>
              </label>
            ))}
          </div>
        </div>

        {/* SECTION 3: ARCHITECTURE BACKEND DJANGO + POSTGRESQL */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-2xs space-y-4">
          <div className="border-b border-stone-100 pb-3">
            <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-[#816C07]" />
              <span>Infrastructure & Schéma de Base de Données</span>
            </h3>
            <p className="text-xs text-stone-500">
              État de la compatibilité avec la stack cible (Django REST Framework + PostgreSQL Neon)
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
              <span className="font-semibold text-stone-700 block">Modèle de Données</span>
              <p className="text-stone-600 text-[11px]">
                Conforme avec les tables relationnelles : <code className="font-mono text-[10px] bg-stone-200 px-1 py-0.5 rounded">Member</code>, <code className="font-mono text-[10px] bg-stone-200 px-1 py-0.5 rounded">Profession</code>, <code className="font-mono text-[10px] bg-stone-200 px-1 py-0.5 rounded">Formation</code>, <code className="font-mono text-[10px] bg-stone-200 px-1 py-0.5 rounded">FonctionDahirah</code>.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
              <span className="font-semibold text-stone-700 block">Endpoints API REST</span>
              <p className="text-stone-600 text-[11px]">
                Prêt pour liaison immédiate vers <code className="font-mono text-[10px] bg-stone-200 px-1 py-0.5 rounded">/api/v1/members/</code> et <code className="font-mono text-[10px] bg-stone-200 px-1 py-0.5 rounded">/api/v1/taxonomies/</code>.
              </p>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-[#335A79] hover:bg-[#223c52] text-white text-xs font-semibold shadow-xs transition flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Enregistrer les paramètres</span>
          </button>
        </div>

      </form>

    </div>
  );
};
