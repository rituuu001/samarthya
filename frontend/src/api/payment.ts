import { apiRequest } from "./client";

export type PaymentType = "DEPOSIT" | "PAYOUT";

export type PaymentStatus = "HELD" | "RELEASED" | "PENDING" | string;

export type PaymentHistoryResponse = {
  id: string;
  sprint_id: string;
  sprint_title: string;
  application_id: string | null;
  contributor_code: string | null;
  amount: number;
  currency: string;
  payment_type: PaymentType;
  status: PaymentStatus;
  is_simulated: boolean;
  transaction_reference: string | null;
  created_at: string | null;
  completed_at: string | null;
};

export function getMyPayments() {
  return apiRequest<PaymentHistoryResponse[]>("/payments/me");
}
