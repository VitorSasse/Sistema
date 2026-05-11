"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";

type LoginState = {
  error?: string;
};

export async function authenticate(_: LoginState, formData: FormData): Promise<LoginState> {
  try {
    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirect: false
    });
  } catch (error) {
    if (error instanceof AuthError) {
      console.warn("[auth-action] falha no login", {
        type: error.type,
        cause: error.cause
      });
      return { error: "E-mail ou senha invalidos." };
    }

    console.error("[auth-action] erro inesperado no login", error);
    throw error;
  }

  redirect("/dashboard");
}
