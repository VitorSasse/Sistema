import { type RoleCodigo } from "@prisma/client";
import { redirect } from "next/navigation";
import { type NextResponse } from "next/server";
import { type Session } from "next-auth";
import { auth } from "@/lib/auth";
import { hasPermission, type PermissionAction } from "@/lib/permissions";

export async function requireSession() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return session;
}

export async function requirePermission(permission: PermissionAction) {
  const session = await requireSession();

  if (!hasPermission(session.user.roles, permission)) {
    redirect("/dashboard");
  }

  return session;
}

export function hasRoleAccess(roles: RoleCodigo[] | string[], permission: PermissionAction) {
  return hasPermission(roles, permission);
}

export async function validateApiPermission(
  permission: PermissionAction
): Promise<
  | { ok: true; session: Session }
  | { ok: false; response: NextResponse }
> {
  const session = await auth();

  if (!session?.user) {
    const { NextResponse } = await import("next/server");
    return {
      ok: false,
      response: NextResponse.json({ message: "Nao autenticado." }, { status: 401 })
    };
  }

  if (!hasPermission(session.user.roles, permission)) {
    const { NextResponse } = await import("next/server");
    return {
      ok: false,
      response: NextResponse.json({ message: "Sem permissao para esta acao." }, { status: 403 })
    };
  }

  return {
    ok: true,
    session
  };
}
