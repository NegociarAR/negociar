# Suíte Comercial

SaaS comercial modular (ClienteZap · Precifica · OrçaFácil) — Next.js 16 + Supabase.

## Rodar

```bash
npm install
cp .env.example .env.local   # preencher URL e ANON_KEY do Supabase
npm run dev
```

## Banco

Aplicar migrations em `supabase/` na ordem 0001 → 0002 → 0003 (já aplicadas).

## Arquitetura

- App único modular. Módulos vendidos separado/pacote via **entitlements** (`src/lib/entitlements`), não repos separados.
- Autorização server-side: `proxy.ts` (sessão + guarda de rota) + RLS por empresa no banco.
- `hasModule()` / `checkLimit()` decidem acesso; UI só reflete.
- Nav filtrada por plano em `(app)/layout.tsx`.

## Estrutura

```
src/
  app/
    (auth)/         login, signup, recuperar  + actions.ts
    (app)/          dashboard, clientes, precificar, orcamentos,
                    produtos, follow-ups, configuracoes + layout
    orcamento/[token]/   página pública (sem login, via RPC)
  lib/
    supabase/       client, server, middleware(proxy)
    entitlements/   modelo comercial (módulos + limites)
    format.ts       BRL
  components/       sidebar, bottom-nav, nav-items, ui/
```
