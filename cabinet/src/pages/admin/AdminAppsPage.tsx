import { useEffect, useState } from "react";
import { Save, CheckCircle2, Star, Smartphone } from "lucide-react";
import { appsAdminApi } from "@/api/apps";
import { APPS, DEFAULT_PRIORITY } from "@/data/apps";
import { ApiError } from "@/types/api";

export default function AdminAppsPage() {
  const [enabled, setEnabled] = useState<Set<string>>(new Set());
  const [priority, setPriority] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    appsAdminApi
      .get()
      .then((cfg) => {
        // enabled === null → показываются все приложения
        setEnabled(new Set(cfg.enabled ?? APPS.map((a) => a.id)));
        setPriority(cfg.priority);
      })
      .catch((e) => setError(e instanceof ApiError ? e.detail : "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (id: string) => {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (priority === id) setPriority(null); // выключили приоритетное — сбрасываем
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await appsAdminApi.update({
        priority: priority || null,
        enabled: Array.from(enabled),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
    );

  const effectivePriority = priority || DEFAULT_PRIORITY;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 -mx-5 flex items-center justify-between border-b border-border-subtle bg-bg/80 px-5 py-3 backdrop-blur-md md:-mx-8 md:px-8">
        <h1 className="flex items-center gap-2 text-xl font-bold text-fg md:text-2xl">
          <Smartphone className="h-5 w-5 text-accent" />
          Приложения
        </h1>
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? "Сохранено" : saving ? "Сохранение…" : "Сохранить"}
        </button>
      </div>

      <p className="text-sm text-fg-muted">
        Отметьте приложения, которые показывать пользователям на странице
        «Подключить устройство». Звёздочкой выберите{" "}
        <span className="text-fg">приоритетное</span> — оно встанет первым и с
        пометкой «Рекомендуем».
      </p>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="space-y-2">
        {APPS.map((app) => {
          const on = enabled.has(app.id);
          const isPriority = effectivePriority === app.id && on;
          return (
            <div
              key={app.id}
              className={`flex items-center gap-3 rounded-2xl border p-4 transition-colors ${
                on ? "border-border-subtle bg-bg-subtle" : "border-border-subtle bg-bg opacity-60"
              }`}
            >
              {/* Чекбокс «показывать» */}
              <label className="flex flex-1 cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(app.id)}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-fg">{app.name}</span>
                    {isPriority && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent-subtle px-2 py-0.5 text-[10px] font-medium text-accent">
                        <Star className="h-3 w-3" />
                        Рекомендуем
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-fg-muted">
                    {app.desc} · {app.platforms.join(", ")}
                  </p>
                </div>
              </label>

              {/* Сделать приоритетным */}
              <button
                type="button"
                onClick={() => on && setPriority(app.id)}
                disabled={!on}
                title={on ? "Сделать приоритетным" : "Сначала включите приложение"}
                className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border transition-colors ${
                  isPriority
                    ? "border-accent bg-accent-subtle text-accent"
                    : "border-border-subtle text-fg-subtle hover:text-fg disabled:opacity-40"
                }`}
              >
                <Star className={`h-4 w-4 ${isPriority ? "fill-current" : ""}`} />
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-fg-subtle">
        Если не отмечено ни одно приложение, у пользователей будет пусто — оставьте
        хотя бы одно. Сам список приложений (deep-link'и) задаётся в коде кабинета
        (<span className="text-fg">data/apps.ts</span>).
      </p>
    </div>
  );
}
