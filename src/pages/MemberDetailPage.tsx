import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getMemberById, uploadMemberPhoto, deleteMemberPhoto } from '../services/memberService';
import { MemberAvatar } from '../components/MemberAvatar';
import { useLanguage } from '../context/LanguageContext';
import {
  MemberSkill,
  MemberServiceOffer,
  MemberAvailability,
  MemberRelation,
  getMemberSkills,
  getMemberServices,
  getMemberAvailability,
  getMemberRelations,
  getSkills,
  getServicesCatalog,
  addMemberSkill,
  deleteMemberSkill,
  verifyMemberSkill,
  addMemberService,
  deleteMemberService,
  saveMemberAvailability,
  declareMemberRelation,
  approveMemberRelation,
  Skill,
  ServiceCatalogItem,
  MemberNeedDTO,
  fetchMemberNeeds,
  createMemberNeed,
  resolveMemberNeed,
} from '../services/networkService';
import { Member } from '../types';
import { useAuth } from '../context/AuthContext';

export const MemberDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, tControlled } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const [member, setMember] = useState<Member | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Données 360° Network
  const [skills, setSkills] = useState<MemberSkill[]>([]);
  const [services, setServices] = useState<MemberServiceOffer[]>([]);
  const [availability, setAvailability] = useState<MemberAvailability | null>(null);
  const [relations, setRelations] = useState<MemberRelation[]>([]);
  const [needs, setNeeds] = useState<MemberNeedDTO[]>([]);

  // Modals & Formularires
  const [availableSkillsList, setAvailableSkillsList] = useState<Skill[]>([]);
  const [servicesCatalogList, setServicesCatalogList] = useState<ServiceCatalogItem[]>([]);
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [showRelationModal, setShowRelationModal] = useState(false);
  const [showNeedModal, setShowNeedModal] = useState(false);

  // Form states
  const [needTitle, setNeedTitle] = useState('');
  const [needDescription, setNeedDescription] = useState('');
  const [needType, setNeedType] = useState('SOLIDARITY');
  const [needUrgency, setNeedUrgency] = useState<'NORMAL' | 'HIGH' | 'CRITICAL'>('NORMAL');
  const [needVisibility, setNeedVisibility] = useState<'INTERNAL' | 'RESTRICTED_ADMIN'>('INTERNAL');
  const [needIsAnonymous, setNeedIsAnonymous] = useState(false);
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [skillLevel, setSkillLevel] = useState<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT'>('INTERMEDIATE');
  const [skillYears, setSkillYears] = useState<number>(2);

  const [serviceCatalogId, setServiceCatalogId] = useState('');
  const [serviceTitle, setServiceTitle] = useState('');
  const [serviceDesc, setServiceDesc] = useState('');
  const [serviceType, setServiceType] = useState<'VOLUNTEER' | 'DAHIRAH_RATE' | 'STANDARD' | 'MENTORSHIP'>('DAHIRAH_RATE');
  const [serviceTerms, setServiceTerms] = useState('');
  const [serviceContactMode, setServiceContactMode] = useState<'INTERNAL_MESSAGE' | 'WHATSAPP' | 'PHONE' | 'OTHER'>('INTERNAL_MESSAGE');

  const [availStatus, setAvailStatus] = useState<any>('AVAILABLE');
  const [availMentoring, setAvailMentoring] = useState(true);
  const [availEvents, setAvailEvents] = useState(true);
  const [availProHelp, setAvailProHelp] = useState(true);
  const [availVolunteer, setAvailVolunteer] = useState(false);
  const [availHours, setAvailHours] = useState<number>(4);

  const [relationTargetMatricule, setRelationTargetMatricule] = useState('');
  const [relationType, setRelationType] = useState<'SPONSOR' | 'MENTOR' | 'COLLABORATOR' | 'FRATERNAL'>('MENTOR');
  const [relationNotes, setRelationNotes] = useState('');

  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const isSuperAdmin = user?.role === 'superadmin';
  const isAdmin = user?.role === 'admin' || isSuperAdmin;
  const isOwner = Boolean(
    member && user && (
      (user.email && member.email && user.email.toLowerCase() === member.email.toLowerCase()) ||
      (user.member_id && String(user.member_id) === String(member.id))
    )
  );
  const canEdit = isAdmin || isOwner;

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      if (!id) return;
      setIsLoading(true);
      setError(null);
      try {
        const found = await getMemberById(id);
        if (isMounted) {
          if (found) {
            setMember(found);
            // Charger les données 360° en parallèle
            const lookupKey = found.matricule || found.id;
            const [sk, srv, av, rel, nds] = await Promise.all([
              getMemberSkills(lookupKey),
              getMemberServices(lookupKey),
              getMemberAvailability(lookupKey),
              getMemberRelations(lookupKey),
              fetchMemberNeeds(lookupKey),
            ]);
            setSkills(sk);
            setServices(srv);
            setAvailability(av);
            if (av) {
              setAvailStatus(av.status);
              setAvailMentoring(av.open_for_mentoring);
              setAvailEvents(av.open_for_dahirah_events);
              setAvailProHelp(av.open_for_pro_help);
              setAvailVolunteer(av.open_for_volunteer);
              setAvailHours(av.weekly_hours_available || 4);
            }
            setRelations(rel);
            setNeeds(nds);
          } else {
            setError(`Fiche membre introuvable pour "${id}".`);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Erreur lors de la récupération de la fiche 360°.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [id]);

  // Chargement paresseux des référentiels pour les modals
  const ensureReferentials = async () => {
    if (availableSkillsList.length === 0) {
      const list = await getSkills();
      setAvailableSkillsList(list);
      if (list.length > 0 && !selectedSkillId) setSelectedSkillId(list[0].id);
    }
    if (servicesCatalogList.length === 0) {
      const cats = await getServicesCatalog();
      setServicesCatalogList(cats);
      if (cats.length > 0 && !serviceCatalogId) setServiceCatalogId(cats[0].id);
    }
  };

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member || !selectedSkillId) return;
    try {
      setActionError(null);
      await addMemberSkill({
        member: member.id,
        skill: selectedSkillId,
        level: skillLevel,
        years_experience: skillYears,
      });
      const updated = await getMemberSkills(member.matricule || member.id);
      setSkills(updated);
      setShowSkillModal(false);
      setActionSuccess('Compétence ajoutée avec succès.');
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setActionError(err.message || 'Impossible d’ajouter cette compétence.');
    }
  };

  const handleVerifySkill = async (skillAssocId: string) => {
    try {
      await verifyMemberSkill(skillAssocId);
      if (member) {
        const updated = await getMemberSkills(member.matricule || member.id);
        setSkills(updated);
        setActionSuccess('Compétence officiellement certifiée.');
        setTimeout(() => setActionSuccess(null), 4000);
      }
    } catch (err: any) {
      setActionError(err.message || 'Erreur lors de la validation.');
    }
  };

  const handleDeleteSkill = async (skillAssocId: string) => {
    try {
      await deleteMemberSkill(skillAssocId);
      if (member) {
        setSkills(skills.filter((s) => s.id !== skillAssocId));
      }
    } catch (err: any) {
      setActionError(err.message || 'Erreur suppression.');
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member || !serviceCatalogId || !serviceTitle) return;
    try {
      setActionError(null);
      await addMemberService({
        member: member.id,
        service: serviceCatalogId,
        title: serviceTitle,
        description: serviceDesc,
        service_type: serviceType,
        terms: serviceTerms || undefined,
        contact_mode: serviceContactMode,
      });
      const updated = await getMemberServices(member.matricule || member.id);
      setServices(updated);
      setShowServiceModal(false);
      setServiceTitle('');
      setServiceDesc('');
      setActionSuccess('Offre de service enregistrée avec succès.');
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setActionError(err.message || 'Erreur publication du service.');
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    try {
      await deleteMemberService(serviceId);
      setServices(services.filter((s) => s.id !== serviceId));
    } catch (err: any) {
      setActionError(err.message || 'Erreur suppression.');
    }
  };

  const handleSaveAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;
    try {
      setActionError(null);
      const saved = await saveMemberAvailability(availability?.id, {
        member: member.id,
        status: availStatus,
        open_for_mentoring: availMentoring,
        open_for_dahirah_events: availEvents,
        open_for_pro_help: availProHelp,
        open_for_volunteer: availVolunteer,
        weekly_hours_available: availHours,
      });
      setAvailability(saved);
      setShowAvailabilityModal(false);
      setActionSuccess('Statut de disponibilité mis à jour.');
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setActionError(err.message || 'Erreur mise à jour disponibilité.');
    }
  };

  const handleDeclareRelation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member || !relationTargetMatricule.trim()) return;
    try {
      setActionError(null);
      const target = await getMemberById(relationTargetMatricule.trim().toUpperCase());
      if (!target) throw new Error(`Membre cible "${relationTargetMatricule}" introuvable.`);

      await declareMemberRelation({
        from_member: member.id,
        to_member: target.id,
        relation_type: relationType,
        notes: relationNotes || undefined,
      });
      const updated = await getMemberRelations(member.matricule || member.id);
      setRelations(updated);
      setShowRelationModal(false);
      setRelationTargetMatricule('');
      setRelationNotes('');
      setActionSuccess('Relation déclarée. Elle apparaîtra une fois validée par un administrateur.');
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: any) {
      setActionError(err.message || 'Erreur lors de la déclaration du lien.');
    }
  };

  const handleApproveRelation = async (relId: string) => {
    try {
      await approveMemberRelation(relId);
      if (member) {
        const updated = await getMemberRelations(member.matricule || member.id);
        setRelations(updated);
        setActionSuccess('Relation approuvée avec succès.');
        setTimeout(() => setActionSuccess(null), 4000);
      }
    } catch (err: any) {
      setActionError(err.message || 'Erreur approbation.');
    }
  };

  const handleCreateNeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member || !needTitle) return;
    try {
      setActionError(null);
      const created = await createMemberNeed({
        member: member.id,
        title: needTitle,
        description: needDescription,
        need_type: needType,
        urgency_level: needUrgency,
        visibility_level: needVisibility,
        is_anonymous: needIsAnonymous,
      });
      if (created) {
        const lookupKey = member.matricule || member.id;
        const updated = await fetchMemberNeeds(lookupKey);
        setNeeds(updated);
        setShowNeedModal(false);
        setNeedTitle('');
        setNeedDescription('');
        setNeedIsAnonymous(false);
        setActionSuccess("Demande d'entraide formulée avec succès.");
        setTimeout(() => setActionSuccess(null), 4000);
      } else {
        setActionError("Erreur lors de l'enregistrement de la demande.");
      }
    } catch (err: any) {
      setActionError(err.message || "Erreur lors de l'enregistrement du besoin.");
    }
  };

  const handleResolveNeed = async (needId: string) => {
    try {
      setActionError(null);
      const resolved = await resolveMemberNeed(needId);
      if (resolved && member) {
        const lookupKey = member.matricule || member.id;
        const updated = await fetchMemberNeeds(lookupKey);
        setNeeds(updated);
        setActionSuccess('Demande marquée comme résolue (clôturée avec succès).');
        setTimeout(() => setActionSuccess(null), 4000);
      }
    } catch (err: any) {
      setActionError(err.message || 'Erreur lors de la résolution du besoin.');
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !member) return;

    if (file.size > 10 * 1024 * 1024) {
      setActionError('Le fichier dépasse la taille maximale autorisée de 10 Mo.');
      return;
    }

    try {
      setIsUploadingPhoto(true);
      setActionError(null);
      const res = await uploadMemberPhoto(member.matricule || member.id, file);
      setMember((prev) => (prev ? { ...prev, photo: res.photo_url } : null));
      setActionSuccess(t('photoUploadedSuccess'));
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setActionError(err.message || 'Erreur lors du téléversement de la photo.');
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handlePhotoDelete = async () => {
    if (!member) return;
    if (!window.confirm(t('confirm') || 'Confirmez-vous la suppression de la photo de profil ?')) return;

    try {
      setIsUploadingPhoto(true);
      setActionError(null);
      await deleteMemberPhoto(member.matricule || member.id);
      setMember((prev) => (prev ? { ...prev, photo: undefined } : null));
      setActionSuccess(t('photoDeletedSuccess'));
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setActionError(err.message || 'Erreur lors de la suppression de la photo.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-[#f2ca50] gap-3">
        <span className="material-symbols-outlined text-[40px] animate-spin">sync</span>
        <span className="text-xs text-[#9ca7b8] tracking-wide font-medium">Chargement du profil 360°...</span>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 rounded-2xl bg-[#151c28] border border-amber-500/30 text-center flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-amber-500/10 text-[#f2ca50] flex items-center justify-center">
          <span className="material-symbols-outlined text-[32px]">person_off</span>
        </div>
        <h2 className="font-headline-sm text-xl font-bold text-[#e5e9f2]">Fiche Non Trouvée</h2>
        <p className="text-xs text-[#9ca7b8]">{error || 'Le membre demandé n’existe pas dans les registres officiels.'}</p>
        <Link
          to="/members"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#242e40] text-[#f2ca50] font-semibold text-xs hover:bg-[#f2ca50] hover:text-slate-950 transition"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          <span>Retourner à l'Annuaire</span>
        </Link>
      </div>
    );
  }

  const primaryProf = member.professions?.[0];
  const isPhoneVisible = member.privacy?.showPhone === 'MEMBRES' || isAdmin || isOwner;
  const whatsappClean = member.telephone ? member.telephone.replace(/[^0-9]/g, '') : null;

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-12">
      
      {/* Messages Notifications */}
      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-fadeIn">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs flex items-center gap-2 animate-fadeIn">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{actionError}</span>
        </div>
      )}

      {/* Barre de Navigation Supérieure */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/members')}
          className="inline-flex items-center gap-1.5 text-xs text-[#9ca7b8] hover:text-[#f2ca50] transition font-medium"
        >
          <span className="material-symbols-outlined text-[17px]">arrow_back</span>
          <span>Annuaire communautaire</span>
        </button>

        <div className="flex items-center gap-2">
          <Link
            to="/network"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#242e40] text-[#bfcfed] hover:text-[#f2ca50] text-xs font-semibold border border-[#2b3547] transition"
          >
            <span className="material-symbols-outlined text-[16px]">hub</span>
            <span>Carrefour Entraide</span>
          </Link>
          {canEdit && (
            <Link
              to={`/members/${member.matricule || member.id}/edit`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#f2ca50] text-slate-950 text-xs font-bold shadow-md hover:brightness-110 transition"
            >
              <span className="material-symbols-outlined text-[16px]">edit</span>
              <span>Modifier la Fiche</span>
            </Link>
          )}
        </div>
      </div>

      {/* 1. CARTE D'IDENTITÉ 360° SOUVERAINE */}
      <div className="rounded-2xl bg-[#151c28]/95 border border-[#2b3547]/80 shadow-2xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#f2ca50]/70 to-transparent"></div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pb-6 border-b border-[#2b3547]/40">
          <div className="relative group shrink-0">
            <MemberAvatar
              size="hero"
              photoUrl={member.photo}
              name={`${member.prenom} ${member.nom}`}
              matricule={member.matricule}
              className="shadow-2xl border-2 border-[#f2ca50]/40 ring-4 ring-[#111722]"
            />
            <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full ring-2 ring-[#151c28] z-10 ${
              availability?.status === 'AVAILABLE' ? 'bg-emerald-500' :
              availability?.status === 'LIMITED' ? 'bg-amber-500' : 'bg-slate-500'
            }`}></span>

            {canEdit && (
              <div className="absolute inset-0 rounded-2xl bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 z-20">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="p-2 rounded-xl bg-[#f2ca50] text-slate-950 hover:brightness-110 shadow-md transition cursor-pointer"
                  title={t('uploadPhotoBtn')}
                >
                  <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                </button>
                {member.photo && (
                  <button
                    type="button"
                    onClick={handlePhotoDelete}
                    disabled={isUploadingPhoto}
                    className="p-2 rounded-xl bg-red-600 text-white hover:bg-red-500 shadow-md transition cursor-pointer"
                    title={t('deletePhotoBtn')}
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                )}
              </div>
            )}

            {isUploadingPhoto && (
              <div className="absolute inset-0 rounded-2xl bg-black/75 flex flex-col items-center justify-center z-30">
                <span className="material-symbols-outlined text-[#f2ca50] text-[24px] animate-spin">sync</span>
                <span className="text-[10px] text-[#f2ca50] font-bold mt-1">{t('uploadingPhoto')}</span>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>

          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-[#f2ca50]/15 border border-[#f2ca50]/30 text-[#f2ca50] text-xs font-mono font-bold tracking-wider ltr-tech">
                {member.matricule}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                {tControlled('member_status', member.statutCompte) || 'ACTIF'}
              </span>
              {availability && availability.status !== 'NOT_SPECIFIED' && (
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                  availability.status === 'AVAILABLE'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                }`}>
                  {availability.status === 'AVAILABLE' ? 'Disponible pour entraide' : 'Disponibilité partielle'}
                </span>
              )}
            </div>

            <h1 className="font-headline-lg text-2xl sm:text-3xl font-semibold text-[#e5e9f2] tracking-tight">
              {member.prenom} {member.nom}
            </h1>

            {member.nomArabe && (
              <span className="font-headline-md text-lg text-[#f2ca50] mt-0.5 font-normal">
                {member.nomArabe}
              </span>
            )}
          </div>

          {/* Bouton Contact Rapide WhatsApp si consenti */}
          {isPhoneVisible && member.telephone && (
            <div className="mt-2 sm:mt-0">
              <a
                href={`https://wa.me/${whatsappClean}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition shadow-sm"
              >
                <span className="material-symbols-outlined text-[17px]">chat</span>
                <span>Échanger sur WhatsApp</span>
              </a>
            </div>
          )}
        </div>

        {/* Grille 360° en 2 colonnes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
          
          {/* Section A : Situation Civile & Activité Professionnelle */}
          <div className="space-y-4 p-5 rounded-xl bg-[#111722]/80 border border-[#2b3547]/40">
            <h3 className="font-headline-sm text-sm font-semibold text-[#f2ca50] flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">work</span>
              Activité Professionnelle &amp; Statut
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-[#2b3547]/20">
                <span className="text-[#9ca7b8]">Situation :</span>
                <span className="font-medium text-[#e5e9f2]">{tControlled('situation', member.situation) || member.situation || 'Non précisé'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#2b3547]/20">
                <span className="text-[#9ca7b8]">Profession :</span>
                <span className="font-medium text-[#e5e9f2]">{primaryProf?.metier || member.professionActuelle || 'Adhérent'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#2b3547]/20">
                <span className="text-[#9ca7b8]">Entreprise / Organisation :</span>
                <span className="font-medium text-[#e5e9f2]">{primaryProf?.activite || 'Indépendant / Non précisé'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#9ca7b8]">Secteur :</span>
                <span className="font-medium text-[#f2ca50]">{primaryProf?.secteur || 'Secteur général'}</span>
              </div>
            </div>
          </div>

          {/* Section B : Coordonnées avec Consentement */}
          <div className="space-y-4 p-5 rounded-xl bg-[#111722]/80 border border-[#2b3547]/40">
            <h3 className="font-headline-sm text-sm font-semibold text-[#f2ca50] flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">contact_phone</span>
              Coordonnées &amp; Localisation
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-[#2b3547]/20">
                <span className="text-[#9ca7b8]">Téléphone :</span>
                <span className="font-medium text-[#e5e9f2] font-mono">
                  {isPhoneVisible && member.telephone ? (
                    member.telephone
                  ) : (
                    <span className="text-[#788294] italic flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">lock</span>
                      Coordonnée protégée (Admin uniquement)
                    </span>
                  )}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#2b3547]/20">
                <span className="text-[#9ca7b8]">Courriel :</span>
                <span className="font-medium text-[#e5e9f2]">
                  {member.email ? member.email : <span className="text-[#788294] italic">Non renseigné</span>}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#2b3547]/20">
                <span className="text-[#9ca7b8]">Ville / Pôle :</span>
                <span className="font-medium text-[#e5e9f2]">{member.ville || 'Dakar'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#9ca7b8]">Pays :</span>
                <span className="font-medium text-[#e5e9f2]">{member.pays || 'Sénégal'}</span>
              </div>
            </div>
          </div>

          {/* Section C : Formations & Cursus Académique (Étudiants & Cadres) */}
          <div className="p-5 rounded-xl bg-[#111722]/80 border border-[#2b3547]/40 md:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-sm text-sm font-semibold text-[#f2ca50] flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">school</span>
                Formations &amp; Cursus Académique ({member.formations?.length || 0})
              </h3>
            </div>

            {!member.formations || member.formations.length === 0 ? (
              <p className="text-xs text-[#9ca7b8] italic">Aucune formation académique ou coranique renseignée pour le moment.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                {member.formations.map((form) => (
                  <div key={form.id} className="p-3.5 rounded-xl bg-[#151c28] border border-[#2b3547]/60 flex flex-col justify-between gap-2 text-xs">
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-[#e5e9f2] truncate">{form.diplome || form.niveau || 'Formation'}</span>
                        {form.annee && (
                          <span className="px-2 py-0.5 rounded bg-[#242e40] text-[10px] text-[#f2ca50] font-mono ltr-tech font-bold">
                            {form.annee}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#f2ca50] mt-0.5">{form.domaine || 'Domaine général'}</p>
                    </div>

                    <div className="flex items-center gap-1.5 pt-2 border-t border-[#2b3547]/30 text-[11px] text-[#9ca7b8]">
                      <span className="material-symbols-outlined text-[14px] text-sky-400">account_balance</span>
                      <span className="truncate">{form.etablissement || 'Établissement non précisé'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section D : Savoir-Faire & Compétences */}
          <div className="p-5 rounded-xl bg-[#111722]/80 border border-[#2b3547]/40 md:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-sm text-sm font-semibold text-[#f2ca50] flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">psychology</span>
                Compétences &amp; Expertises ({skills.length})
              </h3>
              {canEdit && (
                <button
                  onClick={() => {
                    ensureReferentials();
                    setShowSkillModal(true);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#242e40] hover:bg-[#f2ca50] hover:text-slate-950 text-xs font-semibold text-[#f2ca50] transition"
                >
                  <span className="material-symbols-outlined text-[15px]">add</span>
                  <span>Ajouter</span>
                </button>
              )}
            </div>

            {skills.length === 0 ? (
              <p className="text-xs text-[#9ca7b8] italic">Aucune compétence spécifique déclarée pour le moment.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                {skills.map((ms) => (
                  <div key={ms.id} className="p-3.5 rounded-xl bg-[#151c28] border border-[#2b3547]/60 flex flex-col justify-between gap-2 text-xs">
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-[#e5e9f2] truncate">{ms.skill_name}</span>
                        {ms.is_verified ? (
                          <span className="material-symbols-outlined text-emerald-400 text-[16px]" title="Vérifié par l'administration">
                            verified
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#9ca7b8] italic">Déclaratif</span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#f2ca50] mt-0.5">{ms.level_display}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#2b3547]/30 text-[11px]">
                      <span className="text-[#9ca7b8]">{ms.years_experience ? `${ms.years_experience} ans exp.` : 'Exp. pratique'}</span>
                      <div className="flex items-center gap-1">
                        {isAdmin && !ms.is_verified && (
                          <button
                            onClick={() => handleVerifySkill(ms.id)}
                            className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 font-bold transition"
                            title="Certifier cette compétence"
                          >
                            Certifier
                          </button>
                        )}
                        {canEdit && (
                          <button
                            onClick={() => handleDeleteSkill(ms.id)}
                            className="text-[#9ca7b8] hover:text-red-400 p-1"
                            title="Retirer"
                          >
                            <span className="material-symbols-outlined text-[15px]">delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section D : Services Proposés & Entraide */}
          <div className="p-5 rounded-xl bg-[#111722]/80 border border-[#2b3547]/40 md:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-sm text-sm font-semibold text-[#f2ca50] flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">handshake</span>
                Services &amp; Entraide Communautaire ({services.length})
              </h3>
              {canEdit && (
                <button
                  onClick={() => {
                    ensureReferentials();
                    setShowServiceModal(true);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#242e40] hover:bg-[#f2ca50] hover:text-slate-950 text-xs font-semibold text-[#f2ca50] transition"
                >
                  <span className="material-symbols-outlined text-[15px]">add</span>
                  <span>Proposer un service</span>
                </button>
              )}
            </div>

            {services.length === 0 ? (
              <p className="text-xs text-[#9ca7b8] italic">Aucune offre de service ou de mentorat publiée pour le moment.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {services.map((srv) => (
                  <div key={srv.id} className="p-4 rounded-xl bg-[#151c28] border border-[#2b3547]/60 flex flex-col justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-[#e5e9f2] text-sm leading-snug">{srv.title}</h4>
                        <span className="px-2 py-0.5 rounded-full bg-[#f2ca50]/15 text-[#f2ca50] font-bold text-[10px] whitespace-nowrap">
                          {srv.service_type_display}
                        </span>
                      </div>
                      <p className="text-[#9ca7b8] text-xs mt-1.5 line-clamp-3">{srv.description}</p>
                    </div>

                    <div className="pt-2.5 border-t border-[#2b3547]/30 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <span className="material-symbols-outlined text-[14px]">call</span>
                        <span>Mode : {srv.contact_mode_display}</span>
                      </div>
                      {canEdit && (
                        <button
                          onClick={() => handleDeleteService(srv.id)}
                          className="text-[#9ca7b8] hover:text-red-400 p-1"
                          title="Supprimer l'offre"
                        >
                          <span className="material-symbols-outlined text-[15px]">delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section E : Disponibilité & Engagements */}
          <div className="p-5 rounded-xl bg-[#111722]/80 border border-[#2b3547]/40 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-sm text-sm font-semibold text-[#f2ca50] flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">event_available</span>
                Disponibilité &amp; Mobilisation
              </h3>
              {canEdit && (
                <button
                  onClick={() => setShowAvailabilityModal(true)}
                  className="text-xs text-[#f2ca50] hover:underline font-semibold"
                >
                  Ajuster
                </button>
              )}
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-[#2b3547]/20">
                <span className="text-[#9ca7b8]">Statut :</span>
                <span className="font-semibold text-[#e5e9f2]">
                  {availability?.status_display || 'Non renseigné'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#2b3547]/20">
                <span className="text-[#9ca7b8]">Mentorat étudiants :</span>
                <span className={availability?.open_for_mentoring ? 'text-emerald-400 font-bold' : 'text-[#788294]'}>
                  {availability?.open_for_mentoring ? 'Oui (Actif)' : 'Non'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#2b3547]/20">
                <span className="text-[#9ca7b8]">Événements Dahirah :</span>
                <span className={availability?.open_for_dahirah_events ? 'text-emerald-400 font-bold' : 'text-[#788294]'}>
                  {availability?.open_for_dahirah_events ? 'Oui (Mobilisable)' : 'Non'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-[#9ca7b8]">Conseil Pro :</span>
                <span className={availability?.open_for_pro_help ? 'text-emerald-400 font-bold' : 'text-[#788294]'}>
                  {availability?.open_for_pro_help ? 'Oui (Disponible)' : 'Non'}
                </span>
              </div>
            </div>
          </div>

          {/* Section F : Ancrage Dahirah & Réseau Relationnel */}
          <div className="p-5 rounded-xl bg-[#111722]/80 border border-[#2b3547]/40 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-sm text-sm font-semibold text-[#f2ca50] flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">group</span>
                Réseau &amp; Relations ({relations.length})
              </h3>
              {canEdit && (
                <button
                  onClick={() => setShowRelationModal(true)}
                  className="text-xs text-[#f2ca50] hover:underline font-semibold"
                >
                  + Déclarer lien
                </button>
              )}
            </div>

            {relations.length === 0 ? (
              <p className="text-xs text-[#9ca7b8] italic">Aucun parrainage ou lien formel enregistré.</p>
            ) : (
              <div className="space-y-2 pt-1 text-xs">
                {relations.map((rel) => (
                  <div key={rel.id} className="p-2.5 rounded-lg bg-[#151c28] border border-[#2b3547]/50 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-[#e5e9f2]">
                        {rel.to_member_matricule === member.matricule ? rel.from_member_name : rel.to_member_name}
                      </span>
                      <p className="text-[11px] text-[#f2ca50]">{rel.relation_type_display}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        rel.status === 'APPROVED' ? 'bg-emerald-500/15 text-emerald-400' :
                        rel.status === 'PENDING' ? 'bg-amber-500/15 text-amber-300' : 'bg-red-500/15 text-red-400'
                      }`}>
                        {rel.status_display}
                      </span>
                      {isAdmin && rel.status === 'PENDING' && (
                        <button
                          onClick={() => handleApproveRelation(rel.id)}
                          className="px-2 py-0.5 rounded bg-emerald-500 text-slate-950 font-bold text-[10px]"
                        >
                          Valider
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section G : Besoins & Demandes d'Entraide */}
          <div className="p-5 rounded-xl bg-[#111722]/80 border border-[#2b3547]/40 md:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-sm text-sm font-semibold text-[#f2ca50] flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">handshake</span>
                Besoins &amp; Demandes d'Entraide ({needs.length})
              </h3>
              {canEdit && (
                <button
                  onClick={() => setShowNeedModal(true)}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#242e40] hover:bg-[#f2ca50] hover:text-slate-950 text-xs font-semibold text-[#f2ca50] transition"
                >
                  <span className="material-symbols-outlined text-[15px]">add</span>
                  <span>Exprimer un besoin</span>
                </button>
              )}
            </div>

            {needs.length === 0 ? (
              <p className="text-xs text-[#9ca7b8] italic">Aucune demande d'entraide ou de mise en relation active.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {needs.map((nd) => (
                  <div
                    key={nd.id}
                    className="p-3.5 rounded-xl bg-[#151c28] border border-[#2b3547]/60 flex flex-col justify-between gap-2.5 text-xs"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-[#e5e9f2] text-sm leading-snug">{nd.title}</h4>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            nd.urgency_level === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                            nd.urgency_level === 'HIGH' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                            'bg-blue-500/15 text-blue-300'
                          }`}>
                            {nd.urgency_level_display || nd.urgency_level}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            nd.status === 'RESOLVED' ? 'bg-emerald-500/20 text-emerald-400' :
                            nd.status === 'IN_PROGRESS' ? 'bg-indigo-500/20 text-indigo-300' :
                            nd.status === 'CANCELLED' || nd.status === 'EXPIRED' ? 'bg-slate-500/20 text-slate-400' :
                            'bg-[#f2ca50]/15 text-[#f2ca50]'
                          }`}>
                            {nd.status_display || nd.status}
                          </span>
                        </div>
                      </div>

                      <p className="text-[#9ca7b8] text-xs leading-relaxed">{nd.description}</p>

                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-[#788294]">
                        <span className="px-1.5 py-0.5 rounded bg-[#111722] border border-[#2b3547]/40 text-[#f2ca50]">
                          {nd.need_type_display || nd.need_type}
                        </span>
                        {nd.is_anonymous && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 font-medium">
                            <span className="material-symbols-outlined text-[12px]">visibility_off</span>
                            Anonymat préservé
                          </span>
                        )}
                        {nd.created_at && (
                          <span>Publié le {new Date(nd.created_at).toLocaleDateString('fr-FR')}</span>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#2b3547]/30 flex items-center justify-between">
                      <span className="text-[11px] text-[#9ca7b8]">
                        {nd.status === 'RESOLVED' && nd.resolved_at ? (
                          <span className="text-emerald-400 font-medium">
                            Résolu le {new Date(nd.resolved_at).toLocaleDateString('fr-FR')}
                          </span>
                        ) : (
                          `Visibilité : ${nd.visibility_level_display || nd.visibility_level}`
                        )}
                      </span>
                      {canEdit && (nd.status === 'OPEN' || nd.status === 'IN_PROGRESS') && (
                        <button
                          onClick={() => handleResolveNeed(nd.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 text-[11px] font-semibold transition"
                        >
                          <span className="material-symbols-outlined text-[13px]">check_circle</span>
                          <span>Marquer résolu</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* MODAL 1 : AJOUT DE COMPÉTENCE */}
      {showSkillModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#151c28] border border-[#2b3547] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-headline-sm text-base font-bold text-[#e5e9f2]">Ajouter une Compétence</h3>
            <form onSubmit={handleAddSkill} className="space-y-4 text-xs">
              <div>
                <label className="text-[#9ca7b8] font-medium block mb-1">Compétence de référence</label>
                <select
                  value={selectedSkillId}
                  onChange={(e) => setSelectedSkillId(e.target.value)}
                  className="w-full bg-[#111722] border border-[#2b3547] rounded-xl p-2.5 text-[#e5e9f2]"
                >
                  {availableSkillsList.map((sk) => (
                    <option key={sk.id} value={sk.id}>{sk.name} ({sk.category_name})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[#9ca7b8] font-medium block mb-1">Niveau de maîtrise</label>
                <select
                  value={skillLevel}
                  onChange={(e) => setSkillLevel(e.target.value as any)}
                  className="w-full bg-[#111722] border border-[#2b3547] rounded-xl p-2.5 text-[#e5e9f2]"
                >
                  <option value="BEGINNER">Débutant / Notions</option>
                  <option value="INTERMEDIATE">Intermédiaire / Pratiquant</option>
                  <option value="ADVANCED">Avancé / Confirmé</option>
                  <option value="EXPERT">Expert / Référent</option>
                </select>
              </div>

              <div>
                <label className="text-[#9ca7b8] font-medium block mb-1">Années d'expérience</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={skillYears}
                  onChange={(e) => setSkillYears(Number(e.target.value))}
                  className="w-full bg-[#111722] border border-[#2b3547] rounded-xl p-2.5 text-[#e5e9f2]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSkillModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#242e40] text-[#9ca7b8] hover:text-[#e5e9f2]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#f2ca50] text-slate-950 font-bold"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2 : AJOUT DE SERVICE */}
      {showServiceModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#151c28] border border-[#2b3547] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-headline-sm text-base font-bold text-[#e5e9f2]">Proposer un Service ou Entraide</h3>
            <form onSubmit={handleAddService} className="space-y-3.5 text-xs">
              <div>
                <label className="text-[#9ca7b8] font-medium block mb-1">Type de service</label>
                <select
                  value={serviceCatalogId}
                  onChange={(e) => setServiceCatalogId(e.target.value)}
                  className="w-full bg-[#111722] border border-[#2b3547] rounded-xl p-2.5 text-[#e5e9f2]"
                >
                  {servicesCatalogList.map((sc) => (
                    <option key={sc.id} value={sc.id}>{sc.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[#9ca7b8] font-medium block mb-1">Titre de l'offre</label>
                <input
                  type="text"
                  required
                  value={serviceTitle}
                  onChange={(e) => setServiceTitle(e.target.value)}
                  placeholder="Ex: Soutien scolaire en mathématiques ou Réparation..."
                  className="w-full bg-[#111722] border border-[#2b3547] rounded-xl p-2.5 text-[#e5e9f2]"
                />
              </div>

              <div>
                <label className="text-[#9ca7b8] font-medium block mb-1">Modalité</label>
                <select
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value as any)}
                  className="w-full bg-[#111722] border border-[#2b3547] rounded-xl p-2.5 text-[#e5e9f2]"
                >
                  <option value="VOLUNTEER">Entraide Communautaire & Bénévolat</option>
                  <option value="DAHIRAH_RATE">Prestation Pro (Tarif Préférentiel Dahirah)</option>
                  <option value="MENTORSHIP">Mentorat & Partage d’expérience</option>
                  <option value="STANDARD">Prestation Commerciale Standard</option>
                </select>
              </div>

              <div>
                <label className="text-[#9ca7b8] font-medium block mb-1">Mode de contact souhaité</label>
                <select
                  value={serviceContactMode}
                  onChange={(e) => setServiceContactMode(e.target.value as any)}
                  className="w-full bg-[#111722] border border-[#2b3547] rounded-xl p-2.5 text-[#e5e9f2]"
                >
                  <option value="INTERNAL_MESSAGE">Message interne (Coordonnées protégées)</option>
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="PHONE">Appel téléphonique</option>
                  <option value="OTHER">Autre</option>
                </select>
              </div>

              <div>
                <label className="text-[#9ca7b8] font-medium block mb-1">Description</label>
                <textarea
                  required
                  rows={3}
                  value={serviceDesc}
                  onChange={(e) => setServiceDesc(e.target.value)}
                  placeholder="Précisez votre prestation ou accompagnement..."
                  className="w-full bg-[#111722] border border-[#2b3547] rounded-xl p-2.5 text-[#e5e9f2]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowServiceModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#242e40] text-[#9ca7b8] hover:text-[#e5e9f2]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#f2ca50] text-slate-950 font-bold"
                >
                  Publier l'Offre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3 : DISPONIBILITÉ */}
      {showAvailabilityModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#151c28] border border-[#2b3547] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-headline-sm text-base font-bold text-[#e5e9f2]">Ajuster la Disponibilité</h3>
            <form onSubmit={handleSaveAvailability} className="space-y-4 text-xs">
              <div>
                <label className="text-[#9ca7b8] font-medium block mb-1">Statut global</label>
                <select
                  value={availStatus}
                  onChange={(e) => setAvailStatus(e.target.value)}
                  className="w-full bg-[#111722] border border-[#2b3547] rounded-xl p-2.5 text-[#e5e9f2]"
                >
                  <option value="NOT_SPECIFIED">Non renseigné</option>
                  <option value="AVAILABLE">Disponible</option>
                  <option value="LIMITED">Disponibilité partielle</option>
                  <option value="BUSY">Très peu disponible</option>
                  <option value="UNAVAILABLE">Non disponible actuellement</option>
                </select>
              </div>

              <div className="space-y-2 pt-2 border-t border-[#2b3547]/40">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={availMentoring}
                    onChange={(e) => setAvailMentoring(e.target.checked)}
                    className="rounded text-[#f2ca50]"
                  />
                  <span>Ouvert au mentorat d’étudiants &amp; élèves</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={availEvents}
                    onChange={(e) => setAvailEvents(e.target.checked)}
                    className="rounded text-[#f2ca50]"
                  />
                  <span>Mobilisable pour événements Dahirah</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={availProHelp}
                    onChange={(e) => setAvailProHelp(e.target.checked)}
                    className="rounded text-[#f2ca50]"
                  />
                  <span>Disponible pour conseil pro entre disciples</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAvailabilityModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#242e40] text-[#9ca7b8] hover:text-[#e5e9f2]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#f2ca50] text-slate-950 font-bold"
                >
                  Mettre à jour
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4 : DÉCLARER RELATION */}
      {showRelationModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#151c28] border border-[#2b3547] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-headline-sm text-base font-bold text-[#e5e9f2]">Déclarer un Lien Relationnel</h3>
            <form onSubmit={handleDeclareRelation} className="space-y-4 text-xs">
              <div>
                <label className="text-[#9ca7b8] font-medium block mb-1">Matricule ou identifiant de l'autre membre</label>
                <input
                  type="text"
                  required
                  value={relationTargetMatricule}
                  onChange={(e) => setRelationTargetMatricule(e.target.value)}
                  placeholder="Ex: DAMF-0001"
                  className="w-full bg-[#111722] border border-[#2b3547] rounded-xl p-2.5 text-[#e5e9f2]"
                />
              </div>

              <div>
                <label className="text-[#9ca7b8] font-medium block mb-1">Nature de la relation</label>
                <select
                  value={relationType}
                  onChange={(e) => setRelationType(e.target.value as any)}
                  className="w-full bg-[#111722] border border-[#2b3547] rounded-xl p-2.5 text-[#e5e9f2]"
                >
                  <option value="SPONSOR">Parrain / Marraine d’intégration</option>
                  <option value="MENTOR">Mentor / Accompagnateur</option>
                  <option value="COLLABORATOR">Collaborateur / Associé</option>
                  <option value="FRATERNAL">Lien Fraternel / Recommandation</option>
                </select>
              </div>

              <div>
                <label className="text-[#9ca7b8] font-medium block mb-1">Précisions (optionnel)</label>
                <input
                  type="text"
                  value={relationNotes}
                  onChange={(e) => setRelationNotes(e.target.value)}
                  placeholder="Contexte ou commission de parrainage..."
                  className="w-full bg-[#111722] border border-[#2b3547] rounded-xl p-2.5 text-[#e5e9f2]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRelationModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#242e40] text-[#9ca7b8] hover:text-[#e5e9f2]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#f2ca50] text-slate-950 font-bold"
                >
                  Déclarer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5 : EXPRIMER UN BESOIN */}
      {showNeedModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#151c28] border border-[#2b3547] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-headline-sm text-base font-bold text-[#e5e9f2]">Exprimer un Besoin / Entraide</h3>
            <form onSubmit={handleCreateNeed} className="space-y-4 text-xs">
              <div>
                <label className="text-[#9ca7b8] font-medium block mb-1">Intitulé de la demande *</label>
                <input
                  type="text"
                  required
                  value={needTitle}
                  onChange={(e) => setNeedTitle(e.target.value)}
                  placeholder="Ex: Recherche stage juriste, Appui matériel..."
                  className="w-full bg-[#111722] border border-[#2b3547] rounded-xl p-2.5 text-[#e5e9f2]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#9ca7b8] font-medium block mb-1">Nature du besoin</label>
                  <select
                    value={needType}
                    onChange={(e) => setNeedType(e.target.value)}
                    className="w-full bg-[#111722] border border-[#2b3547] rounded-xl p-2.5 text-[#e5e9f2]"
                  >
                    <option value="EMPLOYMENT">Emploi &amp; Recrutement</option>
                    <option value="INTERNSHIP">Stage &amp; Alternance</option>
                    <option value="MENTORSHIP">Mentorat &amp; Conseil</option>
                    <option value="BUSINESS_PARTNER">Partenariat d'affaires</option>
                    <option value="SERVICE_REQUEST">Demande de prestation</option>
                    <option value="SOLIDARITY">Solidarité &amp; Entraide</option>
                    <option value="OTHER">Autre démarche</option>
                  </select>
                </div>

                <div>
                  <label className="text-[#9ca7b8] font-medium block mb-1">Degré d'urgence</label>
                  <select
                    value={needUrgency}
                    onChange={(e) => setNeedUrgency(e.target.value as any)}
                    className="w-full bg-[#111722] border border-[#2b3547] rounded-xl p-2.5 text-[#e5e9f2]"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">Prioritaire / Urgent</option>
                    <option value="CRITICAL">Critique / Vital</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[#9ca7b8] font-medium block mb-1">Visibilité de la demande</label>
                <select
                  value={needVisibility}
                  onChange={(e) => setNeedVisibility(e.target.value as any)}
                  className="w-full bg-[#111722] border border-[#2b3547] rounded-xl p-2.5 text-[#e5e9f2]"
                >
                  <option value="INTERNAL">Membres de la Dahirah</option>
                  <option value="RESTRICTED_ADMIN">Direction &amp; Admins uniquement</option>
                </select>
              </div>

              <div>
                <label className="text-[#9ca7b8] font-medium block mb-1">Description détaillée *</label>
                <textarea
                  required
                  rows={3}
                  value={needDescription}
                  onChange={(e) => setNeedDescription(e.target.value)}
                  placeholder="Précisez les attentes, les critères ou les démarches..."
                  className="w-full bg-[#111722] border border-[#2b3547] rounded-xl p-2.5 text-[#e5e9f2]"
                />
              </div>

              <div className="p-3 rounded-xl bg-[#111722] border border-[#2b3547]/60">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={needIsAnonymous}
                    onChange={(e) => setNeedIsAnonymous(e.target.checked)}
                    className="mt-0.5 rounded text-[#f2ca50]"
                  />
                  <span className="text-[11px] text-[#9ca7b8]">
                    <strong className="text-[#e5e9f2] block">Préserver l'anonymat face aux pairs</strong>
                    Votre identité ne sera visible que par les administrateurs pour traitement bienveillant et discret.
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNeedModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#242e40] text-[#9ca7b8] hover:text-[#e5e9f2]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#f2ca50] text-slate-950 font-bold"
                >
                  Publier la Demande
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
