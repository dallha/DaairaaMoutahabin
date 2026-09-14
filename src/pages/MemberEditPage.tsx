import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getMemberById, updateMember } from '../services/memberService';
import { useAuth } from '../context/AuthContext';
import { Member, Gender, SituationType } from '../types';
import { useTranslation } from '../i18n/translations';

export const MemberEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentLang = localStorage.getItem('app_lang') || 'fr';
  const { t, tControlled } = useTranslation(currentLang);

  const [member, setMember] = useState<Member | null>(null);
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [nomArabe, setNomArabe] = useState('');
  const [sexe, setSexe] = useState<Gender>('M');
  const [situation, setSituation] = useState<SituationType>('SALARIE');
  const [profession, setProfession] = useState('');
  const [telephone, setTelephone] = useState('');
  const [email, setEmail] = useState('');
  const [ville, setVille] = useState('');
  const [pays, setPays] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
            setPrenom(found.prenom || '');
            setNom(found.nom || '');
            setNomArabe(found.nomArabe || '');
            setSexe(found.sexe || 'M');
            setSituation(found.situation || 'SALARIE');
            setProfession(found.professionActuelle || '');
            setTelephone(found.telephone || '');
            setEmail(found.email || '');
            setVille(found.ville || 'Dakar');
            setPays(found.pays || 'Sénégal');
          } else {
            setError('Membre introuvable.');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Erreur de chargement.');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const payload: Partial<Member> = {
        prenom,
        nom,
        nomArabe: nomArabe || undefined,
        sexe,
        situation,
        professionActuelle: profession || undefined,
        telephone: telephone || undefined,
        email: email || undefined,
        ville,
        pays,
      };

      await updateMember(member.id, payload);
      navigate(`/members/${member.matricule || member.id}`, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-[#f2ca50] gap-3">
        <span className="material-symbols-outlined text-[36px] animate-spin">refresh</span>
        <span className="text-sm text-[#9ca7b8]">{t('loadingSheet')}</span>
      </div>
    );
  }

  const isSuperAdmin = user?.role === 'superadmin';
  const isAdmin = user?.role === 'admin' || isSuperAdmin;
  const isOwner = Boolean(
    member && user && (
      (user.email && member.email && user.email.toLowerCase() === member.email.toLowerCase()) ||
      (user.member_id && (String(user.member_id) === String(member.id) || String(user.member_id) === String(member.matricule)))
    )
  );
  const canEdit = isAdmin || isOwner;

  if (member && !canEdit) {
    return (
      <div className="p-8 max-w-xl mx-auto my-12 rounded-2xl bg-[#151c28] border border-red-500/30 text-center flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center">
          <span className="material-symbols-outlined text-[32px]">shield_person</span>
        </div>
        <h2 className="font-headline-sm text-xl font-bold text-[#e5e9f2]">{t('restrictedAccessTitle')}</h2>
        <p className="text-xs text-[#9ca7b8] max-w-md">
          {t('restrictedAccessDesc')}
        </p>
        <Link
          to={`/members/${id}`}
          className="px-5 py-2 rounded-xl bg-[#242e40] hover:bg-[#f2ca50] hover:text-slate-950 text-[#f2ca50] text-xs font-semibold transition"
        >
          {t('backToSheet')}
        </Link>
      </div>
    );
  }

  const isInstitutional = Boolean(
    member?.isFounder || member?.isPresident || 
    member?.institutionalRoleCode === 'FOUNDER' || member?.institutionalRoleCode === 'PRESIDENT'
  );
  const institutionalRoleLabel = member?.isFounder || member?.institutionalRoleCode === 'FOUNDER'
    ? t('founderBadge')
    : (member?.isPresident || member?.institutionalRoleCode === 'PRESIDENT')
      ? t('presidentBadge')
      : '';

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      
      {/* Navigation retour */}
      <div className="flex items-center justify-between">
        <Link
          to={`/members/${id}`}
          className="inline-flex items-center gap-1.5 text-xs text-[#9ca7b8] hover:text-[#f2ca50] transition font-medium"
        >
          <span className="material-symbols-outlined text-[17px]">arrow_back</span>
          <span>{t('backToSheet')}</span>
        </Link>
      </div>

      {/* Formulaire Card */}
      <div className="rounded-2xl bg-[#151c28]/95 border border-[#2b3547]/80 shadow-2xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#f2ca50]/70 to-transparent"></div>

        <div className="mb-6 pb-4 border-b border-[#2b3547]/40">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-[#f2ca50] text-[24px]">edit</span>
            <h1 className="font-headline-lg text-2xl font-semibold text-[#e5e9f2]">
              {t('editSheetTitle')} : <span className="font-mono ltr-tech">{member?.matricule}</span>
            </h1>
          </div>
          <p className="text-xs text-[#9ca7b8]">
            {t('editSheetSubtitle')}
          </p>
        </div>

        {/* Bannière de protection institutionnelle si rôle souverain */}
        {isInstitutional && (
          <div className="mb-5 p-3.5 rounded-xl bg-[#c8a44d]/10 border border-[#c8a44d]/30 text-[#f2ca50] text-xs flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[20px] text-[#c8a44d] shrink-0">workspace_premium</span>
            <span>
              {t('institutionalRoleProtectedNotice', { role: institutionalRoleLabel })}
            </span>
          </div>
        )}

        {!isAdmin && isOwner && (
          <div className="mb-5 p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[20px] text-blue-400 shrink-0">badge</span>
            <span>
              {t('personalSheetEditNotice')}
            </span>
          </div>
        )}

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          
          {/* Identité */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#f2ca50]">{t('civilIdentity')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#9ca7b8]">{t('firstNameLabel')} *</label>
                <input
                  type="text"
                  required
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  className="bg-[#06090e] border border-[#2b3547] rounded-xl px-3.5 py-2.5 text-xs text-[#e5e9f2] outline-none focus:border-[#f2ca50]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#9ca7b8]">{t('lastNameLabel')} *</label>
                <input
                  type="text"
                  required
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  className="bg-[#06090e] border border-[#2b3547] rounded-xl px-3.5 py-2.5 text-xs text-[#e5e9f2] outline-none focus:border-[#f2ca50]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#9ca7b8]">{t('arabicNameLabel')}</label>
                <input
                  type="text"
                  value={nomArabe}
                  onChange={(e) => setNomArabe(e.target.value)}
                  dir="rtl"
                  className="bg-[#06090e] border border-[#2b3547] rounded-xl px-3.5 py-2.5 text-xs text-[#e5e9f2] outline-none focus:border-[#f2ca50]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#9ca7b8]">{t('genderLabel')} *</label>
                <select
                  value={sexe}
                  onChange={(e) => setSexe(e.target.value as Gender)}
                  className="bg-[#06090e] border border-[#2b3547] rounded-xl px-3.5 py-2.5 text-xs text-[#e5e9f2] outline-none focus:border-[#f2ca50]"
                >
                  <option value="M">{tControlled('gender', 'M')}</option>
                  <option value="F">{tControlled('gender', 'F')}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Coordonnées */}
          <div className="space-y-4 pt-4 border-t border-[#2b3547]/30">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#f2ca50]">{t('contactsAndLocationSection')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#9ca7b8]">{t('phoneFieldLabel')}</label>
                <input
                  type="text"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  className="bg-[#06090e] border border-[#2b3547] rounded-xl px-3.5 py-2.5 text-xs text-[#e5e9f2] outline-none focus:border-[#f2ca50] font-mono ltr-tech"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#9ca7b8]">{t('emailFieldLabel')}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-[#06090e] border border-[#2b3547] rounded-xl px-3.5 py-2.5 text-xs text-[#e5e9f2] outline-none focus:border-[#f2ca50] ltr-tech"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#9ca7b8]">{t('cityFieldLabel')}</label>
                <input
                  type="text"
                  value={ville}
                  onChange={(e) => setVille(e.target.value)}
                  className="bg-[#06090e] border border-[#2b3547] rounded-xl px-3.5 py-2.5 text-xs text-[#e5e9f2] outline-none focus:border-[#f2ca50]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#9ca7b8]">{t('countryFieldLabel')}</label>
                <input
                  type="text"
                  value={pays}
                  onChange={(e) => setPays(e.target.value)}
                  className="bg-[#06090e] border border-[#2b3547] rounded-xl px-3.5 py-2.5 text-xs text-[#e5e9f2] outline-none focus:border-[#f2ca50]"
                />
              </div>
            </div>
          </div>

          {/* Boutons */}
          <div className="pt-6 border-t border-[#2b3547]/40 flex items-center justify-end gap-3">
            <Link
              to={`/members/${id}`}
              className="px-4 py-2.5 rounded-xl border border-[#2b3547] text-xs font-semibold text-[#9ca7b8] hover:text-[#e5e9f2] transition"
            >
              {t('cancel')}
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#e9c349] via-[#f2ca50] to-[#d4af37] text-slate-950 font-bold text-xs shadow-lg hover:brightness-110 active:scale-[0.98] transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
                  <span>{t('savingChanges')}</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px] font-bold">check</span>
                  <span>{t('saveChangesBtn')}</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>

    </div>
  );
};
