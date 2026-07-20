import { NextResponse } from "next/server";
import { authMiddleware } from "@/lib/auth";
import { canAccessModule, moduleFromApiPathname, moduleFromPathname } from "@/lib/permissions";

const publicApiPrefixes = ["/api/auth", "/api/perfil"];
const writeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export const middleware = authMiddleware((request) => {
  const { pathname } = request.nextUrl;
  const sessionUser = request.auth?.user;

  if (pathname.startsWith("/api/") && publicApiPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return NextResponse.next();
  }

  if (!sessionUser) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
    }

    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname.startsWith("/api/")) {
    const module = moduleFromApiPathname(pathname);

    if (!module) {
      return NextResponse.next();
    }

    const action = writeMethods.has(request.method) ? "manage" : "view";

    if (!canAccessModule(sessionUser, module, action)) {
      console.warn("[access-control] tentativa bloqueada", {
        usuarioId: sessionUser.id,
        empresaId: sessionUser.empresaId,
        module,
        action,
        method: request.method,
        path: pathname,
        at: new Date().toISOString()
      });

      return NextResponse.json(
        { message: action === "manage" ? "Sem permissao para alterar dados neste modulo." : "Sem permissao para acessar este modulo." },
        { status: 403 }
      );
    }

    return NextResponse.next();
  }

  const module = moduleFromPathname(pathname);

  if (module && !canAccessModule(sessionUser, module, "view")) {
    console.warn("[access-control] tela bloqueada", {
      usuarioId: sessionUser.id,
      empresaId: sessionUser.empresaId,
      module,
      action: "view",
      path: pathname,
      at: new Date().toISOString()
    });

    return NextResponse.redirect(new URL("/inicio", request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/api/:path*",
    "/dashboard/:path*",
    "/clientes/:path*",
    "/obras/:path*",
    "/equipamentos/:path*",
    "/materiais/:path*",
    "/servicos/:path*",
    "/colaboradores/:path*",
    "/usuarios/:path*",
    "/precos/:path*",
    "/lancamentos/:path*",
    "/historico/:path*",
    "/medicoes/:path*",
    "/orcamentos/:path*",
    "/ordens-compra/:path*",
    "/programacao/:path*",
    "/fornecedores/:path*",
    "/plano-contas/:path*",
    "/centros-custo/:path*",
    "/catalogo-compras/:path*",
    "/seguranca/:path*",
    "/master/:path*",
    "/frota/:path*"
  ]
};
