/**
 * Idiomas de MoodWave. El texto en español es la clave: `t('Hola')` devuelve 'Hello' en inglés
 * y, si falta una traducción, muestra el español (nunca se rompe la interfaz).
 * El idioma vive en el módulo y al cambiarlo la app se vuelve a montar (ver PreferencesProvider).
 */
import { Fragment, createElement, type ReactNode } from 'react';
import { EN, EN_PATTERNS } from './en';

export type Lang = 'es' | 'en';
export const LANGS: { key: Lang; label: string }[] = [
  { key: 'es', label: 'Español' },
  { key: 'en', label: 'English' },
];
const STORAGE_KEY = 'mw-lang';

function initial(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'es' || saved === 'en') return saved;
  } catch { /* sin almacenamiento */ }
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'es';
}

let current: Lang = initial();
if (typeof document !== 'undefined') document.documentElement.lang = current;

export const getLang = () => current;
export const locale = () => (current === 'en' ? 'en-US' : 'es-MX');

export function setLang(lang: Lang) {
  current = lang;
  try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* sin almacenamiento */ }
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
}

type Vars = Record<string, string | number>;
const fill = (text: string, vars?: Vars) =>
  vars ? text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : text;

/** Traduce un texto (con variables `{nombre}`). */
export function t(es: string, vars?: Vars): string {
  if (current === 'es') return fill(es, vars);
  const direct = EN[es];
  if (direct !== undefined) return fill(direct, vars);
  // Mensajes con partes variables (p. ej. errores del servidor con números).
  for (const [re, en] of EN_PATTERNS) {
    const m = es.match(re);
    if (m) return fill(en.replace(/\$(\d)/g, (_, i) => m[Number(i)] ?? ''), vars);
  }
  return fill(es, vars);
}

/** Igual que t(), pero las variables pueden ser elementos de React (negritas, enlaces…). */
export function tx(es: string, vars: Record<string, ReactNode>): ReactNode {
  const text = t(es);
  const parts = text.split(/(\{\w+\})/g);
  return createElement(Fragment, null, ...parts.map((p, i) => {
    const m = p.match(/^\{(\w+)\}$/);
    return createElement(Fragment, { key: i }, m && m[1] in vars ? vars[m[1]] : p);
  }));
}
