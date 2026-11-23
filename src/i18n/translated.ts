import { t } from './index';

/** Convierte propiedades de texto de un objeto en getters traducidos (el español sigue siendo la clave). */
export function translated<T extends object>(obj: T, keys: (keyof T)[]): T {
  for (const k of keys) {
    const es = obj[k] as unknown as string;
    Object.defineProperty(obj, k, { get: () => t(es), enumerable: true, configurable: true });
  }
  return obj;
}

/** Arreglo de textos cuyos elementos se traducen al leerlos. */
export function translatedList(items: string[]): readonly string[] {
  const arr = [...items];
  items.forEach((es, i) => Object.defineProperty(arr, i, { get: () => t(es), enumerable: true }));
  return arr;
}
