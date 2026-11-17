import type React from "react";

export function Textarea({
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  value?: string;
  onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      style={{
        width: "100%",
        border: "1px solid #e8e4e1",
        borderRadius: "10px",
        padding: "10px 14px",
        fontSize: "14px",
        color: "#1a1a1a",
        background: "#ffffff",
        resize: "vertical",
        transition: "border-color 0.15s",
        fontFamily: "Outfit, sans-serif",
        lineHeight: 1.6,
      }}
    />
  );
}
