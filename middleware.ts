export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: [
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
    "/frota/:path*"
  ]
};
