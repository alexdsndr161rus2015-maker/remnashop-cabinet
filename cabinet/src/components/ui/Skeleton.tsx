import { clsx } from "clsx";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        "skeleton animate-shimmer rounded-lg",
        className,
      )}
    />
  );
}
