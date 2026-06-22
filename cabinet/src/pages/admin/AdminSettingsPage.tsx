import { useEffect, useState } from "react";
import { Save, AlertCircle } from "lucide-react";
import { settingsAdminApi, type AdminSettings } from "@/api/admin";
import { ApiError } from "@/types/api";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-bg-subtle p-5">
      <h2 className="mb-4 text-sm font-semibold text-fg">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Toggle({ label, sub, checked, onChange }: { label: string; sub?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 cursor-pointer">
      <div>
        <p className="text-sm text-fg">{label}</p>
        {sub && <p className="text-xs text-fg-muted">{sub}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${checked ? "bg-accent" : "bg-border"}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </label>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-fg-muted">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full rounded-xl border border-border-subtle bg-bg px-3 py-2.5 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent" />
    </div>
  );
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    settingsAdminApi.get()
      .then(setSettings)
      .catch(e => setError(e instanceof ApiError ? e.detail : "Ошибка"))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await settingsAdminApi.update({
        access: settings.access,
        registration_allowed: settings.access.registration_allowed,
        payments_allowed: settings.access.payments_allowed,
        rules_required: settings.requirements.rules_required,
        channel_required: settings.requirements.channel_required,
        channel_link: settings.requirements.channel_link,
        rules_link: settings.requirements.rules_link,
        referral: {
          enable: settings.referral.enable,
          reward_type: settings.referral.reward.type,
          reward_value: Object.values(settings.referral.reward.config)[0] ?? 0,
          accrual_strategy: settings.referral.accrual_strategy,
        },
        backup: settings.backup,
        trial_channel_guard: settings.extra.trial_channel_guard,
        mini_app_reserve: settings.extra.mini_app_reserve,
        notifications: settings.notifications,
      });
      setSettings(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const upd = (path: string[], value: unknown) => {
    setSettings(prev => {
      if (!prev) return prev;
      const copy = JSON.parse(JSON.stringify(prev)) as AdminSettings;
      let cur: Record<string, unknown> = copy as unknown as Record<string, unknown>;
      for (let i = 0; i < path.length - 1; i++) {
        cur = cur[path[i]!] as Record<string, unknown>;
      }
      cur[path[path.length - 1]!] = value;
      return copy;
    });
  };

  if (loading) return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" /></div>;
  if (!settings) return null;

  const firstRewardValue = Object.values(settings.referral.reward.config)[0] ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-fg">Настройки</h1>
        <button onClick={save} disabled={saving} className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${saved ? "bg-success text-white" : "bg-accent text-accent-fg hover:bg-accent/90"}`}>
          <Save className="h-4 w-4" />
          {saved ? "Сохранено!" : saving ? "Сохранение…" : "Сохранить"}
        </button>
      </div>

      {error && <div className="flex items-center gap-2 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger"><AlertCircle className="h-4 w-4" />{error}</div>}

      {/* Access */}
      <Section title="Доступ">
        <div>
          <label className="mb-1 block text-xs font-medium text-fg-muted">Режим доступа</label>
          <select value={settings.access.mode} onChange={e => upd(["access", "mode"], e.target.value)}
            className="w-full rounded-xl border border-border-subtle bg-bg px-3 py-2.5 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent">
            <option value="PUBLIC">PUBLIC — открытый</option>
            <option value="INVITED">INVITED — только по приглашению</option>
            <option value="RESTRICTED">RESTRICTED — всё заблокировано</option>
          </select>
        </div>
        <Toggle label="Разрешить регистрацию" checked={settings.access.registration_allowed} onChange={v => upd(["access", "registration_allowed"], v)} />
        <Toggle label="Разрешить оплату" checked={settings.access.payments_allowed} onChange={v => upd(["access", "payments_allowed"], v)} />
      </Section>

      {/* Requirements */}
      <Section title="Требования">
        <Toggle label="Принять правила" sub="Пользователь должен принять правила при регистрации" checked={settings.requirements.rules_required} onChange={v => upd(["requirements", "rules_required"], v)} />
        <Toggle label="Обязательный канал" sub="Пользователь должен подписаться на канал" checked={settings.requirements.channel_required} onChange={v => upd(["requirements", "channel_required"], v)} />
        <Field label="Ссылка на канал" value={settings.requirements.channel_link} onChange={v => upd(["requirements", "channel_link"], v)} />
        <Field label="Ссылка на правила" value={settings.requirements.rules_link} onChange={v => upd(["requirements", "rules_link"], v)} />
      </Section>

      {/* Referral */}
      <Section title="Реферальная программа">
        <Toggle label="Включена" checked={settings.referral.enable} onChange={v => upd(["referral", "enable"], v)} />
        <div>
          <label className="mb-1 block text-xs font-medium text-fg-muted">Тип награды</label>
          <select value={settings.referral.reward.type} onChange={e => upd(["referral", "reward", "type"], e.target.value)}
            className="w-full rounded-xl border border-border-subtle bg-bg px-3 py-2.5 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent">
            <option value="EXTRA_DAYS">Дополнительные дни</option>
            <option value="POINTS">Баллы</option>
          </select>
        </div>
        <Field label={settings.referral.reward.type === "EXTRA_DAYS" ? "Дней за реферала" : "Баллов за реферала"} type="number"
          value={String(firstRewardValue)}
          onChange={v => upd(["referral", "reward", "config"], { FIRST: Number(v) })} />
        <div>
          <label className="mb-1 block text-xs font-medium text-fg-muted">Стратегия начисления</label>
          <select value={settings.referral.accrual_strategy} onChange={e => upd(["referral", "accrual_strategy"], e.target.value)}
            className="w-full rounded-xl border border-border-subtle bg-bg px-3 py-2.5 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent">
            <option value="ON_FIRST_PAYMENT">При первой оплате реферала</option>
            <option value="ON_REGISTRATION">При регистрации</option>
          </select>
        </div>
      </Section>

      {/* Backup */}
      <Section title="Резервные копии">
        <Toggle label="Автобэкап" checked={settings.backup.enabled} onChange={v => upd(["backup", "enabled"], v)} />
        <Toggle label="Отправлять в чат" checked={settings.backup.send_to_chat} onChange={v => upd(["backup", "send_to_chat"], v)} />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Интервал (часов)" type="number" value={String(settings.backup.interval_hours)} onChange={v => upd(["backup", "interval_hours"], Number(v))} />
          <Field label="Макс. файлов" type="number" value={String(settings.backup.max_files)} onChange={v => upd(["backup", "max_files"], Number(v))} />
        </div>
      </Section>

      {/* Extra */}
      <Section title="Дополнительно">
        <Toggle label="Охрана канала для триала" sub="Запрещать пробный период без подписки на канал" checked={settings.extra.trial_channel_guard} onChange={v => upd(["extra", "trial_channel_guard"], v)} />
        <Toggle label="Резервный Mini App" checked={settings.extra.mini_app_reserve} onChange={v => upd(["extra", "mini_app_reserve"], v)} />
        <Toggle label="Сброс одного устройства" checked={settings.extra.device_single_reset.enabled} onChange={v => upd(["extra", "device_single_reset", "enabled"], v)} />
        <Toggle label="Сброс всех устройств" checked={settings.extra.device_all_reset.enabled} onChange={v => upd(["extra", "device_all_reset", "enabled"], v)} />
        <Toggle label="Сброс ссылки" checked={settings.extra.link_reset.enabled} onChange={v => upd(["extra", "link_reset", "enabled"], v)} />
      </Section>

      {/* Notifications */}
      <Section title="Уведомления">
        <div className="space-y-3">
          {Object.entries(settings.notifications).map(([key, enabled]) => (
            <Toggle key={key} label={key} checked={enabled} onChange={v => upd(["notifications", key], v)} />
          ))}
        </div>
      </Section>
    </div>
  );
}
