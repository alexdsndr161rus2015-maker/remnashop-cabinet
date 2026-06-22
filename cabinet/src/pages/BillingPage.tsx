import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { clsx } from "clsx";
import { Check, Wifi, Smartphone } from "lucide-react";
import { subscriptionApi } from "@/api/subscription";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatTrafficLimit } from "@/lib/format";
import { useAuth } from "@/contexts/AuthContext";
import type {
  DurationOfferResponse,
  PaymentGatewayType,
  PlanOfferResponse,
  SubscriptionOffersResponse,
} from "@/types/api";
import { ApiError } from "@/types/api";

const gatewayLabels: Record<string, string> = {
  YOOKASSA: "ЮKassa (карта)",
  CRYPTOMUS: "Криптовалюта",
  TELEGRAM_STARS: "Telegram Stars",
};

function PlanCard({
  plan,
  isSelected,
  onSelect,
}: {
  plan: PlanOfferResponse;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={clsx(
        "w-full flex flex-col gap-3 rounded-xl border p-4 text-left transition-all duration-150",
        isSelected
          ? "border-accent bg-accent-subtle shadow-glow"
          : "border-border-subtle bg-bg-raised hover:border-border",
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-fg">{plan.name}</h3>
        {isSelected && <Check className="h-4 w-4 text-accent" />}
      </div>
      {plan.description && (
        <p className="text-xs text-fg-subtle">{plan.description}</p>
      )}
      <div className="flex flex-col gap-1 text-xs text-fg-muted">
        <span className="flex items-center gap-1.5">
          <Wifi className="h-3.5 w-3.5" /> {formatTrafficLimit(plan.traffic_limit)}
        </span>
        <span className="flex items-center gap-1.5">
          <Smartphone className="h-3.5 w-3.5" /> до {plan.device_limit} устройств
        </span>
      </div>
    </button>
  );
}

function DurationSelector({
  durations,
  selectedDays,
  onSelect,
  gatewayType,
}: {
  durations: DurationOfferResponse[];
  selectedDays: number | null;
  onSelect: (days: number) => void;
  gatewayType: PaymentGatewayType | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {durations.map((duration) => {
        const price = duration.prices.find((p) => p.gateway_type === gatewayType);
        const isSelected = selectedDays === duration.days;
        return (
          <button
            key={duration.days}
            onClick={() => onSelect(duration.days)}
            className={clsx(
              "flex flex-col items-center gap-1 rounded-xl border p-3 transition-all",
              isSelected
                ? "border-accent bg-accent-subtle"
                : "border-border-subtle bg-bg-subtle hover:border-border",
            )}
          >
            <span className="text-sm font-medium text-fg">{duration.days} дн.</span>
            {price && (
              <span className="text-xs text-fg-subtle">
                {price.is_free ? (
                  <span className="text-success">бесплатно</span>
                ) : (
                  <>
                    {price.discount_percent > 0 && (
                      <span className="mr-1 line-through opacity-60">
                        {price.original_amount}
                      </span>
                    )}
                    {price.final_amount} {price.currency_symbol}
                  </>
                )}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default function BillingPage() {
  const { user } = useAuth();
  const [offers, setOffers] = useState<SubscriptionOffersResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedPlanCode, setSelectedPlanCode] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState<number | null>(null);
  const [selectedGateway, setSelectedGateway] = useState<PaymentGatewayType | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await subscriptionApi.offers();
      setOffers(data);
      if (data.gateways.length > 0) {
        setSelectedGateway(data.gateways[0]!.gateway_type);
      }
      if (data.plans.length > 0) {
        setSelectedPlanCode(data.plans[0]!.public_code);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : "Не удалось загрузить тарифы");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selectedPlan = offers?.plans.find((p) => p.public_code === selectedPlanCode);

  const handlePurchase = async () => {
    if (!selectedPlan || !selectedDays || !selectedGateway) return;
    setIsPurchasing(true);
    setPurchaseError(null);
    try {
      const isRenew = selectedPlan.recommended_purchase_type === "RENEW";
      const result = isRenew
        ? await subscriptionApi.extend({
            duration_days: selectedDays,
            gateway_type: selectedGateway,
          })
        : await subscriptionApi.purchase({
            plan_code: selectedPlan.public_code,
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
        detail.toLowerCase().includes("email") ||
        detail.toLowerCase().includes("verified");
      if (isEmailError) {
        setPurchaseError("__email__");
      } else {
        setPurchaseError(detail || "Не удалось создать оплату");
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-xl font-semibold text-fg">Тарифы и оплата</h1>
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-xl font-semibold text-fg">Тарифы и оплата</h1>
        <p className="text-sm text-danger">{error}</p>
      </div>
    );
  }

  if (!offers || offers.plans.length === 0) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-xl font-semibold text-fg">Тарифы и оплата</h1>
        <p className="text-sm text-fg-subtle">Сейчас нет доступных тарифов.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-semibold text-fg">Тарифы и оплата</h1>

      <div>
        <p className="mb-3 text-sm font-medium text-fg-muted">Тариф</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {offers.plans.map((plan) => (
            <PlanCard
              key={plan.public_code}
              plan={plan}
              isSelected={selectedPlanCode === plan.public_code}
              onSelect={() => {
                setSelectedPlanCode(plan.public_code);
                setSelectedDays(null);
              }}
            />
          ))}
        </div>
      </div>

      {selectedPlan && (
        <div>
          <p className="mb-3 text-sm font-medium text-fg-muted">Срок</p>
          <DurationSelector
            durations={selectedPlan.durations}
            selectedDays={selectedDays}
            onSelect={setSelectedDays}
            gatewayType={selectedGateway}
          />
        </div>
      )}

      {offers.gateways.length > 1 && (
        <div>
          <p className="mb-3 text-sm font-medium text-fg-muted">Способ оплаты</p>
          <div className="flex flex-wrap gap-2">
            {offers.gateways.map((gw) => (
              <button
                key={gw.gateway_type}
                onClick={() => setSelectedGateway(gw.gateway_type)}
                className={clsx(
                  "rounded-xl border px-4 py-2 text-sm font-medium transition-all",
                  selectedGateway === gw.gateway_type
                    ? "border-accent bg-accent-subtle text-accent"
                    : "border-border-subtle bg-bg-subtle text-fg-muted hover:border-border",
                )}
              >
                {gatewayLabels[gw.gateway_type] || gw.gateway_type}
              </button>
            ))}
          </div>
        </div>
      )}

      {purchaseError && purchaseError !== "__email__" && (
        <div className="rounded-xl border border-danger/30 bg-danger/8 px-4 py-3">
          <p className="text-sm font-medium text-danger">
            {purchaseError === "Unknown error" || purchaseError === "Internal Server Error"
              ? "Ошибка соединения с платёжной системой"
              : purchaseError}
          </p>
          {(purchaseError === "Unknown error" || purchaseError === "Internal Server Error" ||
            purchaseError.includes("соединения") || purchaseError.includes("платёжной")) && (
            <p className="mt-1 text-xs text-fg-muted">
              Попробуйте ещё раз или выберите другой способ оплаты.
            </p>
          )}
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

      <Card variant="bordered" className="bg-grain">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-fg-muted">
              {selectedPlan?.recommended_purchase_type === "RENEW"
                ? "Продление подписки"
                : "Оформление подписки"}
            </p>
            <p className="text-xs text-fg-subtle">
              {selectedPlan?.name} · {selectedDays ? `${selectedDays} дн.` : "выберите срок"}
            </p>
          </div>
          <Button
            onClick={handlePurchase}
            isLoading={isPurchasing}
            disabled={!selectedPlan || !selectedDays || !selectedGateway}
          >
            Оплатить
          </Button>
        </div>
      </Card>
    </div>
  );
}
