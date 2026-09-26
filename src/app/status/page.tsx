import { redirect } from "next/navigation";
import { getSession } from "@/lib/entitlements";
import { signOut } from "@/app/(auth)/actions";
import { LogoN } from "@/components/logo";

export default async function StatusPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.status === "active") redirect("/dashboard");

  const suspended = session.status === "suspended";

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg border bg-surface p-8 text-center">
        <div className="mx-auto mb-4 flex w-fit">
          <LogoN size={44} />
        </div>
        <h1 className="text-lg font-semibold">
          {suspended ? "Acesso suspenso" : "Conta em análise"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {suspended
            ? "Seu acesso foi suspenso. Entre em contato para regularizar."
            : "Seu cadastro foi recebido e está aguardando aprovação. Você receberá um e-mail assim que o acesso for liberado."}
        </p>
        <form action={signOut} className="mt-6">
          <button
            type="submit"
            className="text-sm text-muted underline transition hover:text-foreground"
          >
            Sair
          </button>
        </form>
      </div>
    </div>
  );
}
