import { api } from "./client";
import type { PublicPlanLandingListResponse } from "@/types/api";

export const plansApi = {
  publicLanding: () =>
    api.get<PublicPlanLandingListResponse>("/plans/public"),
};
