import { api } from "./client";

export interface BalanceResponse {
  points: number;
  total_spent: number;
  total_purchases: number;
}

export interface BalanceTransaction {
  payment_id: string;
  status: string;
  gateway_type: string;
  gateway_display_name: string | null;
  purchase_type: string;
  plan_name: string | null;
  original_amount: string;
  discount_percent: number;
  final_amount: string;
  currency: string;
  is_free: boolean;
  is_test: boolean;
  created_at: string | null;
}

export interface TransactionListResponse {
  total: number;
  limit: number;
  offset: number;
  items: BalanceTransaction[];
}

export const balanceApi = {
  get: () => api.get<BalanceResponse>("/balance"),
  transactions: (params: { limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params.limit != null) qs.set("limit", String(params.limit));
    if (params.offset != null) qs.set("offset", String(params.offset));
    return api.get<TransactionListResponse>(`/balance/transactions?${qs}`);
  },
};
