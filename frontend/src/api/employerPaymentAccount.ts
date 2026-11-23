import { apiRequest } from "./client";

export type EmployerPaymentAccount = {
  id: string;
  employer_id: string;
  account_type: "esewa" | "khalti" | "bank";
  account_identifier: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export type CreateEmployerPaymentAccountData = {
  account_type: EmployerPaymentAccount["account_type"];
  account_identifier: string;
  is_default?: boolean;
};

export type UpdateEmployerPaymentAccountData = {
  account_type?: EmployerPaymentAccount["account_type"];
  account_identifier?: string;
  is_default?: boolean;
};

export function getEmployerPaymentAccounts() {
  return apiRequest<EmployerPaymentAccount[]>("/employer/payment-accounts");
}

export function createEmployerPaymentAccount(
  data: CreateEmployerPaymentAccountData,
) {
  return apiRequest<EmployerPaymentAccount>("/employer/payment-accounts", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateEmployerPaymentAccount(
  accountId: string,
  data: UpdateEmployerPaymentAccountData,
) {
  return apiRequest<EmployerPaymentAccount>(
    `/employer/payment-accounts/${accountId}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
  );
}

export function deleteEmployerPaymentAccount(accountId: string) {
  return apiRequest<void>(`/employer/payment-accounts/${accountId}`, {
    method: "DELETE",
  });
}
