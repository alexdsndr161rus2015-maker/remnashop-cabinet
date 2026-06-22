import { clsx } from "clsx";

const statusConfig: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: "Активна", className: "bg-success/10 text-success" },
  EXPIRED: { label: "Истекла", className: "bg-danger/10 text-danger" },
  DISABLED: { label: "Отключена", className: "bg-fg-subtle/10 text-fg-subtle" },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || {
    label: status,
    className: "bg-fg-subtle/10 text-fg-subtle",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        config.className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {config.label}
    </span>
  );
}
