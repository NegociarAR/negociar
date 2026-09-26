import Link from "next/link";
import { BackLink } from "@/components/back-link";
import { createProduct } from "@/modules/produtos/actions";
import { ProductForm } from "@/modules/produtos/product-form";
import { getEntitlements, checkLimit } from "@/lib/entitlements";
import { countProducts } from "@/modules/produtos/queries";

export default async function NovoProdutoPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const ent = await getEntitlements();
  const gate = checkLimit(ent, "products", await countProducts());

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <BackLink href="/produtos" label="Voltar para produtos" />
      <h1 className="text-xl font-semibold">Novo produto</h1>
      {!gate.allowed ? (
        <div className="rounded-lg border border-l-2 border-l-primary bg-primary-soft p-6 text-center text-sm">
          <p>Você atingiu o limite de {gate.limit} produtos do seu plano.</p>
          <Link href="/configuracoes" className="mt-2 inline-block font-medium text-foreground underline">
            Fazer upgrade
          </Link>
        </div>
      ) : (
        <ProductForm action={createProduct} submitLabel="Salvar produto" erro={erro} />
      )}
    </div>
  );
}
