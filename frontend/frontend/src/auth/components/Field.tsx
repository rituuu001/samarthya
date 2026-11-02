import type { FieldProps } from "@/auth/types";

export default function Field({
  label,
  name,
  value,
  placeholder,
  onChange,
  error,
  optional,
  type = "text",
}: FieldProps) {
  return (
    <label className="auth-field" htmlFor={name}>
      <span className="auth-label">
        {label}
        {optional ? <small>Optional</small> : <b>*</b>}
      </span>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={error ? "auth-input auth-input-error" : "auth-input"}
      />
      {error && <span className="auth-error">{error}</span>}
    </label>
  );
}
