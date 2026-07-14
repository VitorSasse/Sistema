import { RoleUsuarioEmpresa } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { withUnscopedPrisma } from "@/lib/prisma";

export async function requireMasterApi() {
  const session = await auth();

  if (!session?.user) {
    return {
      ok: false as const,
      response: NextResponse.json({ message: "Nao autenticado." }, { status: 401 })
    };
  }

  if (session.user.roleEmpresa !== RoleUsuarioEmpresa.MASTER) {
    return {
      ok: false as const,
      response: NextResponse.json({ message: "Acesso exclusivo para usuarios MASTER." }, { status: 403 })
    };
  }

  return {
    ok: true as const,
    session,
    run: withUnscopedPrisma
  };
}
