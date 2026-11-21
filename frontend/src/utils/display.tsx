export function formatBackendDeadline(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function BackendMoney({ amount, currency }: { amount: number; currency: string }) {
  return <>{currency} {amount.toLocaleString()}</>;
}
