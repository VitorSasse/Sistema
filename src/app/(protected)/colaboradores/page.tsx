import { PageHeader } from "@/components/layout/page-header";
import { ColaboradoresManager } from "@/features/colaboradores/colaboradores-manager";

export default function ColaboradoresPage() {
  return (
    <main style={{ padding: 24 }}>
      <PageHeader
        title="Colaboradores"
        description="Cadastro mestre de operadores, motoristas e equipe operacional."
      />
      <ColaboradoresManager />
    </main>
  );
}
