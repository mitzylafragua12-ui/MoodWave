import type { EmotionKey } from '../../../lib/types';
import type { GameDef } from './types';
import Bubbles from './Bubbles';
import Stars from './Stars';
import Garden from './Garden';
import Breath from './Breath';
import Wipe from './Wipe';
import Memory from './Memory';
import OddOne from './OddOne';
import { translated } from '../../../i18n/translated';

/** Un juego diseñado para cada una de las 7 emociones. */
export const GAMES: GameDef[] = ([
  { key: 'stars', emotion: 'happy', name: 'Lluvia de estrellas', icon: '⭐', seconds: 45, Component: Stars,
    why: 'Aprovecha tu buena energía con un juego ágil.', howTo: 'Mueve la canasta y atrapa las estrellas. Las doradas 🌟 valen 3.' },
  { key: 'garden', emotion: 'sad', name: 'Jardín de luz', icon: '🌸', seconds: 40, Component: Garden,
    why: 'Una tarea suave y bonita para acompañar la tristeza.', howTo: 'Toca el jardín para plantar flores, una a la vez y sin prisa.' },
  { key: 'bubbles', emotion: 'angry', name: 'Burbujas de calma', icon: '🫧', seconds: 45, Component: Bubbles,
    why: 'Suelta la tensión del enojo de forma segura.', howTo: 'Revienta las burbujas con lo que te molesta. Las doradas ✨ valen 5.' },
  { key: 'breath', emotion: 'fearful', name: 'Faro en calma', icon: '🗼', seconds: 50, Component: Breath,
    why: 'Respirar en ciclos baja la alerta del miedo.', howTo: 'Mantén presionado al inhalar y sostener; suelta al exhalar. Sigue al faro.' },
  { key: 'wipe', emotion: 'disgusted', name: 'Ventana limpia', icon: '🧽', seconds: 45, Component: Wipe,
    why: 'Cambia el foco hacia algo agradable.', howTo: 'Arrastra para limpiar la ventana y descubrir el paisaje.' },
  { key: 'memory', emotion: 'surprised', name: 'Memoria sorpresa', icon: '🎁', seconds: 60, Component: Memory,
    why: 'Convierte la sorpresa en atención y orden.', howTo: 'Voltea cartas y encuentra las parejas.' },
  { key: 'odd', emotion: 'neutral', name: 'Encuentra el distinto', icon: '🎯', seconds: 45, Component: OddOne,
    why: 'Activa tu mente con un reto de atención.', howTo: 'Toca el cuadro con un color un poco distinto. Cada nivel es más difícil.' },
] as GameDef[]).map((g) => translated(g, ['name', 'why', 'howTo']));

export const GAME_BY_KEY = Object.fromEntries(GAMES.map((g) => [g.key, g])) as Record<string, GameDef>;
export const GAME_FOR_EMOTION = Object.fromEntries(GAMES.map((g) => [g.emotion, g])) as Record<EmotionKey, GameDef>;
