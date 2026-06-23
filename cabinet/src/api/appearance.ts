import { api } from "./client";
import { adminApi } from "./admin";

export interface Appearance {
  brand_name: string;
  accent: string | null;
  background: string | null;
}

// Публичное оформление — доступно без авторизации.
export const appearanceApi = {
  get: () => api.get<Appearance>("/appearance"),
};

// Изменение оформления — только для админов.
export const appearanceAdminApi = {
  get: () => adminApi.get<Appearance>("/appearance"),
  update: (data: Partial<Appearance>) => adminApi.put<Appearance>("/appearance", data),
};
