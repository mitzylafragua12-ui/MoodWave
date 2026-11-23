import type { EmotionKey } from '../../../lib/types';
import type { GameDef } from './types';
import Bubbles from './Bubbles';
import Stars from './Stars';
import Garden from './Garden';
import Breath from './Breath';
import Wipe from './Wipe';
import Memory from './Memory';
import OddOne from './OddOne';
import Mole from './Mole';
import Simon from './Simon';
import Balloons from './Balloons';
import Lanterns from './Lanterns';
import Puzzle from './Puzzle';
import Kind from './Kind';
import Drum from './Drum';
import Sparks from './Sparks';
import Toss from './Toss';
import Seek from './Seek';
import Lights from './Lights';
import Constellation from './Constellation';
import Sort from './Sort';
import Bouquet from './Bouquet';
import Mandala from './Mandala';
import Cups from './Cups';
import Reflex from './Reflex';
import Changed from './Changed';
import QuickMath from './QuickMath';
import Stroop from './Stroop';
import Schulte from './Schulte';
import { translated } from '../../../i18n/translated';

/** Cuatro juegos para cada una de las 7 emociones (28). El primero de cada emoción es el original. */
export const GAMES: GameDef[] = ([
  // 😊 Feliz: aprovechar la energía
  { key: 'stars', emotion: 'happy', name: 'Lluvia de estrellas', icon: '⭐', seconds: 45, Component: Stars,
    why: 'Aprovecha tu buena energía con un juego ágil.', howTo: 'Mueve la canasta y atrapa las estrellas. Las doradas 🌟 valen 3.' },
  { key: 'mole', emotion: 'happy', name: 'Sonrisas escondidas', icon: '😄', seconds: 40, Component: Mole,
    why: 'Convierte la alegría en reflejos rápidos.', howTo: 'Toca las sonrisas en cuanto aparezcan. Las nubes 🌧️ restan un punto.' },
  { key: 'simon', emotion: 'happy', name: 'Sigue la melodía', icon: '🎵', seconds: 60, Component: Simon,
    why: 'Mantén el buen ánimo con música y memoria.', howTo: 'Mira y escucha la secuencia; después repítela. Cada ronda suma una nota.' },
  { key: 'balloons', emotion: 'happy', name: 'Globos de colores', icon: '🎈', seconds: 45, Component: Balloons,
    why: 'Canaliza la euforia hacia la atención.', howTo: 'Revienta solo los globos del color que se indica arriba. El color cambia cada tanto.' },
  // 😢 Triste: suavidad y cariño
  { key: 'garden', emotion: 'sad', name: 'Jardín de luz', icon: '🌸', seconds: 40, Component: Garden,
    why: 'Una tarea suave y bonita para acompañar la tristeza.', howTo: 'Toca el jardín para plantar flores, una a la vez y sin prisa.' },
  { key: 'lanterns', emotion: 'sad', name: 'Cielo de faroles', icon: '🏮', seconds: 40, Component: Lanterns,
    why: 'Ir despacio también es avanzar.', howTo: 'Toca el cielo para soltar faroles. Si esperas un poco entre uno y otro valen doble.' },
  { key: 'puzzle', emotion: 'sad', name: 'Rompecabezas luminoso', icon: '🧩', seconds: 60, Component: Puzzle,
    why: 'Armar una imagen alegre pieza por pieza da una pequeña victoria.', howTo: 'Toca dos piezas para intercambiarlas hasta que quede igual al modelo.' },
  { key: 'kind', emotion: 'sad', name: 'Pensamientos amables', icon: '💛', seconds: 60, Component: Kind,
    why: 'Practica hablarte con el cariño que le darías a un amigo.', howTo: 'Lee el pensamiento y elige la respuesta más amable.' },
  // 😠 Enojo: soltar la tensión de forma segura
  { key: 'bubbles', emotion: 'angry', name: 'Burbujas de calma', icon: '🫧', seconds: 45, Component: Bubbles,
    why: 'Suelta la tensión del enojo de forma segura.', howTo: 'Revienta las burbujas con lo que te molesta. Las doradas ✨ valen 5.' },
  { key: 'drum', emotion: 'angry', name: 'Tambor de desahogo', icon: '🥁', seconds: 45, Component: Drum,
    why: 'Descarga la energía y deja que el ritmo te baje las revoluciones.', howTo: 'Golpea el tambor al compás. El ritmo se va haciendo más lento.' },
  { key: 'sparks', emotion: 'angry', name: 'Apaga las chispas', icon: '🔥', seconds: 45, Component: Sparks,
    why: 'Calmar el enojo a tiempo evita que crezca.', howTo: 'Toca las chispas para apagarlas antes de que crezcan.' },
  { key: 'toss', emotion: 'angry', name: 'Al cesto', icon: '🗑️', seconds: 45, Component: Toss,
    why: 'Tira simbólicamente lo que te molesta.', howTo: 'Arrastra cada papel arrugado hasta el cesto.' },
  // 😨 Miedo: calma, control y anclaje
  { key: 'breath', emotion: 'fearful', name: 'Faro en calma', icon: '🗼', seconds: 50, Component: Breath,
    why: 'Respirar en ciclos baja la alerta del miedo.', howTo: 'Mantén presionado al inhalar y sostener; suelta al exhalar. Sigue al faro.' },
  { key: 'seek', emotion: 'fearful', name: 'Busca en la calma', icon: '🐚', seconds: 50, Component: Seek,
    why: 'Fijarte en cosas concretas te trae al aquí y ahora.', howTo: 'Encuentra en el tablero el objeto que se indica arriba.' },
  { key: 'lights', emotion: 'fearful', name: 'Enciende las luces', icon: '💡', seconds: 60, Component: Lights,
    why: 'Iluminar la oscuridad paso a paso devuelve la sensación de control.', howTo: 'Cada ventana cambia junto con sus vecinas. Enciéndelas todas.' },
  { key: 'constellation', emotion: 'fearful', name: 'Une las estrellas', icon: '✨', seconds: 50, Component: Constellation,
    why: 'Una tarea tranquila y predecible ordena la mente.', howTo: 'Toca las estrellas en orden para dibujar la constelación.' },
  // 🤢 Disgusto: cambiar el foco a algo agradable
  { key: 'wipe', emotion: 'disgusted', name: 'Ventana limpia', icon: '🧽', seconds: 45, Component: Wipe,
    why: 'Cambia el foco hacia algo agradable.', howTo: 'Arrastra para limpiar la ventana y descubrir el paisaje.' },
  { key: 'sort', emotion: 'disgusted', name: 'Separa y recicla', icon: '♻️', seconds: 45, Component: Sort,
    why: 'Convierte el rechazo en una acción útil y ordenada.', howTo: 'Manda cada objeto al bote correcto: reciclable u orgánico.' },
  { key: 'bouquet', emotion: 'disgusted', name: 'Ramo fresco', icon: '💐', seconds: 50, Component: Bouquet,
    why: 'Lleva tu atención a algo bonito y fresco.', howTo: 'Elige las flores que pide el ramo, en la cantidad indicada.' },
  { key: 'mandala', emotion: 'disgusted', name: 'Mandala de colores', icon: '🎨', seconds: 60, Component: Mandala,
    why: 'Colorear algo bello reemplaza la sensación desagradable.', howTo: 'Elige un color abajo y toca las partes del mandala para pintarlas.' },
  // 😮 Sorpresa: de la sorpresa a la atención
  { key: 'memory', emotion: 'surprised', name: 'Memoria sorpresa', icon: '🎁', seconds: 60, Component: Memory,
    why: 'Convierte la sorpresa en atención y orden.', howTo: 'Voltea cartas y encuentra las parejas.' },
  { key: 'cups', emotion: 'surprised', name: '¿Dónde quedó?', icon: '🥤', seconds: 60, Component: Cups,
    why: 'Seguir algo con la mirada enfoca la mente.', howTo: 'Mira bajo qué vaso queda la bolita, sigue los movimientos y elige.' },
  { key: 'reflex', emotion: 'surprised', name: 'Reflejos de luz', icon: '🚦', seconds: 40, Component: Reflex,
    why: 'Practica reaccionar a lo inesperado con calma.', howTo: 'Espera a que el círculo se ponga verde y tócalo lo más rápido que puedas.' },
  { key: 'changed', emotion: 'surprised', name: '¿Qué cambió?', icon: '🔍', seconds: 60, Component: Changed,
    why: 'Transforma el sobresalto en observación.', howTo: 'Memoriza el tablero; después toca el objeto que cambió.' },
  // 😐 Neutral: activar la mente
  { key: 'odd', emotion: 'neutral', name: 'Encuentra el distinto', icon: '🎯', seconds: 45, Component: OddOne,
    why: 'Activa tu mente con un reto de atención.', howTo: 'Toca el cuadro con un color un poco distinto. Cada nivel es más difícil.' },
  { key: 'math', emotion: 'neutral', name: 'Suma rápida', icon: '➕', seconds: 45, Component: QuickMath,
    why: 'Despierta la mente con cuentas sencillas.', howTo: 'Elige el resultado correcto. Las cuentas se ponen más interesantes.' },
  { key: 'stroop', emotion: 'neutral', name: 'Color y palabra', icon: '🌈', seconds: 45, Component: Stroop,
    why: 'Un reto clásico de concentración.', howTo: 'Toca el color con el que está escrita la palabra, no el que dice.' },
  { key: 'schulte', emotion: 'neutral', name: 'Números en orden', icon: '🔢', seconds: 50, Component: Schulte,
    why: 'Entrena la atención y la vista.', howTo: 'Toca los números del más pequeño al más grande lo más rápido que puedas.' },
] as GameDef[]).map((g) => translated(g, ['name', 'why', 'howTo']));

export const GAME_BY_KEY = Object.fromEntries(GAMES.map((g) => [g.key, g])) as Record<string, GameDef>;
export const GAMES_FOR_EMOTION = GAMES.reduce((acc, g) => {
  (acc[g.emotion] ??= []).push(g);
  return acc;
}, {} as Record<EmotionKey, GameDef[]>);

// Rotación: se recuerda en este navegador qué juegos se jugaron hace poco para no repetir.
const RECENT_KEY = 'mw-games-recent';
function recent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as string[]; } catch { return []; }
}
export function markPlayed(key: string) {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify([key, ...recent().filter((k) => k !== key)].slice(0, 30))); } catch { /* sin almacenamiento */ }
}
/** El juego de esa emoción que hace más tiempo no se juega (si hay empate, uno al azar). */
export function nextGameFor(emotion: EmotionKey): GameDef {
  const r = recent();
  const age = (g: GameDef) => { const i = r.indexOf(g.key); return i === -1 ? Infinity : i; };
  const games = GAMES_FOR_EMOTION[emotion];
  const oldest = Math.max(...games.map(age));
  const pool = games.filter((g) => age(g) === oldest);
  return pool[Math.floor(Math.random() * pool.length)];
}
