import { PageHeader } from "@/components/layout/page-header";
import { MedicoesManager } from "@/features/medicoes/medicoes-manager";

export default function MedicoesPage() {
  return (
    <main style={{ padding: 24 }}>
      <PageHeader
        title="Medicoes"
        description="Consolidacao operacional por periodo para conferencia com cliente antes do faturamento."
      />
      <MedicoesManager />
    </main>
  );
}
