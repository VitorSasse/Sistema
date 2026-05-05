"use client";

import { OrigemLeituraEquipamento } from "@prisma/client";
import { useEffect, useMemo, useState, useTransition } from "react";

type EquipamentoOption = {
  id: string;
  descricao: string;
  placaOuTag: string;
};

type LeituraItem = {
  id: string;
  dataLeitura: string;
  horimetroValor: string | null;
  kmValor: string | null;
  origem: OrigemLeituraEquipamento;
  observacao: string | null;
  equipamento: EquipamentoOption;
  usuario: {
    id: string;
    nome: string;
  };
};

type FormState = {
  equipamentoId: string;
  dataLeitura: string;
  horimetroValor: string;
  kmValor: string;
  origem: OrigemLeituraEquipamento;
  observacao: string;
};

const initialForm: FormState = {
  equipamentoId: "",
  dataLeitura: new Date().toISOString().slice(0, 10),
  horimetroValor: "",
  kmValor: "",
  origem: "MANUAL",
  observacao: ""
};

const origemOptions: OrigemLeituraEquipamento[] = [
  "MANUAL",
  "LANCAMENTO_DIARIO",
  "MANUTENCAO",
  "IMPORTADO",
  "AJUSTE"
];

function formatEquipamentoLabel(equipamento: EquipamentoOption) {
  return [equipamento.descricao, equipamento.placaOuTag].filter(Boolean).join(" - ");
}

export function LeiturasManager() {
  const [equipamentos, setEquipamentos] = useState<EquipamentoOption[]>([]);
  const [leituras, setLeituras] = useState<LeituraItem[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [origemFilter, setOrigemFilter] = useState<"TODOS" | OrigemLeituraEquipamento>("TODOS");
  const [equipamentoFilter, setEquipamentoFilter] = useState("TODOS");
  const [isPending, startTransition] = useTransition();

  async function loadEquipamentos() {
    const response = await fetch("/api/equipamentos", { cache: "no-store" });
    const data = (await response.json()) as { items: EquipamentoOption[] };
    setEquipamentos(data.items.filter((item) => item.id));
    setForm((current) => ({
      ...current,
      equipamentoId: current.equipamentoId || data.items[0]?.id || ""
    }));
  }

  async function loadLeituras() {
    const params = new URLSearchParams();
    if (equipamentoFilter !== "TODOS") params.set("equipamentoId", equipamentoFilter);
    if (origemFilter !== "TODOS") params.set("origem", origemFilter);

    const response = await fetch(`/api/frota/leituras?${params.toString()}`, {
      cache: "no-store"
    });
    const data = (await response.json()) as { items: LeituraItem[] };
    setLeituras(data.items);
  }

  useEffect(() => {
    void loadEquipamentos();
  }, []);

  useEffect(() => {
    void loadLeituras();
  }, [equipamentoFilter, origemFilter]);

  const filteredLeituras = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    if (!normalized) return leituras;

    return leituras.filter((item) =>
      [item.equipamento.descricao, item.equipamento.placaOuTag, item.usuario.nome, item.observacao ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [leituras, search]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    startTransition(async () => {
      const response = await fetch("/api/frota/leituras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setMessage(data.message ?? "Nao foi possivel registrar a leitura.");
        return;
      }

      setForm((current) => ({
        ...initialForm,
        equipamentoId: current.equipamentoId
      }));
      setMessage("Leitura registrada e equipamento atualizado.");
      await Promise.all([loadLeituras(), loadEquipamentos()]);
    });
  }

  return (
    <main className="page-stack">
      <section className="surface section-card">
        <div className="section-header">
          <div>
            <h2 className="section-title">Nova leitura</h2>
            <p className="section-copy">
              Registre horimetro e quilometragem com validacao para evitar regressao de leitura.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 24 }}>
          <div className="form-grid-4">
            <label className="field">
              <span className="field-label">Equipamento</span>
              <select
                className="field-control"
                value={form.equipamentoId}
                onChange={(event) => updateField("equipamentoId", event.target.value)}
              >
                {equipamentos.map((equipamento) => (
                  <option key={equipamento.id} value={equipamento.id}>
                    {formatEquipamentoLabel(equipamento)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Data</span>
              <input
                className="field-control"
                type="date"
                value={form.dataLeitura}
                onChange={(event) => updateField("dataLeitura", event.target.value)}
              />
            </label>
            <label className="field">
              <span className="field-label">Horimetro</span>
              <input
                className="field-control"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.horimetroValor}
                onChange={(event) => updateField("horimetroValor", event.target.value)}
              />
            </label>
            <label className="field">
              <span className="field-label">KM</span>
              <input
                className="field-control"
                type="number"
                step="0.1"
                placeholder="0.0"
                value={form.kmValor}
                onChange={(event) => updateField("kmValor", event.target.value)}
              />
            </label>
            <label className="field">
              <span className="field-label">Origem</span>
              <select
                className="field-control"
                value={form.origem}
                onChange={(event) =>
                  updateField("origem", event.target.value as OrigemLeituraEquipamento)
                }
              >
                {origemOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="field">
            <span className="field-label">Observacao</span>
            <textarea
              className="field-control textarea-lg"
              placeholder="Contexto da leitura, manutencao ou ajuste"
              value={form.observacao}
              onChange={(event) => updateField("observacao", event.target.value)}
            />
          </label>

          <div className="toolbar-actions">
            <button type="submit" disabled={isPending} className="button-primary">
              {isPending ? "Salvando..." : "Registrar leitura"}
            </button>
          </div>

          {message ? <p className="message-inline">{message}</p> : null}
        </form>
      </section>

      <section className="surface section-card">
        <div className="section-header">
          <div>
            <h2 className="section-title">Historico de leituras</h2>
            <p className="section-copy">
              Consulta rapida por equipamento, origem e responsavel pelo registro.
            </p>
          </div>
          <div className="toolbar-actions">
            <input
              className="field-control"
              placeholder="Buscar por equipamento, placa ou usuario"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select
              className="field-control"
              value={equipamentoFilter}
              onChange={(event) => setEquipamentoFilter(event.target.value)}
            >
              <option value="TODOS">Todos os equipamentos</option>
              {equipamentos.map((equipamento) => (
                <option key={equipamento.id} value={equipamento.id}>
                  {formatEquipamentoLabel(equipamento)}
                </option>
              ))}
            </select>
            <select
              className="field-control"
              value={origemFilter}
              onChange={(event) =>
                setOrigemFilter(event.target.value as "TODOS" | OrigemLeituraEquipamento)
              }
            >
              <option value="TODOS">Todas as origens</option>
              {origemOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Equipamento</th>
                <th>Leitura</th>
                <th>Origem</th>
                <th>Usuario</th>
                <th>Observacao</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeituras.map((item) => (
                <tr key={item.id}>
                  <td>{new Date(item.dataLeitura).toLocaleDateString("pt-BR")}</td>
                  <td>
                    <div>{item.equipamento.descricao}</div>
                    <div className="subtle">{item.equipamento.placaOuTag}</div>
                  </td>
                  <td>
                    <div>Horimetro: {item.horimetroValor ?? "-"}</div>
                    <div className="subtle">KM: {item.kmValor ?? "-"}</div>
                  </td>
                  <td>
                    <span className="badge badge-info">{item.origem}</span>
                  </td>
                  <td>{item.usuario.nome}</td>
                  <td>{item.observacao ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
