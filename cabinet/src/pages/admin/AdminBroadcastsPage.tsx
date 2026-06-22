import { useEffect, useState, useCallback } from "react";
import { RefreshCw, AlertCircle, CheckCircle, XCircle, Clock } from "lucide-react";
import { broadcastsAdminApi, type AdminBroadcast } from "@/api/admin";
import { ApiError } from "@/types/api";
import { formatDate } from "@/lib/format";

const AUDIENCE_LABELS: Record<string, string> = {
  ALL: "Все пользователи",
  SUBSCRIBED: "С активной подпиской",
  PLAN: "По тарифу",
};

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  PROCESSING: { label: "В процессе", icon: Clock, cls: "text-warning" },
  COMPLETED: { label: "Завершена", icon: CheckCircle, cls: "text-success" },
  CANCELED: { label: "Отменена", icon: XCircle, cls: "text-danger" },
};

function BroadcastCard({ b, onRefresh }: { b: AdminBroadcast; onRefresh: (id: string) => void }) {
  const cfg = STATUS_CONFIG[b.status] ?? { label: b.status, icon: Clock, cls: "text-fg-muted" };
  const Icon = cfg.icon;
  const successRate = b.total_count > 0 ? Math.round(b.success_count / b.total_count * 100) : 0;

  return (
    <div className="rounded-2xl border border-border-subtle bg-bg-subtle p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${cfg.cls}`} />
            <span className={`text-sm font-medium ${cfg.cls}`}>{cfg.label}</span>
          </div>
          <p className="mt-1 text-xs text-fg-muted">
            {AUDIENCE_LABELS[b.audience] ?? b.audience}
            {b.created_at && ` · ${formatDate(b.created_at)}`}
          </p>
        </div>
        {b.status === "PROCESSING" && (
          <button onClick={() => onRefresh(b.task_id)} className="rounded-lg p-1.5 text-fg-muted hover:text-accent transition-colors" title="Обновить">
            <RefreshCw className="h-4 w-4" />
          </button>
        )}
      </div>

      {b.total_count > 0 && (
        <>
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-fg-muted">Прогресс</span>
            <span className="font-medium text-fg">{b.success_count + b.failed_count} / {b.total_count}</span>
          </div>
          <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-bg-raised">
            <div
              className="h-full rounded-full bg-success transition-all"
              style={{ width: `${successRate}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs text-center">
            <div className="rounded-xl bg-bg-raised p-3">
              <p className="text-2xl font-bold text-fg">{b.total_count}</p>
              <p className="text-fg-muted mt-0.5">Всего</p>
            </div>
            <div className="rounded-xl bg-success/10 p-3">
              <p className="text-2xl font-bold text-success">{b.success_count}</p>
              <p className="text-fg-muted mt-0.5">Доставлено</p>
            </div>
            <div className="rounded-xl bg-danger/10 p-3">
              <p className="text-2xl font-bold text-danger">{b.failed_count}</p>
              <p className="text-fg-muted mt-0.5">Ошибок</p>
            </div>
          </div>
        </>
      )}

      <p className="mt-3 font-mono text-[10px] text-fg-subtle break-all">{b.task_id}</p>
    </div>
  );
}

export default function AdminBroadcastsPage() {
  const [broadcasts, setBroadcasts] = useState<AdminBroadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    broadcastsAdminApi.list()
      .then(r => setBroadcasts(r.items))
      .catch(e => setError(e instanceof ApiError ? e.detail : "Ошибка"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const refreshOne = async (task_id: string) => {
    try {
      const updated = await broadcastsAdminApi.get(task_id);
      setBroadcasts(prev => prev.map(b => b.task_id === task_id ? updated : b));
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-fg">Рассылки</h1>
        <button onClick={load} className="flex items-center gap-2 rounded-xl border border-border-subtle px-3 py-2 text-sm text-fg-muted hover:text-fg transition-colors">
          <RefreshCw className="h-4 w-4" /> Обновить
        </button>
      </div>

      <div className="rounded-2xl border border-border-subtle bg-accent/5 px-5 py-4 text-sm text-fg-muted">
        💡 Рассылки запускаются через Telegram бота. Здесь отображается история и статус выполнения.
      </div>

      {error && <div className="flex items-center gap-2 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger"><AlertCircle className="h-4 w-4" />{error}</div>}

      {loading ? (
        <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" /></div>
      ) : broadcasts.length === 0 ? (
        <div className="py-20 text-center text-fg-muted">Рассылок пока нет</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {broadcasts.map(b => <BroadcastCard key={b.task_id} b={b} onRefresh={refreshOne} />)}
        </div>
      )}
    </div>
  );
}
