import { useEffect, useState } from 'react';
import { Clock, X, AlertCircle } from 'lucide-react';

interface SessionTimerProps {
  startedAt: string;
  isTrial: boolean;
  trialDurationSeconds?: number;
  onExpire?: () => void;
}

export default function SessionTimer({ startedAt, isTrial, trialDurationSeconds = 300, onExpire }: SessionTimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const update = () => {
      const now = Date.now();
      const secs = Math.floor((now - start) / 1000);
      setElapsed(secs);
      if (isTrial && secs >= trialDurationSeconds) {
        onExpire?.();
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startedAt, isTrial, trialDurationSeconds, onExpire]);

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const remaining = trialDurationSeconds - elapsed;
  const pct = isTrial ? Math.min((elapsed / trialDurationSeconds) * 100, 100) : 0;
  const isWarning = isTrial && remaining <= 60 && remaining > 0;
  const isExpired = isTrial && elapsed >= trialDurationSeconds;

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all ${
      isExpired
        ? 'bg-red-500/10 border-red-500/30 text-red-400'
        : isWarning
        ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
        : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
    }`}>
      {isExpired ? <AlertCircle size={16} /> : <Clock size={16} />}
      <div className="flex flex-col gap-0.5">
        <div className="text-xs font-medium">
          {isTrial
            ? isExpired
              ? 'Trial Expired'
              : `Trial: ${formatTime(Math.max(remaining, 0))} left`
            : `Session: ${formatTime(elapsed)}`}
        </div>
        {isTrial && !isExpired && (
          <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isWarning ? 'bg-yellow-400' : 'bg-cyan-400'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
