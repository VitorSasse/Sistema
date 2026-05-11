import { RoleCodigo } from "@prisma/client";
import bcrypt from "bcryptjs";
import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      roles: RoleCodigo[];
    };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
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

          console.info("[auth] inicio authorize", {
            rawEmail: String(credentials?.email ?? ""),
            normalizedEmail: parsed.success ? parsed.data.email : null,
            hasPassword: Boolean(String(credentials?.password ?? ""))
          });

          if (!parsed.success) {
            console.warn("[auth] credenciais invalidas no parse", {
              email: String(credentials?.email ?? ""),
              issues: parsed.error.issues.map((issue) => ({
                path: issue.path.join("."),
                message: issue.message
              }))
            });
            return null;
          }

          const user = await prisma.usuario.findUnique({
            where: { email: parsed.data.email },
            include: {
              roles: {
                include: {
                  role: true
                }
              }
            }
          });

          console.info("[auth] resultado busca usuario", {
            email: parsed.data.email,
            found: Boolean(user),
            status: user?.status ?? null
          });

          if (!user || user.status !== "ATIVO") {
            console.warn("[auth] usuario nao encontrado ou inativo", {
              email: parsed.data.email,
              found: Boolean(user),
              status: user?.status ?? null
            });
            return null;
          }

          const passwordMatches = await bcrypt.compare(parsed.data.password, user.senhaHash);

          console.info("[auth] comparacao senha", {
            email: parsed.data.email,
            passwordMatches
          });

          if (!passwordMatches) {
            console.warn("[auth] senha invalida", {
              email: parsed.data.email
            });
            return null;
          }

          await prisma.usuario.update({
            where: { id: user.id },
            data: { ultimoLoginEm: new Date() }
          });

          console.info("[auth] login autorizado", {
            email: parsed.data.email,
            userId: user.id,
            roles: user.roles.map((item) => item.role.codigo)
          });

          return {
            id: user.id,
            name: user.nome,
            email: user.email,
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
        (token as { roles?: RoleCodigo[] }).roles = (user as { roles?: RoleCodigo[] }).roles ?? [];
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.roles = (token as { roles?: RoleCodigo[] }).roles ?? [];
      }

      return session;
    }
  },
  pages: {
    signIn: "/login"
  }
});
