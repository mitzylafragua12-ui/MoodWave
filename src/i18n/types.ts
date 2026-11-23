/** Un idioma de la interfaz. La clave de cada texto es el español tal como aparece en el código. */
export interface Locale {
  /** Nombre del idioma en su propio idioma (se muestra en el selector). */
  label: string;
  /** Código para fechas y números (Intl). */
  locale: string;
  dict: Record<string, string>;
  /** Mensajes con partes variables (errores del servidor). $1, $2… son los grupos capturados. */
  patterns: [RegExp, string][];
  /** Logros: en la base están en español; aquí su traducción por clave. */
  badges: Record<string, { name: string; description: string }>;
}
