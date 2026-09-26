import Link from "next/link";
import { signUp } from "../actions";
import { Field, Input, Button } from "@/components/ui/form";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  return (
    <form action={signUp} className="space-y-4">
      <h2 className="text-base font-semibold">Criar conta</h2>
      {erro && (
        <p className="rounded-lg border-l-2 border-foreground bg-subtle px-3 py-2 text-sm">
          {erro}
        </p>
      )}
      <Field label="Nome da empresa">
        <Input name="company_name" type="text" required />
      </Field>
      <Field label="E-mail">
        <Input name="email" type="email" required autoComplete="email" />
      </Field>
      <Field label="Senha">
        <Input
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
        />
      </Field>
      <Button type="submit" className="w-full">
        Começar grátis
      </Button>
      <p className="text-center text-sm text-muted">
        Já tem conta?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
