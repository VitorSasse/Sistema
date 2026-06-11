import { FrotaSubnav } from "@/features/frota/dashboard/frota-subnav";
import { FrotaDashboard } from "@/features/frota/dashboard/frota-dashboard";

export default function FrotaDashboardPage() {
  return (
    <main style={{ padding: 24 }}>
      <FrotaSubnav />
      <FrotaDashboard />
    </main>
  );
}
