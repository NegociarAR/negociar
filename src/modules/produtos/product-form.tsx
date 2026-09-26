import { Field, Input, Button } from "@/components/ui/form";
import type { Product } from "@/modules/produtos/queries";
import { brl } from "@/lib/format";

export function ProductForm({
  action,
  initial,
  submitLabel,
  erro,
}: {
  action: (formData: FormData) => void;
  initial?: Partial<Product>;
  submitLabel: string;
  erro?: string;
}) {
  return (
    <form action={action} className="space-y-5">
      {erro && (
        <p className="rounded-lg border-l-2 border-foreground bg-subtle px-3 py-2 text-sm">
          {erro}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Nome">
            <Input name="name" defaultValue={initial?.name ?? ""} required />
          </Field>
        </div>
        <Field label="SKU">
          <Input name="sku" defaultValue={initial?.sku ?? ""} />
        </Field>
        <Field label="Unidade">
          <Input
            name="unit"
            placeholder="un, kg, h, m..."
            defaultValue={initial?.unit ?? ""}
          />
        </Field>
        <Field label="Custo (R$)">
          <Input
            name="cost"
            inputMode="decimal"
            placeholder="0,00"
            defaultValue={
              initial?.cost_cents ? (initial.cost_cents / 100).toFixed(2).replace(".", ",") : ""
            }
          />
        </Field>
      </div>
      <Button type="submit">{submitLabel}</Button>
    </form>
  );
}
