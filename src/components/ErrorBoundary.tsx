import React, { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends (React.Component as new (...args: any[]) => any) {
  state: State = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Erreur non interceptée dans l’interface:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-6 text-center text-[#e5e9f2]">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-[#f2ca50]/40 flex items-center justify-center mb-4 text-[#f2ca50]">
            <span className="material-symbols-outlined text-[32px]">warning</span>
          </div>
          <h2 className="text-xl font-headline-sm font-semibold mb-2 text-[#f2ca50]">
            Une anomalie d'affichage est survenue
          </h2>
          <p className="text-xs text-[#9ca7b8] max-w-md mb-6 leading-relaxed">
            {this.state.error?.message || 'Une erreur inattendue s’est produite lors du rendu de cette vue.'}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 rounded-xl bg-[#242e40] hover:bg-[#2b3547] text-xs font-semibold text-[#e5e9f2] transition cursor-pointer"
            >
              Réessayer
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-[#f2ca50] hover:brightness-110 text-slate-950 text-xs font-bold transition cursor-pointer"
            >
              Recharger la page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
