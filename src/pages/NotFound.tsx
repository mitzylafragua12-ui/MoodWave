import { Link } from 'react-router-dom';
export default function NotFound() {
  return (
    <div className="page center">
      <h1>404</h1>
      <p className="muted">Esta ola no existe.</p>
      <Link to="/" className="btn btn-primary">Volver al inicio</Link>
    </div>
  );
}
