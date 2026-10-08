import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
import { ToastProvider } from "@/components/toast";
import { RouteProgress } from "@/components/route-progress";
import { PwaRegister } from "@/components/pwa-register";

export const metadata: Metadata = {
  title: "NEGOCIAR",
  description: "Onde atendimento vira relacionamento e relacionamento vira negócio.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "NEGOCIAR",
  },
};

export const viewport: Viewport = {
  themeColor: "#111111",
};

// aplica o tema salvo antes da pintura, evitando flash
const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('theme');
    if (t === 'dark') document.documentElement.setAttribute('data-theme','dark');
  } catch(e){}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <PwaRegister />
        <RouteProgress />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
