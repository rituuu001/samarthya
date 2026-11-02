import type { ReactNode } from "react";

export function PageHeading({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="portal-page-heading">
      <div>
        <div className="portal-eyebrow">{eyebrow}</div>
        <div className="portal-title">{title}</div>
        <div className="portal-subtitle">{subtitle}</div>
      </div>
      {action}
    </div>
  );
}
