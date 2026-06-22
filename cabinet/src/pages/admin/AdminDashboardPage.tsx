import { useEffect, useState } from "react";
import { Users, CreditCard, TrendingUp, Activity, AlertCircle } from "lucide-react";
import { statisticsApi, type AdminOverviewResponse, type GatewayStats } from "@/api/admin";
import { ApiError } from "@/types/api";

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-bg-subtle p-5">
      <p className="text-xs font-medium text-fg-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-fg">{value}</p>
      {sub && <p className="mt-1 text-xs text-fg-subtle">{sub}</p>}
    </div>
  );
}

function GatewayCard({ g }: { g: GatewayStats }) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-bg-subtle p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-fg">{g.gateway_type}</span>
        <span className="rounded-full bg-accent-subtle px-2 py-0.5 text-xs text-accent">
          {g.paid_count} платежей
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-fg-muted">Всего</p>
          <p className="font-semibold text-fg">
            {g.total_income.toLocaleString("ru-RU", { maximumFractionDigits: 0 })} ₽
          </p>
        </div>
        <div>
          <p className="text-fg-muted">За месяц</p>
          <p className="font-semibold text-fg">
            {g.monthly_income.toLocaleString("ru-RU", { maximumFractionDigits: 0 })} ₽
          </p>
        </div>
        <div>
          <p className="text-fg-muted">За неделю</p>
          <p className="font-semibold text-fg">
            {g.weekly_income.toLocaleString("ru-RU", { maximumFractionDigits: 0 })} ₽
          </p>
        </div>
        <div>
          <p className="text-fg-muted">За сегодня</p>
          <p className="font-semibold text-fg">
            {g.daily_income.toLocaleString("ru-RU", { maximumFractionDigits: 0 })} ₽
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    statisticsApi
      .overview()
      .then(setData)
      .catch((e) => {
        setError(e instanceof ApiError ? e.detail : "Ошибка загрузки");
      })
      .finally(() => setLoading(false));
  }, []);

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

  if (!data) return null;

  const { users, subscriptions, transactions } = data;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-fg">Обзор</h1>

      {/* Users */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-accent" />
          <h2 className="text-base font-semibold text-fg">Пользователи</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <StatCard label="Всего" value={users.total} />
          <StatCard label="Активных" value={users.active} />
          <StatCard label="Заблокированных" value={users.blocked} />
          <StatCard label="Платящих" value={users.paying} />
          <StatCard label="Новых сегодня" value={users.new_today} />
          <StatCard label="За неделю" value={users.new_week} />
          <StatCard label="За месяц" value={users.new_month} />
          <StatCard label="Пробные" value={users.with_trial} />
        </div>
      </section>

      {/* Subscriptions */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-accent" />
          <h2 className="text-base font-semibold text-fg">Подписки</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <StatCard label="Всего" value={subscriptions.total} />
          <StatCard label="Активных" value={subscriptions.active} />
          <StatCard label="Истекших" value={subscriptions.expired} />
          <StatCard label="Отключённых" value={subscriptions.disabled} />
          <StatCard label="Пробных" value={subscriptions.trial} />
          <StatCard label="Безлимит" value={subscriptions.unlimited} />
          <StatCard label="Ограниченных" value={subscriptions.limited} />
          <StatCard
            label="Истекают скоро"
            value={subscriptions.expiring_soon}
          />
        </div>
      </section>

      {/* Gateways */}
      {transactions.gateways.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-accent" />
            <h2 className="text-base font-semibold text-fg">Платёжные шлюзы</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {transactions.gateways.map((g) => (
              <GatewayCard key={g.gateway_type} g={g} />
            ))}
          </div>
        </section>
      )}

      {/* Transactions summary */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-accent" />
          <h2 className="text-base font-semibold text-fg">Транзакции</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard label="Всего" value={transactions.total} />
          <StatCard label="Успешных" value={transactions.completed} />
        </div>
      </section>
    </div>
  );
}
