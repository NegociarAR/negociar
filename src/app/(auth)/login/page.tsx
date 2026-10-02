import Link from "next/link";
import { signIn } from "../actions";
import { Field, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; confirme?: string }>;
}) {
  const { erro, confirme } = await searchParams;
  return (
    <form action={signIn} className="space-y-4">
      <h2 className="text-base font-semibold">Entrar</h2>
      {confirme && (
        <p className="rounded-lg border-l-2 border-foreground bg-subtle px-3 py-2 text-sm">
          Conta criada. Confira seu e-mail para confirmar antes de entrar.
        </p>
      )}
      {erro && (
        <p className="rounded-lg border-l-2 border-foreground bg-subtle px-3 py-2 text-sm">
          {erro}
        </p>
      )}
      <Field label="E-mail">
        <Input name="email" type="email" required autoComplete="email" />
      </Field>
      <Field label="Senha">
        <Input
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </Field>
      <SubmitButton pendingText="Entrando..." className="w-full">
        Entrar
      </SubmitButton>
      <div className="flex justify-between text-sm text-muted">
        <Link href="/recuperar" className="hover:text-foreground">
          Esqueci a senha
        </Link>
        <Link href="/signup" className="hover:text-foreground">
          Criar conta
        </Link>
      </div>
    </form>
  );
}
