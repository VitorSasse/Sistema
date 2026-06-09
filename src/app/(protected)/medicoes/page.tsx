import { MedicoesSubnav } from "@/features/medicoes/components/medicoes-subnav";
import { MedicoesManager } from "@/features/medicoes/medicoes-manager";

export default function MedicoesPage() {
  return (
    <main style={{ padding: 24 }}>
      <MedicoesSubnav />
      <MedicoesManager />
    </main>
  );
}
