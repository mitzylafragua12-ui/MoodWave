/**
 * Idiomas de MoodWave. El texto en español es la clave: `t('Hola')` devuelve 'Hello' en inglés
 * y, si falta una traducción, muestra el español (nunca se rompe la interfaz).
 * Todas las traducciones viven dentro de la app: no se envía texto a servicios externos
 * (importante: la app maneja emociones y diarios).
 * El idioma vive en el módulo y al cambiarlo la app se vuelve a montar (ver PreferencesProvider).
 */
import { Fragment, createElement, type ReactNode } from 'react';
import type { Locale } from './types';
import { EN_LOCALE } from './en';
import { PT } from './pt';
import { FR } from './fr';
import { DE } from './de';
import { IT } from './it';

export type Lang = 'es' | 'en' | 'pt' | 'fr' | 'de' | 'it';
const LOCALES: Record<Exclude<Lang, 'es'>, Locale> = { en: EN_LOCALE, pt: PT, fr: FR, de: DE, it: IT };

/** Opciones del selector, cada una con su nombre en su propio idioma. */
export const LANGS: { key: Lang; label: string; flag: string }[] = [
  { key: 'es', label: 'Español', flag: '🇲🇽' },
  { key: 'en', label: 'English', flag: '🇺🇸' },
  { key: 'pt', label: 'Português', flag: '🇧🇷' },
  { key: 'fr', label: 'Français', flag: '🇫🇷' },
  { key: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { key: 'it', label: 'Italiano', flag: '🇮🇹' },
];
export const isLang = (v: unknown): v is Lang => LANGS.some((l) => l.key === v);
const STORAGE_KEY = 'mw-lang';

function initial(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isLang(saved)) return saved;
  } catch { /* sin almacenamiento */ }
  const nav = typeof navigator !== 'undefined' ? navigator.language?.slice(0, 2).toLowerCase() : 'es';
  return isLang(nav) ? nav : 'es';
}

let current: Lang = initial();
if (typeof document !== 'undefined') document.documentElement.lang = current;

export const getLang = () => current;
export const locale = () => (current === 'es' ? 'es-MX' : LOCALES[current].locale);

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
  const loc = LOCALES[current];
  const direct = loc.dict[es];
  if (direct !== undefined) return fill(direct, vars);
  // Mensajes con partes variables (p. ej. errores del servidor con números).
  for (const [re, tr] of loc.patterns) {
    const m = es.match(re);
    if (m) return fill(tr.replace(/\$(\d)/g, (_: string, i: string) => m[Number(i)] ?? ''), vars);
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

/** Traducción de un logro por su clave (los de la base están en español). */
export const badgeTranslation = (key: string) => (current === 'es' ? undefined : LOCALES[current].badges[key]);

/** Para pruebas: todos los idiomas distintos del español. */
export const ALL_LOCALES = LOCALES;
