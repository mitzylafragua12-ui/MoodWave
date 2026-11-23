/** Ruta a un archivo de /public respetando la base (p. ej. /MoodWave/ en GitHub Pages). */
export const asset = (path: string) => import.meta.env.BASE_URL + path.replace(/^\//, '');
