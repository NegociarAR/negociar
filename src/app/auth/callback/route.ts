import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type"); // "recovery" | "signup" | "email"
  const next = searchParams.get("next") ?? "/dashboard";

  const supabase = await createClient();

  // Formato PKCE (code)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (type === "recovery") {
        return NextResponse.redirect(`${origin}/recuperar/nova-senha`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Formato token_hash (Auth v2 / OTP)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type: type as never });
    if (!error) {
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
