"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="auth-form auth-form-strong"
      onSubmit={(event) => {
        event.preventDefault();
        setError("");

        const formData = new FormData(event.currentTarget);
        const email = String(formData.get("email") ?? "").trim().toLowerCase();
        const password = String(formData.get("password") ?? "");

        startTransition(async () => {
          try {
            const result = await signIn("credentials", {
              email,
              password,
              redirect: false
            });

            if (!result || result.error) {
              setError("E-mail ou senha invalidos.");
              return;
            }

            router.replace("/dashboard");
            router.refresh();
          } catch (submitError) {
            console.error("[login-form] erro ao autenticar", submitError);
            setError("Nao foi possivel concluir o login agora.");
          }
        });
      }}
    >
      <div className="auth-form-grid">
        <label className="field">
          <span className="field-label">E-mail</span>
          <input
            className="field-control auth-field-control"
            name="email"
            type="email"
            placeholder="seu@email.com"
            autoComplete="username"
            required
          />
        </label>

        <label className="field">
          <span className="field-label">Senha</span>
          <input
            className="field-control auth-field-control"
            name="password"
            type="password"
            placeholder="Digite sua senha"
            autoComplete="current-password"
            required
          />
        </label>
      </div>

      {error ? <p className="message-inline">{error}</p> : null}

      <button type="submit" disabled={isPending} className="button-primary auth-submit">
        {isPending ? "Entrando..." : "Entrar no sistema"}
      </button>

      <div className="auth-tips auth-tips-strong">
        <div className="auth-tip-grid">
          <span className="subtle">Use uma conta autorizada para acessar o ambiente operacional.</span>
          <span className="subtle">
            Somente usuarios ativos e cadastrados pelo administrador conseguem entrar no sistema.
          </span>
        </div>
      </div>
    </form>
  );
}
