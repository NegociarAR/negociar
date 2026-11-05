-- Coluna para registrar quem aprovou o orçamento pela página pública
alter table public.quotes add column if not exists approved_by_name text;

-- Recria a RPC com o novo parâmetro p_signer_name
create or replace function public.respond_public_quote(
  p_token text,
  p_action text,
  p_reason text default null,
  p_signer_name text default null
) returns void
  language plpgsql security definer
  set search_path to 'public'
as $$
declare q record;
begin
  select id, company_id, number, customer_id, status
    into q
  from quotes
  where public_token = p_token and deleted_at is null;
  if not found then raise exception 'not found'; end if;

  if p_action = 'approved' then
    update quotes
      set status = 'approved',
          decided_at = now(),
          approved_by_name = nullif(trim(coalesce(p_signer_name, '')), '')
      where id = q.id;
    insert into quote_status_history(quote_id, company_id, status)
      values (q.id, q.company_id, 'approved');

  elsif p_action = 'rejected' then
    if p_reason is null or length(trim(p_reason)) = 0 then
      raise exception 'reason required';
    end if;
    update quotes
      set status = 'rejected', decided_at = now(), decision_reason = p_reason
      where id = q.id;
    insert into quote_status_history(quote_id, company_id, status)
      values (q.id, q.company_id, 'rejected');

  elsif p_action = 'negotiate' then
    if p_reason is null or length(trim(p_reason)) = 0 then
      raise exception 'reason required';
    end if;
    update quotes
      set status = 'negotiation_requested', decision_reason = p_reason
      where id = q.id;
    insert into quote_status_history(quote_id, company_id, status)
      values (q.id, q.company_id, 'negotiation_requested');

  else
    raise exception 'invalid action';
  end if;

  insert into activities(company_id, customer_id, type, title, metadata)
  values (
    q.company_id, q.customer_id,
    'quote_' || p_action,
    case p_action
      when 'approved' then 'Orçamento #' || q.number || ' aprovado pelo cliente'
      when 'rejected' then 'Orçamento #' || q.number || ' recusado pelo cliente'
      else 'Cliente pediu negociação no orçamento #' || q.number
    end,
    coalesce(jsonb_build_object('reason', p_reason), '{}'::jsonb)
  );
end $$;
