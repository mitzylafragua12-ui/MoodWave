import type { CSSProperties, ReactNode } from 'react';
import { EMOTION_BY_KEY, ROLE_BY_KEY } from '../lib/catalog';
import type { EmotionKey, RoleKey } from '../lib/types';
import { t } from '../i18n';

export const Spinner = () => <div className="spinner" role="progressbar" aria-label={t('Cargando')} />;

export function ProgressBar({ value, color, label }: { value: number; color?: string; label?: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className="bar" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <span style={{ width: `${pct}%`, '--fill': color } as CSSProperties} />
    </div>
  );
}

export function EmotionChip({ emotion, confidence }: { emotion: EmotionKey | null; confidence?: number | null }) {
  if (!emotion) return <span className="chip faint">{t('Sin detección')}</span>;
  const e = EMOTION_BY_KEY[emotion];
  return (
    <span className="chip" style={{ '--c': e.color } as CSSProperties}>
      <span className="chip-dot" /> {e.emoji} {e.label}
      {confidence != null && <span className="faint">· {Math.round(confidence * 100)}%</span>}
    </span>
  );
}

export function RoleChip({ role }: { role: RoleKey }) {
  const colors: Partial<Record<RoleKey, string>> = {
    guest: '#64748b', listener: '#22d3ee', curator: '#4ade80', mentor: '#a78bfa',
    analyst: '#38bdf8', admin: '#f43f5e', superadmin: '#eab308',
  };
  return <span className="chip" style={{ '--c': colors[role] } as CSSProperties}><span className="chip-dot" />{ROLE_BY_KEY[role].name}</span>;
}

export function PageHead({ eyebrow, title, subtitle, actions, color }: {
  eyebrow?: string; title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; color?: string;
}) {
  return (
    <header className="page-head">
      <div>
        {eyebrow && <div className="eyebrow" style={color ? { color } : undefined}>{eyebrow}</div>}
        <h1>{title}</h1>
        {subtitle && <p className="subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="row">{actions}</div>}
    </header>
  );
}

export function Modal({ children, onClose, left }: { children: ReactNode; onClose?: () => void; left?: boolean }) {
  return (
    <div className="modal-back" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className={`modal${left ? ' left' : ''}`} role="dialog" aria-modal="true">{children}</div>
    </div>
  );
}

export function ErrorBox({ error }: { error: string | null }) {
  return error ? <div className="error" role="alert">{error}</div> : null;
}
