import { type RoleCodigo } from "@prisma/client";
import { redirect } from "next/navigation";
import { type NextResponse } from "next/server";
import { type Session } from "next-auth";
import { auth } from "@/lib/auth";
import {
  canAccessModule,
  hasPermission,
  permissionActionToModule,
  type AccessAction,
  type AccessModule,
  type PermissionAction
} from "@/lib/permissions";

export async function requireSession() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return session;
}

export async function requirePermission(permission: PermissionAction) {
  const session = await requireSession();

  if (!hasPermission(session.user.roles, permission, session.user)) {
    redirect("/dashboard");
  }

  return session;
}

export async function requireModuleAccess(module: AccessModule, action: AccessAction = "view") {
  const session = await requireSession();

  if (!canAccessModule(session.user, module, action)) {
    redirect("/inicio");
  }

  return session;
}

export function hasRoleAccess(roles: RoleCodigo[] | string[], permission: PermissionAction, subject?: Parameters<typeof hasPermission>[2]) {
  return hasPermission(roles, permission, subject);
}

export function hasModuleAccess(subject: Parameters<typeof canAccessModule>[0], module: AccessModule, action: AccessAction = "view") {
  return canAccessModule(subject, module, action);
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

  const modulePermission = permissionActionToModule(permission);
  const allowed = modulePermission
    ? canAccessModule(session.user, modulePermission.module, modulePermission.action)
    : hasPermission(session.user.roles, permission, session.user);

  if (!allowed) {
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
