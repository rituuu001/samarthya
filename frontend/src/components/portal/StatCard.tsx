import { PortalCard } from "@/components/portal/PortalCard";

export function StatCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <PortalCard className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-note">{note}</div>
    </PortalCard>
  );
}
