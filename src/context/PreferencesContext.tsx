import { createContext, Fragment, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { getLang, setLang as setModuleLang, type Lang } from '../i18n';
import { applyTheme, storedTheme, watchSystemTheme, type Theme } from '../i18n/theme';

interface Prefs { lang: Lang; theme: Theme; setLang: (l: Lang) => void; setTheme: (t: Theme) => void }
const Ctx = createContext<Prefs | null>(null);

/** Idioma y tema. Al cambiar de idioma se vuelve a montar la app para que todo el texto se traduzca. */
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getLang());
  const [theme, setThemeState] = useState<Theme>(storedTheme());
  const themeRef = useRef(theme);
  themeRef.current = theme;

  useEffect(() => { applyTheme(theme); }, [theme]);
  useEffect(() => watchSystemTheme(() => themeRef.current), []);

  const setLang = useCallback((l: Lang) => { if (l !== getLang()) { setModuleLang(l); setLangState(l); } }, []);
  const setTheme = useCallback((t: Theme) => setThemeState(t), []);

  return (
    <Ctx.Provider value={{ lang, theme, setLang, setTheme }}>
      <Fragment key={lang}>{children}</Fragment>
    </Ctx.Provider>
  );
}

export function usePrefs() {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePrefs fuera de PreferencesProvider');
  return v;
}
