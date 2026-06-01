import { FaturamentoSubnav } from "@/features/dashboard/faturamento-subnav";
import { FaturamentoDashboard } from "@/features/dashboard/faturamento-dashboard";

export default function DashboardPage() {
  return (
    <>
      <FaturamentoSubnav />
      <FaturamentoDashboard />
    </>
  );
}
