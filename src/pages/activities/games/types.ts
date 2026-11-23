import { useCallback, useEffect, useRef, type ComponentType } from 'react';
import type { EmotionKey } from '../../../lib/types';

/** Lo que el contenedor (GameShell) le da a cada juego. */
export interface GameProps {
  /** Suma puntos al marcador (el total nunca baja de 0). */
  addScore: (n: number) => void;
  /** Muestra un mensaje flotante (afirmación, ánimo). */
  say: (text: string) => void;
}

export interface GameDef {
  key: string;
  emotion: EmotionKey;
  name: string;
  icon: string;
  /** Por qué este juego ayuda con esa emoción. */
  why: string;
  howTo: string;
  seconds: number;
  Component: ComponentType<GameProps>;
}

export const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];

export function shuffle<T>(xs: readonly T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export const randInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

let audio: AudioContext | null = null;
/** Un tono corto (sin archivos de audio). Si el navegador no deja reproducir, no pasa nada. */
export function tone(freq: number, ms = 180, type: OscillatorType = 'sine', volume = 0.12) {
  try {
    audio ??= new AudioContext();
    const o = audio.createOscillator();
    const g = audio.createGain();
    const end = audio.currentTime + ms / 1000;
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(volume, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, end);
    o.connect(g).connect(audio.destination);
    o.start(); o.stop(end);
  } catch { /* sin audio */ }
}

/** setTimeout que se cancela solo cuando el juego se desmonta (al acabar el tiempo). */
export function useTimers() {
  const ids = useRef(new Set<number>());
  useEffect(() => {
    const set = ids.current;
    return () => { set.forEach(clearTimeout); set.clear(); };
  }, []);
  return useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => { ids.current.delete(id); fn(); }, ms);
    ids.current.add(id);
  }, []);
}
