import { Link } from 'react-router-dom';
import { t } from '../i18n';
export default function NotFound() {
  return (
    <div className="page center">
      <h1>404</h1>
      <p className="muted">{t('Esta ola no existe.')}</p>
      <Link to="/" className="btn btn-primary">{t('Volver al inicio')}</Link>
    </div>
  );
}
