import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const type = searchParams.get("type"); // "recovery" = reset de senha
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // recuperação de senha → vai pra tela de definir nova senha
      if (type === "recovery") {
        return NextResponse.redirect(`${origin}/recuperar/nova-senha`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/login?erro=${encodeURIComponent("Link inválido ou expirado.")}`,
  );
}
