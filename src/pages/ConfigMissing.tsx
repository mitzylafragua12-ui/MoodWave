// i18n-ignore-file: pantalla técnica para quien despliega el sitio (solo en español).
import { AuthHero } from './Login';

/** Se muestra si el sitio se compiló sin las credenciales de Supabase. */
export default function ConfigMissing() {
  return (
    <div className="auth-wrap">
      <div className="auth-card" style={{ maxWidth: 560 }}>
        <AuthHero />
        <div className="card">
          <h2>Falta conectar la base de datos</h2>
          <p className="muted">Este sitio se compiló sin las credenciales de Supabase, así que no puede iniciar sesión ni guardar datos.</p>
          <ol className="small" style={{ paddingLeft: 18, lineHeight: 1.8 }}>
            <li>En Supabase: <strong>Project Settings → API</strong>, copia la <em>Project URL</em> y la clave <em>anon public</em>.</li>
            <li>En GitHub: <strong>Settings → Secrets and variables → Actions → Variables</strong>, crea <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code>.</li>
            <li>Vuelve a ejecutar el workflow <em>Publicar en GitHub Pages</em>.</li>
          </ol>
          <p className="small faint mb0">En local: copia <code>.env.example</code> a <code>.env.local</code> y llena los mismos dos valores.</p>
        </div>
      </div>
    </div>
  );
}
