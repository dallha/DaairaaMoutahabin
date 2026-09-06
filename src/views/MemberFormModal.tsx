import React, { useState } from 'react';
import {
  X,
  User,
  Briefcase,
  GraduationCap,
  Award,
  ShieldCheck,
  CheckCircle2,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Lock
} from 'lucide-react';
import {
  Member,
  Profession,
  Formation,
  FonctionDahirah,
  PrivacySettings,
  ProfessionRef,
  CategoryRef,
  FormationRef,
  FonctionRef
} from '../types';

interface MemberFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (memberData: Partial<Member>) => void;
  initialData?: Member | null;
  mode: 'ADD' | 'EDIT' | 'EDIT_SELF';
  professionsList: ProfessionRef[];
  categoriesList: CategoryRef[];
  formationsList: FormationRef[];
  functionsList: FonctionRef[];
}

export const MemberFormModal: React.FC<MemberFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  mode,
  professionsList,
  categoriesList,
  formationsList,
  functionsList,
}) => {
  if (!isOpen) return null;

  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form State: Step 1 - Identité & Coordonnées
  const [prenom, setPrenom] = useState(initialData?.prenom || '');
  const [nom, setNom] = useState(initialData?.nom || '');
  const [sexe, setSexe] = useState<'M' | 'F' | 'OTHER'>(initialData?.sexe || 'M');
  const [dateNaissance, setDateNaissance] = useState(initialData?.dateNaissance || '');
  const [lieuNaissance, setLieuNaissance] = useState(initialData?.lieuNaissance || '');
  const [telephone, setTelephone] = useState(initialData?.telephone || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [ville, setVille] = useState(initialData?.ville || 'Dakar');
  const [pays, setPays] = useState(initialData?.pays || 'Sénégal');
  const [adresse, setAdresse] = useState(initialData?.adresse || '');

  // Step 2 - Situation
  const [situation, setSituation] = useState(initialData?.situation || 'SALARIE');

  // Step 3 - Formations (multiples)
  const [formations, setFormations] = useState<Formation[]>(
    initialData?.formations || [
      {
        id: 'form-1',
        domaine: 'Sciences Juridiques',
        niveau: 'Master',
        etablissement: 'UCAD',
        diplome: 'Master 2 Droit',
        annee: '2022'
      }
    ]
  );

  // Step 4 - Professions (multiples - Crucial!)
  const [professions, setProfessions] = useState<Profession[]>(
    initialData?.professions || [
      {
        id: 'prof-1',
        metier: 'Consultant',
        secteur: 'Services & Conseil',
        isPrincipale: true,
        activite: 'Conseil en organisation'
      }
    ]
  );

  // Step 5 - Fonctions dans la Dahirah (multiples)
  const [fonctionsDahirah, setFonctionsDahirah] = useState<FonctionDahirah[]>(
    initialData?.fonctionsDahirah || [
      {
        id: 'fn-1',
        role: 'Membre actif',
        pole: 'Pôle Général',
        isActif: true
      }
    ]
  );

  // Step 6 - Confidentialité
  const [privacy, setPrivacy] = useState<PrivacySettings>(
    initialData?.privacy || {
      showPhone: 'MEMBRES',
      showEmail: 'MEMBRES',
      showAddress: 'ADMIN_ONLY',
      showProfessions: 'PUBLIC',
      showFormations: 'MEMBRES'
    }
  );

  // Helper handlers for dynamic arrays
  const addProfession = () => {
    const defaultRef = professionsList[0];
    setProfessions([
      ...professions,
      {
        id: `prof-${Date.now()}`,
        metier: defaultRef ? defaultRef.nom : 'Nouvelle profession',
        secteur: defaultRef ? defaultRef.categorieNom : 'Général',
        isPrincipale: professions.length === 0,
        activite: ''
      }
    ]);
  };

  const removeProfession = (index: number) => {
    setProfessions(professions.filter((_, i) => i !== index));
  };

  const updateProfession = (index: number, field: keyof Profession, value: any) => {
    const updated = [...professions];
    updated[index] = { ...updated[index], [field]: value };
    setProfessions(updated);
  };

  const addFormation = () => {
    setFormations([
      ...formations,
      {
        id: `form-${Date.now()}`,
        domaine: 'Enseignement / Études',
        niveau: 'Licence',
        etablissement: '',
        diplome: '',
        annee: ''
      }
    ]);
  };

  const removeFormation = (index: number) => {
    setFormations(formations.filter((_, i) => i !== index));
  };

  const updateFormation = (index: number, field: keyof Formation, value: any) => {
    const updated = [...formations];
    updated[index] = { ...updated[index], [field]: value };
    setFormations(updated);
  };

  const addFonction = () => {
    setFonctionsDahirah([
      ...fonctionsDahirah,
      {
        id: `fn-${Date.now()}`,
        role: 'Membre de commission',
        pole: 'Pôle Général',
        isActif: true
      }
    ]);
  };

  const removeFonction = (index: number) => {
    setFonctionsDahirah(fonctionsDahirah.filter((_, i) => i !== index));
  };

  const updateFonction = (index: number, field: keyof FonctionDahirah, value: any) => {
    const updated = [...fonctionsDahirah];
    updated[index] = { ...updated[index], [field]: value };
    setFonctionsDahirah(updated);
  };

  // Final submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Determine data quality issues dynamically
    const dataQualityIssues: string[] = [];
    if (!nom.trim()) dataQualityIssues.push('Nom de famille manquant');
    if (!telephone.trim()) dataQualityIssues.push('Téléphone manquant');
    if (professions.length === 0 && situation !== 'ELEVE') dataQualityIssues.push('Aucune profession renseignée');

    const memberPayload: Partial<Member> = {
      prenom,
      nom,
      sexe,
      dateNaissance,
      lieuNaissance,
      telephone,
      email,
      ville,
      pays,
      adresse,
      situation: situation as any,
      formations,
      professions,
      fonctionsDahirah,
      privacy,
      dataQualityIssues: dataQualityIssues.length > 0 ? dataQualityIssues : undefined,
    };

    onSave(memberPayload);
    onClose();
  };

  const steps = [
    { num: 1, label: 'Identité' },
    { num: 2, label: 'Situation' },
    { num: 3, label: 'Formations' },
    { num: 4, label: 'Professions' },
    { num: 5, label: 'Fonctions' },
    { num: 6, label: 'Confidentialité' },
    { num: 7, label: 'Validation' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-gray-100 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-white">
          <div>
            <h2 className="text-sm sm:text-base font-serif italic text-[#335A79] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#816C07]" />
              {mode === 'ADD' ? 'Ajouter un nouveau membre' : mode === 'EDIT_SELF' ? 'Mettre à jour mon profil' : `Modifier la fiche de ${prenom} ${nom}`}
            </h2>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Étape {currentStep} sur 7 : {steps[currentStep - 1].label}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator Bar */}
        <div className="px-4 py-2.5 bg-[#F8F8F8] border-b border-gray-100 flex items-center justify-between gap-1 overflow-x-auto scrollbar-none">
          {steps.map((s) => (
            <button
              key={s.num}
              onClick={() => setCurrentStep(s.num)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition ${
                currentStep === s.num
                  ? 'bg-[#335A79] text-white font-semibold shadow-xs'
                  : currentStep > s.num
                  ? 'text-[#816C07] bg-amber-50 font-semibold'
                  : 'text-stone-500 hover:bg-stone-200/70'
              }`}
            >
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] border border-current font-mono">
                {currentStep > s.num ? '✓' : s.num}
              </span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>

        {/* Form Body Scrollable */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-xs text-stone-800">
          
          {/* ÉTAPE 1: INFORMATIONS PERSONNELLES & COORDONNÉES */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-stone-700">Prénom(s) *</label>
                  <input
                    type="text"
                    required
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    placeholder="Ex: Khadija"
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#335A79]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-stone-700">Nom de famille *</label>
                  <input
                    type="text"
                    required
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    placeholder="Ex: Sidibé"
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#335A79]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-stone-700">Sexe</label>
                  <select
                    value={sexe}
                    onChange={(e) => setSexe(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white"
                  >
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                    <option value="OTHER">Autre</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-stone-700">Date de naissance</label>
                  <input
                    type="date"
                    value={dateNaissance}
                    onChange={(e) => setDateNaissance(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-stone-700">Lieu de naissance</label>
                  <input
                    type="text"
                    value={lieuNaissance}
                    onChange={(e) => setLieuNaissance(e.target.value)}
                    placeholder="Ex: Kaolack"
                    className="w-full px-3 py-2 rounded-lg border border-stone-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-stone-700">Téléphone (WhatsApp)</label>
                  <input
                    type="tel"
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                    placeholder="+221 77 000 00 00"
                    className="w-full px-3 py-2 rounded-lg border border-stone-300"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-stone-700">Adresse Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="adresse@domaine.com"
                    className="w-full px-3 py-2 rounded-lg border border-stone-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-stone-700">Ville de résidence</label>
                  <input
                    type="text"
                    value={ville}
                    onChange={(e) => setVille(e.target.value)}
                    placeholder="Dakar"
                    className="w-full px-3 py-2 rounded-lg border border-stone-300"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-stone-700">Pays</label>
                  <input
                    type="text"
                    value={pays}
                    onChange={(e) => setPays(e.target.value)}
                    placeholder="Sénégal"
                    className="w-full px-3 py-2 rounded-lg border border-stone-300"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-stone-700">Quartier / Adresse</label>
                  <input
                    type="text"
                    value={adresse}
                    onChange={(e) => setAdresse(e.target.value)}
                    placeholder="Mermoz, Médina..."
                    className="w-full px-3 py-2 rounded-lg border border-stone-300"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ÉTAPE 2: SITUATION */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <label className="font-bold text-stone-900 block text-sm">
                Situation socioprofessionnelle principale :
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { id: 'ELEVE', label: 'Élève', desc: 'Scolarisé(e) au primaire ou secondaire' },
                  { id: 'ETUDIANT', label: 'Étudiant(e)', desc: 'Université, école supérieure ou institut' },
                  { id: 'SALARIE', label: 'Salarié(e) / Cadre', desc: 'Employé dans le secteur public ou privé' },
                  { id: 'ENTREPRENEUR', label: 'Entrepreneur / Chef d’entreprise', desc: 'Fondateur, dirigeant de société ou startup' },
                  { id: 'INDEPENDANT', label: 'Indépendant / Artisan', desc: 'Profession libérale, artisan, commerçant' },
                  { id: 'AUTRE', label: 'Autre situation', desc: 'En recherche, retraité, etc.' },
                ].map((sit) => (
                  <label
                    key={sit.id}
                    className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                      situation === sit.id
                        ? 'border-[#335A79] bg-[#335A79]/5 shadow-xs'
                        : 'border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="situation"
                      value={sit.id}
                      checked={situation === sit.id}
                      onChange={(e) => setSituation(e.target.value as any)}
                      className="mt-1 text-[#335A79] focus:ring-[#335A79]"
                    />
                    <div>
                      <p className="font-semibold text-stone-900">{sit.label}</p>
                      <p className="text-[11px] text-stone-500 mt-0.5">{sit.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* ÉTAPE 3: FORMATIONS */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-stone-900 text-sm">Parcours académique & Formations</h3>
                  <p className="text-[11px] text-stone-500">Ajoutez les diplômes et établissements fréquentés</p>
                </div>
                <button
                  type="button"
                  onClick={addFormation}
                  className="px-2.5 py-1.5 rounded-lg bg-[#335A79]/10 text-[#335A79] font-semibold text-xs flex items-center gap-1 hover:bg-[#335A79]/20 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter une formation</span>
                </button>
              </div>

              {formations.map((f, idx) => (
                <div key={f.id || idx} className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 space-y-3 relative">
                  <div className="flex items-center justify-between border-b border-stone-200/70 pb-2">
                    <span className="font-semibold text-stone-700 text-xs">Formation #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeFormation(idx)}
                      className="text-rose-600 hover:text-rose-800 p-1"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-medium text-stone-600 block mb-1">Diplôme / Certificat</label>
                      <input
                        type="text"
                        value={f.diplome}
                        onChange={(e) => updateFormation(idx, 'diplome', e.target.value)}
                        placeholder="Ex: Master en Droit Privé"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300"
                      />
                    </div>
                    <div>
                      <label className="font-medium text-stone-600 block mb-1">Niveau</label>
                      <input
                        type="text"
                        value={f.niveau}
                        onChange={(e) => updateFormation(idx, 'niveau', e.target.value)}
                        placeholder="Ex: Bac+5 / Master"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300"
                      />
                    </div>
                    <div>
                      <label className="font-medium text-stone-600 block mb-1">Domaine / Spécialité</label>
                      <input
                        type="text"
                        value={f.domaine}
                        onChange={(e) => updateFormation(idx, 'domaine', e.target.value)}
                        placeholder="Ex: Droit, Informatique, Électromécanique..."
                        className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300"
                      />
                    </div>
                    <div>
                      <label className="font-medium text-stone-600 block mb-1">Établissement & Année</label>
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={f.etablissement}
                          onChange={(e) => updateFormation(idx, 'etablissement', e.target.value)}
                          placeholder="UCAD, BEM..."
                          className="col-span-2 px-2.5 py-1.5 rounded-lg border border-stone-300"
                        />
                        <input
                          type="text"
                          value={f.annee}
                          onChange={(e) => updateFormation(idx, 'annee', e.target.value)}
                          placeholder="2023"
                          className="px-2.5 py-1.5 rounded-lg border border-stone-300 text-center"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ÉTAPE 4: PROFESSIONS (MULTI-PROFESSION SUPPORTED AS REQUIRED) */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-stone-900 text-sm">Professions & Métiers</h3>
                  <p className="text-[11px] text-stone-500">
                    Un membre peut exercer plusieurs métiers (ex: Enseignant et Écrivain)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addProfession}
                  className="px-2.5 py-1.5 rounded-lg bg-[#335A79] text-white font-semibold text-xs flex items-center gap-1 hover:bg-[#223c52] transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter une profession</span>
                </button>
              </div>

              {professions.map((p, idx) => (
                <div key={p.id || idx} className="p-4 rounded-xl border border-stone-200 bg-stone-50/70 space-y-3">
                  <div className="flex items-center justify-between border-b border-stone-200/70 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-stone-800 text-xs">Profession #{idx + 1}</span>
                      <label className="flex items-center gap-1.5 text-[11px] text-stone-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={p.isPrincipale}
                          onChange={(e) => updateProfession(idx, 'isPrincipale', e.target.checked)}
                          className="rounded text-[#335A79]"
                        />
                        <span>Activité principale</span>
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeProfession(idx)}
                      className="text-rose-600 hover:text-rose-800 p-1"
                      title="Supprimer cette profession"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-medium text-stone-600 block mb-1">Intitulé du Métier *</label>
                      <input
                        type="text"
                        required
                        value={p.metier}
                        onChange={(e) => updateProfession(idx, 'metier', e.target.value)}
                        placeholder="Ex: Écrivaine, Journaliste, Voix off, Développeur..."
                        className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300"
                      />
                    </div>
                    <div>
                      <label className="font-medium text-stone-600 block mb-1">Catégorie / Secteur</label>
                      <input
                        type="text"
                        value={p.secteur}
                        onChange={(e) => updateProfession(idx, 'secteur', e.target.value)}
                        placeholder="Ex: Médias, Droit, Santé, Commerce..."
                        className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-medium text-stone-600 block mb-1">Détail des activités ou spécialités</label>
                    <input
                      type="text"
                      value={p.activite || ''}
                      onChange={(e) => updateProfession(idx, 'activite', e.target.value)}
                      placeholder="Ex: Spécialiste droit des affaires, présentatrice radio, etc."
                      className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ÉTAPE 5: FONCTIONS DANS LA DAHIRAH */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-stone-900 text-sm">Fonctions & Responsabilités Dahirah</h3>
                  <p className="text-[11px] text-stone-500">Rôles spirituels, organisationnels et de bureau</p>
                </div>
                <button
                  type="button"
                  onClick={addFonction}
                  className="px-2.5 py-1.5 rounded-lg bg-[#816C07]/15 text-[#816C07] font-semibold text-xs flex items-center gap-1 hover:bg-[#816C07]/25 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter une fonction</span>
                </button>
              </div>

              {fonctionsDahirah.map((fn, idx) => (
                <div key={fn.id || idx} className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-3">
                  <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
                    <span className="font-semibold text-amber-950 text-xs">Rôle #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeFonction(idx)}
                      className="text-rose-600 hover:text-rose-800 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-medium text-stone-700 block mb-1">Rôle / Titre</label>
                      <input
                        type="text"
                        value={fn.role}
                        onChange={(e) => updateFonction(idx, 'role', e.target.value)}
                        placeholder="Ex: Zakir, Responsable Pôle Éducation, Membre..."
                        className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300"
                      />
                    </div>
                    <div>
                      <label className="font-medium text-stone-700 block mb-1">Pôle d’appartenance</label>
                      <input
                        type="text"
                        value={fn.pole || ''}
                        onChange={(e) => updateFonction(idx, 'pole', e.target.value)}
                        placeholder="Ex: Pôle Spirituel, Pôle Santé..."
                        className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ÉTAPE 6: CONFIDENTIALITÉ & VISIBILITÉ */}
          {currentStep === 6 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-stone-900 text-sm">Gestion des droits de visibilité</h3>
                <p className="text-[11px] text-stone-500">
                  Déterminez qui a accès à vos données sensibles dans l’annuaire
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl border border-stone-200 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-stone-900">Numéro de téléphone</p>
                    <p className="text-[11px] text-stone-500">Visibilité de vos coordonnées mobiles</p>
                  </div>
                  <select
                    value={privacy.showPhone}
                    onChange={(e) => setPrivacy({ ...privacy, showPhone: e.target.value as any })}
                    className="px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-medium"
                  >
                    <option value="PUBLIC">Public</option>
                    <option value="MEMBRES">Membres connectés</option>
                    <option value="ADMIN_ONLY">Administration uniquement</option>
                  </select>
                </div>

                <div className="p-3.5 rounded-xl border border-stone-200 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-stone-900">Adresse email</p>
                    <p className="text-[11px] text-stone-500">Visibilité de votre courriel</p>
                  </div>
                  <select
                    value={privacy.showEmail}
                    onChange={(e) => setPrivacy({ ...privacy, showEmail: e.target.value as any })}
                    className="px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-medium"
                  >
                    <option value="PUBLIC">Public</option>
                    <option value="MEMBRES">Membres connectés</option>
                    <option value="ADMIN_ONLY">Administration uniquement</option>
                  </select>
                </div>

                <div className="p-3.5 rounded-xl border border-stone-200 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-stone-900">Adresse physique</p>
                    <p className="text-[11px] text-stone-500">Quartier et domicile exact</p>
                  </div>
                  <select
                    value={privacy.showAddress}
                    onChange={(e) => setPrivacy({ ...privacy, showAddress: e.target.value as any })}
                    className="px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-medium"
                  >
                    <option value="PUBLIC">Public</option>
                    <option value="MEMBRES">Membres connectés</option>
                    <option value="ADMIN_ONLY">Administration uniquement</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ÉTAPE 7: VALIDATION & RÉCAPITULATIF */}
          {currentStep === 7 && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1">
                <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Récapitulatif de la fiche membre</span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  Vérifiez la cohérence des données avant enregistrement dans le registre de la Dahirah.
                </p>
              </div>

              <div className="space-y-3 bg-stone-50 p-4 rounded-xl border border-stone-200 text-xs">
                <div className="flex justify-between border-b border-stone-200 pb-2">
                  <span className="text-stone-500">Identité :</span>
                  <span className="font-bold text-stone-900">{prenom} {nom} ({sexe})</span>
                </div>
                <div className="flex justify-between border-b border-stone-200 pb-2">
                  <span className="text-stone-500">Situation :</span>
                  <span className="font-semibold text-stone-900">{situation}</span>
                </div>
                <div className="flex justify-between border-b border-stone-200 pb-2">
                  <span className="text-stone-500">Professions :</span>
                  <span className="font-semibold text-[#335A79]">
                    {professions.map((p) => p.metier).join(', ') || 'Aucune'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-stone-200 pb-2">
                  <span className="text-stone-500">Fonctions Dahirah :</span>
                  <span className="font-semibold text-[#816C07]">
                    {fonctionsDahirah.map((f) => f.role).join(', ') || 'Membre simple'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Localisation :</span>
                  <span className="text-stone-900">{ville}, {pays}</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between">
          <button
            type="button"
            disabled={currentStep === 1}
            onClick={() => setCurrentStep((s) => Math.max(s - 1, 1))}
            className="px-3.5 py-2 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-100 disabled:opacity-40 disabled:pointer-events-none text-xs font-medium flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Précédent</span>
          </button>

          {currentStep < 7 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((s) => Math.min(s + 1, 7))}
              className="px-4 py-2 rounded-xl bg-[#335A79] hover:bg-[#223c52] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5"
            >
              <span>Suivant</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirmer & Enregistrer</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
