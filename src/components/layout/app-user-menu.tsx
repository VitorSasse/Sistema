"use client";

import { ChevronDown, KeyRound, LogOut, UserRound, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { logout } from "@/app/(protected)/actions";
import { PasswordDialog } from "@/features/perfil/password-dialog";
import { getUserInitials } from "@/lib/perfil";

type AppUserMenuProps = {
  userName: string;
  userEmail: string;
  userAvatarUrl?: string | null;
};

export function AppUserMenu({ userName, userEmail, userAvatarUrl }: AppUserMenuProps) {
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
      <div ref={containerRef} className="app-user-menu-shell">
        <button
          type="button"
          className="app-user-chip app-user-menu-trigger"
          title={`${userName} - ${userEmail}`}
          aria-label="Abrir menu do usuario"
          aria-expanded={isOpen}
          aria-haspopup="menu"
          onClick={() => setIsOpen((current) => !current)}
        >
          <span className="app-user-avatar" aria-hidden="true">
            {userAvatarUrl ? <img src={userAvatarUrl} alt="" /> : getUserInitials(userName)}
          </span>
          <span className="app-user-menu-identity">
            <strong>{userName}</strong>
            <small>{userEmail}</small>
          </span>
          <ChevronDown className={isOpen ? "is-open" : ""} size={16} aria-hidden="true" />
        </button>

        {isOpen ? (
          <div className="app-user-dropdown" role="menu">
            <Link href={"/perfil" as Route} className="app-user-menu-item" role="menuitem">
              <UserRound size={17} />
              <span>Meu perfil</span>
            </Link>
            <button
              type="button"
              className="app-user-menu-item"
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
              className="app-user-menu-item is-danger"
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
