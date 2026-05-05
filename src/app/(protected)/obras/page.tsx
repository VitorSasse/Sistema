import { PageHeader } from "@/components/layout/page-header";
import { ObrasManager } from "@/features/obras/obras-manager";

export default function ObrasPage() {
  return (
    <main style={{ padding: 24 }}>
      <PageHeader
        title="Obras"
        description="Cadastro mestre de obras com cliente vinculado e controle de liberacao operacional."
      />
      <ObrasManager />
    </main>
  );
}
