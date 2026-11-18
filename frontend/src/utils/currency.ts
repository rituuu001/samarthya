export function formatCurrency(amount: number | string, currency?: string) {
  const numericAmount = Number(amount);
  const formatted = numericAmount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return currency ? `${currency} ${formatted}` : formatted;
}
