import { LancamentosManager } from "@/features/lancamentos/lancamentos-manager";
import { hasModuleAccess, requireSession } from "@/lib/auth-guards";

export default async function LancamentosPage() {
  const session = await requireSession();
  const canManage = hasModuleAccess(session.user, "lancamentos", "manage");

  return (
    <main style={{ padding: 24 }}>
      <LancamentosManager canManage={canManage} />
    </main>
  );
}
