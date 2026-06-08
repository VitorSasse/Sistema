import Link from "next/link";
import { LoginForm } from "@/app/(auth)/login/login-form";
import { BaseproLogo } from "@/components/branding/basepro-logo";

const highlights = [
  {
    title: "OPERACAO",
    copy: "Fichas de bordo, agenda de servicos e producao em uma unica torre de controle."
  },
  {
    title: "MANUTENCAO",
    copy: "Controle de equipamentos, alertas e preventivas sem perder janela operacional."
  },
  {
    title: "FATURAMENTO",
    copy: "Medicoes, financeiro e relatorios para transformar producao em lucro real."
  }
];

type AccessEntryProps = {
  mode?: "home" | "login";
};

export function AccessEntry({ mode = "home" }: AccessEntryProps) {
  return (
    <main className="access-shell">
      <section className="access-showcase fade-up">
        <div className="access-showcase-topline">
          <span className="access-chip">BASEPRO</span>
          <span className="access-kicker">Sistema completo para terraplenagem</span>
        </div>

        <div className="access-copy">
          <h1>
            Controle total da sua operacao de <span>terraplenagem</span>, da <span>frente de servico</span>{" "}
            ao <span>faturamento</span>.
          </h1>
          <p>
            Sua operacao pesada, agora sob controle. Gestao completa para quem nao pode parar.
          </p>
        </div>

        <div className="access-highlight-grid">
          {highlights.map((item) => (
            <article key={item.title} className="access-highlight-card">
              <strong>{item.title}</strong>
              <span>{item.copy}</span>
            </article>
          ))}
        </div>

        <div className="access-footer-note">
          <strong>Produtividade com comando central</strong>
          <span>Pare de perder dinheiro por falta de controle. Informacao certa. Decisao inteligente.</span>
        </div>
      </section>

      <section className="access-auth-panel fade-up fade-up-delay-1">
        <div className="access-brand">
          <BaseproLogo theme="light" />
        </div>

        <div className="access-auth-copy">
          <h2>{mode === "home" ? "Acesso ao sistema" : "Login administrativo"}</h2>
          <p>
            Entre com sua conta para acessar operacao, manutencao, medicoes, RH e financeiro na mesma base.
          </p>
        </div>

        {mode === "login" ? (
          <LoginForm />
        ) : (
          <div className="access-home-actions">
            <Link href="/login" className="button-primary access-home-primary">
              Ir para o login
            </Link>
            <p className="subtle access-home-subtle">
              Controle total da sua operacao de terraplenagem.
            </p>
          </div>
        )}

        <div className="access-secondary-links">
          {mode === "home" ? (
            <Link href="/login" className="access-secondary-link">
              Abrir tela de login dedicada
            </Link>
          ) : (
            <Link href="/" className="access-secondary-link">
              Voltar para a entrada principal
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
