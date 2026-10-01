// Traduz erros técnicos do Postgres em mensagens que fazem sentido pra
// quem está preenchendo um formulário — sem expor nome de constraint,
// código SQL, etc.
export function friendlyDbError(error: { code?: string; message: string }): string {
  if (error.code === "23505") {
    const m = error.message;
    if (m.includes("customers_cpf_unique")) return "Já existe um cliente cadastrado com este CPF.";
    if (m.includes("customers_cnpj_unique")) return "Já existe um cliente cadastrado com este CNPJ.";
    if (m.includes("products_sku_unique")) return "Já existe um produto cadastrado com este código.";
    return "Já existe um registro cadastrado com esses dados.";
  }
  return error.message;
}
