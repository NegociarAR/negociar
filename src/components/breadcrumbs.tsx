import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav className="-my-1 flex flex-wrap items-center gap-0.5 text-sm text-muted">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={i} className="flex items-center gap-0.5">
            {i > 0 && <ChevronRight size={13} className="shrink-0 opacity-50" />}
            {crumb.href && !isLast ? (
              <Link href={crumb.href} className="transition hover:text-foreground">
                {crumb.label}
              </Link>
            ) : (
              <span className={isLast ? "text-foreground" : undefined}>{crumb.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
