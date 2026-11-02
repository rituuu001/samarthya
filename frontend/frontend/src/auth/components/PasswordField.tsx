import { useState } from "react";
import type { PasswordFieldProps } from "@/auth/types";

export default function PasswordField({
  label,
  name,
  value,
  placeholder,
  onChange,
  error,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="auth-field" htmlFor={name}>
      <span className="auth-label">
        {label}<b>*</b>
      </span>
      <span className="password-wrap">
        <input
          id={name}
          name={name}
          type={visible ? "text" : "password"}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={error ? "auth-input auth-input-error" : "auth-input"}
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </span>
      {error && <span className="auth-error">{error}</span>}
    </label>
  );
}
