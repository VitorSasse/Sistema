import { PageHeader } from "@/components/layout/page-header";
import { HistoricoManager } from "@/features/historico/historico-manager";

export default function HistoricoPage() {
  return (
    <main style={{ padding: 24 }}>
      <PageHeader
        title="Historico"
        description="Consulta avancada dos lancamentos para conferencia, rastreabilidade e auditoria operacional."
      />
      <HistoricoManager />
    </main>
  );
}
