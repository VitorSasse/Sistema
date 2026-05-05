import { PageHeader } from "@/components/layout/page-header";
import { requirePermission } from "@/lib/auth-guards";
import { UsuariosManager } from "@/features/usuarios/usuarios-manager";

export default async function UsuariosPage() {
  await requirePermission("users.manage");

  return (
    <main style={{ padding: 24 }}>
      <PageHeader
        title="Usuarios e acessos"
        description="Cadastre contas, ajuste perfis de acesso e mantenha o controle de quem entra no sistema."
      />
      <UsuariosManager />
    </main>
  );
}
