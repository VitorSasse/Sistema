import { RoleCodigo, RoleUsuarioEmpresa } from "@prisma/client";
import bcrypt from "bcryptjs";
import NextAuth, { type DefaultSession } from "next-auth";
import { cookies } from "next/headers";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { MASTER_EMPRESA_COOKIE } from "@/lib/master-empresa-cookie";
import { normalizeModulePermissions, type ModulePermissionMap } from "@/lib/permissions";
import { withUnscopedPrisma } from "@/lib/prisma";
import {
  listarEmpresasUsuario,
  roleLegadaPorRoleEmpresa,
  selecionarEmpresaUsuario,
  USUARIO_EMPRESA_COOKIE
} from "@/lib/usuario-empresa";
import {
  beginTenantContext,
  resolveTenantContext
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
      modoSomenteLeitura: boolean;
      permissoesAcesso: ModulePermissionMap;
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

          const user = await withUnscopedPrisma((db) =>
            db.usuario.findUnique({
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
                },
                empresasAcesso: {
                  where: {
                    status: "ATIVO",
                    empresa: {
                      status: "ATIVO",
                      deletedAt: null
                    }
                  },
                  include: {
                    empresa: {
                      select: {
                        id: true
                      }
                    }
                  },
                  orderBy: [{ padrao: "desc" }]
                }
              }
            })
          );

          if (!user || user.status !== "ATIVO") {
            return null;
          }

          const isMaster = user.roleEmpresa === RoleUsuarioEmpresa.MASTER;

          const acessoPadrao = user.empresasAcesso[0] ?? null;

          if (!isMaster && !acessoPadrao && (user.empresa.status !== "ATIVO" || user.empresa.deletedAt)) {
            return null;
          }

          const passwordMatches = await bcrypt.compare(parsed.data.password, user.senhaHash);

          if (!passwordMatches) {
            return null;
          }

          await withUnscopedPrisma((db) =>
            db.usuario.update({
              where: { id: user.id },
              data: { ultimoLoginEm: new Date() }
            })
          );

          return {
            id: user.id,
            name: user.nome,
            email: user.email,
            empresaId: acessoPadrao?.empresaId ?? user.empresaId,
            roleEmpresa: acessoPadrao?.roleEmpresa ?? user.roleEmpresa,
            isMaster,
            roles: acessoPadrao ? [roleLegadaPorRoleEmpresa(acessoPadrao.roleEmpresa)] : user.roles.map((item) => item.role.codigo),
            modoSomenteLeitura: acessoPadrao?.modoSomenteLeitura ?? user.modoSomenteLeitura,
            permissoesAcesso: normalizeModulePermissions(acessoPadrao?.permissoesAcesso ?? user.permissoesAcesso)
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
          modoSomenteLeitura?: boolean;
          permissoesAcesso?: ModulePermissionMap;
        };

        (token as { empresaId?: string }).empresaId = usuarioAutenticado.empresaId;
        (token as { roleEmpresa?: RoleUsuarioEmpresa }).roleEmpresa = usuarioAutenticado.roleEmpresa;
        (token as { isMaster?: boolean }).isMaster = usuarioAutenticado.isMaster ?? false;
        (token as { roles?: RoleCodigo[] }).roles = usuarioAutenticado.roles ?? [];
        (token as { modoSomenteLeitura?: boolean }).modoSomenteLeitura = usuarioAutenticado.modoSomenteLeitura ?? false;
        (token as { permissoesAcesso?: ModulePermissionMap }).permissoesAcesso = usuarioAutenticado.permissoesAcesso ?? {};
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
        session.user.modoSomenteLeitura = (token as { modoSomenteLeitura?: boolean }).modoSomenteLeitura ?? false;
        session.user.permissoesAcesso = (token as { permissoesAcesso?: ModulePermissionMap }).permissoesAcesso ?? {};
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

async function getEmpresaSelecionadaUsuario(isMaster: boolean) {
  if (isMaster) {
    return null;
  }

  try {
    const cookieStore = await cookies();
    return cookieStore.get(USUARIO_EMPRESA_COOKIE)?.value ?? null;
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

  const usuario = await withUnscopedPrisma((db) =>
    db.usuario.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        empresaId: true,
        roleEmpresa: true,
        status: true,
        modoSomenteLeitura: true,
        permissoesAcesso: true,
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
        },
        empresasAcesso: {
          where: {
            status: "ATIVO",
            empresa: {
              status: "ATIVO",
              deletedAt: null
            }
          },
          include: {
            empresa: {
              select: {
                id: true,
                nome: true,
                nomeFantasia: true,
                razaoSocial: true
              }
            }
          },
          orderBy: [{ padrao: "desc" }, { empresa: { nome: "asc" } }]
        }
      }
    })
  );

  if (!usuario || usuario.status !== "ATIVO") {
    resolveTenantContext(tenantContext, null);
    return null;
  }

  const isMaster = usuario.roleEmpresa === RoleUsuarioEmpresa.MASTER;

  const empresaSelecionadaUsuarioCookie = await getEmpresaSelecionadaUsuario(isMaster);
  const empresasAcesso = isMaster
    ? []
    : await withUnscopedPrisma((db) => listarEmpresasUsuario(db, usuario.id));
  const acessoAtivo = isMaster
    ? null
    : selecionarEmpresaUsuario({
        acessos: empresasAcesso,
        empresaSelecionadaId: empresaSelecionadaUsuarioCookie,
        empresaLegadaId: usuario.empresaId
      });

  if (!isMaster && !acessoAtivo && (!usuario.empresaId || usuario.empresa.status !== "ATIVO" || usuario.empresa.deletedAt)) {
    resolveTenantContext(tenantContext, null);
    return null;
  }

  const empresaSelecionadaCookie = await getEmpresaSelecionadaMaster(isMaster);
  const empresaSelecionadaId = empresaSelecionadaCookie
    ? await withUnscopedPrisma(async (db) => {
        const empresa = await db.empresa.findFirst({
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

  session.user.empresaId = acessoAtivo?.empresaId ?? usuario.empresaId;
  session.user.roleEmpresa = acessoAtivo?.roleEmpresa ?? usuario.roleEmpresa;
  session.user.isMaster = isMaster;
  session.user.empresaSelecionadaId = empresaSelecionadaId;
  session.user.roles = acessoAtivo?.roles ?? usuario.roles.map((item) => item.role.codigo);
  session.user.modoSomenteLeitura = acessoAtivo?.modoSomenteLeitura ?? usuario.modoSomenteLeitura;
  session.user.permissoesAcesso = acessoAtivo?.permissoesAcesso ?? normalizeModulePermissions(usuario.permissoesAcesso);

  resolveTenantContext(tenantContext, {
    usuarioId: usuario.id,
    empresaId: session.user.empresaId,
    roleEmpresa: session.user.roleEmpresa,
    isMaster,
    empresaSelecionadaId
  });

  return session;
}
