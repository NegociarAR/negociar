import Link from "next/link";

export function StatCard({
  label,
  value,
  href,
  active,
  danger,
  sub,
}: {
  label: string;
  value: string | number;
  href?: string;
  active?: boolean;
  danger?: boolean;
  sub?: string;
}) {
  const base = `rounded-lg border bg-surface p-3 shadow-card transition sm:p-4`;
  const state = active
    ? "border-primary bg-primary-soft"
    : danger
    ? "border-danger/30 bg-danger/5"
    : "hover:bg-subtle";

  const inner = (
    <>
      <p className={`tabular text-lg font-semibold sm:text-xl ${danger ? "text-danger" : ""}`}>
        {value}
      </p>
      <p className="text-xs text-muted">{label}</p>
      {sub && <p className={`mt-0.5 text-xs font-medium ${danger ? "text-danger" : "text-muted"}`}>{sub}</p>}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`block ${base} ${state}`}>
        {inner}
      </Link>
    );
  }
  return <div className={`${base} ${state}`}>{inner}</div>;
}
