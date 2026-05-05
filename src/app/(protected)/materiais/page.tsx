import { PageHeader } from "@/components/layout/page-header";
import { MateriaisManager } from "@/features/materiais/materiais-manager";

export default function MateriaisPage() {
  return (
    <main style={{ padding: 24 }}>
      <PageHeader
        title="Materiais"
        description="Cadastro mestre de materiais, unidade padrao e origem operacional."
      />
      <MateriaisManager />
    </main>
  );
}
