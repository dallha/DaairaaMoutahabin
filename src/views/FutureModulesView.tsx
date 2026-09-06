import React, { useState } from 'react';
import {
  Calendar,
  CheckSquare,
  DollarSign,
  MessageSquare,
  Sparkles,
  Clock,
  MapPin,
  Users,
  Plus,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { Language } from '../types';
import { useTranslation } from '../i18n/translations';

interface FutureModulesViewProps {
  currentLang: Language;
  initialTab?: 'events' | 'attendance' | 'contributions' | 'communications';
  onNotify: (msg: string) => void;
}

export const FutureModulesView: React.FC<FutureModulesViewProps> = ({
  currentLang,
  initialTab = 'events',
  onNotify,
}) => {
  const t = useTranslation(currentLang);
  const [activeTab, setActiveTab] = useState<'events' | 'attendance' | 'contributions' | 'communications'>(initialTab);

  return (
    <div className="space-y-6 pb-16 max-w-5xl mx-auto">
      
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
            {t.navCommunityLife}
          </h1>
          <span className="text-xs bg-[#816C07]/10 text-[#816C07] px-2.5 py-0.5 rounded-full font-semibold">
            Modules d’Extension
          </span>
        </div>
        <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
          Espaces préparés pour les activités spirituelles, la gestion des présences et la solidarité communautaire
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 overflow-x-auto scrollbar-none pb-1">
        <button
          onClick={() => setActiveTab('events')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition border-b-2 whitespace-nowrap ${
            activeTab === 'events'
              ? 'border-[#335A79] text-[#335A79] bg-white'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>{t.navEvents}</span>
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition border-b-2 whitespace-nowrap ${
            activeTab === 'attendance'
              ? 'border-[#335A79] text-[#335A79] bg-white'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>{t.navAttendance}</span>
        </button>

        <button
          onClick={() => setActiveTab('contributions')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition border-b-2 whitespace-nowrap ${
            activeTab === 'contributions'
              ? 'border-[#335A79] text-[#335A79] bg-white'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>{t.navContributions}</span>
        </button>

        <button
          onClick={() => setActiveTab('communications')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition border-b-2 whitespace-nowrap ${
            activeTab === 'communications'
              ? 'border-[#335A79] text-[#335A79] bg-white'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>{t.navCommunications}</span>
        </button>
      </div>

      {/* TAB 1: ÉVÉNEMENTS */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-stone-900">Agenda Spirituel & Rencontres</h3>
            <button
              onClick={() => onNotify('Création d’événement planifiée.')}
              className="px-3 py-1.5 rounded-lg bg-[#335A79] text-white text-xs font-medium flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Programmer un événement</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-full bg-[#335A79]/10 text-[#335A79] font-bold text-[10px]">
                  RÉCURRENT • CHAQUE VENDREDI
                </span>
                <span className="text-stone-400">17h00 - 19h30</span>
              </div>
              <h4 className="font-bold text-sm text-stone-900">
                Hadratu-l-Jumah & Wazifa Solennelle
              </h4>
              <p className="text-stone-600 leading-relaxed">
                Récitation collective du wird et de la Hailala conformément à la tradition de la Tarīqa Tijāniyya.
              </p>
              <div className="flex items-center gap-3 pt-2 text-stone-500 border-t border-stone-100">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#816C07]" />
                  Mosquée Médina Baye / Siège
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-[#335A79]" />
                  Tout public
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-full bg-[#816C07]/10 text-[#816C07] font-bold text-[10px]">
                  ÉVÉNEMENT MAJEUR
                </span>
                <span className="text-stone-400">25 Septembre 2026</span>
              </div>
              <h4 className="font-bold text-sm text-stone-900">
                Colloque Annuel de Dāʾiratu Al-Mutahābbīna
              </h4>
              <p className="text-stone-600 leading-relaxed">
                « Érudition, Éthique Professionnelle et Solidarité : L’Héritage de Shaykh Al-Islam Ibrahima Ñas ».
              </p>
              <div className="flex items-center gap-3 pt-2 text-stone-500 border-t border-stone-100">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#816C07]" />
                  Grand Théâtre National, Dakar
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-[#335A79]" />
                  Disciples & Invités
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PRÉSENCES */}
      {activeTab === 'attendance' && (
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-2xs space-y-4 text-xs">
          <div>
            <h3 className="font-bold text-sm text-stone-900">Émargement & Assiduité aux Wazifas</h3>
            <p className="text-stone-500 text-[11px]">
              Suivi fraternel de la participation des membres aux séances et commissions
            </p>
          </div>

          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="font-semibold text-stone-900">Dernière séance enregistrée</span>
              <p className="text-stone-500 text-[11px]">Vendredi 28 Août 2026 — Hadratu-l-Jumah</p>
            </div>
            <span className="font-bold text-[#335A79] text-base">32 présents / 34</span>
          </div>

          <div className="text-center py-6 space-y-2">
            <CheckSquare className="w-8 h-8 text-stone-300 mx-auto" />
            <p className="font-medium text-stone-700">Module d'émargement QR Code & badge mobile prêt pour activation.</p>
          </div>
        </div>
      )}

      {/* TAB 3: COTISATIONS & TAYSIR */}
      {activeTab === 'contributions' && (
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-stone-200 space-y-1">
              <span className="text-[10px] uppercase font-semibold text-stone-400">Total Fonds Taysir</span>
              <p className="text-xl font-bold text-emerald-700">2 450 000 FCFA</p>
              <p className="text-[10px] text-stone-500">Caisse de solidarité active</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-stone-200 space-y-1">
              <span className="text-[10px] uppercase font-semibold text-stone-400">Cotisations Annuelles</span>
              <p className="text-xl font-bold text-[#335A79]">88% à jour</p>
              <p className="text-[10px] text-stone-500">Exercice 2026</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-stone-200 space-y-1">
              <span className="text-[10px] uppercase font-semibold text-stone-400">Aides sociales allouées</span>
              <p className="text-xl font-bold text-[#816C07]">6 interventions</p>
              <p className="text-[10px] text-stone-500">Santé et bourses étudiantes</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-2xs space-y-3">
            <h4 className="font-bold text-stone-900">Historique récent de la caisse de solidarité</h4>
            <div className="divide-y divide-stone-100">
              <div className="py-2.5 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-stone-900">Cotisation mensuelle membres du bureau</p>
                  <p className="text-[10px] text-stone-400">1er Septembre 2026 • Virement Wave / Orange Money</p>
                </div>
                <span className="font-bold text-emerald-700">+150 000 FCFA</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-stone-900">Prise en charge ordonnance membre daara</p>
                  <p className="text-[10px] text-stone-400">24 Août 2026 • Pôle Santé & Solidarité</p>
                </div>
                <span className="font-bold text-rose-700">-35 000 FCFA</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: COMMUNICATIONS */}
      {activeTab === 'communications' && (
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-2xs space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-stone-900">Diffusions & Annonces Officielles</h3>
              <p className="text-stone-500 text-[11px]">
                Envoi de circulaires via WhatsApp API et Email aux membres
              </p>
            </div>
            <button
              onClick={() => onNotify('Nouvelle circulaire préparée.')}
              className="px-3 py-1.5 rounded-lg bg-[#335A79] text-white text-xs font-medium"
            >
              Rédiger une circulaire
            </button>
          </div>

          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-stone-900 text-xs">
                Circulaire N° 04/2026 — Préparation du Mawlid an-Nabaouy
              </span>
              <span className="text-[10px] text-stone-400">15 Août 2026</span>
            </div>
            <p className="text-stone-600 text-[11px]">
              Appel à mobilisation de tous les membres des commissions d'organisation et du pôle logistique.
            </p>
            <div className="pt-2 flex items-center gap-2 text-[10px] text-stone-500">
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">Diffusé à 34 membres</span>
              <span>• Taux d'ouverture : 94%</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
