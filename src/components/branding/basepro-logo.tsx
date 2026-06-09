import Image from "next/image";

type BaseproLogoProps = {
  compact?: boolean;
  showTagline?: boolean;
  theme?: "dark" | "light";
  className?: string;
};

export function BaseproLogo({
  compact = false,
  showTagline: _showTagline = true,
  theme = "dark",
  className = ""
}: BaseproLogoProps) {
  void _showTagline;

  return (
    <div
      className={`basepro-logo${compact ? " is-compact" : ""}${className ? ` ${className}` : ""}`}
      aria-label="BASEPRO"
    >
      <span className={`basepro-logo-mark basepro-logo-mark-${theme}`} aria-hidden="true">
        <Image
          src={compact ? "/assets/basepro-icon.svg" : "/branding/basepro-logo-horizontal.jpeg"}
          alt=""
          width={compact ? 96 : 1600}
          height={compact ? 96 : 900}
          className="basepro-logo-image"
          priority
        />
      </span>
    </div>
  );
}
