import { ManutencaoExecucaoForm } from "@/features/frota/manutencao/manutencao-execucao-form";
import { FrotaManutencaoDashboard } from "@/features/frota/manutencao/manutencao-dashboard";

export default function FrotaManutencaoPage() {
  return (
    <main style={{ padding: 24 }}>
      <ManutencaoExecucaoForm />
      <FrotaManutencaoDashboard />
    </main>
  );
}
