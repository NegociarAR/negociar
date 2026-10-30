"use client";

import { useState, useTransition } from "react";
import { Field, Input, Button } from "@/components/ui/form";
import { PasswordStrengthMeter } from "@/components/password-strength-meter";
import { useToast } from "@/components/toast";
import { changePassword } from "@/app/(auth)/actions";

export function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (next.length < 8) {
      setError("A nova senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (next !== confirm) {
      setError("As senhas não conferem.");
      return;
    }
    start(async () => {
      const res = await changePassword(current, next);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      toast("Senha alterada com sucesso.");
      setCurrent("");
      setNext("");
      setConfirm("");
    });
  }

  return (
    <div className="space-y-4 rounded-lg border bg-surface p-5 shadow-card">
      <h2 className="text-sm font-semibold">Segurança</h2>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Senha atual">
          <Input
            type="password"
            required
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </Field>
        <Field label="Nova senha">
          <Input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
          <PasswordStrengthMeter password={next} />
        </Field>
        <Field label="Confirmar nova senha">
          <Input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </Field>
        {error && (
          <p className="rounded-lg border-l-2 border-danger bg-danger/5 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar nova senha"}
        </Button>
      </form>
    </div>
  );
}
