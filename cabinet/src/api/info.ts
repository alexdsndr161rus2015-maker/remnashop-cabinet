import { api } from "./client";
import { adminApi } from "./admin";

export interface FaqItem {
  q: string;
  a: string;
}

// Контент страницы «Информация». Тексты — в markdown (мини-рендер на фронте).
// Вкладка «Серверы» сюда не входит — она живая (Remnawave), см. service_status.
export interface InfoContent {
  faq: FaqItem[];
  rules: string;
  privacy: string;
  offer: string;
  statuses: string;
}

// Публичное чтение (сохранённое или брендированные дефолты).
export const infoApi = {
  get: () => api.get<InfoContent>("/info"),
};

// Редактирование — только для админов.
export const infoAdminApi = {
  get: () => adminApi.get<InfoContent>("/info"),
  update: (data: Partial<InfoContent>) => adminApi.put<InfoContent>("/info", data),
};
