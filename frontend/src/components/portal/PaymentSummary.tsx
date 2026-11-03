import { Badge } from "@/components/portal/Badge";
import { PortalCard } from "@/components/portal/PortalCard";

export function PaymentSummary({
  held,
  pending,
  released,
}: {
  held: string;
  pending: string;
  released: string;
}) {
  return (
    <PortalCard>
      <div className="card-heading-row">
        <div>
          <div className="card-title">Payment Progress</div>
          <div className="card-subtitle">Escrow and release status across your projects.</div>
        </div>
        <Badge tone="gray">Protected payments</Badge>
      </div>
      <div className="payment-summary-grid">
        <div><span className="payment-dot held" /><small>Held</small><strong>{held}</strong></div>
        <div><span className="payment-dot pending" /><small>Pending Approval</small><strong>{pending}</strong></div>
        <div><span className="payment-dot released" /><small>Released</small><strong>{released}</strong></div>
      </div>
    </PortalCard>
  );
}
