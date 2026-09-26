-- =====================================================================
-- Seed dos planos (preços/limites de TESTE — validar com usuários reais).
-- modules: quais features o plano libera.
-- limits: null = ilimitado.
-- =====================================================================

insert into public.plans (id, name, price_cents, modules, limits, sort_order) values
('free', 'Free', 0,
  '{"clientes":true,"precifica":true,"orcamentos":true}',
  '{"customers":30,"quotes_per_month":5,"products":10,"pdf_branding":true}', 0),

('clientezap', 'ClienteZap', 2990,
  '{"clientes":true,"precifica":false,"orcamentos":false}',
  '{"customers":null,"products":10}', 1),

('precifica', 'Precifica', 2990,
  '{"clientes":false,"precifica":true,"orcamentos":false}',
  '{"products":null}', 2),

('orcafacil', 'OrçaFácil', 2990,
  '{"clientes":true,"precifica":false,"orcamentos":true}',
  '{"customers":null,"quotes_per_month":null}', 3),

('pro', 'Pro', 5990,
  '{"clientes":true,"precifica":true,"orcamentos":true}',
  '{"customers":null,"quotes_per_month":null,"products":null,"pdf_branding":false}', 4),

('equipe', 'Equipe', 9990,
  '{"clientes":true,"precifica":true,"orcamentos":true,"teams":true}',
  '{"customers":null,"quotes_per_month":null,"products":null,"users":null,"pdf_branding":false}', 5)

on conflict (id) do update set
  name=excluded.name, price_cents=excluded.price_cents,
  modules=excluded.modules, limits=excluded.limits, sort_order=excluded.sort_order;
