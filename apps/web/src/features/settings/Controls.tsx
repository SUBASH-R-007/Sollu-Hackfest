import type { ReactNode } from "react";
import "./settings.css";

export function SettingsCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="settings-card settings-feature-card panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function SettingsField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="settings-feature-field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

export function SettingsToggle({
  checked,
  onChange,
  children,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className="settings-feature-toggle">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{children}</span>
    </label>
  );
}
