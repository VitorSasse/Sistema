import { PageHeader } from "@/components/layout/page-header";
import { ClientesManager } from "@/features/clientes/clientes-manager";

export default function ClientesPage() {
  return (
    <main style={{ padding: 24 }}>
      <PageHeader
        title="Clientes"
        description="Cadastro mestre de clientes com status e identificacao fiscal."
      />
      <ClientesManager />
    </main>
  );
}
