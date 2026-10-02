import { redirect } from "next/navigation";
import { getSession } from "@/lib/entitlements";
import { signOut } from "@/app/(auth)/actions";
import { LogoN } from "@/components/logo";
import { createClient } from "@/lib/supabase/server";
import { PlainSubmitButton } from "@/components/ui/submit-button";

export default async function StatusPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.status === "active") redirect("/dashboard");

  const suspended = session.status === "suspended";

  // suspensão por pendência financeira: mensagem própria + instruções de pagamento
  let billing = false;
  let instructions: string | null = null;
  if (suspended && session.companyId) {
    const supabase = await createClient();
    const [co, set] = await Promise.all([
      supabase.from("companies").select("suspended_reason").eq("id", session.companyId).maybeSingle(),
      supabase.from("platform_settings").select("payment_instructions").maybeSingle(),
    ]);
    billing = co.data?.suspended_reason === "billing";
    instructions = set.data?.payment_instructions ?? null;
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg border bg-surface p-8 text-center">
        <div className="mx-auto mb-4 flex w-fit">
          <LogoN size={44} />
        </div>
        <h1 className="text-lg font-semibold">
          {suspended ? (billing ? "Acesso suspenso por pendência financeira" : "Acesso suspenso") : "Conta em análise"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {suspended
            ? billing
              ? "Há mensalidade(s) em aberto. Regularize o pagamento e o acesso é reativado. Seus dados estão preservados."
              : "Seu acesso foi suspenso. Entre em contato para regularizar."
            : "Seu cadastro foi recebido e está aguardando aprovação. Você receberá um e-mail assim que o acesso for liberado."}
        </p>
        {billing && instructions && (
          <p className="mt-4 whitespace-pre-line rounded-md bg-subtle p-3 text-left text-xs text-muted">{instructions}</p>
        )}
        <form action={signOut} className="mt-6">
          <PlainSubmitButton
            pendingText="Saindo..."
            className="text-sm text-muted underline transition hover:text-foreground"
          >
            Sair
          </PlainSubmitButton>
        </form>
      </div>
    </div>
  );
}
