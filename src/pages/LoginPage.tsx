import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [identifier, setIdentifier] = useState('DM-2026-BUREAU-01');
  const [password, setPassword] = useState('KhadimouRassoul#2026');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      await login({
        email: identifier.includes('@') ? identifier : undefined,
        matricule: !identifier.includes('@') ? identifier : undefined,
        password,
      });

      const destination = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(destination, { replace: true });
    } catch (err: any) {
      setErrorMessage(err.message || 'Identifiants invalides ou compte non accrédité.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden bg-gradient-to-b from-[#0a0e14] via-[#0d121a] to-[#0f141c] text-[#e5e9f2]">
      
      {/* Top Utility Bar */}
      <div className="absolute top-0 left-0 right-0 max-w-5xl mx-auto flex items-center justify-between px-4 py-3 z-20 text-xs text-[#9ca7b8] border-b border-[#f2ca50]/10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#06090e]/90 border border-emerald-500/30 text-emerald-400 font-label-sm font-semibold tracking-wider shadow-[0_0_12px_rgba(16,185,129,0.15)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            LIAISON NEON DB &amp; DJANGO REST • SSL SECURED
          </span>
          <span className="hidden sm:inline text-[#2b3547]">|</span>
          <span className="hidden sm:inline-flex items-center gap-1.5 font-label-sm text-[#9ca7b8]">
            <span className="material-symbols-outlined text-[15px] text-[#f2ca50]">verified_user</span>
            Protocole Dāʾiratu v2.6
          </span>
        </div>
      </div>

      {/* Halo Géométrique et Étoilé d'Arrière-Plan */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
        <div className="w-[620px] h-[620px] rounded-full bg-gradient-to-tr from-[#f2ca50]/15 via-amber-600/10 to-transparent blur-[110px] transform -translate-y-24"></div>
        <div className="absolute w-[850px] h-[850px] rounded-full border border-[#f2ca50]/10 opacity-30"></div>
        <div className="absolute w-[1150px] h-[1150px] rounded-full border border-[#2b3547]/20 opacity-20"></div>
        <svg className="absolute w-[680px] h-[680px] text-[#f2ca50]/[0.05] animate-pulse duration-[4000ms]" fill="none" stroke="currentColor" strokeWidth="0.75" viewBox="0 0 200 200">
          <rect height="130" transform="rotate(0 100 100)" width="130" x="35" y="35"></rect>
          <rect height="130" transform="rotate(45 100 100)" width="130" x="35" y="35"></rect>
          <circle cx="100" cy="100" r="84" strokeDasharray="2 4"></circle>
          <circle cx="100" cy="100" r="68" strokeDasharray="1 3"></circle>
          <circle cx="100" cy="100" r="44"></circle>
        </svg>
      </div>

      <div className="relative w-full max-w-xl flex flex-col items-center z-10 pt-10">
        
        {/* En-tête Sceau & Calligraphie */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative mb-4 group cursor-pointer">
            <div className="absolute -inset-3 rounded-full bg-gradient-to-tr from-[#f2ca50] via-[#ffb95f] to-amber-600 opacity-35 blur-xl group-hover:opacity-60 transition duration-700"></div>
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#06090e] flex items-center justify-center shadow-[0_10px_35px_rgba(0,0,0,0.6)] p-1 border border-[#f2ca50]/50 ring-4 ring-[#f2ca50]/15">
              <img
                src="https://lh3.googleusercontent.com/aida/AEtjO1VFfKNNPTdKqGKZNBuoAaCLwnDofoEfks4uP-jHqDqfVp6MFfEIVn7T_VlPkgt9zeDWYB3veqQYzYYiGV9iAzw1E91g4Gy-z07RUlmuIuzGhiV185af1fFHg1XMId5yTos4w99nNVn-lXZ6AzNWs9PFl1gzj27jSCh1t-dAfHk2MD80qEIxine2okW7ICURcsJZwa8oM9lHLR7DvO3Vc_r0ynQ9sHXpUmBreJ2X8pQCIEPBE52q86cMFw"
                alt="Sceau Officiel Dāʾiratu Al-Mutahābbīna Fillāhi"
                className="w-full h-full object-cover rounded-full drop-shadow-md"
              />
            </div>
          </div>

          <span className="font-headline-md bg-gradient-to-r from-amber-200 via-[#f2ca50] to-amber-300 bg-clip-text text-transparent tracking-widest text-2xl sm:text-3xl mb-1 select-none font-semibold">
            دَائِرَةُ الْمُتَحَابِّينَ فِي اللهِ
          </span>
          <h1 className="font-headline-lg text-xl sm:text-2xl text-[#e5e9f2] tracking-tight mt-1 font-semibold">
            Portail de Gouvernance &amp; d'Accréditation
          </h1>
          <p className="text-xs sm:text-sm text-[#9ca7b8] max-w-md mt-1 leading-relaxed">
            Espace d'authentification souveraine réservé aux dignitaires, délégués et membres assermentés.
          </p>
        </div>

        {/* Boîte de Connexion Glassmorphic */}
        <div className="w-full bg-[#151c28]/90 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] rounded-2xl p-6 sm:p-8 relative border border-[#f2ca50]/30 ring-1 ring-[#f2ca50]/10">
          <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#f2ca50]/80 to-transparent"></div>

          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            
            {/* Identifiant ou Matricule */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#e5e9f2] flex items-center justify-between" htmlFor="identifier">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[17px] text-[#f2ca50]">badge</span>
                  Identifiant, Matricule ou Courriel
                </span>
                <span className="text-[#9ca7b8] text-[10px] bg-[#242e40]/60 px-1.5 py-0.5 rounded border border-[#2b3547]">Obligatoire</span>
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3.5 text-[#f2ca50]/70 text-[19px]">person</span>
                <input
                  id="identifier"
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="ex: DM-2026-0001 ou courriel institutionnel"
                  className="w-full bg-[#06090e]/90 text-[#e5e9f2] placeholder-[#788294]/60 text-xs sm:text-sm rounded-xl pl-11 pr-4 py-3 outline-none border border-[#f2ca50]/20 focus:border-[#f2ca50] focus:ring-1 focus:ring-[#f2ca50]/40 transition"
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#e5e9f2] flex items-center justify-between" htmlFor="password">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[17px] text-[#f2ca50]">key</span>
                  Mot de passe d'accréditation
                </span>
                <span className="text-[10px] text-emerald-400 bg-[#242e40]/60 px-1.5 py-0.5 rounded border border-[#2b3547] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">shield</span> Chiffré AES
                </span>
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3.5 text-[#f2ca50]/70 text-[19px]">lock</span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="w-full bg-[#06090e]/90 text-[#e5e9f2] placeholder-[#788294]/60 text-xs sm:text-sm rounded-xl pl-11 pr-11 py-3 outline-none border border-[#f2ca50]/20 focus:border-[#f2ca50] focus:ring-1 focus:ring-[#f2ca50]/40 transition tracking-widest"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-[#9ca7b8] hover:text-[#f2ca50] transition"
                  title={showPassword ? 'Masquer' : 'Afficher'}
                >
                  <span className="material-symbols-outlined text-[19px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Bouton d'Action Principal */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-6 bg-gradient-to-r from-[#f59e0b] via-[#fbbf24] to-[#d97706] text-slate-950 rounded-xl shadow-[0_4px_20px_rgba(245,158,11,0.3)] hover:shadow-[0_6px_28px_rgba(245,158,11,0.45)] hover:brightness-105 active:scale-[0.99] transition flex items-center justify-center gap-2 font-bold text-xs sm:text-sm tracking-wide disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
                    <span>Vérification d'accréditation...</span>
                  </>
                ) : (
                  <>
                    <span>S'identifier &amp; Accéder au Portail</span>
                    <span className="material-symbols-outlined text-[19px] font-bold">arrow_forward</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Bandeau de Sécurité */}
          <div className="mt-5 pt-3 border-t border-[#2b3547]/40 flex items-center justify-center gap-2 text-center text-[11px] text-[#9ca7b8]">
            <span className="material-symbols-outlined text-[16px] text-[#f2ca50]">enhanced_encryption</span>
            <span>Chiffrement SSL • Neon PostgreSQL • Contrôle d'accès RBAC Django REST</span>
          </div>
        </div>
      </div>
    </div>
  );
};
