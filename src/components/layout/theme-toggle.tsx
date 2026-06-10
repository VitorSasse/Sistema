"use client";

import { useEffect, useState } from "react";

type ModoTema = "dark" | "light";

const chaveArmazenamento = "basepro-theme";

function aplicarTema(modo: ModoTema) {
  document.body.dataset.theme = modo;
}

export function ThemeToggle() {
  const [modoTema, setModoTema] = useState<ModoTema>("dark");

  useEffect(() => {
    const temaSalvo = window.localStorage.getItem(chaveArmazenamento);
    const temaInicial = temaSalvo === "light" || temaSalvo === "dark" ? temaSalvo : "dark";
    setModoTema(temaInicial);
    aplicarTema(temaInicial);
  }, []);

  function alterarTema(proximoTema: ModoTema) {
    setModoTema(proximoTema);
    aplicarTema(proximoTema);
    window.localStorage.setItem(chaveArmazenamento, proximoTema);
  }

  return (
    <div className="theme-toggle" aria-label="Tema do sistema">
      <button
        type="button"
        className={`theme-toggle-button${modoTema === "dark" ? " is-active" : ""}`}
        onClick={() => alterarTema("dark")}
        aria-pressed={modoTema === "dark"}
      >
        Escuro
      </button>
      <button
        type="button"
        className={`theme-toggle-button${modoTema === "light" ? " is-active" : ""}`}
        onClick={() => alterarTema("light")}
        aria-pressed={modoTema === "light"}
      >
        Claro
      </button>
    </div>
  );
}
