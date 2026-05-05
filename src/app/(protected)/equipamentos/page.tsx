import { PageHeader } from "@/components/layout/page-header";
import { EquipamentosManager } from "@/features/equipamentos/equipamentos-manager";

export default function EquipamentosPage() {
  return (
    <main style={{ padding: 24 }}>
      <PageHeader
        title="Equipamentos"
        description="Cadastro mestre de caminhoes, maquinas, carretas e recursos operacionais."
      />
      <EquipamentosManager />
    </main>
  );
}
