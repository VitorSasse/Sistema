import { PageHeader } from "@/components/layout/page-header";
import { LeiturasManager } from "@/features/frota/leituras/leituras-manager";

export default function LeiturasFrotaPage() {
  return (
    <main style={{ padding: 24 }}>
      <PageHeader
        title="Leituras de horimetro e KM"
        description="Registro manual inicial das leituras de frota com validacao de consistencia."
      />
      <LeiturasManager />
    </main>
  );
}
