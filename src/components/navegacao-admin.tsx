"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { GrupoNavegacaoAdmin } from "@/lib/configuracao/navegacao-admin";

type PropriedadesNavegacaoAdmin = {
  grupos: GrupoNavegacaoAdmin[];
};

export function NavegacaoAdmin({ grupos }: PropriedadesNavegacaoAdmin) {
  const caminhoAtual = usePathname();
  const [gruposAbertos, setGruposAbertos] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setGruposAbertos((estadoAtual) => {
      const proximoEstado = { ...estadoAtual };

      for (const grupo of grupos) {
        if (proximoEstado[grupo.rotulo] !== undefined) {
          continue;
        }

        proximoEstado[grupo.rotulo] = grupo.itens.some(
          (item) => caminhoAtual === item.href || caminhoAtual.startsWith(`${item.href}/`)
        );
      }

      return proximoEstado;
    });
  }, [grupos, caminhoAtual]);

  function alternarGrupo(label: string) {
    setGruposAbertos((estadoAtual) => ({
      ...estadoAtual,
      [label]: !estadoAtual[label]
    }));
  }

  return (
    <nav className="admin-nav">
      {grupos.map((grupo) => (
        <section key={grupo.rotulo} className="admin-nav-group">
          <button
            type="button"
            className="admin-nav-group-trigger"
            onClick={() => alternarGrupo(grupo.rotulo)}
            aria-expanded={gruposAbertos[grupo.rotulo] ?? false}
          >
            <span className="admin-nav-group-trigger-heading">
              <span
                className={`admin-nav-group-icon${grupo.icone ? ` is-${grupo.icone}` : ""}`}
                aria-hidden="true"
              >
                <span className="admin-nav-group-icon-shape" />
              </span>
              <span className="admin-nav-group-trigger-label">{grupo.rotulo}</span>
            </span>
            <span
              className={`admin-nav-group-trigger-icon${
                gruposAbertos[grupo.rotulo] ? " is-open" : ""
              }`}
            >
              &lsaquo;
            </span>
          </button>

          <div
            className={`admin-nav-group-links${gruposAbertos[grupo.rotulo] ? " is-open" : ""}`}
          >
            {grupo.itens.map((item) => {
              const estaAtivo =
                caminhoAtual === item.href || caminhoAtual.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`admin-nav-link${estaAtivo ? " admin-nav-link-active" : ""}`}
                >
                  <span>{item.rotulo}</span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </nav>
  );
}
