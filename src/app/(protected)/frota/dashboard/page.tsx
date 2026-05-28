import { PageHeader } from "@/components/layout/page-header";
import { FrotaDashboard } from "@/features/frota/dashboard/frota-dashboard";

export default function FrotaDashboardPage() {
  return (
    <main style={{ padding: 24 }}>
      <PageHeader
        title="Dashboard da frota"
        description="Valor medido por caminhões e máquinas no período selecionado."
      />
      <FrotaDashboard />
    </main>
  );
}
