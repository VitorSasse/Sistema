import { classNames } from "@/lib/class-names";

type AvatarProps = {
  alt: string;
  className?: string;
  name: string;
  size?: "sm" | "md" | "lg";
  src?: string | null;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] ?? "U"}${parts.length > 1 ? parts.at(-1)?.[0] ?? "" : ""}`.toUpperCase();
}

export function Avatar({ alt, className, name, size = "md", src }: AvatarProps) {
  return (
    <span className={classNames("ui-avatar", `ui-avatar-${size}`, className)}>
      {src ? <img src={src} alt={alt} /> : <span aria-label={alt}>{initials(name)}</span>}
    </span>
  );
}
