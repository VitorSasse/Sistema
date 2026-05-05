"use client";

import { useActionState } from "react";
import { authenticate } from "./actions";

const initialState = {
  error: ""
};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(authenticate, initialState);

  return (
    <form action={formAction} className="auth-form auth-form-strong">
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

      {state.error ? <p className="message-inline">{state.error}</p> : null}

      <button type="submit" disabled={pending} className="button-primary auth-submit">
        {pending ? "Entrando..." : "Entrar no sistema"}
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
