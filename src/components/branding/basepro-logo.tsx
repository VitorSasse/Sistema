import Image from "next/image";

type PropriedadesLogoBasepro = {
  compact?: boolean;
  showTagline?: boolean;
  theme?: "dark" | "light";
  className?: string;
};

export function BaseproLogo({
  compact: compacto = false,
  showTagline: _exibirSlogan = true,
  theme: tema = "dark",
  className = ""
}: PropriedadesLogoBasepro) {
  void _exibirSlogan;

  const origemLogo = compacto
    ? "/assets/basepro-icon.svg"
    : "/branding/basepro-logo-horizontal-transparent.png";
  const larguraImagem = compacto ? 96 : 1600;
  const alturaImagem = compacto ? 96 : 900;

  return (
    <div
      className={`basepro-logo${compacto ? " is-compact" : ""}${className ? ` ${className}` : ""}`}
      aria-label="BASEPRO"
    >
      <span className={`basepro-logo-mark basepro-logo-mark-${tema}`} aria-hidden="true">
        <Image
          src={origemLogo}
          alt=""
          width={larguraImagem}
          height={alturaImagem}
          className="basepro-logo-image"
          priority
        />
      </span>
    </div>
  );
}
