"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { loadOperationalOptions } from "@/lib/client/operational-options";
import { formatQuantidadeComUnidade } from "@/lib/utils/unidades";

type Option = {
  id: string;
  codigo?: string;
  codigoMaterial?: string;
  nome?: string;
  tipoServico?: string;
  descricao?: string;
  status: "ATIVO" | "INATIVO";
  clienteId?: string;
  placaOuTag?: string;
};

type Lancamento = {
  id: string;
  data: string;
  clienteId?: string;
  obraId?: string | null;
  servicoId?: string;
  materialId?: string | null;
  equipamentoId?: string;
  colaboradorId?: string;
  quantidadeApontada: string;
  unidadeApontada: "CARGA" | "HORA" | "M3";
  quantidadeFaturada: string;
  unidadeFaturada: "CARGA" | "HORA" | "M3" | "DIARIA";
  statusValidacao: "VALIDO" | "PENDENTE_OBRA" | "PENDENTE_PRECO" | "DIVERGENTE" | "MEDIDO" | "CANCELADO";
  observacao: string | null;
  ficha: { numero: string; observacao?: string | null };
  cliente: { nome: string };
  obra: { nome: string } | null;
  servico: { tipoServico: string };
  material: { descricao: string } | null;
  equipamento: { descricao: string; placaOuTag: string };
  colaborador: { nome: string };
};

type HistoricoAlteracao = {
  id: string;
  campo: string;
  valorAnterior: string | null;
  valorNovo: string | null;
  motivo: string | null;
  createdAt: string;
  usuario: { nome: string | null; email: string | null };
};

type Filters = {
  periodoInicial: string;
  periodoFinal: string;
  fichaNumero: string;
  clienteId: string;
  obraId: string;
  servicoId: string;
  equipamentoId: string;
  colaboradorId: string;
  status: string;
};

const initialFilters: Filters = {
  periodoInicial: "",
  periodoFinal: "",
  fichaNumero: "",
  clienteId: "",
  obraId: "",
  servicoId: "",
  equipamentoId: "",
  colaboradorId: "",
  status: ""
};

export function HistoricoManager() {
  const [clientes, setClientes] = useState<Option[]>([]);
  const [obras, setObras] = useState<Option[]>([]);
  const [servicos, setServicos] = useState<Option[]>([]);
  const [materiais, setMateriais] = useState<Option[]>([]);
  const [equipamentos, setEquipamentos] = useState<Option[]>([]);
  const [colaboradores, setColaboradores] = useState<Option[]>([]);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [items, setItems] = useState<Lancamento[]>([]);
  const [selected, setSelected] = useState<Lancamento | null>(null);
  const [historico, setHistorico] = useState<HistoricoAlteracao[]>([]);
  const [editForm, setEditForm] = useState({
    data: "",
    fichaNumero: "",
    fichaObservacao: "",
    clienteId: "",
    obraId: "",
    servicoId: "",
    materialId: "",
    equipamentoId: "",
    colaboradorId: "",
    quantidadeApontada: "",
    unidadeApontada: "HORA",
    quantidadeFaturada: "",
    unidadeFaturada: "HORA",
    observacao: "",
    motivoAlteracao: ""
  });
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  async function loadOptions() {
    const data = await loadOperationalOptions();

    setClientes(data.clientes);
    setObras(data.obras);
    setServicos(data.servicos);
    setMateriais(data.materiais);
    setEquipamentos(data.equipamentos);
    setColaboradores(data.colaboradores);
  }

  useEffect(() => {
    void loadOptions();
  }, []);

  const obrasDisponiveis = useMemo(
    () => obras.filter((obra) => !filters.clienteId || obra.clienteId === filters.clienteId),
    [obras, filters.clienteId]
  );

  const hasActiveFilters = useMemo(
    () => Object.values(filters).some((value) => Boolean(value)),
    [filters]
  );

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function buildSearchParams() {
    const query = new URLSearchParams();

    for (const [key, value] of Object.entries(filters)) {
      if (value) {
        query.set(key, value);
      }
    }

    query.set("includeDeleted", "true");
    return query;
  }

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const query = buildSearchParams();

    startTransition(async () => {
      const response = await fetch(`/api/lancamentos?${query.toString()}`, { cache: "no-store" });
      const data = (await response.json()) as { items?: Lancamento[]; message?: string };

      if (!response.ok) {
        setMessage(data.message ?? "Nao foi possivel consultar o historico.");
        return;
      }

      setItems(data.items ?? []);
      setMessage(`${data.items?.length ?? 0} lancamento(s) encontrado(s).`);
    });
  }

  function resetFilters() {
    setFilters(initialFilters);
    setItems([]);
    setMessage("");
  }

  function handleGenerateReport() {
    const query = buildSearchParams();
    const targetUrl = `/api/lancamentos/relatorio?${query.toString()}`;
    window.open(targetUrl, "_blank", "noopener,noreferrer");
  }

  async function loadHistorico(entidadeId: string) {
    const response = await fetch(
      `/api/historico-alteracoes?entidade=lancamento_diario&entidadeId=${entidadeId}`,
      { cache: "no-store" }
    );
    const data = (await response.json()) as { items: HistoricoAlteracao[] };
    setHistorico(data.items);
  }

  function startEdit(item: Lancamento) {
    const cliente = clientes.find((entry) => entry.nome === item.cliente.nome);
    const obra = obras.find((entry) => entry.nome === item.obra?.nome);
    const servico = servicos.find((entry) => entry.tipoServico === item.servico.tipoServico);
    const material = materiais.find((entry) => entry.descricao === item.material?.descricao);
    const equipamento = equipamentos.find(
      (entry) =>
        entry.descricao === item.equipamento.descricao &&
        entry.placaOuTag === item.equipamento.placaOuTag
    );
    const colaborador = colaboradores.find((entry) => entry.nome === item.colaborador.nome);

    setSelected(item);
    setEditForm({
      data: item.data.slice(0, 10),
      fichaNumero: item.ficha.numero,
      fichaObservacao: item.ficha.observacao ?? "",
      clienteId: item.clienteId ?? cliente?.id ?? "",
      obraId: item.obraId ?? obra?.id ?? "",
      servicoId: item.servicoId ?? servico?.id ?? "",
      materialId: item.materialId ?? material?.id ?? "",
      equipamentoId: item.equipamentoId ?? equipamento?.id ?? "",
      colaboradorId: item.colaboradorId ?? colaborador?.id ?? "",
      quantidadeApontada: String(item.quantidadeApontada),
      unidadeApontada: item.unidadeApontada,
      quantidadeFaturada: String(item.quantidadeFaturada),
      unidadeFaturada: item.unidadeFaturada,
      observacao: item.observacao ?? "",
      motivoAlteracao: ""
    });
    void loadHistorico(item.id);
  }

  function closeEdit() {
    setSelected(null);
    setHistorico([]);
    setEditForm({
      data: "",
      fichaNumero: "",
      fichaObservacao: "",
      clienteId: "",
      obraId: "",
      servicoId: "",
      materialId: "",
      equipamentoId: "",
      colaboradorId: "",
      quantidadeApontada: "",
      unidadeApontada: "HORA",
      quantidadeFaturada: "",
      unidadeFaturada: "HORA",
      observacao: "",
      motivoAlteracao: ""
    });
  }

  function updateEditField(key: keyof typeof editForm, value: string) {
    setEditForm((current) => ({ ...current, [key]: value }));
  }

  async function handleUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selected) {
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/lancamentos/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editForm,
          obraId: editForm.obraId || null,
          materialId: editForm.materialId || null
        })
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setMessage(data.message ?? "Nao foi possivel atualizar o lancamento.");
        return;
      }

      setMessage("Lancamento atualizado com historico.");
      await loadHistorico(selected.id);
      await handleRefreshCurrentSearch();
      closeEdit();
    });
  }

  async function handleRefreshCurrentSearch() {
    const query = buildSearchParams();
    const response = await fetch(`/api/lancamentos?${query.toString()}`, { cache: "no-store" });
    const data = (await response.json()) as { items?: Lancamento[] };
    setItems(data.items ?? []);
  }

  async function handleDelete(id: string) {
    startTransition(async () => {
      const response = await fetch(`/api/lancamentos/${id}?mode=delete`, {
        method: "DELETE"
      });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setMessage(data.message ?? "Nao foi possivel excluir o lancamento.");
        return;
      }

      if (selected?.id === id) {
        closeEdit();
      }

      setMessage("Lancamento excluido definitivamente.");
      await handleRefreshCurrentSearch();
    });
  }

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <section style={panelStyle}>
        <h2 style={{ marginTop: 0 }}>Filtros de consulta</h2>
        <form onSubmit={handleSearch} style={{ display: "grid", gap: 24 }}>
          <div style={formGridStyle}>
            <Field label="Periodo inicial">
              <input type="date" value={filters.periodoInicial} onChange={(e) => updateFilter("periodoInicial", e.target.value)} style={fieldStyle} />
            </Field>
            <Field label="Periodo final">
              <input type="date" value={filters.periodoFinal} onChange={(e) => updateFilter("periodoFinal", e.target.value)} style={fieldStyle} />
            </Field>
            <Field label="Numero da ficha">
              <input value={filters.fichaNumero} onChange={(e) => updateFilter("fichaNumero", e.target.value)} style={fieldStyle} placeholder="Buscar por ficha" />
            </Field>
            <Field label="Status">
              <select value={filters.status} onChange={(e) => updateFilter("status", e.target.value)} style={fieldStyle}>
                <option value="">Todos</option>
                <option value="VALIDO">VALIDO</option>
                <option value="PENDENTE_OBRA">PENDENTE_OBRA</option>
                <option value="PENDENTE_PRECO">PENDENTE_PRECO</option>
                <option value="DIVERGENTE">DIVERGENTE</option>
                <option value="MEDIDO">MEDIDO</option>
                <option value="CANCELADO">CANCELADO</option>
              </select>
            </Field>
            <Field label="Cliente">
              <select value={filters.clienteId} onChange={(e) => updateFilter("clienteId", e.target.value)} style={fieldStyle}>
                <option value="">Todos</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {(cliente.codigo ?? "") + " - " + (cliente.nome ?? "")}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Obra">
              <select value={filters.obraId} onChange={(e) => updateFilter("obraId", e.target.value)} style={fieldStyle}>
                <option value="">Todas</option>
                {obrasDisponiveis.map((obra) => (
                  <option key={obra.id} value={obra.id}>
                    {(obra.codigo ?? "") + " - " + (obra.nome ?? "")}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Servico">
              <select value={filters.servicoId} onChange={(e) => updateFilter("servicoId", e.target.value)} style={fieldStyle}>
                <option value="">Todos</option>
                {servicos.map((servico) => (
                  <option key={servico.id} value={servico.id}>
                    {(servico.codigo ?? "") + " - " + (servico.tipoServico ?? "")}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Equipamento">
              <select value={filters.equipamentoId} onChange={(e) => updateFilter("equipamentoId", e.target.value)} style={fieldStyle}>
                <option value="">Todos</option>
                {equipamentos.map((equipamento) => (
                  <option key={equipamento.id} value={equipamento.id}>
                    {[equipamento.descricao ?? "", equipamento.placaOuTag ?? ""]
                      .filter(Boolean)
                      .join(" - ")}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Colaborador">
              <select value={filters.colaboradorId} onChange={(e) => updateFilter("colaboradorId", e.target.value)} style={fieldStyle}>
                <option value="">Todos</option>
                {colaboradores.map((colaborador) => (
                  <option key={colaborador.id} value={colaborador.id}>
                    {(colaborador.codigo ?? "") + " - " + (colaborador.nome ?? "")}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button type="submit" disabled={isPending} style={primaryButtonStyle}>
              {isPending ? "Consultando..." : "Consultar historico"}
            </button>
            <button
              type="button"
              onClick={handleGenerateReport}
              disabled={!hasActiveFilters || isPending}
              style={secondaryButtonStyle}
            >
              Gerar relatorio
            </button>
            <button type="button" onClick={resetFilters} style={secondaryButtonStyle}>
              Limpar filtros
            </button>
          </div>

          {message ? <p style={{ margin: 0, color: "#6e6457" }}>{message}</p> : null}
        </form>
      </section>

      <section style={panelStyle}>
        <h2 style={{ marginTop: 0 }}>Resultado da consulta</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Data</th>
                <th style={thStyle}>Ficha</th>
                <th style={thStyle}>Cliente/Obra</th>
                <th style={thStyle}>Servico</th>
                <th style={thStyle}>Recurso</th>
                <th style={thStyle}>Colaborador</th>
                <th style={thStyle}>Apontado</th>
                <th style={thStyle}>Faturado</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td style={tdStyle}>{item.data.slice(0, 10)}</td>
                  <td style={tdStyle}>{item.ficha.numero}</td>
                  <td style={tdStyle}>
                    <div>{item.cliente.nome}</div>
                    <div style={subtleTextStyle}>{item.obra?.nome ?? "Sem obra"}</div>
                  </td>
                  <td style={tdStyle}>
                    <div>{item.servico.tipoServico}</div>
                    <div style={subtleTextStyle}>{item.material?.descricao ?? "-"}</div>
                  </td>
                  <td style={tdStyle}>
                    <div>{item.equipamento.descricao}</div>
                    <div style={subtleTextStyle}>{item.equipamento.placaOuTag}</div>
                  </td>
                  <td style={tdStyle}>{item.colaborador.nome}</td>
                  <td style={tdStyle}>
                    {formatQuantidadeComUnidade(item.quantidadeApontada, item.unidadeApontada)}
                  </td>
                  <td style={tdStyle}>
                    {formatQuantidadeComUnidade(item.quantidadeFaturada, item.unidadeFaturada)}
                  </td>
                  <td style={tdStyle}>
                    <span style={{ ...badgeStyle, ...statusStyles[item.statusValidacao] }}>
                      {item.statusValidacao}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        disabled={item.statusValidacao === "MEDIDO" || item.statusValidacao === "CANCELADO"}
                        style={secondaryButtonStyle}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        style={dangerButtonStyle}
                      >
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

      {selected ? (
        <section style={panelStyle}>
          <h2 style={{ marginTop: 0 }}>Editar lancamento</h2>
          <form onSubmit={handleUpdate} style={{ display: "grid", gap: 24 }}>
            <div style={formGridStyle}>
              <Field label="Data">
                <input type="date" value={editForm.data} onChange={(e) => updateEditField("data", e.target.value)} style={fieldStyle} />
              </Field>
              <Field label="Ficha">
                <input value={editForm.fichaNumero} onChange={(e) => updateEditField("fichaNumero", e.target.value)} style={fieldStyle} />
              </Field>
              <Field label="Cliente">
                <select value={editForm.clienteId} onChange={(e) => updateEditField("clienteId", e.target.value)} style={fieldStyle}>
                  <option value="">Selecione</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {(cliente.codigo ?? "") + " - " + (cliente.nome ?? "")}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Obra">
                <select value={editForm.obraId} onChange={(e) => updateEditField("obraId", e.target.value)} style={fieldStyle}>
                  <option value="">Sem obra</option>
                  {obras
                    .filter((obra) => !editForm.clienteId || obra.clienteId === editForm.clienteId)
                    .map((obra) => (
                      <option key={obra.id} value={obra.id}>
                        {(obra.codigo ?? "") + " - " + (obra.nome ?? "")}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Servico">
                <select value={editForm.servicoId} onChange={(e) => updateEditField("servicoId", e.target.value)} style={fieldStyle}>
                  <option value="">Selecione</option>
                  {servicos.map((servico) => (
                    <option key={servico.id} value={servico.id}>
                      {(servico.codigo ?? "") + " - " + (servico.tipoServico ?? "")}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Material">
                <select value={editForm.materialId} onChange={(e) => updateEditField("materialId", e.target.value)} style={fieldStyle}>
                  <option value="">Nao aplicavel</option>
                  {materiais.map((material) => (
                    <option key={material.id} value={material.id}>
                      {((material.codigoMaterial as string | undefined) ?? "") + " - " + ((material.descricao as string | undefined) ?? "")}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Equipamento">
                <select value={editForm.equipamentoId} onChange={(e) => updateEditField("equipamentoId", e.target.value)} style={fieldStyle}>
                  <option value="">Selecione</option>
                  {equipamentos.map((equipamento) => (
                    <option key={equipamento.id} value={equipamento.id}>
                      {[equipamento.descricao ?? "", equipamento.placaOuTag ?? ""]
                        .filter(Boolean)
                        .join(" - ")}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Colaborador">
                <select value={editForm.colaboradorId} onChange={(e) => updateEditField("colaboradorId", e.target.value)} style={fieldStyle}>
                  <option value="">Selecione</option>
                  {colaboradores.map((colaborador) => (
                    <option key={colaborador.id} value={colaborador.id}>
                      {(colaborador.codigo ?? "") + " - " + (colaborador.nome ?? "")}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Quantidade apontada">
                <input value={editForm.quantidadeApontada} onChange={(e) => updateEditField("quantidadeApontada", e.target.value)} style={fieldStyle} />
              </Field>
              <Field label="Unidade apontada">
                <select value={editForm.unidadeApontada} onChange={(e) => updateEditField("unidadeApontada", e.target.value)} style={fieldStyle}>
                  <option value="CARGA">CARGA</option>
                  <option value="HORA">HORA</option>
                  <option value="M3">M3</option>
                </select>
              </Field>
              <Field label="Quantidade faturada">
                <input value={editForm.quantidadeFaturada} onChange={(e) => updateEditField("quantidadeFaturada", e.target.value)} style={fieldStyle} />
              </Field>
              <Field label="Unidade faturada">
                <select value={editForm.unidadeFaturada} onChange={(e) => updateEditField("unidadeFaturada", e.target.value)} style={fieldStyle}>
                  <option value="CARGA">CARGA</option>
                  <option value="HORA">HORA</option>
                  <option value="M3">M3</option>
                  <option value="DIARIA">DIARIA</option>
                </select>
              </Field>
            </div>

            <Field label="Observacao">
              <textarea value={editForm.observacao} onChange={(e) => updateEditField("observacao", e.target.value)} style={{ ...fieldStyle, minHeight: 72, resize: "vertical" as const }} />
            </Field>
            <Field label="Observacao da ficha">
              <textarea value={editForm.fichaObservacao} onChange={(e) => updateEditField("fichaObservacao", e.target.value)} style={{ ...fieldStyle, minHeight: 72, resize: "vertical" as const }} />
            </Field>
            <Field label="Motivo da alteracao">
              <textarea value={editForm.motivoAlteracao} onChange={(e) => updateEditField("motivoAlteracao", e.target.value)} style={{ ...fieldStyle, minHeight: 72, resize: "vertical" as const }} placeholder="Descreva o motivo da correcao" />
            </Field>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button type="submit" disabled={isPending} style={primaryButtonStyle}>
                {isPending ? "Salvando..." : "Salvar alteracao"}
              </button>
              <button type="button" onClick={closeEdit} style={secondaryButtonStyle}>
                Fechar
              </button>
            </div>
          </form>

          <div style={{ marginTop: 24 }}>
            <h3>Historico de alteracoes</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Quando</th>
                    <th style={thStyle}>Campo</th>
                    <th style={thStyle}>Antes</th>
                    <th style={thStyle}>Depois</th>
                    <th style={thStyle}>Motivo</th>
                    <th style={thStyle}>Usuario</th>
                  </tr>
                </thead>
                <tbody>
                  {historico.map((item) => (
                    <tr key={item.id}>
                      <td style={tdStyle}>{item.createdAt.slice(0, 19).replace("T", " ")}</td>
                      <td style={tdStyle}>{item.campo}</td>
                      <td style={tdStyle}>{item.valorAnterior ?? "-"}</td>
                      <td style={tdStyle}>{item.valorNovo ?? "-"}</td>
                      <td style={tdStyle}>{item.motivo ?? "-"}</td>
                      <td style={tdStyle}>{item.usuario.nome ?? item.usuario.email ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <span style={{ fontSize: 14, color: "#6e6457" }}>{label}</span>
      {children}
    </label>
  );
}

const statusStyles: Record<Lancamento["statusValidacao"], { background: string; color: string }> = {
  VALIDO: { background: "#dcefe9", color: "#125b50" },
  PENDENTE_OBRA: { background: "#fff1cf", color: "#a36e00" },
  PENDENTE_PRECO: { background: "#f8ddd6", color: "#bc4b2f" },
  DIVERGENTE: { background: "#f8ddd6", color: "#bc4b2f" },
  MEDIDO: { background: "#d9e9f8", color: "#2f6db3" },
  CANCELADO: { background: "#ece5d9", color: "#6e6457" }
};

const panelStyle = {
  padding: 20,
  borderRadius: 20,
  background: "#fffdf8",
  border: "1px solid #d7cfbf"
};

const formGridStyle = {
  display: "grid",
  gap: 14,
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))"
};

const fieldStyle = {
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #d7cfbf",
  background: "#fffdf8",
  width: "100%"
};

const primaryButtonStyle = {
  padding: "12px 18px",
  borderRadius: 12,
  border: "none",
  background: "#125b50",
  color: "#fff"
};

const secondaryButtonStyle = {
  padding: "12px 18px",
  borderRadius: 12,
  border: "1px solid #d7cfbf",
  background: "#fffdf8"
};

const dangerButtonStyle = {
  padding: "12px 18px",
  borderRadius: 12,
  border: "1px solid #e2b6aa",
  background: "#fff0eb",
  color: "#bc4b2f"
};

const thStyle = {
  textAlign: "left" as const,
  padding: 12,
  borderBottom: "1px solid #d7cfbf",
  whiteSpace: "nowrap" as const
};

const tdStyle = {
  padding: 12,
  borderBottom: "1px solid #ece5d9",
  verticalAlign: "top" as const
};

const subtleTextStyle = {
  color: "#6e6457",
  fontSize: 13
};

const badgeStyle = {
  display: "inline-block",
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700
};
