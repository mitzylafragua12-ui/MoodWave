import type { ComponentType } from 'react';
import type { EmotionKey } from '../../../lib/types';

/** Lo que el contenedor (GameShell) le da a cada juego. */
export interface GameProps {
  /** Suma puntos al marcador. */
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
