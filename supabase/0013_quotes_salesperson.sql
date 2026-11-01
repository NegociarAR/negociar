-- Relatório de performance por vendedor.
-- Executar no SQL Editor do Supabase (projeto suite-comercial).

alter table public.quotes
  add column if not exists salesperson_id uuid references auth.users(id);

-- Recria create_quote adicionando salesperson_id = auth.uid() no INSERT.
create or replace function public.create_quote(
  p_company uuid,
  p_customer uuid,
  p_items jsonb,
  p_discount_cents integer,
  p_valid_until date,
  p_payment_terms text,
  p_delivery_terms text,
  p_notes text
) returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_number int;
  v_subtotal int;
  v_total int;
  v_quote_id uuid;
begin
  if not exists (select 1 from company_users where user_id = auth.uid() and company_id = p_company) then
    raise exception 'not authorized';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Adicione ao menos um item.';
  end if;

  select coalesce(sum(round(((i->>'quantity')::numeric) * ((i->>'unit_price_cents')::numeric)))::int, 0)
    into v_subtotal
  from jsonb_array_elements(p_items) i;
  v_total := greatest(0, v_subtotal - coalesce(p_discount_cents, 0));

  v_number := public.next_quote_number(p_company);

  insert into quotes (company_id, customer_id, number, status, discount_cents,
                       subtotal_cents, total_cents, valid_until, payment_terms,
                       delivery_terms, notes, salesperson_id)
  values (p_company, p_customer, v_number, 'draft', coalesce(p_discount_cents, 0),
          v_subtotal, v_total, p_valid_until, p_payment_terms, p_delivery_terms, p_notes,
          auth.uid())
  returning id into v_quote_id;

  insert into quote_items (quote_id, company_id, product_id, description, quantity,
                            unit_price_cents, total_cents, sort_order)
  select v_quote_id, p_company,
         nullif(i->>'product_id', '')::uuid,
         i->>'description',
         (i->>'quantity')::numeric,
         (i->>'unit_price_cents')::int,
         round(((i->>'quantity')::numeric) * ((i->>'unit_price_cents')::numeric))::int,
         (ord - 1)::int
  from jsonb_array_elements(p_items) with ordinality as t(i, ord);

  insert into activities (company_id, customer_id, type, title)
  values (p_company, p_customer, 'quote_created', 'Orçamento #' || v_number || ' criado');

  perform public.increment_usage(p_company, 'quotes_created',
    to_char(now() at time zone 'America/Sao_Paulo', 'YYYY-MM'));

  return jsonb_build_object('id', v_quote_id, 'number', v_number);
end $$;
