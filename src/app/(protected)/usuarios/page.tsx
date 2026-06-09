import { requirePermission } from "@/lib/auth-guards";
import { UsuariosManager } from "@/features/usuarios/usuarios-manager";

export default async function UsuariosPage() {
  await requirePermission("users.manage");

  return (
    <main style={{ padding: 24 }}>
      <UsuariosManager />
    </main>
  );
}
