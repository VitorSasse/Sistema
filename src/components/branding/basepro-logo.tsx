type BaseproLogoProps = {
  compact?: boolean;
  theme?: "dark" | "light";
  className?: string;
};

export function BaseproLogo({
  compact = false,
  theme = "dark",
  className = ""
}: BaseproLogoProps) {
  const isDark = theme === "dark";

  return (
    <div
      className={`basepro-logo${compact ? " is-compact" : ""}${className ? ` ${className}` : ""}`}
      aria-label="BASEPRO"
    >
      <span className={`basepro-logo-mark basepro-logo-mark-${theme}`} aria-hidden="true">
        <svg viewBox="0 0 78 78" role="img">
          <rect x="3" y="3" width="72" height="72" rx="20" fill={isDark ? "#111827" : "#0B0B0B"} />
          <path
            d="M17 54L27 16H47C58 16 63 21 63 29C63 37 58 41 49 42H33L30 54H17Z"
            fill="#F97316"
          />
          <path d="M38 27H48C51.5 27 54 28.8 54 31.7C54 35.4 50.8 37 46.6 37H35.2L38 27Z" fill="white" />
          <path d="M42 58L50 30L59 58H42Z" fill="#0F2A44" opacity="0.95" />
          <path d="M52 58L58.2 35.5L64.4 58H52Z" fill="#173F68" />
          <path d="M22 58C28 48 35 43 43.5 42.5C35.5 45.5 29.5 50.7 25.5 58H22Z" fill="white" opacity="0.88" />
        </svg>
      </span>

      {compact ? null : (
        <span className="basepro-logo-lockup">
          <span className="basepro-logo-wordmark">
            <span className="basepro-logo-base">BASE</span>
            <span className="basepro-logo-pro">PRO</span>
          </span>
          <span className="basepro-logo-tagline">Sua operacao pesada, agora sob controle.</span>
        </span>
      )}
    </div>
  );
}
