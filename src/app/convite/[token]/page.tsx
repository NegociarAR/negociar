import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/entitlements";
import { ROLE_LABELS, type CompanyRole } from "@/modules/team/types";
import { acceptInvite } from "./actions";
import { SubmitButton } from "@/components/ui/submit-button";

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { token } = await params;
  const { erro } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_invite_info", { p_token: token }).maybeSingle();
  const session = await getSession();

  if (!data) {
    return <Wrap><p className="text-sm text-muted">Convite não encontrado.</p></Wrap>;
  }
  const invite = data as { email: string; role: CompanyRole; company_name: string; status: string; expires_at: string };

  if (invite.status === "accepted") {
    return <Wrap><p className="text-sm text-muted">Este convite já foi aceito.</p></Wrap>;
  }
  if (invite.status === "revoked") {
    return <Wrap><p className="text-sm text-muted">Este convite foi cancelado.</p></Wrap>;
  }
  if (new Date(invite.expires_at) < new Date()) {
    return <Wrap><p className="text-sm text-muted">Este convite expirou. Peça um novo link.</p></Wrap>;
  }

  const loggedInAsInvited = session?.user.email?.toLowerCase() === invite.email.toLowerCase();

  return (
    <Wrap>
      <p className="text-sm">
        Você foi convidado para a equipe de <strong>{invite.company_name}</strong>, como{" "}
        <strong>{ROLE_LABELS[invite.role]}</strong>.
      </p>
      {erro && <p className="mt-3 rounded-lg border-l-2 border-foreground bg-subtle px-3 py-2 text-sm">{erro}</p>}

      {session && loggedInAsInvited && (
        <form action={acceptInvite.bind(null, token)} className="mt-4">
          <SubmitButton pendingText="Aceitando..." className="w-full">
            Aceitar convite
          </SubmitButton>
        </form>
      )}

      {session && !loggedInAsInvited && (
        <p className="mt-4 text-sm text-muted">
          Este convite foi enviado para <strong>{invite.email}</strong>, mas você está logado como{" "}
          {session.user.email}.{" "}
          <Link href={`/login?next=/convite/${token}`} className="text-primary hover:underline">
            Entrar com outra conta
          </Link>
        </p>
      )}

      {!session && (
        <div className="mt-4 flex flex-col gap-2">
          <Link
            href={`/login?next=/convite/${token}`}
            className="h-10 flex items-center justify-center rounded-lg border text-sm font-medium hover:bg-subtle"
          >
            Já tenho conta
          </Link>
          <Link
            href={`/signup?email=${encodeURIComponent(invite.email)}`}
            className="h-10 flex items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-fg"
          >
            Criar conta
          </Link>
        </div>
      )}
    </Wrap>
  );
}

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl border bg-surface p-6 shadow-card">
        <h1 className="mb-3 text-base font-semibold">Convite para equipe</h1>
        {children}
      </div>
    </div>
  );
}
