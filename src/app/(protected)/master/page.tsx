import { RoleUsuarioEmpresa } from "@prisma/client";
import { MasterPanel } from "@/features/master/master-panel";
import { requireRole } from "@/lib/empresa-context";

export default async function MasterPage() {
  await requireRole([RoleUsuarioEmpresa.MASTER]);

  return <MasterPanel />;
}
