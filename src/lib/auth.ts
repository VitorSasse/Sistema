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
        const parsed = signInSchema.safeParse({
          email: String(credentials?.email ?? "")
            .trim()
            .toLowerCase(),
          password: String(credentials?.password ?? "")
        });

        if (!parsed.success) {
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

        if (!user || user.status !== "ATIVO") {
          return null;
        }

        const passwordMatches = await bcrypt.compare(parsed.data.password, user.senhaHash);

        if (!passwordMatches) {
          return null;
        }

        await prisma.usuario.update({
          where: { id: user.id },
          data: { ultimoLoginEm: new Date() }
        });

        return {
          id: user.id,
          name: user.nome,
          email: user.email,
          roles: user.roles.map((item) => item.role.codigo)
        };
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
