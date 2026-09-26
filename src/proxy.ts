import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Exclui:
     * - _next/static  (arquivos estáticos do Next)
     * - _next/image   (otimização de imagens)
     * - brand/        (logos NEGOCIAR — assets públicos)
     * - favicon, ícones e extensões de imagem/fonte
     */
    "/((?!_next/static|_next/image|brand/|favicon|icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2|woff|ttf|otf)$).*)",
  ],
};
