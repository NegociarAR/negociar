-- Adiciona token de entrada: usado pelo AppFinançasBr para chamar de volta o NEGOCIAR.
-- Executar no SQL editor do Supabase (projeto suite-comercial).

alter table public.company_appfinancasbr_settings
  add column if not exists inbound_token text unique;
