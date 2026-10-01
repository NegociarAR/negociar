import Link from "next/link";
import {
  MessageCircle,
  Tag,
  FileText,
  Users,
  TrendingUp,
  Clock,
  BarChart3,
  History,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { LogoN } from "@/components/logo";
import { ContactForm } from "./contact-form";

export const metadata = {
  title: "NEGOCIAR — A suíte comercial para o seu negócio",
  description:
    "Onde atendimento vira relacionamento e relacionamento vira negócio. Clientes, preços, orçamentos e vendas em um só lugar.",
};

const FLOW = [
  { label: "Atender", icon: MessageCircle },
  { label: "Precificar", icon: Tag },
  { label: "Orçar", icon: FileText },
  { label: "Acompanhar", icon: Users },
  { label: "Negociar", icon: TrendingUp },
  { label: "Vender", icon: CheckCircle2 },
];

const MODULES = [
  {
    name: "ClienteZap",
    color: "#2E7CF6",
    icon: MessageCircle,
    tag: "Relacionamento",
    tagline: "Organize seus clientes e relacionamentos.",
    features: [
      "Funil simples: Lead → Oportunidade → Cliente",
      "Alerta automático de quem esfriou o contato",
      "Contato principal + contatos adicionais por empresa",
      "Follow-ups com lembrete e mensagem de WhatsApp pronta",
      "Importação de clientes por planilha",
    ],
  },
  {
    name: "Precifica",
    color: "#1FAE5E",
    icon: Tag,
    tag: "Precificação",
    tagline: "Encontre o preço certo para vender.",
    features: [
      "Calculadora de preço por markup e margem real",
      "Presets por segmento e regime tributário",
      "Diagnóstico visual da composição do preço",
      "Salva como produto ou já gera o orçamento",
      "Cobrança por hora, com fechamento mensal automático",
    ],
  },
  {
    name: "OrçaFácil",
    color: "#7C3AED",
    icon: FileText,
    tag: "Propostas",
    tagline: "Transforme oportunidades em propostas.",
    features: [
      "Orçamento profissional pronto em minutos",
      "Link público com a sua marca para o cliente decidir",
      "Cliente aprova, recusa ou pede negociação — com motivo",
      "Vira venda com parcelas, direto em Recebíveis",
      "Histórico de versões: nada se perde numa negociação",
    ],
  },
];

const EXTRAS = [
  { icon: BarChart3, label: "Relatórios", desc: "Funil de conversão, faturamento e motivos de recusa." },
  { icon: History, label: "Histórico completo", desc: "Toda alteração registrada — segurança e rastreabilidade." },
  { icon: Clock, label: "Faturamento por hora", desc: "Lance horas trabalhadas e feche o mês automaticamente." },
];

const PLANS = [
  { name: "Free", price: "Grátis", desc: "Para começar", features: ["Até 5 clientes", "Até 5 produtos", "5 orçamentos/mês"] },
  { name: "Precifica", price: "R$ 9,90/mês", desc: "Só precificação", features: ["Produtos ilimitados", "Calculadora completa", "Cobrança por hora"] },
  { name: "OrçaFácil", price: "R$ 29,90/mês", desc: "Só orçamentos", features: ["Orçamentos ilimitados", "Link público + PDF", "Vendas e recebíveis"] },
  { name: "ClienteZap", price: "R$ 35,90/mês", desc: "Só relacionamento", features: ["Clientes ilimitados", "Funil + follow-ups", "Contatos por empresa"] },
  { name: "Pro", price: "R$ 59,90/mês", desc: "Tudo incluído", features: ["Os 3 módulos", "Tudo ilimitado", "Relatórios completos"], highlight: true },
];

function Section({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`mx-auto max-w-5xl px-4 py-16 sm:py-20 ${className}`}>
      {children}
    </section>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-background">
      {/* header */}
      <header className="sticky top-0 z-20 border-b bg-surface/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <LogoN size={28} />
            <span className="text-base font-bold tracking-tight">
              NEGOCI<span className="text-primary">AR</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-muted hover:text-foreground">
              Entrar
            </Link>
            <a
              href="#contato"
              className="h-9 rounded-lg bg-primary px-4 text-sm font-medium leading-9 text-primary-fg transition hover:opacity-90"
            >
              Testar grátis
            </a>
          </div>
        </div>
      </header>

      {/* hero */}
      <Section className="text-center">
        <div className="mx-auto mb-6 w-fit">
          <LogoN size={56} />
        </div>
        <h1 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight sm:text-5xl">
          Onde atendimento vira relacionamento
          <br className="hidden sm:block" /> e relacionamento vira{" "}
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: "linear-gradient(100deg, #2e7cf6 0%, #1fae5e 50%, #7c3aed 100%)" }}
          >
            negócio
          </span>
          .
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-muted sm:text-lg">
          A suíte comercial completa para o MEI e a pequena empresa: organize clientes,
          precifique com segurança, envie propostas profissionais e acompanhe cada venda
          — tudo em um só lugar.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="#contato"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-fg transition hover:opacity-90"
          >
            Quero testar grátis <ArrowRight size={16} />
          </a>
          <a
            href="#modulos"
            className="inline-flex h-12 items-center justify-center rounded-lg border px-6 text-sm font-semibold transition hover:bg-subtle"
          >
            Ver funcionalidades
          </a>
        </div>
      </Section>

      {/* fluxo */}
      <Section className="border-t bg-surface !max-w-none py-14 sm:py-16">
        <div className="mx-auto max-w-5xl">
          <p className="mb-8 text-center text-sm font-medium uppercase tracking-wide text-muted">
            Como funciona
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-6">
            {FLOW.map((step, i) => (
              <div key={step.label} className="flex items-center gap-2">
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <step.icon size={20} />
                  </div>
                  <span className="text-xs font-medium">{step.label}</span>
                </div>
                {i < FLOW.length - 1 && <ArrowRight size={16} className="mb-6 text-muted" />}
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* módulos */}
      <Section id="modulos">
        <div className="mb-12 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">Três módulos, uma suíte</h2>
          <p className="mt-2 text-muted">Use um só, ou os três juntos — sua escolha.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {MODULES.map((m) => (
            <div key={m.name} className="rounded-xl border bg-surface p-6 shadow-card">
              <div
                className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg text-white"
                style={{ backgroundColor: m.color }}
              >
                <m.icon size={20} />
              </div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">{m.tag}</p>
              <h3 className="mt-1 text-lg font-bold">{m.name}</h3>
              <p className="mt-1 text-sm text-muted">{m.tagline}</p>
              <ul className="mt-4 space-y-2.5">
                {m.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      {/* extras */}
      <Section className="border-t bg-surface !max-w-none py-14 sm:py-16">
        <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-3">
          {EXTRAS.map((e) => (
            <div key={e.label} className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <e.icon size={18} />
              </div>
              <div>
                <p className="font-semibold">{e.label}</p>
                <p className="text-sm text-muted">{e.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* planos */}
      <Section>
        <div className="mb-12 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">Planos para cada fase do seu negócio</h2>
          <p className="mt-2 text-muted">Comece grátis. Cresça no seu ritmo.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`rounded-xl border p-5 ${p.highlight ? "border-primary bg-primary-soft shadow-card" : "bg-surface"}`}
            >
              <p className="text-sm font-semibold">{p.name}</p>
              <p className="mt-1 text-xl font-bold">{p.price}</p>
              <p className="mt-0.5 text-xs text-muted">{p.desc}</p>
              <ul className="mt-4 space-y-1.5">
                {p.features.map((f) => (
                  <li key={f} className="text-xs text-muted">{f}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-muted">
          Preços de referência — fale com a gente para condições especiais.
        </p>
      </Section>

      {/* frase de reforço */}
      <Section className="text-center">
        <p className="text-xl font-semibold text-muted sm:text-2xl">
          Mais que ferramentas.
          <br />
          Uma suíte para o seu <span className="text-primary">negócio</span>.
        </p>
      </Section>

      {/* contato */}
      <Section id="contato" className="border-t bg-surface !max-w-none py-16 sm:py-20">
        <div className="mx-auto max-w-md">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">Vamos começar?</h2>
            <p className="mt-2 text-muted">
              Deixe seus dados e liberamos seu acesso de teste em até 1 dia útil.
            </p>
          </div>
          <ContactForm />
        </div>
      </Section>

      {/* footer */}
      <footer className="border-t py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-4 text-center">
          <div className="flex items-center gap-2">
            <LogoN size={24} />
            <span className="text-sm font-bold tracking-tight">
              NEGOCI<span className="text-primary">AR</span>
            </span>
          </div>
          <p className="text-sm text-muted">Atendimento & Relacionamento</p>
          <p className="text-xs text-muted">© {new Date().getFullYear()} NEGOCIAR. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
