import { PageHeader } from "@/components/layout/page-header";
import { ProgramacaoManager } from "@/features/programacao/programacao-manager";

export default function ProgramacaoPage() {
  return (
    <main style={{ padding: 24 }}>
      <PageHeader
        title="Agenda de programacao"
        description="Controle operacional para alocar equipamentos por obra, periodo e status sem conflito de agenda."
      />
      <ProgramacaoManager />
    </main>
  );
}
