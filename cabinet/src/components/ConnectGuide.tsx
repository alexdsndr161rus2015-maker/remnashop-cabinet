import { useEffect, useMemo, useState } from "react";
import { Download, Zap, Check, Star, QrCode, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { APPS, PLATFORMS, DEFAULT_PRIORITY, type AppEntry, type Platform } from "@/data/apps";
import { appsApi, type AppsConfig } from "@/api/apps";

function detectPlatform(): Platform {
  const ua = (navigator.userAgent || "").toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android tv|googletv|smart-tv/.test(ua)) return "androidtv";
  if (/android/.test(ua)) return "android";
  if (/macintosh|mac os x/.test(ua)) return "macos";
  return "windows";
}

function AppCard({
  app,
  platform,
  sub,
  recommended,
}: {
  app: AppEntry;
  platform: Platform;
  sub: string;
  recommended?: boolean;
}) {
  const [connected, setConnected] = useState(false);
  const installUrl = app.install[platform];

  const handleConnect = () => {
    window.location.href = app.deepLink(sub);
    setConnected(true);
    setTimeout(() => setConnected(false), 2500);
  };

  return (
    <div className="surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-fg">{app.name}</span>
          {recommended && (
            <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent-subtle px-2 py-0.5 text-[10px] font-medium text-accent">
              <Star className="h-3 w-3" />
              Рекомендуем
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-fg-muted">{app.desc}</p>
      </div>
      <div className="flex flex-shrink-0 gap-2">
        {installUrl && (
          <a
            href={installUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-bg-raised px-3 text-xs font-medium text-fg transition-colors hover:bg-bg-overlay"
          >
            <Download className="h-3.5 w-3.5" />
            Установить
          </a>
        )}
        <button
          onClick={handleConnect}
          className="btn-gradient inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-4 text-xs font-semibold transition-all active:scale-[0.98]"
        >
          {connected ? <Check className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />}
          {connected ? "Открываем…" : "Подключиться"}
        </button>
      </div>
    </div>
  );
}

export function ConnectGuide({ subUrl }: { subUrl: string }) {
  const [platform, setPlatform] = useState<Platform>(detectPlatform);
  const [showQr, setShowQr] = useState(false);
  // Выбор админа: какие приложения показывать и какое приоритетное.
  const [config, setConfig] = useState<AppsConfig | null>(null);

  useEffect(() => {
    appsApi
      .get()
      .then(setConfig)
      .catch(() => setConfig(null)); // при ошибке — показываем все (дефолт)
  }, []);

  const priority = config?.priority || DEFAULT_PRIORITY;

  const apps = useMemo(() => {
    // 1) только приложения под выбранную платформу
    let list = APPS.filter((a) => a.platforms.includes(platform));
    // 2) если админ ограничил список — оставляем только включённые
    if (config?.enabled) {
      const allow = new Set(config.enabled);
      list = list.filter((a) => allow.has(a.id));
    }
    // 3) приоритетное приложение — первым
    return [...list].sort((a, b) => {
      if (a.id === priority) return -1;
      if (b.id === priority) return 1;
      return 0;
    });
  }, [platform, config, priority]);

  return (
    <div className="surface p-5">
      <div className="mb-1">
        <h3 className="text-sm font-semibold tracking-tight text-fg">Подключить устройство</h3>
        <p className="mt-0.5 text-xs text-fg-subtle">
          Установите приложение и нажмите «Подключиться» — подписка добавится автоматически
        </p>
      </div>

      {/* Выбор платформы */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {PLATFORMS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPlatform(p.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              platform === p.id
                ? "bg-accent text-accent-fg"
                : "border border-[var(--border)] bg-bg-raised text-fg-muted hover:text-fg"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Приложения */}
      <div className="mt-4 flex flex-col gap-2.5">
        {apps.map((app) => (
          <AppCard
            key={app.id}
            app={app}
            platform={platform}
            sub={subUrl}
            recommended={app.id === priority}
          />
        ))}
        {apps.length === 0 && (
          <p className="py-4 text-center text-sm text-fg-subtle">
            Для этой платформы пока нет рекомендованных приложений
          </p>
        )}
      </div>

      {/* QR — подключить другое устройство (ТВ, второй телефон): отсканировать
          камерой приложения. Генерируется локально (qrcode.react), подписка
          наружу не уходит. */}
      <div className="mt-4 border-t border-[var(--border)] pt-4">
        <button
          type="button"
          onClick={() => setShowQr((v) => !v)}
          className="inline-flex items-center gap-2 text-sm font-medium text-fg-muted transition-colors hover:text-fg"
        >
          {showQr ? <X className="h-4 w-4" /> : <QrCode className="h-4 w-4" />}
          {showQr ? "Скрыть QR-код" : "QR для другого устройства"}
        </button>
        {showQr && (
          <div className="mt-3 flex flex-col items-center gap-2">
            <div className="rounded-2xl bg-white p-3">
              <QRCodeSVG value={subUrl} size={180} />
            </div>
            <p className="max-w-xs text-center text-xs text-fg-subtle">
              Отсканируйте камерой приложения на другом устройстве, чтобы добавить подписку
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
