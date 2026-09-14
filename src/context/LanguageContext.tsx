import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { AppLanguage, TRANSLATIONS, CONTROLLED_TRANSLATIONS, useTranslation } from '../i18n/translations';

interface LanguageContextType {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  toggleLanguage: () => void;
  isRTL: boolean;
  dir: 'ltr' | 'rtl';
  t: (
    key: keyof typeof TRANSLATIONS.fr,
    fallbackOrParams?: string | Record<string, string | number>,
    maybeParams?: Record<string, string | number>
  ) => string;
  tControlled: (category: keyof typeof CONTROLLED_TRANSLATIONS.fr, codeKey: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'dahirah_language';

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<AppLanguage>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'ar' || saved === 'fr') {
        return saved;
      }
    } catch {
      // Ignorer si localStorage est inaccessible
    }
    return 'fr';
  });

  const isRTL = language === 'ar';
  const dir = isRTL ? 'rtl' : 'ltr';

  useEffect(() => {
    // 1. Mettre à jour l'attribut lang et dir sur l'élément racine <html>
    document.documentElement.lang = language;
    document.documentElement.dir = dir;

    // 2. Basculer la classe 'rtl' sur <html> et <body> pour le styling fin
    if (isRTL) {
      document.documentElement.classList.add('rtl');
      document.body.classList.add('rtl');
    } else {
      document.documentElement.classList.remove('rtl');
      document.body.classList.remove('rtl');
    }

    // 3. Persistance locale
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // fallback silencieux
    }
  }, [language, isRTL, dir]);

  const setLanguage = (lang: AppLanguage) => {
    if (lang === 'fr' || lang === 'ar') {
      setLanguageState(lang);
    }
  };

  const toggleLanguage = () => {
    setLanguageState((prev) => (prev === 'fr' ? 'ar' : 'fr'));
  };

  const translator = useMemo(() => useTranslation(language), [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      toggleLanguage,
      isRTL,
      dir,
      t: translator.t,
      tControlled: translator.tControlled,
    }),
    [language, isRTL, dir, translator]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage doit être utilisé à l’intérieur d’un <LanguageProvider>');
  }
  return context;
};
