import { FaturamentoMensalDashboard } from "@/features/dashboard/faturamento-mensal-dashboard";
import { FaturamentoSubnav } from "@/features/dashboard/faturamento-subnav";

export default function DashboardMensalPage() {
  return (
    <>
      <FaturamentoSubnav />
      <FaturamentoMensalDashboard />
    </>
  );
}
