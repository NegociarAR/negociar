"use client";

import { flash } from "@/components/toast";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Field, Input, Button } from "@/components/ui/form";

export default function NovaSenhaPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const data = new FormData(e.currentTarget);
    const password = String(data.get("password"));
    const confirm = String(data.get("confirm"));

    if (password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não conferem.");
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(error.message);
        return;
      }
      flash("Senha alterada com sucesso.");
      router.push("/dashboard");
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <h2 className="text-base font-semibold">Criar nova senha</h2>
      <Field label="Nova senha">
        <Input name="password" type="password" required minLength={8} autoFocus />
      </Field>
      <Field label="Confirmar nova senha">
        <Input name="confirm" type="password" required minLength={8} />
      </Field>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Salvando..." : "Salvar nova senha"}
      </Button>
    </form>
  );
}
