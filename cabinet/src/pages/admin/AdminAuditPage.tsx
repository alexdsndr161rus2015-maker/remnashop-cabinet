import { useEffect, useState } from "react";
import { AlertCircle, ShieldAlert } from "lucide-react";
import { auditAdminApi, type AuditEntry } from "@/api/admin";
import { ApiError } from "@/types/api";

const METHOD_COLOR: Record<string, string> = {
  POST: "text-success",
  PUT: "text-accent",
  PATCH: "text-accent",
  DELETE: "text-danger",
};

// Короткое читаемое действие из пути (например, /gateways/5/fields/api_key).
function actionLabel(path: string): string {
  const p = path.replace(/^\/api\/v1\/admin\//, "");
  const map: [RegExp, string][] = [
    [/^gateways\/\d+\/fields\/(.+)$/, "Шлюз: ключ «$1»"],
    [/^gateways\/\d+\/toggle$/, "Шлюз: вкл/выкл"],
    [/^plans/, "Тарифы"],
    [/^promocodes/, "Промокоды"],
    [/^users\/\d+\/block$/, "Пользователь: блокировка"],
    [/^users\/\d+\/role$/, "Пользователь: роль"],
    [/^users\/\d+\/discount$/, "Пользователь: скидка"],
    [/^broadcasts/, "Рассылки"],
    [/^ad-links/, "Рекл. ссылки"],
    [/^appearance/, "Оформление"],
    [/^settings/, "Настройки"],
    [/^support/, "Поддержка"],
  ];
  for (const [re, label] of map) {
    if (re.test(p)) return p.replace(re, label);
  }
  return p;
}

function fmt(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function AdminAuditPage() {
  const [items, setItems] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    auditAdminApi
      .list(200)
      .then((r) => setItems(r.items))
      .catch((e) => setError(e instanceof ApiError ? e.detail : "Ошибка"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-fg-muted" />
        <h1 className="text-2xl font-bold text-fg">Аудит действий</h1>
      </div>

      <p className="text-sm text-fg-muted">
        Изменяющие действия в админке: кто, когда и что менял.
      </p>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
        </div>
      ) : items.length === 0 ? (
        <div className="py-20 text-center text-fg-muted">Записей пока нет</div>
      ) : (
        <div className="space-y-2">
          {items.map((it) => (
            <div
              key={it.id}
              className="flex items-center gap-3 rounded-xl border border-border-subtle bg-bg-subtle px-4 py-3"
            >
              <span className={`w-14 shrink-0 text-xs font-bold ${METHOD_COLOR[it.method] ?? "text-fg-muted"}`}>
                {it.method}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-fg">{actionLabel(it.path)}</p>
                <p className="truncate text-xs text-fg-subtle">{it.actor}</p>
              </div>
              <span className="shrink-0 text-xs text-fg-subtle tabular">{fmt(it.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
