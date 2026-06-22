import { clsx } from "clsx";

interface ProgressBarProps {
  value: number;
  max: number;
  className?: string;
}

export function ProgressBar({ value, max, className }: ProgressBarProps) {
  const percent = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const isHigh = percent >= 90;
  const isMedium = percent >= 70;

  return (
    <div className={clsx("h-2 w-full overflow-hidden rounded-full bg-bg-subtle", className)}>
      <div
        className={clsx(
          "h-full rounded-full transition-all duration-500",
          isHigh ? "bg-danger" : isMedium ? "bg-warning" : "bg-accent",
        )}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
