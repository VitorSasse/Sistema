"use client";

import type { ReactNode } from "react";
import {
  StatusEquipamentoOperacional,
  TipoControleEquipamento,
  TipoRecurso
} from "@prisma/client";
import { useEffect, useMemo, useState, useTransition } from "react";

type Equipamento = {
  id: string;
  tipoRecurso: TipoRecurso;
  tipoControle: TipoControleEquipamento;
  descricao: string;
  placaOuTag: string;
  fabricante: string | null;
  modelo: string | null;
  marcaModelo: string | null;
  anoFabricacao: number | null;
  dataEntrada: string | null;
  capacidadeM3: string | null;
  unidadeCapacidade: string | null;
  apelido: string | null;
  observacao: string | null;
  status: "ATIVO" | "INATIVO";
  statusOperacional: StatusEquipamentoOperacional;
  horimetroAtual: string | null;
  kmAtual: string | null;
  periodicidadeManutencaoHoras: number | null;
  periodicidadeManutencaoKm: number | null;
};

type FormState = {
  id?: string;
  tipoRecurso: TipoRecurso;
  tipoControle: TipoControleEquipamento;
  descricao: string;
  placaOuTag: string;
  fabricante: string;
  modelo: string;
  marcaModelo: string;
  anoFabricacao: string;
  dataEntrada: string;
  capacidadeM3: string;
  unidadeCapacidade: string;
  apelido: string;
  observacao: string;
  status: "ATIVO" | "INATIVO";
  statusOperacional: StatusEquipamentoOperacional;
  horimetroAtual: string;
  kmAtual: string;
  periodicidadeManutencaoHoras: string;
  periodicidadeManutencaoKm: string;
};

const initialForm: FormState = {
  tipoRecurso: "CAMINHAO",
  tipoControle: "HORIMETRO",
  descricao: "",
  placaOuTag: "",
  fabricante: "",
  modelo: "",
  marcaModelo: "",
  anoFabricacao: "",
  dataEntrada: "",
  capacidadeM3: "",
  unidadeCapacidade: "m3",
  apelido: "",
  observacao: "",
  status: "ATIVO",
  statusOperacional: "ATIVO",
  horimetroAtual: "",
  kmAtual: "",
  periodicidadeManutencaoHoras: "",
  periodicidadeManutencaoKm: ""
};

const tipoRecursoOptions: TipoRecurso[] = [
  "CAMINHAO",
  "MAQUINA",
  "CARRETA",
  "EQUIPAMENTO_APOIO",
  "OUTRO"
];

const statusOperacionalOptions: StatusEquipamentoOperacional[] = [
  "ATIVO",
  "EM_OPERACAO",
  "EM_MANUTENCAO",
  "PARADO",
  "INATIVO"
];

const tipoControleOptions: TipoControleEquipamento[] = ["HORIMETRO", "KM"];

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

function getOperationalBadge(status: StatusEquipamentoOperacional) {
  switch (status) {
    case "EM_MANUTENCAO":
      return "badge badge-danger";
    case "EM_OPERACAO":
      return "badge badge-info";
    case "PARADO":
      return "badge badge-warn";
    case "INATIVO":
      return "badge badge-neutral";
    default:
      return "badge badge-success";
  }
}

export function EquipamentosManager() {
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState<"TODOS" | TipoRecurso>("TODOS");
  const [statusFilter, setStatusFilter] = useState<"TODOS" | "ATIVO" | "INATIVO">("TODOS");
  const [operacionalFilter, setOperacionalFilter] = useState<
    "TODOS" | StatusEquipamentoOperacional
  >("TODOS");
  const [isPending, startTransition] = useTransition();

  async function loadEquipamentos() {
    const response = await fetch("/api/equipamentos", { cache: "no-store" });
    const data = (await response.json()) as { items: Equipamento[] };
    setEquipamentos(data.items);
  }

  useEffect(() => {
    void loadEquipamentos();
  }, []);

  const filteredEquipamentos = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return equipamentos.filter((equipamento) => {
      const matchesTipo = tipoFilter === "TODOS" || equipamento.tipoRecurso === tipoFilter;
      const matchesStatus = statusFilter === "TODOS" || equipamento.status === statusFilter;
      const matchesOperational =
        operacionalFilter === "TODOS" || equipamento.statusOperacional === operacionalFilter;
      const matchesSearch =
        !normalized ||
        [
          equipamento.descricao,
          equipamento.placaOuTag,
          equipamento.fabricante ?? "",
          equipamento.modelo ?? "",
          equipamento.apelido ?? ""
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalized);

      return matchesTipo && matchesStatus && matchesOperational && matchesSearch;
    });
  }, [equipamentos, search, tipoFilter, statusFilter, operacionalFilter]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const method = form.id ? "PATCH" : "POST";
    const url = form.id ? `/api/equipamentos/${form.id}` : "/api/equipamentos";

    startTransition(async () => {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setMessage(data.message ?? "Nao foi possivel salvar o equipamento.");
        return;
      }

      setForm(initialForm);
      setMessage(form.id ? "Equipamento atualizado." : "Equipamento cadastrado.");
      await loadEquipamentos();
    });
  }

  function handleEdit(equipamento: Equipamento) {
    setForm({
      id: equipamento.id,
      tipoRecurso: equipamento.tipoRecurso,
      tipoControle: equipamento.tipoControle,
      descricao: equipamento.descricao,
      placaOuTag: equipamento.placaOuTag,
      fabricante: equipamento.fabricante ?? "",
      modelo: equipamento.modelo ?? "",
      marcaModelo: equipamento.marcaModelo ?? "",
      anoFabricacao: equipamento.anoFabricacao ? String(equipamento.anoFabricacao) : "",
      dataEntrada: equipamento.dataEntrada ? equipamento.dataEntrada.slice(0, 10) : "",
      capacidadeM3: equipamento.capacidadeM3 ?? "",
      unidadeCapacidade: equipamento.unidadeCapacidade ?? "",
      apelido: equipamento.apelido ?? "",
      observacao: equipamento.observacao ?? "",
      status: equipamento.status,
      statusOperacional: equipamento.statusOperacional,
      horimetroAtual: equipamento.horimetroAtual ?? "",
      kmAtual: equipamento.kmAtual ?? "",
      periodicidadeManutencaoHoras: equipamento.periodicidadeManutencaoHoras
        ? String(equipamento.periodicidadeManutencaoHoras)
        : "",
      periodicidadeManutencaoKm: equipamento.periodicidadeManutencaoKm
        ? String(equipamento.periodicidadeManutencaoKm)
        : ""
    });
    setMessage(`Editando ${equipamento.descricao}.`);
  }

  async function handleDisable(id: string) {
    startTransition(async () => {
      const response = await fetch(`/api/equipamentos/${id}`, { method: "DELETE" });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setMessage(data.message ?? "Nao foi possivel inativar o equipamento.");
        return;
      }

      setMessage("Equipamento inativado.");
      await loadEquipamentos();
    });
  }

  async function handleDelete(id: string) {
    startTransition(async () => {
      const response = await fetch(`/api/equipamentos/${id}?mode=delete`, { method: "DELETE" });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setMessage(data.message ?? "Nao foi possivel excluir o equipamento.");
        return;
      }

      if (form.id === id) {
        setForm(initialForm);
      }

      setMessage("Equipamento excluido.");
      await loadEquipamentos();
    });
  }

  return (
    <main className="page-stack">
      <section className="surface section-card">
        <div className="section-header">
          <div>
            <h2 className="section-title">{form.id ? "Editar equipamento" : "Novo equipamento"}</h2>
            <p className="section-copy">
              Cadastro simplificado com tipo de controle por horimetro ou KM.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 24 }}>
          <div className="form-grid-4">
            <Field label="Tipo de recurso">
              <select
                className="field-control"
                value={form.tipoRecurso}
                onChange={(event) => updateField("tipoRecurso", event.target.value as TipoRecurso)}
              >
                {tipoRecursoOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tipo de controle">
              <select
                className="field-control"
                value={form.tipoControle}
                onChange={(event) =>
                  updateField("tipoControle", event.target.value as TipoControleEquipamento)
                }
              >
                {tipoControleOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Descricao">
              <input
                className="field-control"
                value={form.descricao}
                onChange={(event) => updateField("descricao", event.target.value)}
              />
            </Field>
            <Field label="Placa ou tag">
              <input
                className="field-control"
                value={form.placaOuTag}
                onChange={(event) => updateField("placaOuTag", event.target.value.toUpperCase())}
              />
            </Field>
            <Field label="Fabricante">
              <input
                className="field-control"
                value={form.fabricante}
                onChange={(event) => updateField("fabricante", event.target.value)}
              />
            </Field>
            <Field label="Modelo">
              <input
                className="field-control"
                value={form.modelo}
                onChange={(event) => updateField("modelo", event.target.value)}
              />
            </Field>
            <Field label="Marca / modelo livre">
              <input
                className="field-control"
                value={form.marcaModelo}
                onChange={(event) => updateField("marcaModelo", event.target.value)}
              />
            </Field>
            <Field label="Ano de fabricacao">
              <input
                className="field-control"
                type="number"
                value={form.anoFabricacao}
                onChange={(event) => updateField("anoFabricacao", event.target.value)}
              />
            </Field>
            <Field label="Data de entrada">
              <input
                className="field-control"
                type="date"
                value={form.dataEntrada}
                onChange={(event) => updateField("dataEntrada", event.target.value)}
              />
            </Field>
            <Field label="Horimetro atual">
              <input
                className="field-control"
                type="number"
                step="0.01"
                value={form.horimetroAtual}
                onChange={(event) => updateField("horimetroAtual", event.target.value)}
              />
            </Field>
            <Field label="KM atual">
              <input
                className="field-control"
                type="number"
                step="0.1"
                value={form.kmAtual}
                onChange={(event) => updateField("kmAtual", event.target.value)}
              />
            </Field>
            <Field label="Status operacional">
              <select
                className="field-control"
                value={form.statusOperacional}
                onChange={(event) =>
                  updateField(
                    "statusOperacional",
                    event.target.value as StatusEquipamentoOperacional
                  )
                }
              >
                {statusOperacionalOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Periodicidade em horas">
              <input
                className="field-control"
                type="number"
                value={form.periodicidadeManutencaoHoras}
                onChange={(event) => updateField("periodicidadeManutencaoHoras", event.target.value)}
              />
            </Field>
            <Field label="Periodicidade em KM">
              <input
                className="field-control"
                type="number"
                value={form.periodicidadeManutencaoKm}
                onChange={(event) => updateField("periodicidadeManutencaoKm", event.target.value)}
              />
            </Field>
            <Field label="Capacidade">
              <input
                className="field-control"
                type="number"
                step="0.01"
                value={form.capacidadeM3}
                onChange={(event) => updateField("capacidadeM3", event.target.value)}
              />
            </Field>
            <Field label="Unidade capacidade">
              <input
                className="field-control"
                value={form.unidadeCapacidade}
                onChange={(event) => updateField("unidadeCapacidade", event.target.value)}
              />
            </Field>
            <Field label="Status do cadastro">
              <select
                className="field-control"
                value={form.status}
                onChange={(event) => updateField("status", event.target.value as FormState["status"])}
              >
                <option value="ATIVO">ATIVO</option>
                <option value="INATIVO">INATIVO</option>
              </select>
            </Field>
          </div>

          <Field label="Observacao">
            <textarea
              className="field-control textarea-lg"
              value={form.observacao}
              onChange={(event) => updateField("observacao", event.target.value)}
            />
          </Field>

          <div className="toolbar-actions">
            <button type="submit" disabled={isPending} className="button-primary">
              {isPending ? "Salvando..." : form.id ? "Atualizar equipamento" : "Salvar equipamento"}
            </button>
          </div>

          {message ? <p className="message-inline">{message}</p> : null}
        </form>
      </section>

      <section className="surface section-card">
        <div className="section-header">
          <div>
            <h2 className="section-title">Equipamentos cadastrados</h2>
            <p className="section-copy">
              {filteredEquipamentos.length} registro(s) exibido(s) de {equipamentos.length}.
            </p>
          </div>
          <div className="toolbar-actions">
            <input
              className="field-control"
              placeholder="Buscar por descricao, placa, fabricante ou apelido"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select
              className="field-control"
              value={tipoFilter}
              onChange={(event) => setTipoFilter(event.target.value as "TODOS" | TipoRecurso)}
            >
              <option value="TODOS">Todos os tipos</option>
              {tipoRecursoOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <select
              className="field-control"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "TODOS" | "ATIVO" | "INATIVO")
              }
            >
              <option value="TODOS">Todos os cadastros</option>
              <option value="ATIVO">Ativos</option>
              <option value="INATIVO">Inativos</option>
            </select>
            <select
              className="field-control"
              value={operacionalFilter}
              onChange={(event) =>
                setOperacionalFilter(
                  event.target.value as "TODOS" | StatusEquipamentoOperacional
                )
              }
            >
              <option value="TODOS">Todo status operacional</option>
              {statusOperacionalOptions.map((option) => (
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
                <th>Equipamento</th>
                <th>Controle</th>
                <th>Leitura atual</th>
                <th>Periodicidade</th>
                <th>Status</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {filteredEquipamentos.map((equipamento) => (
                <tr key={equipamento.id}>
                  <td>
                    <div>{equipamento.descricao}</div>
                    <div className="subtle">
                      {[equipamento.placaOuTag, equipamento.fabricante, equipamento.modelo]
                        .filter(Boolean)
                        .join(" · ") || "-"}
                    </div>
                  </td>
                  <td>
                    <div>{equipamento.tipoControle}</div>
                    <div className="subtle">{equipamento.tipoRecurso}</div>
                  </td>
                  <td>
                    <div>Horimetro: {equipamento.horimetroAtual ?? "-"}</div>
                    <div className="subtle">KM: {equipamento.kmAtual ?? "-"}</div>
                  </td>
                  <td>
                    <div>Horas: {equipamento.periodicidadeManutencaoHoras ?? "-"}</div>
                    <div className="subtle">KM: {equipamento.periodicidadeManutencaoKm ?? "-"}</div>
                  </td>
                  <td>
                    <div>
                      <span className={equipamento.status === "ATIVO" ? "badge badge-success" : "badge badge-danger"}>
                        {equipamento.status}
                      </span>
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <span className={getOperationalBadge(equipamento.statusOperacional)}>
                        {equipamento.statusOperacional}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="toolbar-actions">
                      <button type="button" onClick={() => handleEdit(equipamento)} className="button-secondary">
                        Editar
                      </button>
                      <button type="button" onClick={() => handleDisable(equipamento.id)} className="button-danger">
                        Inativar
                      </button>
                      <button type="button" onClick={() => handleDelete(equipamento.id)} className="button-danger">
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
