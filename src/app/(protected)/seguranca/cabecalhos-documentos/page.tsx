import { requireModuleAccess } from "@/lib/auth-guards";
import { DocumentoCabecalhoManager } from "@/features/seguranca/documento-cabecalho-manager";

export default async function CabecalhosDocumentosPage() {
  await requireModuleAccess("pdfs", "manage");

  return (
    <main style={{ padding: 24 }}>
      <DocumentoCabecalhoManager />
    </main>
  );
}
