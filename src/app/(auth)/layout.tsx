import { LogoN } from "@/components/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex items-center justify-center gap-2">
            <LogoN size={40} />
            <span className="text-2xl font-bold tracking-tight">
              NEGOCI<span className="text-primary">AR</span>
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">
            Onde atendimento vira relacionamento e relacionamento vira negócio.
          </p>
        </div>
        <div className="rounded-lg border bg-surface p-6 shadow-card">
          {children}
        </div>
      </div>
    </div>
  );
}
