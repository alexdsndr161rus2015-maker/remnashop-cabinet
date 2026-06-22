import { useCallback, useEffect, useState } from "react";
import { subscriptionApi } from "@/api/subscription";
import type { SubscriptionInfoResponse } from "@/types/api";

export function useSubscription() {
  const [subscription, setSubscription] = useState<SubscriptionInfoResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await subscriptionApi.current();
      setSubscription(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить подписку");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { subscription, isLoading, error, reload };
}
