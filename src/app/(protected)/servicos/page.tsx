import { PageHeader } from "@/components/layout/page-header";
import { ServicosManager } from "@/features/servicos/servicos-manager";

export default function ServicosPage() {
  return (
    <main style={{ padding: 24 }}>
      <PageHeader
        title="Servicos"
        description="Cadastro mestre de servicos, forma de medicao e unidade de faturamento."
      />
      <ServicosManager />
    </main>
  );
}
