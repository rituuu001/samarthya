import type React from "react";

type TextareaProps = {
  placeholder?: string;
  rows?: number;
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLTextAreaElement>;
};

export function Textarea({
  placeholder,
  rows = 4,
  value,
  onChange,
}: TextareaProps) {
  return (
    <textarea
      placeholder={placeholder}
      rows={rows}
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
        resize: "vertical",
        transition: "border-color 0.15s",
        fontFamily: "Outfit, sans-serif",
        lineHeight: 1.6,
      }}
    />
  );
}