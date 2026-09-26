import * as React from "react";

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-lg border bg-surface px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
    />
  );
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
}) {
  const base =
    "inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium transition disabled:opacity-50";
  const styles =
    variant === "primary"
      ? "bg-primary text-primary-fg hover:opacity-90"
      : "text-foreground hover:bg-background";
  return <button {...props} className={`${base} ${styles} ${className}`} />;
}
