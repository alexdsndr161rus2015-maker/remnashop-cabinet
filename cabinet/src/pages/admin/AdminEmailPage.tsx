import { useEffect, useState } from "react";
import { Save, CheckCircle2, Mail, Send, Server } from "lucide-react";
import { emailTemplateAdminApi, type EmailTemplate } from "@/api/emailTemplate";
import {
  emailSettingsAdminApi,
  type EmailSettings,
  type EmailProvider,
} from "@/api/emailSettings";
import { ApiError } from "@/types/api";

const PROVIDER_LABELS: Record<EmailProvider, string> = {
  gmail: "Gmail",
  yandex: "Yandex",
  mailru: "Mail.ru",
  brevo: "Brevo (API)",
  custom: "Свой SMTP",
};

// Настройка подключения почты: выбор провайдера (пресет host/port/TLS) + логин/
// пароль/отправитель, либо Brevo по API-ключу. Сохраняется в assets/email.json и
// применяется сразу (без рестарта). Пустой пароль/ключ при сохранении = «не менять».
function SmtpSettingsCard() {
  const [s, setS] = useState<EmailSettings | null>(null);
  const [provider, setProvider] = useState<EmailProvider>("custom");
  const [host, setHost] = useState("");
  const [port, setPort] = useState(587);
  const [useTls, setUseTls] = useState(true);
  const [useSsl, setUseSsl] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("");
  const [brevoKey, setBrevoKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const apply = (d: EmailSettings) => {
    setS(d);
    setProvider(d.provider);
    setHost(d.host);
    setPort(d.port);
    setUseTls(d.use_tls);
    setUseSsl(d.use_ssl);
    setUsername(d.username);
    setFromEmail(d.from_email);
    setFromName(d.from_name);
    setPassword("");
    setBrevoKey("");
  };

  useEffect(() => {
    emailSettingsAdminApi
      .get()
      .then(apply)
      .catch((e) => setMsg({ type: "error", text: e instanceof ApiError ? e.detail : "Ошибка" }))
      .finally(() => setLoading(false));
  }, []);

  const onProvider = (p: EmailProvider) => {
    setProvider(p);
    const preset = s?.presets?.[p];
    if (preset) {
      setHost(preset.host);
      setPort(preset.port);
      setUseTls(preset.use_tls);
      setUseSsl(preset.use_ssl);
    }
  };

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const next = await emailSettingsAdminApi.update({
        enabled: true,
        provider,
        host,
        port,
        use_tls: useTls,
        use_ssl: useSsl,
        username,
        from_email: fromEmail,
        from_name: fromName,
        password, // "" = не менять
        brevo_api_key: brevoKey, // "" = не менять
      });
      apply(next);
      setMsg({ type: "success", text: "Сохранено" });
    } catch (e) {
      setMsg({ type: "error", text: e instanceof ApiError ? e.detail : "Ошибка сохранения" });
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    setSending(true);
    setMsg(null);
    try {
      await emailSettingsAdminApi.sendTest(testTo);
      setMsg({ type: "success", text: `Тестовое письмо отправлено на ${testTo}` });
    } catch (e) {
      setMsg({ type: "error", text: e instanceof ApiError ? e.detail : "Не удалось отправить" });
    } finally {
      setSending(false);
    }
  };

  if (loading) return null;

  const isBrevo = provider === "brevo";
  const isPreset = provider === "gmail" || provider === "yandex" || provider === "mailru";

  return (
    <section className="space-y-4 rounded-2xl border border-border-subtle bg-bg-subtle p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
          <Server className="h-4 w-4 text-accent" />
          Подключение почты (SMTP)
        </h2>
        <span
          className={`text-xs font-medium ${s?.is_enabled ? "text-success" : "text-fg-subtle"}`}
        >
          {s?.is_enabled ? "● Готово к отправке" : "○ Не настроено"}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-fg">Провайдер</label>
          <select
            value={provider}
            onChange={(e) => onProvider(e.target.value as EmailProvider)}
            className="input w-full"
          >
            {(Object.keys(PROVIDER_LABELS) as EmailProvider[]).map((p) => (
              <option key={p} value={p}>
                {PROVIDER_LABELS[p]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-fg">Отправитель (From)</label>
          <input
            type="email"
            value={fromEmail}
            onChange={(e) => setFromEmail(e.target.value)}
            placeholder="noreply@example.com"
            className="input w-full"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-fg">Имя отправителя</label>
        <input
          type="text"
          value={fromName}
          onChange={(e) => setFromName(e.target.value)}
          placeholder="My VPN"
          className="input w-full"
        />
      </div>

      {isBrevo ? (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-fg">Brevo API key</label>
          <input
            type="password"
            value={brevoKey}
            onChange={(e) => setBrevoKey(e.target.value)}
            placeholder={s?.has_brevo_key ? "•••••• (сохранён) — оставьте пустым, чтобы не менять" : "xkeysib-…"}
            className="input w-full"
            autoComplete="off"
          />
        </div>
      ) : (
        <>
          {provider === "custom" && (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-fg">SMTP host</label>
                <input type="text" value={host} onChange={(e) => setHost(e.target.value)}
                  placeholder="smtp.example.com" className="input w-full" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-fg">Port</label>
                <input type="number" value={port} onChange={(e) => setPort(Number(e.target.value))}
                  className="input w-full" />
              </div>
              <label className="flex items-center gap-2 text-sm text-fg">
                <input type="checkbox" checked={useTls} onChange={(e) => setUseTls(e.target.checked)} />
                STARTTLS
              </label>
              <label className="flex items-center gap-2 text-sm text-fg">
                <input type="checkbox" checked={useSsl} onChange={(e) => setUseSsl(e.target.checked)} />
                SSL
              </label>
            </div>
          )}
          {isPreset && (
            <p className="text-xs text-fg-subtle">
              Сервер: <span className="text-fg">{host}:{port}</span> ({useSsl ? "SSL" : useTls ? "STARTTLS" : "без шифрования"}) — задаётся автоматически.
              Пароль — это <span className="text-fg">пароль приложения</span> (app password), а не пароль от аккаунта.
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-fg">Логин (email)</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                placeholder="you@gmail.com" className="input w-full" autoComplete="off" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-fg">Пароль</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder={s?.has_password ? "•••••• (сохранён) — пусто, чтобы не менять" : "app password"}
                className="input w-full" autoComplete="off" />
            </div>
          </div>
        </>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {saving ? "Сохранение…" : "Сохранить"}
        </button>
        <input
          type="email"
          placeholder="test@example.com"
          value={testTo}
          onChange={(e) => setTestTo(e.target.value)}
          className="input flex-1 min-w-[180px]"
        />
        <button
          onClick={sendTest}
          disabled={sending || !testTo}
          className="inline-flex items-center gap-2 rounded-xl border border-border-subtle bg-bg px-4 py-2 text-sm font-medium text-fg transition-colors hover:bg-bg-overlay disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {sending ? "Отправка…" : "Тест"}
        </button>
      </div>

      {msg && (
        <p className={`text-sm ${msg.type === "success" ? "text-success" : "text-danger"}`}>
          {msg.text}
        </p>
      )}
    </section>
  );
}

type Key = keyof EmailTemplate;

const FIELDS: { key: Key; label: string; hint?: string; multiline?: boolean }[] = [
  { key: "subject", label: "Тема письма", hint: "Например: Код подтверждения — {brand}" },
  { key: "heading", label: "Заголовок в письме" },
  { key: "intro", label: "Текст перед кодом", multiline: true },
  { key: "expire_note", label: "Про срок действия", hint: "Можно использовать {minutes}" },
  { key: "ignore_note", label: "Примечание внизу", multiline: true },
];

export default function AdminEmailPage() {
  const [form, setForm] = useState<EmailTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [testTo, setTestTo] = useState("");
  const [sending, setSending] = useState(false);
  const [testMsg, setTestMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    emailTemplateAdminApi
      .get()
      .then(setForm)
      .catch((e) => setError(e instanceof ApiError ? e.detail : "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      const next = await emailTemplateAdminApi.update(form);
      setForm(next);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    setSending(true);
    setTestMsg(null);
    try {
      await emailTemplateAdminApi.sendTest(testTo);
      setTestMsg({ type: "success", text: `Тестовое письмо отправлено на ${testTo}` });
    } catch (e) {
      setTestMsg({
        type: "error",
        text: e instanceof ApiError ? e.detail : "Не удалось отправить",
      });
    } finally {
      setSending(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
    );
  if (!form) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="sticky top-0 z-10 -mx-5 flex items-center justify-between border-b border-border-subtle bg-bg/80 px-5 py-3 backdrop-blur-md md:-mx-8 md:px-8">
        <h1 className="flex items-center gap-2 text-xl font-bold text-fg md:text-2xl">
          <Mail className="h-5 w-5 text-accent" />
          Письмо с кодом
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

      <SmtpSettingsCard />

      <p className="text-sm text-fg-muted">
        Текст письма с кодом подтверждения. Доступные подстановки:{" "}
        <code className="rounded bg-bg-subtle px-1 text-fg">{"{brand}"}</code> (имя из
        EMAIL_FROM_NAME),{" "}
        <code className="rounded bg-bg-subtle px-1 text-fg">{"{code}"}</code>,{" "}
        <code className="rounded bg-bg-subtle px-1 text-fg">{"{minutes}"}</code>. Применяется
        сразу после «Сохранить». Пустое поле вернётся к стандартному тексту.
      </p>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="space-y-4">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label className="mb-1.5 block text-sm font-medium text-fg">{f.label}</label>
            {f.multiline ? (
              <textarea
                rows={2}
                value={form[f.key]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                className="input w-full"
              />
            ) : (
              <input
                type="text"
                value={form[f.key]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                className="input w-full"
              />
            )}
            {f.hint && <p className="mt-1 text-xs text-fg-subtle">{f.hint}</p>}
          </div>
        ))}
      </div>

      {/* Тест-отправка */}
      <section className="rounded-2xl border border-border-subtle bg-bg-subtle p-5">
        <h2 className="text-sm font-semibold text-fg">Проверить отправку</h2>
        <p className="mt-0.5 text-xs text-fg-muted">
          Отправит тестовое письмо с кодом <span className="text-fg">123456</span> на
          указанный адрес (текущим сохранённым шаблоном).
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            type="email"
            placeholder="you@example.com"
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            className="input flex-1"
          />
          <button
            onClick={sendTest}
            disabled={sending || !testTo}
            className="inline-flex items-center gap-2 rounded-xl border border-border-subtle bg-bg px-4 py-2 text-sm font-medium text-fg transition-colors hover:bg-bg-overlay disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {sending ? "Отправка…" : "Отправить тест"}
          </button>
        </div>
        {testMsg && (
          <p className={`mt-2 text-sm ${testMsg.type === "success" ? "text-success" : "text-danger"}`}>
            {testMsg.text}
          </p>
        )}
      </section>
    </div>
  );
}
