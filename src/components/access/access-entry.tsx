import Image from "next/image";
import Link from "next/link";
import { LoginForm } from "@/app/(auth)/login/login-form";

const highlights = [
  {
    title: "LANCAMENTOS",
    copy: "Fichas, apontamentos e recursos em um fluxo centralizado para o escritorio."
  },
  {
    title: "CONFERENCIA",
    copy: "Historico filtravel, rastreabilidade e leitura rapida para validar o dia."
  },
  {
    title: "MEDICAO",
    copy: "Fechamento com PDF, status, anexos e controle pronto para seguir operando."
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
          <span className="access-chip">Sistema interno</span>
          <span className="access-kicker">Terraplenagem e medicao</span>
        </div>

        <div className="access-copy">
          <h1>
            Entre no ambiente que concentra <span>lancamentos</span>, <span>historico</span> e{" "}
            <span>medicoes</span>.
          </h1>
          <p>
            Uma entrada mais direta para a equipe do escritorio: menos vitrine, mais acesso rapido ao sistema
            que organiza a operacao real do dia a dia.
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
          <strong>Acesso controlado</strong>
          <span>Somente usuarios cadastrados e ativos conseguem entrar no sistema operacional.</span>
        </div>
      </section>

      <section className="access-auth-panel fade-up fade-up-delay-1">
        <div className="access-brand">
          <Image
            src="/assets/logo-jtbjmx.png"
            alt="JTB JMX Terraplenagem"
            width={360}
            height={120}
            className="access-brand-image"
            priority
          />
        </div>

        <div className="access-auth-copy">
          <h2>{mode === "home" ? "Acesso ao sistema" : "Login administrativo"}</h2>
          <p>
            Entre com sua conta para acessar a base operacional, os lancamentos, a conferencia e o fechamento.
          </p>
        </div>

        <LoginForm />

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
