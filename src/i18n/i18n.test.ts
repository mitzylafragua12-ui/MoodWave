import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ALL_LOCALES, setLang, t } from './index';
import { ACTIVITIES, DEFAULT_BADGES, EMOTIONS, JOURNAL_PROMPTS, RECOMMENDATIONS, ROLES } from '../lib/catalog';
import { LEVEL_NAMES } from '../lib/gamification';

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) && !f.endsWith('.test.ts') ? [p] : [];
  });
}

/** Textos literales pasados a t()/tx(), incluidos los de `t(cond ? 'a' : 'b')`. */
function usedKeys(): Set<string> {
  const keys = new Set<string>();
  const str = String.raw`'((?:[^'\\]|\\.)*)'`;
  for (const f of files(join(__dirname, '..'))) {
    if (f.includes('/i18n/')) continue;
    const src = readFileSync(f, 'utf8');
    if (src.includes('i18n-ignore-file')) continue;
    for (const m of src.matchAll(new RegExp(String.raw`\btx?\(\s*` + str, 'g'))) keys.add(m[1].replace(/\\'/g, "'"));
    for (const m of src.matchAll(new RegExp(String.raw`\btx?\([^()]*?\?\s*` + str + String.raw`\s*:\s*` + str, 'g'))) {
      keys.add(m[1].replace(/\\'/g, "'")); keys.add(m[2].replace(/\\'/g, "'"));
    }
  }
  return keys;
}

describe('traducciones al inglés', () => {
  it.each(Object.entries(ALL_LOCALES))('%s: cada texto de la interfaz tiene traducción', (_, loc) => {
    const missing = [...usedKeys()].filter((k) => !(k in loc.dict));
    expect(missing).toEqual([]);
  });
  it.each(Object.entries(ALL_LOCALES))('%s: las variables {…} coinciden con el español', (_, loc) => {
    const vars = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');
    const bad = Object.entries(loc.dict).filter(([es, tr]) => vars(es) !== vars(tr)).map(([es]) => es);
    expect(bad).toEqual([]);
  });
  it.each(Object.entries(ALL_LOCALES))('%s: los catálogos están traducidos', (_, loc) => {
    setLang('es');
    const texts = [
      ...EMOTIONS.map((e) => e.label), ...ACTIVITIES.flatMap((a) => [a.name, a.description]),
      ...ROLES.flatMap((r) => [r.name, r.description]), ...LEVEL_NAMES,
      ...Object.values(RECOMMENDATIONS).flatMap((rs) => rs.map(([, reason]) => reason)),
      ...Object.values(JOURNAL_PROMPTS).flat(),
    ];
    expect(texts.filter((x) => !(x in loc.dict))).toEqual([]);
    expect(DEFAULT_BADGES.filter((b) => !loc.badges[b.key]).map((b) => b.key)).toEqual([]);
  });
  it('traduce con variables y mensajes del servidor', () => {
    setLang('en');
    expect(t('Hola, {name}', { name: 'Mitzy' })).toBe('Hi, Mitzy');
    expect(t('Duración insuficiente: mínimo 60 segundos')).toBe('Not enough time: at least 60 seconds');
    expect(t('Texto sin traducción')).toBe('Texto sin traducción');
    expect(EMOTIONS[0].label).toBe('Happy');
    expect(LEVEL_NAMES[2]).toBe('Tide');
    setLang('pt');
    expect(t('Hola, {name}', { name: 'Mitzy' })).toBe('Olá, Mitzy');
    setLang('fr');
    expect(t('Duración insuficiente: mínimo 60 segundos')).toBe('Durée insuffisante : au moins 60 secondes');
    setLang('de');
    expect(EMOTIONS[1].label).toBe('Traurigkeit');
    setLang('it');
    expect(LEVEL_NAMES[0]).toBe('Brezza');
    setLang('es');
    expect(EMOTIONS[0].label).toBe('Feliz');
    expect(t('Hola, {name}', { name: 'Mitzy' })).toBe('Hola, Mitzy');
  });
});
