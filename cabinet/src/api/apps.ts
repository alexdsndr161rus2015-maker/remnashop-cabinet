import { api } from "./client";
import { adminApi } from "./admin";

// Выбор админа: какое приложение приоритетное и какие показывать.
// priority: id приложения | null;  enabled: список id | null (null = все).
export interface AppsConfig {
  priority: string | null;
  enabled: string[] | null;
}

export const appsApi = {
  get: () => api.get<AppsConfig>("/apps"),
};

export const appsAdminApi = {
  get: () => adminApi.get<AppsConfig>("/apps"),
  update: (cfg: AppsConfig) => adminApi.put<AppsConfig>("/apps", cfg),
};
