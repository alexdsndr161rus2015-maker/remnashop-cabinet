import { useEffect, useState, useCallback } from "react";
import { Wallet, TrendingUp, ShoppingBag, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { balanceApi, type BalanceResponse, type BalanceTransaction } from "@/api/balance";
import { ApiError } from "@/types/api";
import { formatDate } from "@/lib/format";

const LIMIT = 15;

const CURRENCY_SYMBOLS: Record<string, string> = {
  RUB: "₽",
  USD: "$",
  EUR: "€",
  XTR: "⭐",
};

function currencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency?.toUpperCase()] ?? currency;
}

function statusStyle(status: string): string {
  switch (status.toUpperCase()) {
    case "COMPLETED":
      return "bg-success/10 text-success";
    case "PENDING":
      return "bg-warning/10 text-warning";
    case "CANCELED":
    case "FAILED":
      return "bg-danger/10 text-danger";
    default:
      return "bg-bg-raised text-fg-muted";
  }
}

function statusLabel(status: string): string {
  switch (status.toUpperCase()) {
    case "COMPLETED": return "Оплачено";
    case "PENDING": return "В обработке";
    case "CANCELED": return "Отменён";
    case "FAILED": return "Ошибка";
    default: return status;
  }
}

function gatewayLabel(type: string, displayName: string | null): string {
  if (displayName) return displayName;
  switch (type.toUpperCase()) {
    case "YOOKASSA": return "ЮKassa";
    case "TELEGRAM_STARS": return "Telegram Stars";
    case "CRYPTOMUS": return "Cryptomus";
    default: return type;
  }
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-bg-subtle p-5">
      <div className="mb-3 flex items-center gap-2">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-xl ${
            accent ? "bg-accent text-accent-fg" : "bg-bg-raised text-fg-muted"
          }`}
        >
          <Icon className="h-4 w-4" strokeWidth={2} />
        </div>
        <span className="text-xs font-medium text-fg-muted">{label}</span>
      </div>
      <p className="text-2xl font-bold text-fg">{value}</p>
      {sub && <p className="mt-1 text-xs text-fg-subtle">{sub}</p>}
    </div>
  );
}

function TransactionRow({ t }: { t: BalanceTransaction }) {
  const sym = currencySymbol(t.currency);
  const isFree = t.is_free || t.final_amount === "0";

  return (
    <div className="flex items-center justify-between gap-4 border-b border-border-subtle py-4 last:border-0">
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-fg">
            {t.plan_name ?? gatewayLabel(t.gateway_type, t.gateway_display_name)}
          </span>
          {t.is_test && (
            <span className="rounded bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-warning">
              TEST
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-fg-muted">
            {gatewayLabel(t.gateway_type, t.gateway_display_name)}
          </span>
          {t.created_at && (
            <span className="text-xs text-fg-subtle">· {formatDate(t.created_at)}</span>
          )}
        </div>
      </div>

      <div className="flex flex-shrink-0 flex-col items-end gap-1">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle(t.status)}`}
        >
          {statusLabel(t.status)}
        </span>
        <span className="text-sm font-semibold text-fg">
          {isFree ? (
            <span className="text-success">Бесплатно</span>
          ) : (
            <>
              {t.final_amount} {sym}
              {t.discount_percent > 0 && (
                <span className="ml-1 text-xs font-normal text-fg-muted line-through">
                  {t.original_amount} {sym}
                </span>
              )}
            </>
          )}
        </span>
      </div>
    </div>
  );
}

export default function BalancePage() {
  const [balance, setBalance] = useState<BalanceResponse | null>(null);
  const [transactions, setTransactions] = useState<BalanceTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    balanceApi
      .get()
      .then(setBalance)
      .catch((e) => setError(e instanceof ApiError ? e.detail : "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, []);

  const loadTx = useCallback(() => {
    setTxLoading(true);
    balanceApi
      .transactions({ limit: LIMIT, offset })
      .then((res) => {
        setTransactions(res.items);
        setTotal(res.total);
      })
      .catch((e) => setError(e instanceof ApiError ? e.detail : "Ошибка загрузки"))
      .finally(() => setTxLoading(false));
  }, [offset]);

  useEffect(() => {
    loadTx();
  }, [loadTx]);

  const totalPages = Math.ceil(total / LIMIT);
  const currentPage = Math.floor(offset / LIMIT) + 1;

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <AlertCircle className="h-10 w-10 text-danger" />
        <p className="text-fg-muted">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-fg">Баланс</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={Wallet}
          label="Баллы"
          value={String(balance?.points ?? 0)}
          sub="Начислено за рефералов"
          accent
        />
        <StatCard
          icon={TrendingUp}
          label="Потрачено всего"
          value={`${balance?.total_spent?.toLocaleString("ru-RU", { maximumFractionDigits: 2 }) ?? "0"} ₽`}
          sub="За всё время"
        />
        <StatCard
          icon={ShoppingBag}
          label="Покупок"
          value={String(balance?.total_purchases ?? 0)}
          sub="Успешных транзакций"
        />
      </div>

      {/* Transactions */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-fg">История транзакций</h2>
          <span className="text-sm text-fg-muted">{total} всего</span>
        </div>

        <div className="rounded-2xl border border-border-subtle bg-bg-subtle px-5">
          {txLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-border border-t-accent" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-12 text-center text-sm text-fg-muted">
              Транзакций пока нет
            </div>
          ) : (
            transactions.map((t) => <TransactionRow key={t.payment_id} t={t} />)
          )}
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-fg-muted">
              Страница {currentPage} из {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setOffset(Math.max(0, offset - LIMIT))}
                disabled={offset === 0 || txLoading}
                className="rounded-xl border border-border-subtle p-2 text-fg-muted hover:text-fg disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setOffset(offset + LIMIT)}
                disabled={offset + LIMIT >= total || txLoading}
                className="rounded-xl border border-border-subtle p-2 text-fg-muted hover:text-fg disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
