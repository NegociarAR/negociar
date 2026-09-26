import { PriceCalculator } from "@/modules/precifica/calculator";
import { getProduct } from "@/modules/produtos/queries";

export default async function PrecificarPage({
  searchParams,
}: {
  searchParams: Promise<{ produto?: string }>;
}) {
  const { produto } = await searchParams;
  const product = produto ? await getProduct(produto) : null;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-semibold">Precificar</h1>
        <p className="text-sm text-muted">
          Calcule o preço de venda ou descubra a margem a partir de um preço-alvo.
        </p>
      </header>
      <PriceCalculator
        productId={product?.id}
        productName={product?.name}
        initialCostCents={product?.cost_cents}
      />
    </div>
  );
}
