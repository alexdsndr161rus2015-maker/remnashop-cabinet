import { useState } from "react";
import { Link } from "react-router-dom";
import { Copy, RefreshCw, Check, Gift, ArrowRight, QrCode, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useSubscription } from "@/hooks/useSubscription";
import { subscriptionApi } from "@/api/subscription";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Input } from "@/components/ui/Input";
import {
  formatTrafficLimit,
  formatBytes,
  formatDate,
  daysUntil,
  formatRelativeOnline,
} from "@/lib/format";
import { ApiError } from "@/types/api";

function SubscriptionSkeleton() {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-6 w-20" />
      </div>
      <Skeleton className="mt-6 h-3 w-full" />
      <Skeleton className="mt-3 h-3 w-2/3" />
    </Card>
  );
}

function EmptySubscription() {
  const [isActivating, setIsActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTrial = async () => {
    setIsActivating(true);
    setError(null);
    try {
      await subscriptionApi.activateTrial();
      window.location.reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : "Не удалось активировать пробный период");
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <Card className="bg-grain text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-subtle">
        <Gift className="h-6 w-6 text-accent" />
      </div>
      <h2 className="text-base font-semibold text-fg">У вас пока нет подписки</h2>
      <p className="mt-1 text-sm text-fg-subtle">
        Попробуйте бесплатный пробный период или выберите тариф
      </p>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Button onClick={handleTrial} isLoading={isActivating}>
          Активировать пробный период
        </Button>
        <Link to="/billing">
          <Button variant="secondary">
            Выбрать тариф <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </Card>
  );
}

function ConnectionUrlCard({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Card variant="bordered">
      <CardHeader title="Ссылка для подключения" />
      <div className="flex items-center gap-2 rounded-xl bg-bg-subtle p-2">
        <code className="flex-1 truncate px-2 text-xs text-fg-muted">{url}</code>
        <Button size="sm" variant="secondary" onClick={() => setShowQr((v) => !v)}>
          {showQr ? <X className="h-4 w-4" /> : <QrCode className="h-4 w-4" />}
        </Button>
        <Button size="sm" variant="secondary" onClick={handleCopy}>
          {copied ? (
            <Check className="h-4 w-4 text-success" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {copied ? "Скопировано" : "Копировать"}
        </Button>
      </div>
      {showQr && (
        <div className="mt-4 flex justify-center">
          <div className="rounded-2xl bg-white p-4 shadow-soft">
            <QRCodeSVG value={url} size={180} />
          </div>
        </div>
      )}
    </Card>
  );
}

export default function DashboardPage() {
  const { subscription, isLoading, reload } = useSubscription();
  const [isReissuing, setIsReissuing] = useState(false);
  const [reissueError, setReissueError] = useState<string | null>(null);

  const handleReissue = async () => {
    setIsReissuing(true);
    setReissueError(null);
    try {
      await subscriptionApi.reissue();
      await reload();
    } catch (e) {
      setReissueError(
        e instanceof ApiError ? e.detail : "Не удалось перевыпустить подписку",
      );
    } finally {
      setIsReissuing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-xl font-semibold text-fg">Подписка</h1>
        <SubscriptionSkeleton />
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-xl font-semibold text-fg">Подписка</h1>
        <EmptySubscription />
      </div>
    );
  }

  const remainingDays = daysUntil(subscription.expire_at);
  const isUnlimited = subscription.traffic_limit === 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-fg">Подписка</h1>
        <StatusBadge status={subscription.status} />
      </div>

      <Card className="bg-grain">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-fg-subtle">Текущий тариф</p>
            <h2 className="mt-1 text-lg font-semibold text-fg">
              {subscription.plan_name}
              {subscription.is_trial && (
                <span className="ml-2 rounded-full bg-accent-subtle px-2 py-0.5 text-xs font-medium text-accent">
                  Пробный
                </span>
              )}
            </h2>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-fg-subtle">Действует до</p>
            <p className="mt-1 text-sm font-medium text-fg">
              {formatDate(subscription.expire_at)}
            </p>
            <p className="text-xs text-fg-subtle">
              {remainingDays > 0 ? `${remainingDays} дн. осталось` : "истекла"}
            </p>
          </div>
          <div>
            <p className="text-xs text-fg-subtle">Устройства</p>
            <p className="mt-1 text-sm font-medium text-fg">
              лимит {subscription.device_limit}
            </p>
          </div>
          <div>
            <p className="text-xs text-fg-subtle">Последняя активность</p>
            <p className="mt-1 text-sm font-medium text-fg">
              {formatRelativeOnline(subscription.online_at)}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between text-xs text-fg-subtle">
            <span>Трафик</span>
            <span>
              {isUnlimited
                ? `${formatBytes(subscription.used_traffic_bytes)} · безлимит`
                : `${formatBytes(subscription.used_traffic_bytes)} из ${formatTrafficLimit(
                    subscription.traffic_limit,
                  )}`}
            </span>
          </div>
          {!isUnlimited && (
            <ProgressBar
              value={subscription.used_traffic_bytes || 0}
              max={subscription.traffic_limit}
            />
          )}
        </div>

        {reissueError && (
          <p className="mt-4 text-sm text-danger">{reissueError}</p>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/billing">
            <Button>Продлить / сменить тариф</Button>
          </Link>
          <Button variant="secondary" onClick={handleReissue} isLoading={isReissuing}>
            <RefreshCw className="h-4 w-4" />
            Перевыпустить ссылку
          </Button>
        </div>
      </Card>

      <ConnectionUrlCard url={subscription.url} />

      <PromocodeCard onActivated={reload} />
    </div>
  );
}

function PromocodeCard({ onActivated }: { onActivated: () => void }) {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setIsLoading(true);
    setMessage(null);
    try {
      await subscriptionApi.activatePromocode(code.trim());
      setMessage({ type: "success", text: "Промокод активирован!" });
      setCode("");
      onActivated();
    } catch (e) {
      setMessage({
        type: "error",
        text: e instanceof ApiError ? e.detail : "Не удалось активировать промокод",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card variant="bordered">
      <CardHeader title="Промокод" subtitle="Есть код от друга или из рекламной акции?" />
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          name="promo"
          placeholder="PROMO2026"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="flex-1"
        />
        <Button type="submit" variant="secondary" isLoading={isLoading}>
          Применить
        </Button>
      </form>
      {message && (
        <p
          className={`mt-2 text-sm ${
            message.type === "success" ? "text-success" : "text-danger"
          }`}
        >
          {message.text}
        </p>
      )}
    </Card>
  );
}
