import type { ReactNode } from "react";

export function PortalCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`portal-card ${className}`}>{children}</div>;
}
