import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setErrorMessage('Veuillez saisir votre identifiant et votre mot de passe.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await login({
        email: identifier.includes('@') ? identifier.trim() : undefined,
        matricule: !identifier.includes('@') ? identifier.trim() : undefined,
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
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden bg-gradient-to-b from-[#0a0e14] via-[#0d121a] to-[#0f141c] text-[#e5e9f2]">
      
      {/* Halo Géométrique Arrière-Plan sobre */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
        <div className="w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-[#f2ca50]/10 via-amber-600/5 to-transparent blur-[120px] transform -translate-y-16"></div>
      </div>

      <div className="relative w-full max-w-md flex flex-col items-center z-10">
        
        {/* En-tête avec Logo Officiel de la Dahirah */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative mb-3 group">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white flex items-center justify-center shadow-[0_8px_30px_rgba(0,0,0,0.6)] p-1 border-2 border-[#f2ca50] ring-4 ring-[#f2ca50]/20">
              <img
                src="/logo.png"
                alt="Logo Officiel Dāʾiratu Al-Mutahābbīna Fillāhi"
                className="w-full h-full object-contain rounded-full"
              />
            </div>
          </div>

          <span className="font-serif text-amber-300 tracking-wider text-2xl sm:text-3xl mb-1 select-none font-semibold">
            دَائِرَةُ الْمُتَحَابِّينَ فِي اللهِ
          </span>
          <h1 className="font-headline-sm text-lg sm:text-xl text-[#e5e9f2] tracking-tight font-medium">
            Portail de Gestion &amp; d'Accréditation
          </h1>
          <p className="text-xs text-[#9ca7b8] max-w-xs mt-1">
            Espace d'administration réservé aux membres accrédités et dignitaires.
          </p>
        </div>

        {/* Boîte de Connexion */}
        <div className="w-full bg-[#131923]/95 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] rounded-2xl p-6 sm:p-7 relative border border-[#2b3547]/80">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#f2ca50]/80 to-transparent"></div>

          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            
            {/* Identifiant ou Courriel */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#e5e9f2] flex items-center justify-between" htmlFor="identifier">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[17px] text-[#f2ca50]">mail</span>
                  Adresse Email ou Matricule
                </span>
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3.5 text-[#9ca7b8] text-[18px]">account_circle</span>
                <input
                  id="identifier"
                  type="text"
                  required
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full bg-[#090d14] text-[#e5e9f2] text-xs sm:text-sm rounded-xl pl-10 pr-4 py-2.5 outline-none border border-[#2b3547] focus:border-[#f2ca50] focus:ring-1 focus:ring-[#f2ca50]/30 transition"
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#e5e9f2] flex items-center justify-between" htmlFor="password">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[17px] text-[#f2ca50]">key</span>
                  Mot de passe
                </span>
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3.5 text-[#9ca7b8] text-[18px]">lock</span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#090d14] text-[#e5e9f2] text-xs sm:text-sm rounded-xl pl-10 pr-10 py-2.5 outline-none border border-[#2b3547] focus:border-[#f2ca50] focus:ring-1 focus:ring-[#f2ca50]/30 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-[#9ca7b8] hover:text-[#f2ca50] transition"
                  title={showPassword ? 'Masquer' : 'Afficher'}
                >
                  <span className="material-symbols-outlined text-[18px]">
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
                className="w-full py-3 px-6 bg-gradient-to-r from-[#e9c349] via-[#f2ca50] to-[#d4af37] text-slate-950 rounded-xl shadow-[0_4px_16px_rgba(242,202,80,0.25)] hover:brightness-105 active:scale-[0.99] transition flex items-center justify-center gap-2 font-bold text-xs sm:text-sm tracking-wide disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
                    <span>Authentification en cours...</span>
                  </>
                ) : (
                  <>
                    <span>Se connecter</span>
                    <span className="material-symbols-outlined text-[18px] font-bold">arrow_forward</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Footer de la carte */}
          <div className="mt-5 pt-3 border-t border-[#2b3547]/40 text-center text-[11px] text-[#9ca7b8]">
            <span>Dāʾiratu Al-Mutahābbīna Fillāhi • Système Sécurisé</span>
          </div>
        </div>

        {/* Mention discrète en bas de page */}
        <p className="text-[11px] text-[#9ca7b8]/60 mt-6 text-center">
          © 2026 Dāʾiratu Al-Mutahābbīna Fillāhi. Tous droits réservés.
        </p>
      </div>
    </div>
  );
};
