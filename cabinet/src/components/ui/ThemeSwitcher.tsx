import { clsx } from "clsx";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme, type ThemeMode } from "@/contexts/ThemeContext";

const options: { mode: ThemeMode; icon: typeof Moon; label: string }[] = [
  { mode: "light", icon: Sun, label: "Светлая" },
  { mode: "system", icon: Monitor, label: "Системная" },
  { mode: "dark", icon: Moon, label: "Тёмная" },
];

export function ThemeSwitcher() {
  const { mode, setMode, isMiniApp } = useTheme();

  if (isMiniApp) return null;

  return (
    <div className="inline-flex items-center gap-0.5 rounded-xl border border-border bg-bg-subtle p-1">
      {options.map(({ mode: optMode, icon: Icon, label }) => (
        <button
          key={optMode}
          type="button"
          title={label}
          aria-label={label}
          onClick={() => setMode(optMode)}
          className={clsx(
            "flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150",
            mode === optMode
              ? "bg-bg-raised text-accent shadow-soft"
              : "text-fg-subtle hover:text-fg-muted",
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={2} />
        </button>
      ))}
    </div>
  );
}
