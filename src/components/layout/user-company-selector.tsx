"use client";

import { useTransition } from "react";
import { Building2 } from "lucide-react";

type UserCompanyOption = {
  empresaId: string;
  nome: string;
  nomeFantasia: string | null;
  razaoSocial: string | null;
};

type UserCompanySelectorProps = {
  empresas: UserCompanyOption[];
  empresaAtualId: string;
};

export function UserCompanySelector({ empresas, empresaAtualId }: UserCompanySelectorProps) {
  const [isPending, startTransition] = useTransition();

  if (empresas.length <= 1) {
    return null;
  }

  function handleChange(value: string) {
    if (!value || value === empresaAtualId) {
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/empresas-acesso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresaId: value })
      });

      if (response.ok) {
        window.location.reload();
      }
    });
  }

  return (
    <label className="master-company-selector" title="Trocar empresa ativa">
      <Building2 size={16} aria-hidden="true" />
      <span>Empresa atual</span>
      <select
        value={empresaAtualId}
        onChange={(event) => handleChange(event.target.value)}
        disabled={isPending}
        aria-label="Selecionar empresa ativa"
      >
        {empresas.map((empresa) => (
          <option key={empresa.empresaId} value={empresa.empresaId}>
            {empresa.nomeFantasia || empresa.razaoSocial || empresa.nome}
          </option>
        ))}
      </select>
    </label>
  );
}
