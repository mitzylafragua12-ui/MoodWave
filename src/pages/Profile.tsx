import { useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { useAuth, useProfile } from '../context/AuthContext';
import { errMsg, useToast } from '../context/ToastContext';
import { ACTIVITIES, ACTIVITY_BY_KEY, EMOTIONS } from '../lib/catalog';
import { LEVEL_NAMES, LEVEL_THRESHOLDS, levelProgress, type BadgeStats } from '../lib/gamification';
import { fmtDate } from '../lib/date';
import { BadgeGrid } from '../components/BadgeGrid';
import { FaceEnrollCard } from '../components/FaceEnrollCard';
import { ErrorBox, PageHead, ProgressBar, RoleChip, Spinner } from '../components/ui';

export default function Profile() {
  const profile = useProfile();
  const { refresh } = useAuth();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState(profile.username);
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [formErr, setFormErr] = useState<string | null>(null);

  const { data, error } = useAsync(async () => {
    const [badges, earned, counts, detections] = await Promise.all([
      api.getBadges(), api.getMyBadges(), api.getActivityCounts(), api.getDetections(3650),
    ]);
    return { badges, earned, counts, detections };
  }, [profile.xp]);

  const lp = levelProgress(profile.xp);
  const stats: BadgeStats | undefined = data ? {
    detections: data.detections.length,
    completions: Object.values(data.counts).reduce((s, n) => s + n, 0),
    perActivity: Object.fromEntries(ACTIVITIES.map((a) => [a.id, data.counts[a.key]])),
    streak: Math.max(profile.streak, profile.longest_streak),
    level: profile.level,
    distinctEmotions: new Set(data.detections.map((d) => d.emotion)).size,
    distinctActivities: ACTIVITIES.filter((a) => data.counts[a.key] > 0).length,
  } : undefined;
  const last30 = data?.detections.filter((d) => Date.parse(d.created_at) > Date.now() - 30 * 86400_000) ?? [];
  const maxEmo = Math.max(1, ...EMOTIONS.map((e) => last30.filter((d) => d.emotion === e.key).length));

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) return setFormErr('Usuario: 3-24 caracteres (letras, números o _).');
    try {
      await api.updateProfile({ username, display_name: displayName });
      await refresh();
      setEditing(false); setFormErr(null);
      toast('Perfil actualizado');
    } catch (err) { setFormErr(errMsg(err)); }
  }

  return (
    <div className="page">
      <PageHead eyebrow="Perfil" title="Tu progreso" color="var(--purple-soft)" />
      <ErrorBox error={error} />
      <div className="split-2-1">
        <div className="stack">
          <div className="card">
            <div className="row" style={{ gap: 18, alignItems: 'center' }}>
              <div className="avatar" aria-hidden>{(profile.display_name || profile.username).slice(0, 1).toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <h2 className="mb0">{profile.display_name || profile.username}</h2>
                <div className="row small muted" style={{ marginTop: 4 }}>@{profile.username} <RoleChip role={profile.role} /></div>
                <div className="small faint" style={{ marginTop: 4 }}>Miembro desde {fmtDate(profile.created_at)}</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing((v) => !v)}>{editing ? 'Cancelar' : 'Editar'}</button>
            </div>
            {editing && (
              <form onSubmit={save} className="mt">
                <div className="grid grid-2">
                  <div className="field"><label htmlFor="un">Usuario</label><input id="un" className="input" value={username} onChange={(e) => setUsername(e.target.value)} /></div>
                  <div className="field"><label htmlFor="dn">Nombre visible</label><input id="dn" className="input" value={displayName} maxLength={40} onChange={(e) => setDisplayName(e.target.value)} /></div>
                </div>
                <ErrorBox error={formErr} />
                <button className="btn btn-primary btn-sm mt">Guardar</button>
              </form>
            )}
            <div className="mt">
              <div className="spread small" style={{ marginBottom: 6 }}>
                <span><strong>Nivel {lp.level}</strong> · {LEVEL_NAMES[lp.level - 1]}</span>
                <span className="muted">{profile.xp} / {lp.next ?? '—'} XP</span>
              </div>
              <ProgressBar value={lp.ratio} color="var(--cyan)" label="Progreso de nivel" />
            </div>
            <div className="stats-row mt">
              <div className="stat"><div className="value" style={{ color: 'var(--red)' }}>{profile.streak}</div><div className="label">Racha actual</div></div>
              <div className="stat"><div className="value" style={{ color: 'var(--yellow)' }}>{profile.longest_streak}</div><div className="label">Mejor racha</div></div>
              <div className="stat"><div className="value" style={{ color: 'var(--purple-soft)' }}>{data?.earned.length ?? '—'}</div><div className="label">Logros</div></div>
            </div>
          </div>

          <div className="card">
            <h2>Logros</h2>
            {!data ? <Spinner /> : <BadgeGrid badges={data.badges} earned={data.earned} stats={stats} />}
          </div>
        </div>

        <div className="stack">
          <FaceEnrollCard />
          <div className="card">
            <h3>Emociones (30 días)</h3>
            {last30.length === 0 ? <p className="muted small">Sin registros.</p> : EMOTIONS.map((e) => {
              const n = last30.filter((d) => d.emotion === e.key).length;
              return (
                <div key={e.key} className="hbar-row">
                  <span className="small">{e.emoji} {e.label}</span>
                  <ProgressBar value={n / maxEmo} color={e.color} label={e.label} />
                  <span className="small faint">{n}</span>
                </div>
              );
            })}
          </div>
          <div className="card">
            <h3>Actividades completadas</h3>
            {data && ACTIVITIES.map((a) => (
              <div key={a.key} className="spread small" style={{ marginBottom: 6 }}>
                <span>{ACTIVITY_BY_KEY[a.key].icon} {a.name}</span><strong>{data.counts[a.key]}</strong>
              </div>
            ))}
          </div>
          <div className="card">
            <h3>Niveles</h3>
            {LEVEL_NAMES.map((n, i) => (
              <div key={n} className="spread small" style={{ marginBottom: 4, opacity: i + 1 <= lp.level ? 1 : 0.5 }}>
                <span>{i + 1 <= lp.level ? '●' : '○'} {i + 1}. {n}</span><span className="faint">{LEVEL_THRESHOLDS[i]} XP</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
