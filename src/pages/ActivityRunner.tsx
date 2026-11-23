import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { useAuth } from '../context/AuthContext';
import { errMsg, useToast } from '../context/ToastContext';
import { ACTIVITY_BY_KEY } from '../lib/catalog';
import type { CompletionInput, CompletionResult, EmotionKey } from '../lib/types';
import { EmotionChip, ErrorBox, PageHead, Spinner } from '../components/ui';
import { RewardModal } from '../components/RewardModal';
import Meditation from './activities/Meditation';
import Journal from './activities/Journal';
import Minigame from './activities/Minigame';
import Music from './activities/Music';

export interface ActivityProps {
  emotion: EmotionKey | null;
  onComplete: (input: CompletionInput) => Promise<void>;
  busy: boolean;
}

export default function ActivityRunner() {
  const { assignmentId = '' } = useParams();
  const { refresh, profile } = useAuth();
  const toast = useToast();
  const { data: asg, error, loading } = useAsync(() => api.getAssignment(assignmentId), [assignmentId]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CompletionResult | null>(null);

  async function complete(input: CompletionInput) {
    setBusy(true);
    try {
      const r = await api.completeActivity(assignmentId, input);
      setResult(r);
      await refresh();
    } catch (e) {
      toast(errMsg(e), 'error');
    } finally { setBusy(false); }
  }

  if (loading) return <div className="page"><Spinner /></div>;
  if (error || !asg) return <div className="page"><ErrorBox error={error ?? 'Actividad no encontrada'} /><Link to="/actividades" className="btn btn-ghost mt">Volver</Link></div>;

  const a = ACTIVITY_BY_KEY[asg.activity];
  const props = { emotion: asg.emotion, onComplete: complete, busy: busy || !!profile?.suspended };

  return (
    <div className="page">
      <PageHead eyebrow={`Actividad · +${a.base_xp} XP`} title={`${a.icon} ${a.name}`} color={a.color}
        subtitle={<>{a.description} {asg.emotion && <EmotionChip emotion={asg.emotion} />}</>}
        actions={<Link to="/actividades" className="btn btn-ghost btn-sm">Cambiar actividad</Link>} />
      {asg.completed && !result ? (
        <div className="card center">
          <h2>Ya completaste esta actividad ✓</h2>
          <p className="muted">Haz una nueva detección o elige otra actividad.</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <Link to="/detectar" className="btn btn-primary">Nueva detección</Link>
            <Link to="/actividades" className="btn btn-ghost">Actividades</Link>
          </div>
        </div>
      ) : (
        <>
          {asg.activity === 'meditation' && <Meditation {...props} />}
          {asg.activity === 'journaling' && <Journal {...props} />}
          {asg.activity === 'minigame' && <Minigame {...props} />}
          {asg.activity === 'music' && <Music {...props} />}
        </>
      )}
      {result && <RewardModal result={result} onClose={() => setResult(null)} />}
    </div>
  );
}
