import { redirect } from "next/navigation";
import { getSession } from "@/lib/entitlements";
import { NoCompanyView } from "@/modules/team/no-company-view";

export default async function SemEmpresaPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.companyId) redirect("/dashboard");
  return <NoCompanyView email={session.user.email ?? ""} />;
}
