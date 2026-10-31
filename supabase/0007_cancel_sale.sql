-- Cancela uma venda por engano: remove parcelas + venda, devolvendo o
-- orçamento para o formulário de fechar venda.
-- Bloqueios: parcela já recebida, ou NFS-e não-erro associada.
-- Executar no SQL editor do Supabase (projeto suite-comercial).

create or replace function public.cancel_sale(p_sale_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_received_count integer;
  v_invoice_count integer;
begin
  select company_id into v_company_id from sales where id = p_sale_id;
  if v_company_id is null then
    raise exception 'Venda não encontrada.';
  end if;

  select count(*) into v_received_count
  from sale_installments
  where sale_id = p_sale_id and status = 'received';
  if v_received_count > 0 then
    raise exception 'Essa venda já tem parcela recebida — não pode ser cancelada.';
  end if;

  select count(*) into v_invoice_count
  from service_invoices
  where sale_id = p_sale_id and status <> 'error';
  if v_invoice_count > 0 then
    raise exception 'Essa venda já tem nota fiscal emitida/em processamento — cancele a NFS-e antes.';
  end if;

  delete from sale_installments where sale_id = p_sale_id;
  delete from service_invoices where sale_id = p_sale_id; -- só sobram status='error', sem valor fiscal
  update quote_hour_entries set sale_id = null where sale_id = p_sale_id;
  delete from sales where id = p_sale_id;
end;
$$;
