import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/entitlements";
import { signOut } from "@/app/(auth)/actions";
import { LogoN } from "@/components/logo";
import { AdminNav } from "@/components/admin-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  // Só admin da plataforma. Qualquer outro é mandado ao app do cliente.
  if (!session.isAdmin) redirect("/dashboard");

  return (
    <div className="min-h-dvh">
      <header className="border-b bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 px-4 md:h-14 md:flex-nowrap">
          <div className="flex h-14 items-center gap-3">
            <LogoN size={26} />
            <Link href="/admin" className="-my-2 py-2.5 text-sm font-semibold">
              Admin · NEGOCIAR
            </Link>
          </div>
          <div className="order-last -mx-4 w-[calc(100%+2rem)] overflow-x-auto border-t px-1 md:order-none md:mx-0 md:w-auto md:flex-1 md:border-t-0 md:px-0">
            <AdminNav />
          </div>
          <form action={signOut}>
            <button className="px-2 py-2.5 text-sm text-muted underline hover:text-foreground">
              Sair
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4 md:p-8">{children}</main>
    </div>
  );
}
