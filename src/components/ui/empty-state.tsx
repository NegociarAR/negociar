import type { LucideIcon } from "lucide-react";

export function EmptyState({
  message,
  icon: Icon,
}: {
  message: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="rounded-lg border border-dashed bg-surface p-10 text-center text-sm text-muted">
      {Icon && (
        <div className="mb-3 flex justify-center">
          <Icon size={24} strokeWidth={1.5} className="text-muted/50" />
        </div>
      )}
      {message}
    </div>
  );
}
