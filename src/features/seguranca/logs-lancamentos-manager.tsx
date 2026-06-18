"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { SearchableSelect, type SearchableSelectOption } from "@/components/form/searchable-select";

type LogLancamentoUser = {
  id: string;
  nome: string;
  email: string;
};

type LogLancamentoItem = {
  id: string;
  entidadeId: string;
  campo: string;
  valorAnterior: string | null;
  valorNovo: string | null;
  motivo: string | null;
  tipoAlteracao: string;
  createdAt: string;
  usuario: {
    id: string;
    nome: string | null;
    email: string | null;
  } | null;
  lancamento: {
    id: string;
    data: string;
    fichaNumero: string;
    clienteNome: string;
    obraCodigo: string | null;
    obraNome: string | null;
    servicoNome: string;
    equipamentoTag: string;
    equipamentoDescricao: string;
    colaboradorNome: string;
  } | null;
};

type Filters = {
  search: string;
  usuarioId: string;
  dataInicial: string;
  dataFinal: string;
};

const initialFilters: Filters = {
  search: "",
  usuarioId: "",
  dataInicial: "",
  dataFinal: ""
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}

function formatFieldLabel(value: string) {
  const labels: Record<string, string> = {
    data: "Data",
    fichaNumero: "Ficha",
    clienteId: "Cliente",
    obraId: "Obra",
    servicoId: "Servico",
    materialId: "Material",
    equipamentoId: "Equipamento",
    colaboradorId: "Colaborador",
    quantidadeApontada: "Apontado",
    unidadeApontada: "Unidade apontada",
    quantidadeFaturada: "Faturado",
    unidadeFaturada: "Unidade faturada",
    horimetroInformado: "Horimetro",
    kmInformado: "KM",
    observacao: "Observacao",
    statusValidacao: "Status"
  };

  return labels[value] ?? value;
}

function formatValue(value: string | null) {
  if (value === null || value === "") {
    return "-";
  }

  return value;
}

export function LogsLancamentosManager() {
  const [items, setItems] = useState<LogLancamentoItem[]>([]);
  const [users, setUsers] = useState<LogLancamentoUser[]>([]);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(initialFilters);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const userOptions = useMemo<SearchableSelectOption[]>(
    () =>
      users.map((user) => ({
        value: user.id,
        label: user.nome ? `${user.nome} (${user.email})` : user.email
      })),
    [users]
  );

  const summary = useMemo(() => {
    const lancamentosUnicos = new Set(items.map((item) => item.entidadeId)).size;
    const usuariosUnicos = new Set(items.map((item) => item.usuario?.id).filter(Boolean)).size;

    return {
      totalRegistros: items.length,
      totalLancamentos: lancamentosUnicos,
      totalUsuarios: usuariosUnicos
    };
  }, [items]);

  function buildQuery(current: Filters) {
    const query = new URLSearchParams();

    if (current.search.trim()) {
      query.set("search", current.search.trim());
    }

    if (current.usuarioId) {
      query.set("usuarioId", current.usuarioId);
    }

    if (current.dataInicial) {
      query.set("dataInicial", current.dataInicial);
    }

    if (current.dataFinal) {
      query.set("dataFinal", current.dataFinal);
    }

    query.set("limit", "300");
    return query.toString();
  }

  async function loadLogs(current = appliedFilters) {
    const response = await fetch(`/api/seguranca/logs-lancamentos?${buildQuery(current)}`, {
      cache: "no-store"
    });
    const data = (await response.json()) as {
      items?: LogLancamentoItem[];
      users?: LogLancamentoUser[];
      message?: string;
    };

    if (!response.ok) {
      setItems([]);
      setMessage(data.message ?? "Nao foi possivel carregar os logs de edicao.");
      return;
    }

    setItems(data.items ?? []);
    setUsers(data.users ?? []);
    setMessage(`${data.items?.length ?? 0} registro(s) de auditoria encontrado(s).`);
  }

  useEffect(() => {
    void loadLogs(initialFilters);
  }, []);

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((current) => ({
      ...current,
      [key]: value
    }));
  }

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppliedFilters(filters);

    startTransition(async () => {
      await loadLogs(filters);
    });
  }

  function handleReset() {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);

    startTransition(async () => {
      await loadLogs(initialFilters);
    });
  }

  return (
    <main className="page-stack">
      <section className="page-header">
        <div>
          <h1 className="page-title">Logs de edicao de lancamentos</h1>
          <p className="page-copy">
            Consulta dedicada de auditoria para saber quando um lancamento foi alterado, por quem e o que mudou.
          </p>
        </div>
      </section>

      <section className="surface section-card">
        <div className="section-header">
          <div>
            <h2 className="section-title">Filtros de auditoria</h2>
            <p className="section-copy">
              Consulte por usuario, periodo ou qualquer termo relacionado a ficha, obra, equipamento ou motivo da alteracao.
            </p>
          </div>
        </div>

        <form onSubmit={handleSearch} style={{ display: "grid", gap: 18 }}>
          <div className="form-grid-4">
            <label className="field">
              <span className="field-label">Busca geral</span>
              <input
                className="field-control"
                placeholder="Ficha, cliente, obra, equipamento, motivo ou valor alterado"
                value={filters.search}
                onChange={(event) => updateFilter("search", event.target.value)}
              />
            </label>

            <label className="field">
              <span className="field-label">Usuario</span>
              <SearchableSelect
                value={filters.usuarioId}
                options={userOptions}
                placeholder="Digite para buscar o usuario"
                emptyLabel="Nenhum usuario com log encontrado."
                onChange={(value) => updateFilter("usuarioId", value)}
              />
            </label>

            <label className="field">
              <span className="field-label">Data inicial</span>
              <input
                className="field-control"
                type="date"
                value={filters.dataInicial}
                onChange={(event) => updateFilter("dataInicial", event.target.value)}
              />
            </label>

            <label className="field">
              <span className="field-label">Data final</span>
              <input
                className="field-control"
                type="date"
                value={filters.dataFinal}
                onChange={(event) => updateFilter("dataFinal", event.target.value)}
              />
            </label>
          </div>

          <div className="toolbar-actions">
            <button type="submit" className="button-primary" disabled={isPending}>
              {isPending ? "Consultando..." : "Consultar logs"}
            </button>
            <button type="button" className="button-ghost" onClick={handleReset} disabled={isPending}>
              Limpar filtros
            </button>
          </div>
        </form>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <p className="stat-card-label">Registros</p>
          <p className="stat-card-value">{summary.totalRegistros}</p>
          <p className="stat-card-copy">Linhas de alteracao retornadas pelo filtro aplicado.</p>
        </article>
        <article className="stat-card">
          <p className="stat-card-label">Lancamentos afetados</p>
          <p className="stat-card-value">{summary.totalLancamentos}</p>
          <p className="stat-card-copy">Quantidade de lancamentos distintos com edicao registrada.</p>
        </article>
        <article className="stat-card">
          <p className="stat-card-label">Usuarios</p>
          <p className="stat-card-value">{summary.totalUsuarios}</p>
          <p className="stat-card-copy">Usuarios diferentes encontrados nos logs consultados.</p>
        </article>
      </section>

      <section className="surface section-card">
        <div className="section-header">
          <div>
            <h2 className="section-title">Consulta de logs</h2>
            <p className="section-copy">
              {appliedFilters.search || appliedFilters.usuarioId || appliedFilters.dataInicial || appliedFilters.dataFinal
                ? "Resultado considerando os filtros aplicados na consulta."
                : "Ultimos registros de edicao encontrados na trilha de auditoria de lancamentos."}
            </p>
          </div>
        </div>

        {message ? <p className="message-inline">{message}</p> : null}

        {items.length === 0 ? (
          <div className="empty-state">
            <strong>Nenhum log encontrado</strong>
            <p>As alteracoes de lancamentos aparecerao aqui conforme os filtros selecionados.</p>
          </div>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data e hora</th>
                  <th>Usuario</th>
                  <th>Lancamento</th>
                  <th>Campo</th>
                  <th>Alteracao</th>
                  <th>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div>{formatDateTime(item.createdAt)}</div>
                      <div className="subtle">
                        {item.lancamento ? `Competencia ${formatDate(item.lancamento.data)}` : "Lancamento nao localizado"}
                      </div>
                    </td>
                    <td>
                      <div>{item.usuario?.nome ?? "Usuario removido"}</div>
                      <div className="subtle">{item.usuario?.email ?? "-"}</div>
                    </td>
                    <td>
                      {item.lancamento ? (
                        <>
                          <div>
                            Ficha <strong>{item.lancamento.fichaNumero}</strong> | {item.lancamento.equipamentoTag}
                          </div>
                          <div className="subtle">
                            {item.lancamento.clienteNome}
                            {item.lancamento.obraNome
                              ? ` | ${item.lancamento.obraCodigo ? `${item.lancamento.obraCodigo} - ` : ""}${item.lancamento.obraNome}`
                              : ""}
                          </div>
                          <div className="subtle">
                            {item.lancamento.servicoNome} | {item.lancamento.colaboradorNome}
                          </div>
                        </>
                      ) : (
                        <span className="subtle">Contexto do lancamento indisponivel.</span>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-info">{formatFieldLabel(item.campo)}</span>
                    </td>
                    <td>
                      <div style={{ display: "grid", gap: 6, minWidth: 220 }}>
                        <div>
                          <strong>Antes:</strong> {formatValue(item.valorAnterior)}
                        </div>
                        <div>
                          <strong>Depois:</strong> {formatValue(item.valorNovo)}
                        </div>
                      </div>
                    </td>
                    <td style={{ minWidth: 220 }}>
                      {item.motivo?.trim() ? item.motivo : <span className="subtle">Sem motivo informado.</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
