import { requirePermission } from "@/lib/auth-guards";
import { LogsLancamentosManager } from "@/features/seguranca/logs-lancamentos-manager";

export default async function LogsLancamentosPage() {
  await requirePermission("auditoria.read");

  return (
    <main style={{ padding: 24 }}>
      <LogsLancamentosManager />
    </main>
  );
}
