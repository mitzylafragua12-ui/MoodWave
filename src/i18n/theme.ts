/** Tema claro / oscuro / según el sistema, aplicado como data-theme en <html>. */
export type Theme = 'dark' | 'light' | 'system';
const STORAGE_KEY = 'mw-theme';

export function storedTheme(): Theme {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'dark' || v === 'light' || v === 'system') return v;
  } catch { /* sin almacenamiento */ }
  return 'dark';
}

const media = () => window.matchMedia?.('(prefers-color-scheme: light)');
export const resolveTheme = (t: Theme): 'dark' | 'light' => (t === 'system' ? (media()?.matches ? 'light' : 'dark') : t);

export function applyTheme(t: Theme) {
  try { localStorage.setItem(STORAGE_KEY, t); } catch { /* sin almacenamiento */ }
  const r = resolveTheme(t);
  document.documentElement.dataset.theme = r;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', r === 'light' ? '#f4f6fb' : '#0b1120');
}

/** Reaplica el tema si la persona eligió "según el sistema" y el sistema cambia. */
export function watchSystemTheme(get: () => Theme) {
  const m = media();
  const on = () => { if (get() === 'system') applyTheme('system'); };
  m?.addEventListener?.('change', on);
  return () => m?.removeEventListener?.('change', on);
}
