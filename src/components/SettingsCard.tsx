import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { usePrefs } from '../context/PreferencesContext';
import { errMsg, useToast } from '../context/ToastContext';
import { LANGS, t, type Lang } from '../i18n';
import type { Theme } from '../i18n/theme';

const THEMES: { key: Theme; label: string; icon: string }[] = [
  { key: 'dark', label: 'Oscuro', icon: '🌙' },
  { key: 'light', label: 'Claro', icon: '☀️' },
  { key: 'system', label: 'Según el sistema', icon: '💻' },
];

/** Idioma y tema: se guardan en la cuenta y se aplican al instante. */
export function SettingsCard() {
  const { lang, theme, setLang, setTheme } = usePrefs();
  const { profile } = useAuth();
  const toast = useToast();

  async function saveTheme(next: Theme) {
    const prev = theme;
    setTheme(next);
    try { if (profile) await api.updateProfile({ theme: next }); } catch (e) { setTheme(prev); toast(errMsg(e), 'error'); }
  }
  async function saveLang(next: Lang) {
    try {
      if (profile) await api.updateProfile({ language: next });
      setLang(next); // vuelve a montar la app en el nuevo idioma
    } catch (e) { toast(errMsg(e), 'error'); }
  }

  return (
    <section className="card" id="configuracion">
      <h3>⚙️ {t('Configuración')}</h3>
      <p className="small muted mb0">{t('Se guarda en tu cuenta y se aplica en todos tus dispositivos.')}</p>
      <div className="pref-row">
        <span>🌐 {t('Idioma')}</span>
        <div className="seg-inline" role="group" aria-label={t('Idioma')}>
          {LANGS.map((l) => (
            <button key={l.key} aria-pressed={lang === l.key} onClick={() => saveLang(l.key)}>{l.label}</button>
          ))}
        </div>
      </div>
      <div className="pref-row">
        <span>🎨 {t('Tema')}</span>
        <div className="seg-inline" role="group" aria-label={t('Tema')}>
          {THEMES.map((th) => (
            <button key={th.key} aria-pressed={theme === th.key} title={t(th.label)} onClick={() => saveTheme(th.key)}>
              <span aria-hidden>{th.icon}</span> {t(th.label)}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Selector compacto para las pantallas de entrada (antes de iniciar sesión; se guarda en el navegador). */
export function AuthPrefs() {
  const { lang, theme, setLang, setTheme } = usePrefs();
  const dark = theme === 'dark' || (theme === 'system' && document.documentElement.dataset.theme === 'dark');
  return (
    <div className="auth-prefs">
      <div className="seg-inline" role="group" aria-label={t('Idioma')}>
        {LANGS.map((l) => <button key={l.key} aria-pressed={lang === l.key} onClick={() => setLang(l.key)}>{l.key.toUpperCase()}</button>)}
      </div>
      <button className="btn btn-ghost btn-sm" aria-label={t('Tema')} title={t(dark ? 'Claro' : 'Oscuro')} onClick={() => setTheme(dark ? 'light' : 'dark')}>
        {dark ? '☀️' : '🌙'}
      </button>
    </div>
  );
}
