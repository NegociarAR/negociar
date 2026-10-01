import { PriceCalculator } from "@/modules/precifica/calculator";
import { getProduct } from "@/modules/produtos/queries";
import { PageIcon } from "@/components/page-icon";
import { Calculator } from "lucide-react";

export default async function PrecificarPage({
  searchParams,
}: {
  searchParams: Promise<{ produto?: string }>;
}) {
  const { produto } = await searchParams;
  const product = produto ? await getProduct(produto) : null;

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <PageIcon module="precifica" icon={Calculator} />
        <div>
          <h1 className="text-xl font-semibold">Precificar</h1>
          <p className="text-sm text-muted">
            Calcule o preço de venda ou descubra a margem a partir de um preço-alvo.
          </p>
        </div>
      </header>
      <PriceCalculator
        productId={product?.id}
        productName={product?.name}
        initialCostCents={product?.cost_cents}
      />
    </div>
  );
}
