import type React from "react";

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: "12px",
        fontWeight: 600,
        color: "#8a8480",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        marginBottom: "6px",
      }}
    >
      {children}
    </div>
  );
}

export function Input({
  placeholder,
  type = "text",
  value,
  onChange,
}: {
  placeholder?: string;
  type?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      style={{
        width: "100%",
        border: "1px solid #e8e4e1",
        borderRadius: "10px",
        padding: "10px 14px",
        fontSize: "14px",
        color: "#1a1a1a",
        background: "#ffffff",
        transition: "border-color 0.15s",
        fontFamily: "Outfit, sans-serif",
      }}
    />
  );
}
