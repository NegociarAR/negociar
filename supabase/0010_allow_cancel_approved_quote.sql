-- Permite cancelar orçamento aprovado (desde que sem venda — checado na UI).
-- Executar no SQL editor do Supabase (projeto suite-comercial).

create or replace function public.guard_quote_status_transition()
returns trigger
language plpgsql
as $$
declare
  allowed text[];
begin
  allowed := case old.status::text
    when 'draft'                 then array['sent','approved','rejected','negotiation','negotiation_requested','canceled','superseded']
    when 'sent'                  then array['viewed','approved','rejected','negotiation','negotiation_requested','canceled','superseded']
    when 'viewed'                then array['approved','rejected','negotiation','negotiation_requested','canceled','superseded']
    when 'negotiation'           then array['approved','rejected','negotiation_requested','canceled','superseded']
    when 'negotiation_requested' then array['approved','rejected','negotiation','canceled','superseded']
    when 'approved'              then array['canceled']   -- permite cancelar aprovado (sem venda)
    else array[]::text[]         -- rejected, canceled, superseded: terminais
  end;

  if new.status <> old.status and not (new.status::text = any(allowed)) then
    raise exception 'Transição de status inválida: % -> %', old.status, new.status;
  end if;

  return new;
end;
$$;
