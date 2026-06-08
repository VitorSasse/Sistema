import { BaseproOverview } from "@/features/dashboard/basepro-overview";
import { FaturamentoSubnav } from "@/features/dashboard/faturamento-subnav";
import { FaturamentoDashboard } from "@/features/dashboard/faturamento-dashboard";

export default function DashboardPage() {
  return (
    <>
      <BaseproOverview />
      <FaturamentoSubnav />
      <FaturamentoDashboard />
    </>
  );
}
