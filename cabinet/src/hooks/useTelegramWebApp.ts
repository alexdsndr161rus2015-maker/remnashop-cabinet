import { useEffect, useState } from "react";

interface TelegramWebApp {
  initData: string;
  colorScheme: "dark" | "light";
  ready: () => void;
  expand: () => void;
  BackButton: {
    isVisible: boolean;
    show: () => void;
    hide: () => void;
    onClick: (fn: () => void) => void;
    offClick: (fn: () => void) => void;
  };
  onEvent: (event: string, fn: () => void) => void;
  offEvent: (event: string, fn: () => void) => void;
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export function getTelegramWebApp(): TelegramWebApp | null {
  const app = window.Telegram?.WebApp;
  return app && app.initData ? app : null;
}

export function useIsMiniApp(): boolean {
  return Boolean(getTelegramWebApp());
}

export function useTelegramTheme(): "dark" | "light" | null {
  const [scheme, setScheme] = useState<"dark" | "light" | null>(() => {
    const app = getTelegramWebApp();
    return app ? app.colorScheme : null;
  });

  useEffect(() => {
    const app = getTelegramWebApp();
    if (!app) return;
    const handler = () => setScheme(app.colorScheme);
    app.onEvent("themeChanged", handler);
    return () => app.offEvent("themeChanged", handler);
  }, []);

  return scheme;
}

export function useTelegramBackButton(onBack: (() => void) | null) {
  useEffect(() => {
    const app = getTelegramWebApp();
    if (!app) return;

    if (onBack) {
      app.BackButton.show();
      app.BackButton.onClick(onBack);
    } else {
      app.BackButton.hide();
    }

    return () => {
      if (onBack) app.BackButton.offClick(onBack);
      app.BackButton.hide();
    };
  }, [onBack]);
}
