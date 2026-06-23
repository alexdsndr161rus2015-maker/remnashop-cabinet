import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { clsx } from "clsx";
import { Check, Sparkles } from "lucide-react";
import { subscriptionApi } from "@/api/subscription";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatTrafficLimit } from "@/lib/format";
import type {
  PaymentGatewayType,
  PlanOfferResponse,
  SubscriptionOffersResponse,
} from "@/types/api";
import { ApiError } from "@/types/api";

const gatewayLabels: Record<string, string> = {
  YOOKASSA: "ЮKassa (карта)",
  YOOMONEY: "ЮMoney",
  PLATEGA: "Platega",
  CRYPTOMUS: "Криптовалюта",
  TELEGRAM_STARS: "Telegram Stars",
};

function priceFor(plan: PlanOfferResponse, days: number | null, gw: PaymentGatewayType | null) {
  if (days == null || gw == null) return null;
  const d = plan.durations.find((x) => x.days === days);
  if (!d) return null;
  return d.prices.find((p) => p.gateway_type === gw) ?? null;
}

function isPopular(plan: PlanOfferResponse): boolean {
  const hay = `${plan.name} ${plan.description ?? ""}`.toLowerCase();
  return hay.includes("хит") || hay.includes("популярн");
}

/** Маркетинговая карточка тарифа: цена за выбранный срок, список фич, кнопка. */
function PlanCard({
  plan,
  days,
  gateway,
  busy,
  onBuy,
}: {
  plan: PlanOfferResponse;
  days: number | null;
  gateway: PaymentGatewayType | null;
  busy: boolean;
  onBuy: () => void;
}) {
  const price = priceFor(plan, days, gateway);
  const popular = isPopular(plan);
  const perMonth =
    price && !price.is_free && days && days >= 30
      ? Math.round(Number(price.final_amount) / (days / 30))
      : null;

  const features = [
    plan.traffic_limit === 0 ? "Безлимитный трафик" : formatTrafficLimit(plan.traffic_limit),
    `До ${plan.device_limit} устройств`,
    "Все локации",
    "Подключение на любой платформе",
  ];

  return (
    <div
      className={clsx(
        "relative flex flex-col rounded-[22px] border p-6 transition-all duration-200",
        popular
          ? "border-accent bg-accent-subtle/40 shadow-[0_18px_50px_-20px_var(--accent-glow)] sm:-translate-y-1"
          : "border-[var(--border-subtle)] bg-bg-raised hover:-translate-y-0.5 hover:border-[var(--accent)]/50",
      )}
    >
      {popular && (
        <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-[0_6px_16px_-6px_var(--accent-glow)]">
          <Sparkles className="h-3 w-3" /> Хит
        </span>
      )}

      <h3 className="text-[17px] font-bold leading-tight text-fg">{plan.name}</h3>
      {plan.description && <p className="mt-1 text-xs text-fg-subtle">{plan.description}</p>}

      {/* Цена */}
      <div className="mt-5 flex items-end gap-2">
        {price ? (
          price.is_free ? (
            <span className="text-3xl font-extrabold text-success">Бесплатно</span>
          ) : (
            <>
              <span className="text-[34px] font-extrabold leading-none text-fg">
                {price.final_amount}
              </span>
              <span className="pb-1 text-lg font-semibold text-fg-muted">{price.currency_symbol}</span>
              {price.discount_percent > 0 && (
                <span className="pb-1.5 text-sm text-fg-subtle line-through">
                  {price.original_amount}
                </span>
              )}
            </>
          )
        ) : (
          <span className="text-2xl font-bold text-fg-subtle">—</span>
        )}
      </div>
      <p className="mt-1 text-xs text-fg-subtle">
        {days ? `за ${days} дн.` : "выберите срок"}
        {perMonth ? ` · ≈ ${perMonth} ${price?.currency_symbol}/мес` : ""}
      </p>

      {/* Фичи */}
      <ul className="mt-5 flex flex-1 flex-col gap-2.5">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm text-fg-muted">
            <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-accent-subtle text-accent">
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            {f}
          </li>
        ))}
      </ul>

      <button
        onClick={onBuy}
        disabled={busy || !price}
        className={clsx(
          "mt-6 inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-60",
          popular
            ? "btn-gradient text-white"
            : "border border-[var(--accent)]/40 bg-accent-subtle text-accent hover:bg-accent-subtle/80",
        )}
      >
        {busy ? "Переход к оплате…" : "Выбрать"}
      </button>
    </div>
  );
}

export default function BillingPage() {
  const [offers, setOffers] = useState<SubscriptionOffersResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedDays, setSelectedDays] = useState<number | null>(null);
  const [selectedGateway, setSelectedGateway] = useState<PaymentGatewayType | null>(null);
  const [purchasingCode, setPurchasingCode] = useState<string | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await subscriptionApi.offers();
      setOffers(data);
      if (data.gateways.length > 0) setSelectedGateway(data.gateways[0]!.gateway_type);
      const firstDuration = data.plans[0]?.durations[0]?.days ?? null;
      setSelectedDays(firstDuration);
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : "Не удалось загрузить тарифы");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Доступные сроки (объединение по всем тарифам).
  const termDays = useMemo(() => {
    const set = new Set<number>();
    offers?.plans.forEach((p) => p.durations.forEach((d) => set.add(d.days)));
    return Array.from(set).sort((a, b) => a - b);
  }, [offers]);

  const handlePurchase = async (plan: PlanOfferResponse) => {
    if (!selectedDays || !selectedGateway) return;
    setPurchasingCode(plan.public_code);
    setPurchaseError(null);
    try {
      const isRenew = plan.recommended_purchase_type === "RENEW";
      const result = isRenew
        ? await subscriptionApi.extend({ duration_days: selectedDays, gateway_type: selectedGateway })
        : await subscriptionApi.purchase({
            plan_code: plan.public_code,
            duration_days: selectedDays,
            gateway_type: selectedGateway,
          });

      if (result.is_free) {
        window.location.href = "/";
      } else if (result.payment_url) {
        window.location.href = result.payment_url;
      }
    } catch (e) {
      const detail = e instanceof ApiError ? e.detail : "";
      const isEmailError =
        detail.toLowerCase().includes("email") || detail.toLowerCase().includes("verified");
      setPurchaseError(isEmailError ? "__email__" : detail || "Не удалось создать оплату");
    } finally {
      setPurchasingCode(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-2xl font-bold tracking-tight text-fg">Тарифы</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-80 w-full rounded-[22px]" />
          <Skeleton className="h-80 w-full rounded-[22px]" />
          <Skeleton className="h-80 w-full rounded-[22px]" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-2xl font-bold tracking-tight text-fg">Тарифы</h1>
        <p className="text-sm text-danger">{error}</p>
      </div>
    );
  }

  if (!offers || offers.plans.length === 0) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-2xl font-bold tracking-tight text-fg">Тарифы</h1>
        <p className="text-sm text-fg-subtle">Сейчас нет доступных тарифов.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-[28px]">Тарифы</h1>
        <p className="mt-1.5 text-sm text-fg-muted">
          Выберите срок и тариф — оплата картой, СБП или криптовалютой
        </p>
      </div>

      {/* Срок — сегментированный переключатель (меняет цены на всех карточках) */}
      {termDays.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {termDays.map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDays(d)}
              className={clsx(
                "rounded-xl border px-4 py-2 text-sm font-medium transition-all",
                selectedDays === d
                  ? "border-accent bg-accent-subtle text-accent"
                  : "border-border-subtle bg-bg-subtle text-fg-muted hover:border-border",
              )}
            >
              {d} дн.
            </button>
          ))}
        </div>
      )}

      {/* Способ оплаты */}
      {offers.gateways.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">Оплата:</span>
          {offers.gateways.map((gw) => (
            <button
              key={gw.gateway_type}
              onClick={() => setSelectedGateway(gw.gateway_type)}
              className={clsx(
                "rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                selectedGateway === gw.gateway_type
                  ? "border-accent bg-accent-subtle text-accent"
                  : "border-border-subtle bg-bg-subtle text-fg-muted hover:border-border",
              )}
            >
              {gatewayLabels[gw.gateway_type] || gw.gateway_type}
            </button>
          ))}
        </div>
      )}

      {purchaseError && purchaseError !== "__email__" && (
        <div className="rounded-xl border border-danger/30 bg-danger/8 px-4 py-3">
          <p className="text-sm font-medium text-danger">
            {purchaseError === "Unknown error" || purchaseError === "Internal Server Error"
              ? "Ошибка соединения с платёжной системой. Попробуйте ещё раз или выберите другой способ."
              : purchaseError}
          </p>
        </div>
      )}
      {purchaseError === "__email__" && (
        <div className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-fg">
          Сначала подтвердите email.{" "}
          <Link to="/settings" className="font-medium text-accent underline-offset-2 hover:underline">
            Перейти в настройки
          </Link>
        </div>
      )}

      {/* Карточки тарифов */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {offers.plans.map((plan) => (
          <PlanCard
            key={plan.public_code}
            plan={plan}
            days={selectedDays}
            gateway={selectedGateway}
            busy={purchasingCode === plan.public_code}
            onBuy={() => handlePurchase(plan)}
          />
        ))}
      </div>
    </div>
  );
}
