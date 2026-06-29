import { CustosDashboard } from "@/features/dashboard/custos-dashboard";
import { FaturamentoSubnav } from "@/features/dashboard/faturamento-subnav";

export default function DashboardCustosPage() {
  return (
    <>
      <FaturamentoSubnav />
      <CustosDashboard />
    </>
  );
}
