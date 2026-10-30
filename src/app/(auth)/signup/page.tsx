import Link from "next/link";
import { signUp } from "../actions";
import { Field, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { SignupPasswordField } from "./password-field";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; email?: string }>;
}) {
  const { erro, email } = await searchParams;
  const fromInvite = Boolean(email);

  return (
    <form action={signUp} className="space-y-4">
      <h2 className="text-base font-semibold">Criar conta</h2>
      {erro && (
        <p className="rounded-lg border-l-2 border-foreground bg-subtle px-3 py-2 text-sm">
          {erro}
        </p>
      )}
      {!fromInvite && (
        <Field label="Nome da empresa">
          <Input name="company_name" type="text" required />
        </Field>
      )}
      <Field label="E-mail">
        <Input name="email" type="email" required autoComplete="email" defaultValue={email} readOnly={fromInvite} />
      </Field>
      <SignupPasswordField />
      <SubmitButton pendingText="Criando conta..." className="w-full">
        {fromInvite ? "Criar conta e entrar na equipe" : "Começar grátis"}
      </SubmitButton>
      <p className="text-center text-sm text-muted">
        Já tem conta?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
