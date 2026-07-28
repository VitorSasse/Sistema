"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { SearchableSelect } from "@/components/form/searchable-select";
import { loadOperationalOptions } from "@/lib/client/operational-options";
import { isRecursoTecnicoPadrao } from "@/lib/constants/recurso-tecnico";
import { confirmDeleteAction } from "@/lib/utils/confirm-delete";
import { romaneiosToTextarea } from "@/lib/utils/romaneios";
import { formatQuantidadeComUnidade } from "@/lib/utils/unidades";

type Option = {
  id: string;
  codigo?: string;
  codigoMaterial?: string;
  nome?: string;
  tipoServico?: string;
  descricao?: string;
  status: string;
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
  unidadeApontada: "CARGA" | "HORA" | "M3" | "DIARIA" | "SERVICO";
  quantidadeFaturada: string;
  unidadeFaturada: "CARGA" | "HORA" | "M3" | "DIARIA" | "SERVICO";
  statusValidacao: "VALIDO" | "NAO_MEDIDO" | "PENDENTE_OBRA" | "PENDENTE_PRECO" | "DIVERGENTE" | "MEDIDO" | "CANCELADO";
  observacao: string | null;
  romaneios: Array<{ numero: string }>;
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

function optionLabel(option: Option) {
  return [
    option.codigo,
    option.codigoMaterial,
    option.nome,
    option.tipoServico,
    option.descricao,
    option.placaOuTag
  ]
    .filter(Boolean)
    .join(" - ");
}

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
    romaneios: "",
    clienteId: "",
    obraId: "",
    servicoId: "",
    materialId: "",
    equipamentoId: "",
    colaboradorId: "",
    quantidadeApontada: "",
    unidadeApontada: "DIARIA",
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

  const obrasEditaveis = useMemo(
    () => obras.filter((obra) => !editForm.clienteId || obra.clienteId === editForm.clienteId),
    [obras, editForm.clienteId]
  );

  const hasActiveFilters = useMemo(
    () => Object.values(filters).some((value) => Boolean(value)),
    [filters]
  );

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((current) => ({
      ...current,
      [key]: value,
      ...(key === "clienteId" ? { obraId: "" } : {})
    }));
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

  function handleGenerateRomaneiosReport() {
    const query = buildSearchParams();
    query.set("modo", "romaneios");
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
      romaneios: romaneiosToTextarea(item.romaneios),
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
      romaneios: "",
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
    setEditForm((current) => ({
      ...current,
      [key]: value,
      ...(key === "clienteId" ? { obraId: "" } : {})
    }));
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
    if (!confirmDeleteAction("este lancamento")) {
      return;
    }

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
    <main className="page-stack">
      <section className="page-header">
        <div>
          <h1 className="page-title">Historico</h1>
          <p className="page-copy">
            Consulta, auditoria e correcao de lancamentos com rastreabilidade completa.
          </p>
        </div>
      </section>

      <section className="surface section-card manager-panel">
        <h2 style={{ marginTop: 0 }}>Filtros de consulta</h2>
        <form onSubmit={handleSearch} style={{ display: "grid", gap: 24 }}>
          <div className="manager-form-grid">
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
                <option value="NAO_MEDIDO">NAO_MEDIDO</option>
                <option value="PENDENTE_OBRA">PENDENTE_OBRA</option>
                <option value="PENDENTE_PRECO">PENDENTE_PRECO</option>
                <option value="DIVERGENTE">DIVERGENTE</option>
                <option value="MEDIDO">MEDIDO</option>
                <option value="CANCELADO">CANCELADO</option>
              </select>
            </Field>
            <Field label="Cliente">
              <SearchableSelect
                value={filters.clienteId}
                onChange={(value) => updateFilter("clienteId", value)}
                options={clientes.map((cliente) => ({
                  value: cliente.id,
                  label: optionLabel(cliente)
                }))}
                placeholder="Digite a primeira letra do cliente"
                emptyLabel="Nenhum cliente encontrado."
              />
            </Field>
            <Field label="Obra">
              <SearchableSelect
                value={filters.obraId}
                onChange={(value) => updateFilter("obraId", value)}
                options={obrasDisponiveis.map((obra) => ({
                  value: obra.id,
                  label: optionLabel(obra)
                }))}
                placeholder="Digite a primeira letra da obra"
                emptyLabel="Nenhuma obra encontrada."
                disabled={!filters.clienteId}
              />
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

          <div className="manager-actions">
            <button type="submit" disabled={isPending} className="button-primary">
              {isPending ? "Consultando..." : "Consultar historico"}
            </button>
            <button
              type="button"
              onClick={handleGenerateReport}
              disabled={!hasActiveFilters || isPending}
              className="button-secondary"
            >
              Gerar relatorio
            </button>
            <button
              type="button"
              onClick={handleGenerateRomaneiosReport}
              disabled={!hasActiveFilters || isPending}
              className="button-secondary"
            >
              Relatorio de romaneios
            </button>
            <button type="button" onClick={resetFilters} className="button-secondary">
              Limpar filtros
            </button>
          </div>

          {message ? <p className="manager-panel-note">{message}</p> : null}
        </form>
      </section>

      <section className="surface section-card manager-panel">
        <h2 style={{ marginTop: 0 }}>Resultado da consulta</h2>
        <div className="manager-table-wrap">
          <table className="manager-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Ficha</th>
                <th>Cliente/Obra</th>
                <th>Servico</th>
                <th>Recurso</th>
                <th>Colaborador</th>
                <th>Apontado</th>
                <th>Faturado</th>
                <th>Status</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.data.slice(0, 10)}</td>
                  <td>{item.ficha.numero}</td>
                  <td>
                    <div>{item.cliente.nome}</div>
                    <div className="manager-subtle">{item.obra?.nome ?? "Sem obra"}</div>
                  </td>
                  <td>
                    <div>{item.servico.tipoServico}</div>
                    <div className="manager-subtle">{item.material?.descricao ?? "-"}</div>
                  </td>
                  <td>
                    {isRecursoTecnicoPadrao(item.equipamento.placaOuTag) ? (
                      <>
                        <div>Sem recurso tecnico especifico</div>
                        <div className="manager-subtle">Apoio generico</div>
                      </>
                    ) : (
                      <>
                        <div>{item.equipamento.descricao}</div>
                        <div className="manager-subtle">{item.equipamento.placaOuTag}</div>
                      </>
                    )}
                  </td>
                  <td>{item.colaborador.nome}</td>
                  <td>
                    {formatQuantidadeComUnidade(item.quantidadeApontada, item.unidadeApontada)}
                  </td>
                  <td>
                    {formatQuantidadeComUnidade(item.quantidadeFaturada, item.unidadeFaturada)}
                  </td>
                  <td>
                    <span style={statusStyles[item.statusValidacao]} className="manager-badge">
                      {item.statusValidacao}
                    </span>
                  </td>
                  <td>
                    <div className="manager-inline-actions">
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        disabled={item.statusValidacao === "MEDIDO" || item.statusValidacao === "CANCELADO"}
                        className="button-secondary"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="button-secondary manager-button-danger"
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
        <section className="surface section-card manager-panel">
          <h2 style={{ marginTop: 0 }}>Editar lancamento</h2>
          <form onSubmit={handleUpdate} style={{ display: "grid", gap: 24 }}>
            <div className="manager-form-grid">
              <Field label="Data">
                <input type="date" value={editForm.data} onChange={(e) => updateEditField("data", e.target.value)} style={fieldStyle} />
              </Field>
              <Field label="Ficha">
                <input value={editForm.fichaNumero} onChange={(e) => updateEditField("fichaNumero", e.target.value)} style={fieldStyle} />
              </Field>
              <Field label="Cliente">
                <SearchableSelect
                  value={editForm.clienteId}
                  onChange={(value) => updateEditField("clienteId", value)}
                  options={clientes.map((cliente) => ({
                    value: cliente.id,
                    label: optionLabel(cliente)
                  }))}
                  placeholder="Digite a primeira letra do cliente"
                  emptyLabel="Nenhum cliente encontrado."
                />
              </Field>
              <Field label="Obra">
                <SearchableSelect
                  value={editForm.obraId}
                  onChange={(value) => updateEditField("obraId", value)}
                  options={obrasEditaveis.map((obra) => ({
                    value: obra.id,
                    label: optionLabel(obra)
                  }))}
                  placeholder="Digite a primeira letra da obra"
                  emptyLabel="Nenhuma obra encontrada."
                  disabled={!editForm.clienteId}
                />
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
                  <option value="DIARIA">DIARIA</option>
                  <option value="SERVICO">SERVICO</option>
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
                  <option value="SERVICO">SERVICO</option>
                </select>
              </Field>
            </div>

            <Field label="Observacao">
              <textarea value={editForm.observacao} onChange={(e) => updateEditField("observacao", e.target.value)} style={{ ...fieldStyle, minHeight: 72, resize: "vertical" as const }} />
            </Field>
            <Field label="Observacao da ficha">
              <textarea value={editForm.fichaObservacao} onChange={(e) => updateEditField("fichaObservacao", e.target.value)} style={{ ...fieldStyle, minHeight: 72, resize: "vertical" as const }} />
            </Field>
            <Field label="Romaneios da ficha">
              <textarea value={editForm.romaneios} onChange={(e) => updateEditField("romaneios", e.target.value)} style={{ ...fieldStyle, minHeight: 72, resize: "vertical" as const }} placeholder="Informe um romaneio por linha" />
            </Field>
            <Field label="Motivo da alteracao">
              <textarea value={editForm.motivoAlteracao} onChange={(e) => updateEditField("motivoAlteracao", e.target.value)} style={{ ...fieldStyle, minHeight: 72, resize: "vertical" as const }} placeholder="Descreva o motivo da correcao" />
            </Field>

            <div className="manager-actions">
              <button type="submit" disabled={isPending} className="button-primary">
                {isPending ? "Salvando..." : "Salvar alteracao"}
              </button>
              <button type="button" onClick={closeEdit} className="button-secondary">
                Fechar
              </button>
            </div>
          </form>

          <div style={{ marginTop: 24 }}>
            <h3>Historico de alteracoes</h3>
            <div className="manager-table-wrap">
              <table className="manager-table">
                <thead>
                  <tr>
                    <th>Quando</th>
                    <th>Campo</th>
                    <th>Antes</th>
                    <th>Depois</th>
                    <th>Motivo</th>
                    <th>Usuario</th>
                  </tr>
                </thead>
                <tbody>
                  {historico.map((item) => (
                    <tr key={item.id}>
                      <td>{item.createdAt.slice(0, 19).replace("T", " ")}</td>
                      <td>{item.campo}</td>
                      <td>{item.valorAnterior ?? "-"}</td>
                      <td>{item.valorNovo ?? "-"}</td>
                      <td>{item.motivo ?? "-"}</td>
                      <td>{item.usuario.nome ?? item.usuario.email ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="manager-field">
      <span className="manager-field-label">{label}</span>
      {children}
    </label>
  );
}

const statusStyles: Record<Lancamento["statusValidacao"], { background: string; color: string }> = {
  VALIDO: { background: "var(--status-success-bg)", color: "var(--status-success-fg)" },
  NAO_MEDIDO: { background: "var(--status-success-bg)", color: "var(--status-success-fg)" },
  PENDENTE_OBRA: { background: "var(--status-warning-bg)", color: "var(--status-warning-fg)" },
  PENDENTE_PRECO: { background: "var(--status-danger-bg)", color: "var(--status-danger-fg)" },
  DIVERGENTE: { background: "var(--status-danger-bg)", color: "var(--status-danger-fg)" },
  MEDIDO: {
    background: "color-mix(in srgb, var(--info) 28%, transparent)",
    color: "var(--text-on-accent)"
  },
  CANCELADO: { background: "color-mix(in srgb, var(--screen-surface-strong) 70%, var(--screen-border))", color: "var(--muted)" }
};
const fieldStyle = {
  padding: "13px 14px",
  borderRadius: 14,
  border: "1px solid var(--line-strong)",
  background: "var(--surface-strong)",
  color: "var(--text)",
  width: "100%"
};
