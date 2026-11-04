import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export function EmptyState({
  message,
  icon: Icon,
  action,
}: {
  message: string;
  icon?: LucideIcon;
  action?: { label: string; href: string };
}) {
  return (
    <div className="rounded-lg border border-dashed bg-surface p-10 text-center text-sm text-muted">
      {Icon && (
        <div className="mb-3 flex justify-center">
          <Icon size={24} strokeWidth={1.5} className="text-muted/50" />
        </div>
      )}
      <p>{message}</p>
      {action && (
        <Link
          href={action.href}
          className="mt-3 inline-block rounded-lg border bg-surface px-4 py-1.5 text-xs font-medium text-foreground hover:bg-subtle"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
