import { api } from "./client";
import { adminApi } from "./admin";

// Своё приложение, добавленное админом. deep_link — шаблон с {sub}
// (подставляется ссылка подписки). install_url — ссылка установки (необязательно).
export interface CustomApp {
  id: string;
  name: string;
  desc: string;
  platforms: string[]; // ios|android|windows|macos|androidtv
  deep_link: string;
  install_url: string | null;
}

// Выбор админа: какое приложение приоритетное и какие показывать.
// priority: id приложения | null;  enabled: список id | null (null = все).
export interface AppsConfig {
  priority: string | null;
  enabled: string[] | null;
  custom: CustomApp[];
}

export const appsApi = {
  get: () => api.get<AppsConfig>("/apps"),
};

export const appsAdminApi = {
  get: () => adminApi.get<AppsConfig>("/apps"),
  update: (cfg: AppsConfig) => adminApi.put<AppsConfig>("/apps", cfg),
};
