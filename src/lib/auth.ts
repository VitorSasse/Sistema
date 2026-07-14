import { RoleCodigo, RoleUsuarioEmpresa } from "@prisma/client";
import bcrypt from "bcryptjs";
import NextAuth, { type DefaultSession } from "next-auth";
import { cookies } from "next/headers";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { MASTER_EMPRESA_COOKIE } from "@/lib/master-empresa-cookie";
import { prisma } from "@/lib/prisma";
import {
  beginTenantContext,
  resolveTenantContext,
  runWithoutTenantScope
} from "@/lib/tenant-store";

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      empresaId: string;
      roleEmpresa: RoleUsuarioEmpresa;
      isMaster: boolean;
      empresaSelecionadaId: string | null;
      roles: RoleCodigo[];
    };
  }
}

const nextAuth = NextAuth({
  session: {
    strategy: "jwt"
  },
  providers: [
    Credentials({
      name: "Credenciais",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" }
      },
      async authorize(credentials) {
        try {
          const parsed = signInSchema.safeParse({
            email: String(credentials?.email ?? "")
              .trim()
              .toLowerCase(),
            password: String(credentials?.password ?? "")
          });

          if (!parsed.success) {
            return null;
          }

          const user = await runWithoutTenantScope(() =>
            prisma.usuario.findUnique({
              where: { email: parsed.data.email },
              include: {
                empresa: {
                  select: {
                    id: true,
                    status: true,
                    deletedAt: true
                  }
                },
                roles: {
                  include: {
                    role: true
                  }
                }
              }
            })
          );

          if (!user || user.status !== "ATIVO") {
            return null;
          }

          const isMaster = user.roleEmpresa === RoleUsuarioEmpresa.MASTER;

          if (!isMaster && (user.empresa.status !== "ATIVO" || user.empresa.deletedAt)) {
            return null;
          }

          const passwordMatches = await bcrypt.compare(parsed.data.password, user.senhaHash);

          if (!passwordMatches) {
            return null;
          }

          await runWithoutTenantScope(() =>
            prisma.usuario.update({
              where: { id: user.id },
              data: { ultimoLoginEm: new Date() }
            })
          );

          return {
            id: user.id,
            name: user.nome,
            email: user.email,
            empresaId: user.empresaId,
            roleEmpresa: user.roleEmpresa,
            isMaster,
            roles: user.roles.map((item) => item.role.codigo)
          };
        } catch (error) {
          console.error("[auth] erro no authorize", error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const usuarioAutenticado = user as {
          empresaId?: string;
          roleEmpresa?: RoleUsuarioEmpresa;
          isMaster?: boolean;
          roles?: RoleCodigo[];
        };

        (token as { empresaId?: string }).empresaId = usuarioAutenticado.empresaId;
        (token as { roleEmpresa?: RoleUsuarioEmpresa }).roleEmpresa = usuarioAutenticado.roleEmpresa;
        (token as { isMaster?: boolean }).isMaster = usuarioAutenticado.isMaster ?? false;
        (token as { roles?: RoleCodigo[] }).roles = usuarioAutenticado.roles ?? [];
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.empresaId = (token as { empresaId?: string }).empresaId ?? "";
        session.user.roleEmpresa =
          (token as { roleEmpresa?: RoleUsuarioEmpresa }).roleEmpresa ?? RoleUsuarioEmpresa.ADMIN_EMPRESA;
        session.user.isMaster = (token as { isMaster?: boolean }).isMaster ?? false;
        session.user.empresaSelecionadaId = null;
        session.user.roles = (token as { roles?: RoleCodigo[] }).roles ?? [];
      }

      return session;
    }
  },
  pages: {
    signIn: "/login"
  }
});

export const { handlers, signIn, signOut } = nextAuth;

export const authMiddleware = nextAuth.auth;

async function getEmpresaSelecionadaMaster(isMaster: boolean) {
  if (!isMaster) {
    return null;
  }

  try {
    const cookieStore = await cookies();
    return cookieStore.get(MASTER_EMPRESA_COOKIE)?.value ?? null;
  } catch {
    return null;
  }
}

export async function auth() {
  const tenantContext = beginTenantContext();
  const session = await nextAuth.auth();

  if (!session?.user?.id) {
    resolveTenantContext(tenantContext, null);
    return null;
  }

  const usuario = await runWithoutTenantScope(() =>
    prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        empresaId: true,
        roleEmpresa: true,
        status: true,
        empresa: {
          select: {
            status: true,
            deletedAt: true
          }
        },
        roles: {
          select: {
            role: {
              select: { codigo: true }
            }
          }
        }
      }
    })
  );

  if (!usuario || usuario.status !== "ATIVO") {
    resolveTenantContext(tenantContext, null);
    return null;
  }

  const isMaster = usuario.roleEmpresa === RoleUsuarioEmpresa.MASTER;

  if (!isMaster && (!usuario.empresaId || usuario.empresa.status !== "ATIVO" || usuario.empresa.deletedAt)) {
    resolveTenantContext(tenantContext, null);
    return null;
  }

  const empresaSelecionadaCookie = await getEmpresaSelecionadaMaster(isMaster);
  const empresaSelecionadaId = empresaSelecionadaCookie
    ? await runWithoutTenantScope(async () => {
        const empresa = await prisma.empresa.findFirst({
          where: {
            id: empresaSelecionadaCookie,
            status: "ATIVO",
            deletedAt: null
          },
          select: { id: true }
        });
        return empresa?.id ?? null;
      })
    : null;

  session.user.empresaId = usuario.empresaId;
  session.user.roleEmpresa = usuario.roleEmpresa;
  session.user.isMaster = isMaster;
  session.user.empresaSelecionadaId = empresaSelecionadaId;
  session.user.roles = usuario.roles.map((item) => item.role.codigo);

  resolveTenantContext(tenantContext, {
    usuarioId: usuario.id,
    empresaId: usuario.empresaId,
    roleEmpresa: usuario.roleEmpresa,
    isMaster,
    empresaSelecionadaId
  });

  return session;
}
