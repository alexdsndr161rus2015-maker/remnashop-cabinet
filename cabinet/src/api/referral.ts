import { api } from "./client";
import type { ReferralProgramResponse } from "@/types/api";

export const referralApi = {
  program: () => api.get<ReferralProgramResponse>("/referral/program"),
};
