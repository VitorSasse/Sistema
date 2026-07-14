"use client";

import { ChevronDown, KeyRound, LogOut, UserRound, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { logout } from "@/app/(protected)/actions";
import { PasswordDialog } from "@/features/perfil/password-dialog";
import { getUserInitials, type PerfilUsuario } from "@/lib/perfil";

type SidebarUserMenuProps = {
  profile: PerfilUsuario;
};

export function SidebarUserMenu({ profile }: SidebarUserMenuProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        if (!isPending) {
          setIsLogoutOpen(false);
        }
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPending]);

  return (
    <>
      <div ref={containerRef} className="admin-user-card sidebar-user-menu-shell">
        <button
          type="button"
          className="sidebar-user-trigger"
          onClick={() => setIsOpen((current) => !current)}
          aria-expanded={isOpen}
          aria-haspopup="menu"
          title={`${profile.nome} - ${profile.email}`}
        >
          <span className="sidebar-user-avatar" aria-hidden="true">
            {profile.fotoPerfilUrl ? <img src={profile.fotoPerfilUrl} alt="" /> : getUserInitials(profile.nome)}
          </span>
          <span className="sidebar-user-identity">
            <strong>{profile.nome}</strong>
            <small>{profile.email}</small>
          </span>
          <ChevronDown size={17} className={isOpen ? "is-open" : ""} aria-hidden="true" />
        </button>

        {isOpen ? (
          <div className="sidebar-user-dropdown" role="menu">
            <Link href={"/perfil" as Route} className="sidebar-user-menu-item" role="menuitem">
              <UserRound size={17} />
              <span>Meu perfil</span>
            </Link>
            <button
              type="button"
              className="sidebar-user-menu-item"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                setIsPasswordOpen(true);
              }}
            >
              <KeyRound size={17} />
              <span>Alterar senha</span>
            </button>
            <button
              type="button"
              className="sidebar-user-menu-item is-danger"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                setIsLogoutOpen(true);
              }}
            >
              <LogOut size={17} />
              <span>Encerrar sessao</span>
            </button>
          </div>
        ) : null}
      </div>

      <PasswordDialog open={isPasswordOpen} onClose={() => setIsPasswordOpen(false)} />

      {isLogoutOpen ? (
        <div className="profile-dialog-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !isPending) {
            setIsLogoutOpen(false);
          }
        }}>
          <section className="profile-dialog profile-logout-dialog" role="alertdialog" aria-modal="true" aria-labelledby="logout-dialog-title">
            <header className="profile-dialog-header">
              <span className="profile-dialog-icon is-danger"><LogOut size={20} /></span>
              <div>
                <span className="profile-kicker">Sessao ativa</span>
                <h2 id="logout-dialog-title">Encerrar sessao</h2>
              </div>
              <button type="button" className="profile-icon-button" onClick={() => setIsLogoutOpen(false)} disabled={isPending} aria-label="Fechar">
                <X size={19} />
              </button>
            </header>
            <p className="profile-logout-copy">Deseja realmente encerrar sua sessao?</p>
            <footer className="profile-dialog-actions">
              <button type="button" className="button-secondary" onClick={() => setIsLogoutOpen(false)} disabled={isPending}>Cancelar</button>
              <button
                type="button"
                className="profile-danger-button"
                disabled={isPending}
                onClick={() => startTransition(async () => logout())}
              >
                {isPending ? "Encerrando..." : "Encerrar sessao"}
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}
