import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, ToggleLeft, ToggleRight, AlertCircle, X, ChevronLeft, ChevronRight } from "lucide-react";
import { promocodesAdminApi, type AdminPromocode } from "@/api/admin";
import { ApiError } from "@/types/api";
import { formatDate } from "@/lib/format";

const LIMIT = 25;

const REWARD_TYPES = ["TRIAL", "DISCOUNT", "DAYS", "POINTS"];
const AVAILABILITY_OPTIONS = ["ALL", "NEW_ONLY", "EXISTING_ONLY"];

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [code, setCode] = useState("");
  const [rewardType, setRewardType] = useState("TRIAL");
  const [reward, setReward] = useState("");
  const [availability, setAvailability] = useState("ALL");
  const [isReusable, setIsReusable] = useState(false);
  const [maxActivations, setMaxActivations] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await promocodesAdminApi.create({
        code: code.trim().toUpperCase(),
        reward_type: rewardType,
        reward: reward ? Number(reward) : undefined,
        availability,
        is_reusable: isReusable,
        max_activations: maxActivations ? Number(maxActivations) : undefined,
        expires_at: expiresAt || undefined,
      });
      onCreated();
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : "Ошибка создания");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border-subtle bg-bg shadow-xl">
        <div className="flex items-center justify-between border-b border-border-subtle px-6 py-4">
          <h2 className="text-base font-semibold text-fg">Создать промокод</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-fg-muted hover:text-fg">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-fg-muted">Код *</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="SUMMER2025"
              required
              className="w-full rounded-xl border border-border-subtle bg-bg-subtle px-3 py-2.5 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-fg-muted">Тип награды *</label>
              <select
                value={rewardType}
                onChange={(e) => setRewardType(e.target.value)}
                className="w-full rounded-xl border border-border-subtle bg-bg-subtle px-3 py-2.5 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {REWARD_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-fg-muted">Значение</label>
              <input
                type="number"
                value={reward}
                onChange={(e) => setReward(e.target.value)}
                placeholder="30"
                className="w-full rounded-xl border border-border-subtle bg-bg-subtle px-3 py-2.5 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-fg-muted">Доступность</label>
            <select
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
              className="w-full rounded-xl border border-border-subtle bg-bg-subtle px-3 py-2.5 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {AVAILABILITY_OPTIONS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-fg-muted">Макс. активаций</label>
              <input
                type="number"
                value={maxActivations}
                onChange={(e) => setMaxActivations(e.target.value)}
                placeholder="∞"
                className="w-full rounded-xl border border-border-subtle bg-bg-subtle px-3 py-2.5 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-fg-muted">Истекает</label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full rounded-xl border border-border-subtle bg-bg-subtle px-3 py-2.5 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isReusable}
              onChange={(e) => setIsReusable(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-accent"
            />
            <span className="text-sm text-fg">Многоразовый</span>
          </label>

          {error && (
            <p className="rounded-xl bg-danger/10 px-4 py-2 text-sm text-danger">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-border-subtle px-4 py-2.5 text-sm font-medium text-fg-muted hover:text-fg transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg hover:bg-accent/90 disabled:opacity-50 transition-colors"
            >
              {saving ? "Создание…" : "Создать"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminPromocodesPage() {
  const [items, setItems] = useState<AdminPromocode[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    promocodesAdminApi
      .list({ limit: LIMIT, offset })
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .catch((e) => setError(e instanceof ApiError ? e.detail : "Ошибка"))
      .finally(() => setLoading(false));
  }, [offset]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (id: number, is_active: boolean) => {
    setActionId(id);
    try {
      await promocodesAdminApi.toggle(id, !is_active);
      load();
    } catch (e) {
      alert(e instanceof ApiError ? e.detail : "Ошибка");
    } finally {
      setActionId(null);
    }
  };

  const remove = async (id: number, code: string) => {
    if (!confirm(`Удалить промокод ${code}?`)) return;
    setActionId(id);
    try {
      await promocodesAdminApi.delete(id);
      load();
    } catch (e) {
      alert(e instanceof ApiError ? e.detail : "Ошибка");
    } finally {
      setActionId(null);
    }
  };

  const totalPages = Math.ceil(total / LIMIT);
  const currentPage = Math.floor(offset / LIMIT) + 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-fg">Промокоды</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg hover:bg-accent/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Создать
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border-subtle">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-bg-subtle">
                <th className="px-4 py-3 text-left text-xs font-medium text-fg-muted">Код</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-fg-muted">Тип</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-fg-muted hidden sm:table-cell">Значение</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-fg-muted hidden md:table-cell">Активации</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-fg-muted hidden lg:table-cell">Истекает</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-fg-muted">Статус</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-fg-muted">Действия</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-border border-t-accent" />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-fg-muted">
                    Промокодов нет
                  </td>
                </tr>
              ) : (
                items.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-border-subtle last:border-0 hover:bg-bg-raised transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-fg">{p.code}</span>
                    </td>
                    <td className="px-4 py-3 text-fg-muted">{p.reward_type}</td>
                    <td className="px-4 py-3 text-fg-muted hidden sm:table-cell">
                      {p.reward ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-fg-muted hidden md:table-cell">
                      {p.total_activations ?? 0}
                      {p.max_activations != null && ` / ${p.max_activations}`}
                    </td>
                    <td className="px-4 py-3 text-xs text-fg-muted hidden lg:table-cell">
                      {p.expires_at ? formatDate(p.expires_at) : "∞"}
                    </td>
                    <td className="px-4 py-3">
                      {p.is_active ? (
                        <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs text-success">
                          Активен
                        </span>
                      ) : (
                        <span className="rounded-full bg-fg-subtle/20 px-2 py-0.5 text-xs text-fg-muted">
                          Отключён
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => toggle(p.id, p.is_active)}
                          disabled={actionId === p.id}
                          className="rounded-lg p-1.5 text-fg-muted hover:text-accent transition-colors disabled:opacity-40"
                          title={p.is_active ? "Отключить" : "Включить"}
                        >
                          {p.is_active ? (
                            <ToggleRight className="h-5 w-5" />
                          ) : (
                            <ToggleLeft className="h-5 w-5" />
                          )}
                        </button>
                        <button
                          onClick={() => remove(p.id, p.code)}
                          disabled={actionId === p.id}
                          className="rounded-lg p-1.5 text-fg-muted hover:text-danger transition-colors disabled:opacity-40"
                          title="Удалить"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-fg-muted">
            Страница {currentPage} из {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - LIMIT))}
              disabled={offset === 0 || loading}
              className="rounded-xl border border-border-subtle p-2 text-fg-muted hover:text-fg disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setOffset(offset + LIMIT)}
              disabled={offset + LIMIT >= total || loading}
              className="rounded-xl border border-border-subtle p-2 text-fg-muted hover:text-fg disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreated={load}
        />
      )}
    </div>
  );
}
