"use client";

import { deleteCustomer } from "@/modules/clientes/actions";

export function DeleteCustomerButton({ id }: { id: string }) {
  const action = deleteCustomer.bind(null, id);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("Excluir este cliente?")) e.preventDefault();
      }}
    >
      <button
        type="submit"
        className="text-sm text-danger transition hover:underline"
      >
        Excluir
      </button>
    </form>
  );
}
