import { adminApi } from "./admin";

export type EmailProvider = "gmail" | "yandex" | "mailru" | "brevo" | "custom";

export interface EmailSettings {
  enabled: boolean;
  provider: EmailProvider;
  host: string;
  port: number;
  use_tls: boolean;
  use_ssl: boolean;
  username: string;
  from_email: string;
  from_name: string;
  has_password: boolean;
  has_brevo_key: boolean;
  is_enabled: boolean; // готово ли реально отправлять
  presets: Record<string, { host: string; port: number; use_tls: boolean; use_ssl: boolean }>;
}

// Поля для PUT: секреты (password / brevo_api_key) — пустая строка = «не менять».
export interface EmailSettingsUpdate {
  enabled?: boolean;
  provider?: EmailProvider;
  host?: string;
  port?: number;
  use_tls?: boolean;
  use_ssl?: boolean;
  username?: string;
  password?: string;
  from_email?: string;
  from_name?: string;
  brevo_api_key?: string;
}

export const emailSettingsAdminApi = {
  get: () => adminApi.get<EmailSettings>("/email-settings"),
  update: (data: EmailSettingsUpdate) => adminApi.put<EmailSettings>("/email-settings", data),
  sendTest: (to: string) =>
    adminApi.post<{ success: boolean; to: string }>("/email-settings/test", { to }),
};
