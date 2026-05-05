import { PageHeader } from "@/components/layout/page-header";
import { LancamentosManager } from "@/features/lancamentos/lancamentos-manager";

export default function LancamentosPage() {
  return (
    <main style={{ padding: 24 }}>
      <PageHeader
        title="Lancamento diario"
        description="Digitacao operacional das fichas recebidas no dia com validacao da base mestre."
      />
      <LancamentosManager />
    </main>
  );
}
