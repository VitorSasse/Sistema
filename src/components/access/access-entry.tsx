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

const metrics = [
  { value: "08+", label: "modulos integrados" },
  { value: "24h", label: "operacao rastreavel" },
  { value: "1 base", label: "campo, frota e faturamento" }
];

const authSignals = [
  {
    title: "Operacao",
    copy: "Fichas, agenda, apontamentos e acompanhamento diario em uma unica rotina."
  },
  {
    title: "Financeiro",
    copy: "Compras, medicoes e rastreabilidade do faturamento com menos retrabalho."
  },
  {
    title: "Seguranca",
    copy: "Acesso controlado e trilha de alteracoes para auditoria operacional."
  }
];

type AccessEntryProps = {
  mode?: "home" | "login";
};

export function AccessEntry({ mode = "home" }: AccessEntryProps) {
  return (
    <main className="access-shell">
      <section className="access-showcase fade-up">
        <div className="access-orbit access-orbit-primary" aria-hidden="true" />
        <div className="access-orbit access-orbit-secondary" aria-hidden="true" />

        <div className="access-showcase-topline">
          <span className="access-chip">BASEPRO</span>
          <span className="access-kicker">SISTEMA COMPLETO PARA TERRAPLENAGEM</span>
        </div>

        <div className="access-copy">
          <h1>
            Controle total da sua operacao pesada, da <span>frente de servico</span> ao{" "}
            <span>faturamento</span>.
          </h1>
          <p>
            Sua operacao pesada, agora sob controle. Um ambiente unico para lancamentos, frota,
            manutencao, compras, medicoes e decisao operacional.
          </p>
        </div>

        <div className="access-metric-grid">
          {metrics.map((item) => (
            <article key={item.label} className="access-metric-card">
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </article>
          ))}
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
          <strong>Sua operacao pesada, agora sob controle.</strong>
          <span>
            Pare de perder dinheiro por falta de controle. Informacao certa, decisao inteligente e
            producao medida sem quebrar o fluxo do escritorio.
          </span>
        </div>
      </section>

      <section className="access-auth-panel fade-up fade-up-delay-1">
        <div className="access-auth-shell">
          <div className="access-brand">
            <BaseproLogo theme="dark" />
          </div>

          <div className="access-auth-copy">
            <h2>{mode === "home" ? "Entrada principal do sistema" : "Login administrativo"}</h2>
            <p>
              Entre com sua conta para acessar operacao, manutencao, medicoes, compras e financeiro
              na mesma base operacional.
            </p>
          </div>

          <div className="access-auth-signal-grid">
            {authSignals.map((item) => (
              <article key={item.title} className="access-auth-signal">
                <strong>{item.title}</strong>
                <span>{item.copy}</span>
              </article>
            ))}
          </div>

          {mode === "login" ? (
            <LoginForm />
          ) : (
            <div className="access-home-actions">
              <Link href="/login" className="button-primary access-home-primary">
                Ir para o login
              </Link>
              <p className="subtle access-home-subtle">
                Controle total da sua operacao de terraplenagem, do campo ao faturamento.
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
        </div>
      </section>
    </main>
  );
}
