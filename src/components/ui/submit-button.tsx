"use client";

import { useFormStatus } from "react-dom";
import { Button } from "./form";

// Botão de envio para formulários com Server Action nativa (<form
// action={...}>, sem useTransition próprio). useFormStatus() sabe
// sozinho quando o form pai está processando — desabilita o clique e
// troca o texto, então um segundo clique enquanto a primeira submissão
// ainda está em voo não duplica nada (cliente, produto, login, etc.).
export function SubmitButton({
  children,
  pendingText = "Salvando...",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? pendingText : children}
    </Button>
  );
}

// Mesma lógica, sem impor o visual do Button — para botões com classes
// próprias (ex.: "Sair" estilizado como link). Só desabilita e troca o
// texto; o resto do estilo é o que já estava no className do chamador.
export function PlainSubmitButton({
  children,
  pendingText,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { pendingText: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${className ?? ""} disabled:opacity-50`.trim()} {...props}>
      {pending ? pendingText : children}
    </button>
  );
}
