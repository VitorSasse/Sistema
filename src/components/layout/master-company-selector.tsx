"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Building2 } from "lucide-react";

type EmpresaOption = {
  id: string;
  nomeFantasia: string | null;
  razaoSocial: string | null;
  nome: string;
  status: "ATIVO" | "INATIVO";
};

export function MasterCompanySelector() {
  const [empresas, setEmpresas] = useState<EmpresaOption[]>([]);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function load() {
      const [empresasResponse, selectedResponse] = await Promise.all([
        fetch("/api/master/empresas", { cache: "no-store" }),
        fetch("/api/master/empresa-selecionada", { cache: "no-store" })
      ]);

      if (empresasResponse.ok) {
        const data = (await empresasResponse.json()) as { items?: EmpresaOption[] };
        setEmpresas(data.items ?? []);
      }

      if (selectedResponse.ok) {
        const data = (await selectedResponse.json()) as { empresaId?: string | null };
        setSelectedEmpresaId(data.empresaId ?? "");
      }
    }

    void load();
  }, []);

  const selectedLabel = useMemo(() => {
    if (!selectedEmpresaId) {
      return "Selecione uma empresa";
    }

    const empresa = empresas.find((item) => item.id === selectedEmpresaId);
    return empresa?.nomeFantasia || empresa?.nome || "Empresa selecionada";
  }, [empresas, selectedEmpresaId]);

  function handleChange(value: string) {
    if (!value) {
      return;
    }

    setSelectedEmpresaId(value);

    startTransition(async () => {
      await fetch("/api/master/empresa-selecionada", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresaId: value })
      });

      window.location.reload();
    });
  }

  return (
    <label className="master-company-selector" title={`Escopo MASTER: ${selectedLabel}`}>
      <Building2 size={16} aria-hidden="true" />
      <span>Escopo</span>
      <select
        value={selectedEmpresaId}
        onChange={(event) => handleChange(event.target.value)}
        disabled={isPending}
        aria-label="Selecionar empresa para visualizacao operacional"
      >
        <option value="" disabled>Selecione uma empresa</option>
        {empresas.map((empresa) => (
          <option key={empresa.id} value={empresa.id}>
            {empresa.nomeFantasia || empresa.nome} {empresa.status === "INATIVO" ? "(inativa)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
