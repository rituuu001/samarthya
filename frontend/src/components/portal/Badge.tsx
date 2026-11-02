import type { ReactNode } from "react";
import type { StatusTone } from "@/data/portalData";

export function Badge({ children, tone = "pink" }: { children: ReactNode; tone?: StatusTone }) {
  return <span className={`portal-badge portal-badge-${tone}`}>{children}</span>;
}
