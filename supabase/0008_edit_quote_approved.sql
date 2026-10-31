-- Permite editar orçamento approved (desde que sem venda fechada).
-- Remove 'approved' do bloqueio e adiciona checagem de venda existente.
-- Executar no SQL editor do Supabase (projeto suite-comercial).

create or replace function public.edit_quote(p_quote_id uuid, p_customer uuid, p_items jsonb, p_discount_cents integer, p_valid_until date, p_payment_terms text, p_delivery_terms text, p_notes text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_company uuid;
  v_status text;
  v_target uuid;
  v_subtotal int;
  v_total int;
  v_has_sale boolean;
begin
  select company_id, status into v_company, v_status
    from quotes where id = p_quote_id and deleted_at is null;
  if not found then raise exception 'Orçamento não encontrado.'; end if;
  if not exists (select 1 from company_users where user_id = auth.uid() and company_id = v_company) then
    raise exception 'not authorized';
  end if;
  if v_status in ('rejected', 'superseded', 'canceled') then
    raise exception 'Este orçamento não pode mais ser editado.';
  end if;
  if v_status = 'approved' then
    select exists(select 1 from sales where quote_id = p_quote_id) into v_has_sale;
    if v_has_sale then
      raise exception 'Esta venda já foi fechada. Cancele a venda antes de editar o orçamento.';
    end if;
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Adicione ao menos um item.';
  end if;

  if v_status <> 'draft' then
    v_target := public.create_quote_revision(p_quote_id);
  else
    v_target := p_quote_id;
  end if;

  select coalesce(sum(round(((i->>'quantity')::numeric) * ((i->>'unit_price_cents')::numeric)))::int, 0)
    into v_subtotal
  from jsonb_array_elements(p_items) i;
  v_total := greatest(0, v_subtotal - coalesce(p_discount_cents, 0));

  update quotes
     set customer_id = p_customer, discount_cents = coalesce(p_discount_cents, 0),
         subtotal_cents = v_subtotal, total_cents = v_total, valid_until = p_valid_until,
         payment_terms = p_payment_terms, delivery_terms = p_delivery_terms, notes = p_notes
   where id = v_target;

  delete from quote_items where quote_id = v_target;
  insert into quote_items (quote_id, company_id, product_id, description, quantity,
                            unit_price_cents, total_cents, sort_order)
  select v_target, v_company,
         nullif(i->>'product_id', '')::uuid,
         i->>'description',
         (i->>'quantity')::numeric,
         (i->>'unit_price_cents')::int,
         round(((i->>'quantity')::numeric) * ((i->>'unit_price_cents')::numeric))::int,
         (ord - 1)::int
  from jsonb_array_elements(p_items) with ordinality as t(i, ord);

  return jsonb_build_object('id', v_target);
end $function$;
