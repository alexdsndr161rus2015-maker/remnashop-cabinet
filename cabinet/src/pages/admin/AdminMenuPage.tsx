import { useEffect, useState } from "react";
import { Save, CheckCircle2, SquareMenu, ChevronUp, ChevronDown } from "lucide-react";
import { menuAdminApi, type MenuConfig } from "@/api/menu";
import { ApiError } from "@/types/api";

type Key = "cabinet_miniapp" | "cabinet_url" | "connect_miniapp" | "connect_url" | "remna_sub";

const META: Record<Key, { title: string; desc: string }> = {
  cabinet_miniapp: {
    title: "Личный кабинет (Mini App)",
    desc: "Открывает кабинет внутри Telegram. Синяя, основная.",
  },
  cabinet_url: {
    title: "Кабинет в браузере",
    desc: "Прямая ссылка на сайт кабинета (резерв, если Mini App не открылся).",
  },
  connect_miniapp: {
    title: "Подключиться (Mini App)",
    desc: "Открывает раздел «Устройства» кабинета внутри Telegram.",
  },
  connect_url: {
    title: "Подключиться (ссылка)",
    desc: "Раздел «Устройства» кабинета прямой ссылкой в браузере.",
  },
  remna_sub: {
    title: "Подписка (резерв)",
    desc: "Стандартная страница подписки Remnawave — на случай, если кабинет недоступен.",
  },
};

const ORDER_FALLBACK: Key[] = [
  "cabinet_miniapp",
  "cabinet_url",
  "connect_miniapp",
  "connect_url",
  "remna_sub",
];

export default function AdminMenuPage() {
  const [cfg, setCfg] = useState<MenuConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    menuAdminApi
      .get()
      .then(setCfg)
      .catch((e) => setError(e instanceof ApiError ? e.detail : "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (key: Key) => cfg && setCfg({ ...cfg, [key]: !cfg[key] });

  // Список ключей в текущем порядке (с фолбэком, если бэкенд не прислал order).
  const orderKeys: Key[] = (() => {
    const fromCfg = (cfg?.order ?? []).filter((k): k is Key => k in META);
    for (const k of ORDER_FALLBACK) if (!fromCfg.includes(k)) fromCfg.push(k);
    return fromCfg;
  })();

  const move = (idx: number, dir: -1 | 1) => {
    if (!cfg) return;
    const j = idx + dir;
    const a = orderKeys[idx];
    const b = orderKeys[j];
    if (a === undefined || b === undefined) return;
    const next = [...orderKeys];
    next[idx] = b;
    next[j] = a;
    setCfg({ ...cfg, order: next });
  };

  const save = async () => {
    if (!cfg) return;
    setSaving(true);
    setError(null);
    try {
      const next = await menuAdminApi.update(cfg);
      setCfg(next);
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
  if (!cfg) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="sticky top-0 z-10 -mx-5 flex items-center justify-between border-b border-border-subtle bg-bg/80 px-5 py-3 backdrop-blur-md md:-mx-8 md:px-8">
        <h1 className="flex items-center gap-2 text-xl font-bold text-fg md:text-2xl">
          <SquareMenu className="h-5 w-5 text-accent" />
          Меню бота
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
        Какие кнопки показывать в главном меню бота и в каком порядке. Стрелками
        справа двигайте кнопки выше/ниже. Применяется сразу после «Сохранить» —
        перезапуск не нужен. (Действует, когда веб-кабинет включён.)
      </p>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="space-y-2">
        {orderKeys.map((key, idx) => {
          const on = cfg[key];
          const meta = META[key];
          return (
            <div
              key={key}
              className={`flex items-center gap-3 rounded-2xl border p-4 transition-colors ${
                on ? "border-border-subtle bg-bg-subtle" : "border-border-subtle bg-bg opacity-70"
              }`}
            >
              <input
                type="checkbox"
                checked={on}
                onChange={() => toggle(key)}
                className="h-4 w-4 shrink-0 cursor-pointer accent-[var(--accent)]"
              />
              <div className="min-w-0 flex-1">
                <span className="text-sm font-semibold text-fg">{meta.title}</span>
                <p className="mt-0.5 text-xs text-fg-muted">{meta.desc}</p>
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <button
                  type="button"
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0}
                  aria-label="Выше"
                  className="rounded-lg border border-border-subtle p-1 text-fg-muted transition-colors hover:bg-bg-overlay hover:text-fg disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => move(idx, 1)}
                  disabled={idx === orderKeys.length - 1}
                  aria-label="Ниже"
                  className="rounded-lg border border-border-subtle p-1 text-fg-muted transition-colors hover:bg-bg-overlay hover:text-fg disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-fg-subtle">
        Порядок и состав действуют только при включённом веб-кабинете. Если
        выключить все — в меню останутся только базовые разделы (Устройства,
        Подписка и т.д.). Когда веб-кабинет выключен, показывается стандартная
        кнопка подписки Remnawave.
      </p>
    </div>
  );
}
