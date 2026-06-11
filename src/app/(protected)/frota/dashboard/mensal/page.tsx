import { FrotaSubnav } from "@/features/frota/dashboard/frota-subnav";
import { FrotaFaturamentoMensalDashboard } from "@/features/frota/dashboard/frota-faturamento-mensal-dashboard";

export default function FrotaDashboardMensalPage() {
  return (
    <main style={{ padding: 24 }}>
      <FrotaSubnav />
      <FrotaFaturamentoMensalDashboard />
    </main>
  );
}
