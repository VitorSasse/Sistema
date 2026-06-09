import { MedicoesSubnav } from "@/features/medicoes/components/medicoes-subnav";
import { SimulacaoMedicaoManager } from "@/features/medicoes/simulacao-medicao-manager";

export default function SimulacaoMedicaoPage() {
  return (
    <main style={{ padding: 24 }}>
      <MedicoesSubnav />
      <SimulacaoMedicaoManager />
    </main>
  );
}
