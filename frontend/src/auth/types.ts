import type { ReactNode } from "react";
import type { InfoPageKey } from "@/PublicInfo";

export type AuthRole = "candidate" | "employer";
export type AuthMode = "signup" | "login";
export type AuthStep = "auth" | "onboarding";

export type AuthFlowProps = {
  initialRole: AuthRole;
  initialMode?: AuthMode;
  onBackHome: () => void;
  onComplete: (role: AuthRole) => void;
  onNavigateInfo: (page: InfoPageKey) => void;
};

export type FieldProps = {
  label: string;
  name: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  error?: string;
  optional?: boolean;
  type?: string;
};

export type PasswordFieldProps = Omit<FieldProps, "type" | "optional">;

export type AuthShellProps = {
  role: AuthRole;
  step: AuthStep;
  onBack: () => void;
  onSwitchRole: () => void;
  children: ReactNode;
};

export type AuthFormProps = {
  role: AuthRole;
  initialMode: AuthMode;
  onBack: () => void;
  onSwitchRole: () => void;
  onRegistered: (name: string) => void;
  onLoggedIn: () => void;
  onNavigateInfo: (page: InfoPageKey) => void;
};
