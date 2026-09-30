import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="-my-2 inline-flex items-center gap-1.5 py-2.5 text-sm text-muted transition hover:text-foreground"
    >
      <ArrowLeft size={15} strokeWidth={1.8} />
      {label}
    </Link>
  );
}
