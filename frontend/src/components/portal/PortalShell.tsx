import type { ReactNode } from "react";
import samarthyaLogo from "@/imports/image.webp";
import type { AuthRole } from "@/AuthFlow";
import { candidateNav, employerNav } from "@/data/portalData";

export function PortalShell({
  role,
  active,
  setActive,
  onLogout,
  children,
}: {
  role: AuthRole;
  active: string;
  setActive: (page: string) => void;
  onLogout: () => void;
  children: ReactNode;
}) {
  const nav = role === "employer" ? employerNav : candidateNav;
  return (
    <div className="portal-shell">
      <aside className="portal-sidebar">
        <div className="portal-logo">
          <img src={samarthyaLogo} alt="Samarthya logo" />
          <div><strong>सामर्थ्य</strong><small>Prove First, Connect Later.</small></div>
        </div>
        <div className="portal-role-label">{role === "employer" ? "Employer workspace" : "Candidate workspace"}</div>
        <nav className="portal-nav">
          {nav.map(([id, label], index) => (
            <button
              type="button"
              key={id}
              className={active === id ? "portal-nav-active" : ""}
              onClick={() => setActive(id)}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              {label}
            </button>
          ))}
        </nav>
        <div className="portal-sidebar-footer">
          <button type="button" onClick={() => setActive("profile")}>
            <span className="portal-avatar">{role === "employer" ? "RS" : "AS"}</span>
            <span><strong>{role === "employer" ? "Rohan Sharma" : "Aaisha Shrestha"}</strong><small>View profile</small></span>
          </button>
          <button type="button" className="logout-button" onClick={onLogout}>Log out</button>
        </div>
      </aside>
      <div className="portal-workspace">
        <header className="portal-mobile-header">
          <div className="portal-logo"><img src={samarthyaLogo} alt="" /><strong>सामर्थ्य</strong></div>
          <button type="button" onClick={onLogout}>Log out</button>
        </header>
        <nav className="portal-mobile-nav">
          {nav.map(([id, label]) => (
            <button type="button" key={id} className={active === id ? "portal-nav-active" : ""} onClick={() => setActive(id)}>
              {label}
            </button>
          ))}
        </nav>
        <main className="portal-main">{children}</main>
      </div>
    </div>
  );
}
