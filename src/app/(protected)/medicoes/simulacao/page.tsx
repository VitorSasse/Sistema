import { PageHeader } from "@/components/layout/page-header";
import { MedicoesSubnav } from "@/features/medicoes/components/medicoes-subnav";
import { SimulacaoMedicaoManager } from "@/features/medicoes/simulacao-medicao-manager";

export default function SimulacaoMedicaoPage() {
  return (
    <main style={{ padding: 24 }}>
      <PageHeader
        title="Simulacao de medicao"
        description="Estimativa comercial para cliente sem comprometer lancamentos elegiveis da medicao real."
      />
      <MedicoesSubnav />
      <SimulacaoMedicaoManager />
    </main>
  );
}
