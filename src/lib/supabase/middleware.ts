import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isRouteBlocked, type CompanyRole } from "@/modules/team/access";

// Rotas públicas (sem sessão). Todo o resto exige login.
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/recuperar",
  "/orcamento",
  "/horas-resumo",
  "/convite",
  "/auth",
  "/status",
  "/api/cron",
  "/negociar",
];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getSession() lê o JWT do cookie localmente (sem roundtrip ao servidor Auth).
  // getUser() valida com o servidor — mais seguro mas mais lento.
  // Para navegação comum, getSession() é suficiente.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some(
    (p) => path === p || path.startsWith(p + "/"),
  );

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && (path === "/login" || path === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // acesso por papel: Vendedor e Financeiro não acessam certas áreas
  // (Financeiro/Configurações para Vendedor; Configurações/Equipe para
  // Financeiro). Owner/admin/gestor têm acesso total. Checagem no
  // middleware — não só no menu — porque esconder um link não impede
  // digitar a URL direto.
  if (user && !isPublic) {
    const { data: membership } = await supabase
      .from("company_users")
      .select("role")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (isRouteBlocked(membership?.role as CompanyRole | undefined, path)) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return response;
}
