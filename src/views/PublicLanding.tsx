import React from 'react';
import {
  Users,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { useTranslation } from '../i18n/translations';
import { Language } from '../types';

interface PublicLandingProps {
  currentLang: Language;
  onNavigate: (view: string) => void;
  onSelectMemberRole: () => void;
  subView?: 'home' | 'presentation' | 'contact';
}

export const PublicLanding: React.FC<PublicLandingProps> = ({
  currentLang,
  onNavigate,
  onSelectMemberRole,
}) => {
  const t = useTranslation(currentLang);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-[#0B1120]">
      
      {/* SaaS Modern Hero Section */}
      <div className="relative w-full overflow-hidden text-white flex-1 flex flex-col justify-center text-center py-16">
        
        {/* Background Glow Effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#335A79] rounded-full blur-[120px] opacity-30 pointer-events-none" />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#816C07] rounded-full blur-[150px] opacity-20 pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto px-6 space-y-8 flex flex-col items-center">
          
          {/* Pill Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-stone-300 font-medium tracking-wide shadow-sm backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-[#E6CD6B]" />
            <span>Plateforme d'Administration & Gestion Communautaire v2.0</span>
          </div>

          {/* Typography */}
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white leading-tight">
              L'intelligence au service de <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#816C07] via-[#E6CD6B] to-[#816C07]">
                votre organisation.
              </span>
            </h1>
            <p className="text-stone-400 text-base sm:text-lg max-w-2xl mx-auto font-light leading-relaxed">
              Pilotez votre structure avec précision. Un écosystème complet intégrant des tableaux de bord analytiques, une gestion avancée des membres et une cartographie des compétences.
            </p>
          </div>

          {/* Main CTA */}
          <div className="pt-4 flex flex-col sm:flex-row items-center gap-4">
            <button
              id="hero-saas-login-btn"
              onClick={() => onNavigate('login')}
              className="px-8 py-4 rounded-2xl bg-white text-[#0B1120] font-bold text-sm sm:text-base shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] hover:scale-105 transition-all flex items-center gap-2"
            >
              <span>Entrer dans le SaaS</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => onNavigate('directory')}
              className="px-8 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-medium text-sm sm:text-base border border-white/10 transition-all flex items-center gap-2"
            >
              <Users className="w-5 h-5 opacity-70" />
              <span>Consulter l'Annuaire Public</span>
            </button>
          </div>
        </div>

        {/* Abstract Dashboard Mockup */}
        <div className="relative z-10 mt-16 max-w-5xl mx-auto px-6 w-full">
          <div className="rounded-t-xl bg-[#1E293B] border border-white/10 border-b-0 p-2 shadow-2xl overflow-hidden aspect-video relative flex flex-col mx-auto max-w-4xl">
            {/* Mockup Header */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>
              <div className="mx-auto w-1/3 h-5 rounded-md bg-white/5" />
            </div>
            {/* Mockup Body */}
            <div className="flex-1 p-4 grid grid-cols-4 gap-4">
              <div className="col-span-1 border-r border-white/5 pr-4 space-y-3">
                <div className="w-full h-8 rounded-lg bg-white/10" />
                <div className="w-3/4 h-6 rounded-lg bg-white/5" />
                <div className="w-5/6 h-6 rounded-lg bg-white/5" />
                <div className="w-full h-6 rounded-lg bg-white/5" />
              </div>
              <div className="col-span-3 flex flex-col gap-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="h-24 rounded-xl bg-gradient-to-br from-white/10 to-transparent border border-white/5" />
                  <div className="h-24 rounded-xl bg-gradient-to-br from-white/10 to-transparent border border-white/5" />
                  <div className="h-24 rounded-xl bg-gradient-to-br from-[#816C07]/20 to-transparent border border-[#816C07]/30" />
                </div>
                <div className="flex-1 rounded-xl bg-white/5 border border-white/5" />
              </div>
            </div>
            
            {/* Gradient fade out at bottom */}
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0B1120] to-transparent" />
          </div>
        </div>
      </div>

    </div>
  );
};
