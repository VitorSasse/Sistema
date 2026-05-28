import { PageHeader } from "@/components/layout/page-header";
import { FrotaDashboard } from "@/features/frota/dashboard/frota-dashboard";

export default function FrotaDashboardPage() {
  return (
    <main style={{ padding: 24 }}>
      <PageHeader
        title="Dashboard da frota"
        description="Producao dos caminhoes no periodo selecionado."
      />
      <FrotaDashboard />
    </main>
  );
}
