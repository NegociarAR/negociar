import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/entitlements";
import { signOut } from "@/app/(auth)/actions";
import { LogoN } from "@/components/logo";

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
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <LogoN size={26} />
              <Link href="/admin" className="text-sm font-semibold">
                Admin · NEGOCIAR
              </Link>
            </div>
            <nav className="flex items-center gap-4 text-sm text-muted">
              <Link href="/admin" className="hover:text-foreground">Empresas</Link>
              <Link href="/admin/financeiro" className="hover:text-foreground">Financeiro</Link>
            </nav>
          </div>
          <form action={signOut}>
            <button className="text-sm text-muted underline hover:text-foreground">
              Sair
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4 md:p-8">{children}</main>
    </div>
  );
}
