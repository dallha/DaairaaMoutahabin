import React, { useState } from 'react';
import {
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  User,
  ShieldAlert,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { UserRole, Language, Member } from '../types';
import { useTranslation } from '../i18n/translations';

interface LoginViewProps {
  currentLang: Language;
  onLoginSuccess: (role: UserRole, member?: Member) => void;
  members: Member[];
  onNavigate: (view: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  currentLang,
  onLoginSuccess,
  members,
  onNavigate,
}) => {
  const t = useTranslation(currentLang);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [forgotModal, setForgotModal] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Check demo credentials or defaults
    if (identifier.toLowerCase().includes('super') || identifier.includes('seck')) {
      onLoginSuccess('SUPER_ADMIN');
    } else if (identifier.toLowerCase().includes('admin') || identifier.includes('ndiaye')) {
      onLoginSuccess('ADMIN');
    } else {
      // Default to Khadija Sidibé as demo member
      const khadija = members.find((m) => m.nom.toLowerCase().includes('sidibé')) || members[0];
      onLoginSuccess('MEMBER', khadija);
    }
  };

  const handleQuickLogin = (role: UserRole, targetMember?: Member) => {
    onLoginSuccess(role, targetMember);
  };

  const khadijaMember = members.find((m) => m.nom.toLowerCase().includes('sidibé')) || members[24];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 pb-12 w-full">
      <div className="w-full max-w-md bg-white rounded-3xl border border-stone-200 shadow-xl p-8 sm:p-10 space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-[#335A79] text-[#F5E8A3] flex items-center justify-center mx-auto shadow-xs border border-[#816C07]/40 font-arabic-calligraphy text-2xl font-bold">
            د
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-stone-900">
            Espace Sécurisé de la Dahirah
          </h2>
          <p className="text-xs text-stone-500 font-arabic-calligraphy text-[#816C07]">
            دائرة المتحابين في الله
          </p>
          <p className="text-xs text-stone-500">
            Connectez-vous avec votre adresse email ou votre numéro de téléphone
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          <div className="space-y-1">
            <label className="font-medium text-stone-700">Identifiant (Email ou Téléphone)</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="ex: khadija.sidibe@mediacraft.sn ou +221 77..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#335A79] text-stone-900"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-medium text-stone-700">Mot de passe</label>
              <button
                type="button"
                onClick={() => setForgotModal(true)}
                className="text-[11px] text-[#335A79] hover:underline"
              >
                Mot de passe oublié ?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#335A79] text-stone-900"
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              id="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-stone-300 text-[#335A79] focus:ring-[#335A79]"
            />
            <label htmlFor="remember-me" className="ml-2 text-stone-600 select-none">
              Rester connecté sur cet appareil
            </label>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 bg-[#335A79] hover:bg-[#223c52] text-white font-medium rounded-xl transition flex items-center justify-center gap-2 shadow-xs"
          >
            <span>Se connecter à mon compte</span>
            <ArrowRight className="w-4 h-4" />
          </button>

        </form>

        {/* Quick Demo Access Pills */}
        <div className="border-t border-stone-100 pt-5 space-y-2.5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-[#816C07]" />
            <span>Accès direct Démonstration</span>
          </div>

          <div className="space-y-1.5 text-xs">
            <button
              onClick={() => handleQuickLogin('MEMBER', khadijaMember)}
              className="w-full text-left px-3 py-2 rounded-lg bg-stone-50 hover:bg-emerald-50 hover:border-emerald-200 border border-stone-200/80 transition flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px]">
                  KS
                </div>
                <div>
                  <p className="font-semibold text-stone-900">Khadija Sidibé</p>
                  <p className="text-[10px] text-stone-500">Membre (Multiprofessions & Bureau)</p>
                </div>
              </div>
              <span className="text-[10px] font-medium text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                Compte Membre
              </span>
            </button>

            <button
              onClick={() => handleQuickLogin('ADMIN')}
              className="w-full text-left px-3 py-2 rounded-lg bg-stone-50 hover:bg-sky-50 hover:border-sky-200 border border-stone-200/80 transition flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-sky-100 text-[#335A79] flex items-center justify-center font-bold text-[10px]">
                  AD
                </div>
                <div>
                  <p className="font-semibold text-stone-900">Mahmoud Ndiaye</p>
                  <p className="text-[10px] text-stone-500">Administrateur Technique & Membres</p>
                </div>
              </div>
              <span className="text-[10px] font-medium text-[#335A79] bg-sky-100/70 px-1.5 py-0.5 rounded">
                Admin
              </span>
            </button>

            <button
              onClick={() => handleQuickLogin('SUPER_ADMIN')}
              className="w-full text-left px-3 py-2 rounded-lg bg-stone-50 hover:bg-amber-50 hover:border-amber-200 border border-stone-200/80 transition flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-[10px]">
                  SA
                </div>
                <div>
                  <p className="font-semibold text-stone-900">Cheikh Seck</p>
                  <p className="text-[10px] text-stone-500">Super Administrateur (Accès Total)</p>
                </div>
              </div>
              <span className="text-[10px] font-medium text-amber-800 bg-amber-100/70 px-1.5 py-0.5 rounded">
                Super Admin
              </span>
            </button>
          </div>
        </div>

        {/* Back link */}
        <div className="text-center pt-2">
          <button
            onClick={() => onNavigate('public-home')}
            className="text-xs text-stone-500 hover:text-stone-800 hover:underline"
          >
            ← Retour au portail public
          </button>
        </div>

      </div>

      {/* Forgot password modal */}
      {forgotModal && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-stone-200 shadow-xl space-y-4">
            <h3 className="font-bold text-sm text-stone-900">Récupération de mot de passe</h3>
            {forgotSuccess ? (
              <div className="p-3 bg-emerald-50 text-emerald-900 rounded-xl text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Lien de réinitialisation envoyé</span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  Vérifiez votre boîte email ou votre messagerie SMS/WhatsApp pour renouveler votre accès.
                </p>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <p className="text-stone-600">
                  Indiquez votre email ou numéro de téléphone enregistré dans le registre de la Dahirah.
                </p>
                <input
                  type="text"
                  placeholder="+221 ... ou nom@domaine.sn"
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#335A79]"
                />
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setForgotModal(false)}
                    className="px-3 py-1.5 text-stone-600 hover:text-stone-900"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => setForgotSuccess(true)}
                    className="px-3 py-1.5 bg-[#335A79] text-white rounded-lg font-medium"
                  >
                    Envoyer le lien
                  </button>
                </div>
              </div>
            )}
            {forgotSuccess && (
              <button
                onClick={() => {
                  setForgotModal(false);
                  setForgotSuccess(false);
                }}
                className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-medium"
              >
                Fermer
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
