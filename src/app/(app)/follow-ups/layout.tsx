import { checkModuleAccess } from "@/lib/entitlements";
import { ModuleLocked } from "@/components/module-locked";

export default async function Layout({ children }: { children: React.ReactNode }) {
  if (!(await checkModuleAccess("clientes"))) return <ModuleLocked module="clientes" />;
  return <>{children}</>;
}
