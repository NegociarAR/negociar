import Link from "next/link";
import { signOut } from "@/app/(auth)/actions";
import { PlainSubmitButton } from "@/components/ui/submit-button";

export function NoCompanyView({ email }: { email: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl border bg-surface p-6 shadow-card">
        <h1 className="mb-3 text-base font-semibold">Conta sem empresa</h1>
        <p className="text-sm text-muted">
          Você entrou como <strong className="text-foreground">{email}</strong>, mas esta conta ainda não está
          vinculada a nenhuma empresa. Se você foi convidado, peça ao responsável para enviar um novo convite para
          este e-mail.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <Link href="/" className="flex h-10 items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-fg">
            Verificar novamente
          </Link>
          <form action={signOut}>
            <PlainSubmitButton
              pendingText="Saindo..."
              className="h-10 w-full rounded-lg border text-sm font-medium hover:bg-subtle"
            >
              Sair
            </PlainSubmitButton>
          </form>
        </div>
      </div>
    </div>
  );
}
