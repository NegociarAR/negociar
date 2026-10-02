import Link from "next/link";
import { resetPassword } from "../actions";
import { Field, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";

export default async function RecoverPage({
  searchParams,
}: {
  searchParams: Promise<{ enviado?: string }>;
}) {
  const { enviado } = await searchParams;
  return (
    <form action={resetPassword} className="space-y-4">
      <h2 className="text-base font-semibold">Recuperar senha</h2>
      {enviado ? (
        <p className="rounded-lg border-l-2 border-foreground bg-subtle px-3 py-2 text-sm">
          Se o e-mail existir, enviamos um link para redefinir a senha.
        </p>
      ) : (
        <>
          <Field label="E-mail">
            <Input name="email" type="email" required autoComplete="email" />
          </Field>
          <SubmitButton pendingText="Enviando..." className="w-full">
            Enviar link
          </SubmitButton>
        </>
      )}
      <p className="text-center text-sm text-muted">
        <Link href="/login" className="hover:text-foreground">
          Voltar para entrar
        </Link>
      </p>
    </form>
  );
}
