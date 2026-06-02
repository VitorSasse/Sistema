import { ExecutivoDashboard } from "@/features/dashboard/executivo-dashboard";
import { ExecutivoSubnav } from "@/features/dashboard/executivo-subnav";

export default function DashboardExecutivoComplementaresPage() {
  return (
    <>
      <ExecutivoSubnav />
      <ExecutivoDashboard scope="complementares" />
    </>
  );
}
