"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { loadOperationalOptions } from "@/lib/client/operational-options";

type ClienteOption = {
  id: string;
  codigo?: string | null;
  nome: string;
};

type ObraOption = {
  id: string;
  codigo?: string | null;
  nome: string;
  clienteId: string;
};

type EquipamentoOption = {
  id: string;
  descricao: string;
  placaOuTag: string;
  classeOperacional?: string | null;
  capacidadeM3?: string | number | null;
  unidadeCapacidade?: string | null;
  unidadeEconomicaPadrao?: string | null;
  custoPadrao?: string | number | null;
};

type RecursoBoletim = {
  id: string;
  origem: string;
  origemRegistroTipo?: string | null;
  origemRegistroId?: string | null;
  editavel?: boolean;
  nomeSnapshot: string;
  quantidadeRealizada: string | number;
  unidadeRealizada: string;
  snapshotTecnicoEconomico?: Record<string, unknown> | null;
  observacao?: string | null;
};

type Boletim = {
  id: string;
  dataBoletim: string;
  status: "ABERTO" | "FECHADO";
  observacoes?: string | null;
  recursos: RecursoBoletim[];
};

type FrenteExecucao = {
  id: string;
  nome: string;
  unidade: string;
  quantidadeExecutada: string | number;
  receitaRealizada: string | number;
};

type Execucao = {
  id: string;
  descricao: string;
  status: string;
  cliente?: { id?: string; nome?: string | null; nomeFantasia?: string | null; codigo?: string | null } | null;
  obra?: { id?: string; nome?: string | null; codigo?: string | null } | null;
  frentes: FrenteExecucao[];
  boletins?: Boletim[];
  resultados?: Array<{
    id: string;
    resultadoOperacionalJson?: Record<string, unknown> | null;
    economiaJson?: Record<string, unknown> | null;
  }>;
};

type FatoOperacional = {
  id: string;
  origemTipo: string;
  origemLabel: string;
  data: string;
  cliente: string;
  obra: string;
  recursoId: string | null;
  recurso: string;
  identificadorRecurso: string;
  servico: string;
  quantidade: number;
  unidade: string;
  origemFato: string;
  statusVinculo: "DISPONIVEL" | "VINCULADO";
  custoDisponivel: boolean;
};

type ComparativoValor = {
  previsto: number | null;
  realizado: number | null;
  desvioAbsoluto: number | null;
  desvioPercentual: number | null;
};

type Comparativo = {
  referenciaDisponivel: boolean;
  motivo?: string;
  frentes: Array<{
    frenteId: string;
    nome: string;
    unidade: string | null;
    quantidade: ComparativoValor;
    receita: ComparativoValor;
    custo: ComparativoValor;
    resultado: ComparativoValor;
    margem: ComparativoValor;
    recursos: Array<{
      status: "CORRESPONDENTE" | "SOMENTE_PREVISTO" | "SOMENTE_REALIZADO";
      recurso: string;
      unidade: string | null;
      quantidade: ComparativoValor;
      custo: ComparativoValor;
      origem: { previsto: string | null; realizado: string | null };
    }>;
  }>;
};

const unidades = ["m3", "m2", "h", "dia", "diaria", "carga", "viagem", "km", "mes", "un"];
const basesEconomicas = ["CARGA", "VIAGEM", "HORA", "DIA", "KM", "M3", "M2", "MES", "UNIDADE", "CUSTO_FIXO"];

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function number(value: number | string | null | undefined, suffix = "") {
  if (value === null || value === undefined || value === "") return "-";
  return `${toNumber(value).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}${suffix}`;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.message ?? "Nao foi possivel concluir a operacao.");
  }

  return data;
}

function initialExecucaoForm() {
  return {
    clienteId: "",
    obraId: "",
    descricao: "",
    frenteNome: "Aterro Compactado",
    unidade: "m3",
    quantidade: "",
    receita: ""
  };
}

function initialBoletimForm() {
  return {
    dataBoletim: todayInput(),
    observacoes: ""
  };
}

function initialRecursoForm(frenteId = "") {
  return {
    frenteExecutadaId: frenteId,
    equipamentoId: "",
    nomeSnapshot: "",
    quantidadeRealizada: "",
    unidadeRealizada: "carga",
    quantidadeRecursos: "1",
    baseEconomica: "CARGA",
    valorCusto: "",
    unidadeCusto: "R$/carga",
    observacao: ""
  };
}

function initialFatosFilter() {
  return {
    dataInicio: todayInput(),
    dataFim: todayInput(),
    obraId: "",
    recursoId: "",
    servicoId: ""
  };
}

function clienteLabel(cliente: ClienteOption) {
  return cliente.codigo ? `${cliente.codigo} - ${cliente.nome}` : cliente.nome;
}

function normalizeClienteOption(item: { id: string; codigo?: string | null; nome?: string | null; nomeFantasia?: string | null }) {
  return {
    id: item.id,
    codigo: item.codigo ?? null,
    nome: item.nomeFantasia || item.nome || item.codigo || "Cliente sem nome"
  };
}

function extractRealizado(selected: Execucao | null) {
  const latest = selected?.resultados?.[0];
  const operacional = latest?.resultadoOperacionalJson?.resultadoOperacional as Record<string, unknown> | undefined;
  const economiaJson = latest?.economiaJson as Record<string, unknown> | undefined;
  const consolidado = operacional?.consolidado as Record<string, unknown> | undefined;
  const economia = economiaJson?.economia as Record<string, unknown> | undefined;
  const unidadesResultado = operacional?.unidades as Array<Record<string, unknown>> | undefined;
  const recursos = (unidadesResultado ?? []).flatMap((unidade) => (unidade.recursos as Array<Record<string, unknown>> | undefined) ?? []);

  return {
    custo: toNumber(consolidado?.custoOperacionalTotal),
    quantidade: toNumber(consolidado?.quantidadeTotal),
    receita: toNumber(economia?.receita),
    resultado: toNumber(economia?.resultado),
    margem: typeof economia?.margemPercentual === "number" ? economia.margemPercentual : null,
    recursos
  };
}

export function ExecucoesManager() {
  const [execucoes, setExecucoes] = useState<Execucao[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedBoletimId, setSelectedBoletimId] = useState("");
  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [obras, setObras] = useState<ObraOption[]>([]);
  const [equipamentos, setEquipamentos] = useState<EquipamentoOption[]>([]);
  const [comparativo, setComparativo] = useState<Comparativo | null>(null);
  const [fatos, setFatos] = useState<FatoOperacional[]>([]);
  const [selectedFatos, setSelectedFatos] = useState<string[]>([]);
  const [fatosFilter, setFatosFilter] = useState(initialFatosFilter);
  const [execucaoForm, setExecucaoForm] = useState(initialExecucaoForm);
  const [boletimForm, setBoletimForm] = useState(initialBoletimForm);
  const [recursoForm, setRecursoForm] = useState(initialRecursoForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [optionsError, setOptionsError] = useState("");
  const [loading, setLoading] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(false);

  const selected = useMemo(
    () => execucoes.find((execucao) => execucao.id === selectedId) ?? execucoes[0] ?? null,
    [execucoes, selectedId]
  );
  const boletins = selected?.boletins ?? [];
  const selectedBoletim = boletins.find((boletim) => boletim.id === selectedBoletimId) ?? boletins[0] ?? null;
  const obrasFiltradas = execucaoForm.clienteId
    ? obras.filter((obra) => obra.clienteId === execucaoForm.clienteId)
    : obras;

  const totais = useMemo(() => {
    const frentes = selected?.frentes ?? [];
    return {
      receita: frentes.reduce((total, frente) => total + toNumber(frente.receitaRealizada), 0),
      quantidade: frentes.reduce((total, frente) => total + toNumber(frente.quantidadeExecutada), 0)
    };
  }, [selected]);
  const realizado = useMemo(() => extractRealizado(selected), [selected]);

  async function loadExecucoes(preferSelectedId = selected?.id) {
    const execucoesData = await fetchJson<{ items: Execucao[] }>("/api/execucoes");
    setExecucoes(execucoesData.items);

    const nextSelectedId = preferSelectedId && execucoesData.items.some((item) => item.id === preferSelectedId)
      ? preferSelectedId
      : execucoesData.items[0]?.id ?? "";
    setSelectedId(nextSelectedId);

    if (nextSelectedId) {
      await loadComparativo(nextSelectedId);
    }
  }

  async function loadOptions() {
    setOptionsLoading(true);
    setOptionsError("");

    try {
      const opcoesData = await loadOperationalOptions();
      setClientes((opcoesData.clientes ?? []).map(normalizeClienteOption));
      setObras((opcoesData.obras ?? []).map((obra) => ({
        id: obra.id,
        codigo: obra.codigo ?? null,
        nome: obra.nome || obra.codigo || "Obra sem nome",
        clienteId: obra.clienteId ?? ""
      })));
      setEquipamentos((opcoesData.equipamentos ?? []).map((equipamento) => ({
        id: equipamento.id,
        descricao: equipamento.descricao || equipamento.placaOuTag || "Recurso sem descricao",
        placaOuTag: equipamento.placaOuTag || "-",
        classeOperacional: equipamento.classeOperacional ?? null,
        capacidadeM3: equipamento.capacidadeM3 ?? null,
        unidadeCapacidade: equipamento.unidadeCapacidade ?? null,
        unidadeEconomicaPadrao: equipamento.unidadeEconomicaPadrao ?? null,
        custoPadrao: equipamento.custoPadrao ?? null
      })));
    } catch (err) {
      setOptionsError(err instanceof Error ? err.message : "Nao foi possivel carregar clientes, obras e recursos.");
    } finally {
      setOptionsLoading(false);
    }
  }

  async function loadAll(preferSelectedId = selected?.id) {
    await Promise.all([
      loadExecucoes(preferSelectedId),
      loadOptions()
    ]);
  }

  async function refreshSelected(id = selected?.id) {
    if (!id) return;
    const data = await fetchJson<{ item: Execucao }>(`/api/execucoes/${id}`);
    setExecucoes((current) => {
      const exists = current.some((item) => item.id === id);
      return exists ? current.map((item) => (item.id === id ? data.item : item)) : [data.item, ...current];
    });
    setSelectedId(id);
    await loadComparativo(id);
  }

  async function loadComparativo(id: string) {
    const data = await fetchJson<{ item: Comparativo }>(`/api/execucoes/${id}/comparativo`);
    setComparativo(data.item);
  }

  async function loadFatos() {
    if (!selected) return;
    const params = new URLSearchParams();
    params.set("execucaoId", selected.id);
    if (fatosFilter.obraId) params.set("obraId", fatosFilter.obraId);
    if (fatosFilter.dataInicio) params.set("dataInicio", fatosFilter.dataInicio);
    if (fatosFilter.dataFim) params.set("dataFim", fatosFilter.dataFim);
    if (fatosFilter.recursoId) params.set("recursoId", fatosFilter.recursoId);
    if (fatosFilter.servicoId) params.set("servicoId", fatosFilter.servicoId);

    const data = await fetchJson<{ items: FatoOperacional[] }>(`/api/execucoes/fatos?${params.toString()}`);
    setFatos(data.items);
    setSelectedFatos((current) => current.filter((id) => data.items.some((item) => item.id === id && item.statusVinculo === "DISPONIVEL")));
  }

  useEffect(() => {
    loadExecucoes().catch((err) => setError(err instanceof Error ? err.message : "Falha ao carregar execucoes."));
    loadOptions().catch((err) => setOptionsError(err instanceof Error ? err.message : "Nao foi possivel carregar clientes, obras e recursos."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selected?.frentes?.[0]?.id && !recursoForm.frenteExecutadaId) {
      setRecursoForm((current) => ({ ...current, frenteExecutadaId: selected.frentes[0].id }));
    }
  }, [recursoForm.frenteExecutadaId, selected]);

  useEffect(() => {
    if (selected?.obra?.id && !fatosFilter.obraId) {
      setFatosFilter((current) => ({ ...current, obraId: selected.obra?.id ?? "" }));
    }
  }, [fatosFilter.obraId, selected]);

  async function handleCreateExecucao(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        clienteId: execucaoForm.clienteId,
        obraId: execucaoForm.obraId || null,
        descricao: execucaoForm.descricao,
        origem: "DIRETA",
        status: "EM_ANDAMENTO",
        frentes: [
          {
            nome: execucaoForm.frenteNome,
            unidade: execucaoForm.unidade,
            quantidadeExecutada: Number(execucaoForm.quantidade),
            receitaRealizada: Number(execucaoForm.receita),
            recursos: []
          }
        ]
      };
      const data = await fetchJson<{ item: Execucao }>("/api/execucoes", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      setExecucaoForm(initialExecucaoForm());
      setMessage("Execucao aberta.");
      await loadExecucoes(data.item.id);
      loadOptions().catch((err) => setOptionsError(err instanceof Error ? err.message : "Nao foi possivel recarregar clientes, obras e recursos."));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel abrir a execucao.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateBoletim(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const data = await fetchJson<{ item: Boletim }>(`/api/execucoes/${selected.id}/boletins`, {
        method: "POST",
        body: JSON.stringify({
          dataBoletim: boletimForm.dataBoletim,
          observacoes: boletimForm.observacoes,
          recursos: []
        })
      });
      setBoletimForm(initialBoletimForm());
      setSelectedBoletimId(data.item.id);
      setMessage("Boletim aberto.");
      await refreshSelected(selected.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel criar o boletim.");
    } finally {
      setLoading(false);
    }
  }

  function applyEquipamento(id: string) {
    const equipamento = equipamentos.find((item) => item.id === id);
    setRecursoForm((current) => ({
      ...current,
      equipamentoId: id,
      nomeSnapshot: equipamento ? `${equipamento.placaOuTag} - ${equipamento.descricao}` : current.nomeSnapshot,
      baseEconomica: equipamento?.unidadeEconomicaPadrao ?? current.baseEconomica,
      valorCusto: equipamento?.custoPadrao ? String(equipamento.custoPadrao) : current.valorCusto
    }));
  }

  async function handleAddRecurso(event: FormEvent) {
    event.preventDefault();
    if (!selectedBoletim) return;
    setLoading(true);
    setError("");
    setMessage("");

    try {
      await fetchJson(`/api/execucoes/boletins/${selectedBoletim.id}/recursos`, {
        method: "POST",
        body: JSON.stringify({
          frenteExecutadaId: recursoForm.frenteExecutadaId,
          recursoId: recursoForm.equipamentoId || null,
          nomeSnapshot: recursoForm.nomeSnapshot,
          quantidadeRealizada: Number(recursoForm.quantidadeRealizada),
          unidadeRealizada: recursoForm.unidadeRealizada,
          quantidadeRecursos: Number(recursoForm.quantidadeRecursos || 1),
          origem: "MANUAL",
          snapshotTecnicoEconomico: {
            origem: recursoForm.equipamentoId ? "BIBLIOTECA_RECURSOS" : "RECURSO_PROVISORIO",
            baseEconomica: recursoForm.baseEconomica,
            valorCusto: Number(recursoForm.valorCusto),
            unidadeCusto: recursoForm.unidadeCusto
          },
          observacao: recursoForm.observacao
        })
      });
      setRecursoForm(initialRecursoForm(selected?.frentes?.[0]?.id ?? ""));
      setMessage("Recurso registrado no boletim.");
      await refreshSelected(selected?.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel adicionar o recurso.");
    } finally {
      setLoading(false);
    }
  }

  async function handleFecharBoletim(id: string) {
    if (!selected) return;
    setLoading(true);
    setError("");
    setMessage("");

    try {
      await fetchJson(`/api/execucoes/boletins/${id}/fechar`, { method: "POST" });
      setMessage("Boletim fechado e comparativo atualizado.");
      await refreshSelected(selected.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel fechar o boletim.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConsolidar() {
    if (!selected) return;
    setLoading(true);
    setError("");
    setMessage("");

    try {
      await fetchJson(`/api/execucoes/${selected.id}/consolidar`, { method: "POST" });
      setMessage("Execucao consolidada.");
      await refreshSelected(selected.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel consolidar.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVincularFatos() {
    if (!selected || !recursoForm.frenteExecutadaId || !selectedFatos.length) return;
    setLoading(true);
    setError("");
    setMessage("");

    try {
      await fetchJson(`/api/execucoes/${selected.id}/fatos/vincular`, {
        method: "POST",
        body: JSON.stringify({
          frenteExecutadaId: recursoForm.frenteExecutadaId,
          fatosIds: selectedFatos
        })
      });
      setMessage("Fatos vinculados aos boletins da execucao.");
      setSelectedFatos([]);
      await refreshSelected(selected.id);
      await loadFatos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel vincular os fatos.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDesvincularRecurso(id: string) {
    if (!selected) return;
    setLoading(true);
    setError("");
    setMessage("");

    try {
      await fetchJson(`/api/execucoes/boletins/recursos/${id}`, { method: "DELETE" });
      setMessage("Fato desvinculado da execucao. O lancamento original foi preservado.");
      await refreshSelected(selected.id);
      await loadFatos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel desvincular o fato.");
    } finally {
      setLoading(false);
    }
  }

  const primeiraFrenteComparativo = comparativo?.frentes[0];

  return (
    <div className="execucoes-page">
      <div className="execucoes-hero">
        <div>
          <span className="page-kicker">Execucao e Resultado</span>
          <h1 className="page-title">Boletim Diario de Producao</h1>
          <p>Consolide fatos realizados, execute o Nucleo e acompanhe Orçado x Realizado sem duplicar calculos.</p>
        </div>
        <button className="button-primary" type="button" onClick={handleConsolidar} disabled={!selected || loading}>
          Consolidar Execucao
        </button>
      </div>

      {message ? <div className="execucoes-alert is-success">{message}</div> : null}
      {error ? <div className="execucoes-alert is-error">{error}</div> : null}
      {optionsError ? <div className="execucoes-alert is-error">{optionsError}</div> : null}

      <section className="execucoes-grid">
        <aside className="execucoes-panel execucoes-list">
          <div className="execucoes-panel-heading">
            <span className="page-kicker">Lista</span>
            <strong>Execucoes</strong>
          </div>
          {execucoes.length ? (
            execucoes.map((execucao) => (
              <button
                key={execucao.id}
                className={`execucoes-list-item${selected?.id === execucao.id ? " is-active" : ""}`}
                type="button"
                onClick={() => {
                  setSelectedId(execucao.id);
                  setSelectedBoletimId("");
                  loadComparativo(execucao.id).catch(() => undefined);
                }}
              >
                <strong>{execucao.descricao}</strong>
                <span>{execucao.cliente?.nomeFantasia || execucao.cliente?.nome || "Cliente nao informado"}</span>
                <small>{execucao.status}</small>
              </button>
            ))
          ) : (
            <div className="empty-state">Nenhuma execucao aberta.</div>
          )}

          <form className="execucoes-create-form" onSubmit={handleCreateExecucao}>
            <span className="page-kicker">Nova execucao direta</span>
            <select
              value={execucaoForm.clienteId}
              onChange={(event) => setExecucaoForm((current) => ({ ...current, clienteId: event.target.value, obraId: "" }))}
              required
              disabled={optionsLoading}
            >
              <option value="">{optionsLoading ? "Carregando clientes..." : "Cliente"}</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>{clienteLabel(cliente)}</option>
              ))}
            </select>
            <select
              value={execucaoForm.obraId}
              onChange={(event) => setExecucaoForm((current) => ({ ...current, obraId: event.target.value }))}
              disabled={optionsLoading || !execucaoForm.clienteId}
            >
              <option value="">
                {!execucaoForm.clienteId
                  ? "Selecione um cliente para listar obras"
                  : optionsLoading
                    ? "Carregando obras..."
                    : "Obra opcional"}
              </option>
              {obrasFiltradas.map((obra) => (
                <option key={obra.id} value={obra.id}>{obra.codigo ? `${obra.codigo} - ` : ""}{obra.nome}</option>
              ))}
            </select>
            <input placeholder="Descricao da execucao" value={execucaoForm.descricao} onChange={(event) => setExecucaoForm((current) => ({ ...current, descricao: event.target.value }))} required />
            <input placeholder="Frente / servico" value={execucaoForm.frenteNome} onChange={(event) => setExecucaoForm((current) => ({ ...current, frenteNome: event.target.value }))} required />
            <div className="execucoes-inline">
              <input placeholder="Quantidade" type="number" step="0.0001" value={execucaoForm.quantidade} onChange={(event) => setExecucaoForm((current) => ({ ...current, quantidade: event.target.value }))} required />
              <select value={execucaoForm.unidade} onChange={(event) => setExecucaoForm((current) => ({ ...current, unidade: event.target.value }))}>
                {unidades.map((unidade) => <option key={unidade} value={unidade}>{unidade}</option>)}
              </select>
            </div>
            <input placeholder="Receita contratada" type="number" step="0.01" value={execucaoForm.receita} onChange={(event) => setExecucaoForm((current) => ({ ...current, receita: event.target.value }))} required />
            <button className="button-primary" type="submit" disabled={loading}>Abrir execucao</button>
          </form>
        </aside>

        <div className="execucoes-main">
          <section className="execucoes-panel">
            <div className="execucoes-panel-heading">
              <span className="page-kicker">Cabecalho</span>
              <strong>{selected?.descricao ?? "Selecione uma execucao"}</strong>
            </div>
            <div className="execucoes-summary-grid">
              <Info label="Cliente" value={selected?.cliente?.nomeFantasia || selected?.cliente?.nome || "-"} />
              <Info label="Obra" value={selected?.obra?.nome || "-"} />
              <Info label="Servico / Frente" value={selected?.frentes?.map((frente) => frente.nome).join(", ") || "-"} />
              <Info label="Situacao" value={selected?.status || "-"} />
              <Info label="Receita contratada" value={money(totais.receita)} />
              <Info label="Quantidade prevista" value={number(totais.quantidade, selected?.frentes?.[0]?.unidade ? ` ${selected.frentes[0].unidade}` : "")} />
              <Info label="Quantidade realizada" value={number(primeiraFrenteComparativo?.quantidade.realizado ?? totais.quantidade, selected?.frentes?.[0]?.unidade ? ` ${selected.frentes[0].unidade}` : "")} />
            </div>
          </section>

          <section className="execucoes-panel">
            <div className="execucoes-panel-heading is-row">
              <div>
                <span className="page-kicker">Boletins</span>
                <strong>Consolidacao diaria</strong>
              </div>
              <form className="execucoes-new-boletim" onSubmit={handleCreateBoletim}>
                <input type="date" value={boletimForm.dataBoletim} onChange={(event) => setBoletimForm((current) => ({ ...current, dataBoletim: event.target.value }))} />
                <input placeholder="Observacoes" value={boletimForm.observacoes} onChange={(event) => setBoletimForm((current) => ({ ...current, observacoes: event.target.value }))} />
                <button className="button-primary" type="submit" disabled={!selected || loading}>Novo Boletim</button>
              </form>
            </div>
            <div className="execucoes-boletins">
              {boletins.map((boletim) => (
                <button key={boletim.id} className={`execucoes-boletim${selectedBoletim?.id === boletim.id ? " is-active" : ""}`} type="button" onClick={() => setSelectedBoletimId(boletim.id)}>
                  <strong>{new Date(boletim.dataBoletim).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</strong>
                  <span>{boletim.status}</span>
                  <small>{boletim.recursos.length} recurso(s)</small>
                </button>
              ))}
            </div>
            {selectedBoletim?.status === "ABERTO" ? (
              <button className="button-secondary" type="button" disabled={loading} onClick={() => handleFecharBoletim(selectedBoletim.id)}>
                Fechar boletim selecionado
              </button>
            ) : null}
          </section>

          <section className="execucoes-panel">
            <div className="execucoes-panel-heading is-row">
              <div>
                <span className="page-kicker">Fatos encontrados</span>
                <strong>Vincular lancamentos existentes</strong>
                <p>Selecione fatos ja registrados na BasePro. A correcao do dado deve ocorrer no lancamento original.</p>
              </div>
              <button className="button-secondary" type="button" disabled={!selected || loading} onClick={() => loadFatos().catch((err) => setError(err instanceof Error ? err.message : "Falha ao buscar fatos."))}>
                Buscar fatos
              </button>
            </div>
            <div className="execucoes-resource-form">
              <div className="execucoes-inline">
                <input type="date" value={fatosFilter.dataInicio} onChange={(event) => setFatosFilter((current) => ({ ...current, dataInicio: event.target.value }))} />
                <input type="date" value={fatosFilter.dataFim} onChange={(event) => setFatosFilter((current) => ({ ...current, dataFim: event.target.value }))} />
              </div>
              <div className="execucoes-inline">
                <select value={fatosFilter.obraId} onChange={(event) => setFatosFilter((current) => ({ ...current, obraId: event.target.value }))}>
                  <option value="">Todas as obras</option>
                  {obras.map((obra) => (
                    <option key={obra.id} value={obra.id}>{obra.codigo ? `${obra.codigo} - ` : ""}{obra.nome}</option>
                  ))}
                </select>
                <select value={fatosFilter.recursoId} onChange={(event) => setFatosFilter((current) => ({ ...current, recursoId: event.target.value }))}>
                  <option value="">Todos os recursos</option>
                  {equipamentos.map((equipamento) => <option key={equipamento.id} value={equipamento.id}>{equipamento.placaOuTag} - {equipamento.descricao}</option>)}
                </select>
              </div>
              <div className="execucoes-inline">
                <select value={recursoForm.frenteExecutadaId} onChange={(event) => setRecursoForm((current) => ({ ...current, frenteExecutadaId: event.target.value }))}>
                  {(selected?.frentes ?? []).map((frente) => <option key={frente.id} value={frente.id}>Destino: {frente.nome}</option>)}
                </select>
                <button className="button-primary" type="button" disabled={!selectedFatos.length || loading} onClick={handleVincularFatos}>
                  Vincular selecionados
                </button>
              </div>
            </div>
            <div className="data-table-wrap">
              <table className="data-table data-table-compact">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Origem</th>
                    <th>Recurso</th>
                    <th>Identificador</th>
                    <th>Qtd</th>
                    <th>Un</th>
                    <th>Obra</th>
                    <th>Status</th>
                    <th>Selecionar</th>
                  </tr>
                </thead>
                <tbody>
                  {fatos.map((fato) => (
                    <tr key={fato.id}>
                      <td>{new Date(fato.data).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</td>
                      <td>{fato.origemLabel}</td>
                      <td>{fato.recurso}</td>
                      <td>{fato.identificadorRecurso}</td>
                      <td>{number(fato.quantidade)}</td>
                      <td>{fato.unidade}</td>
                      <td>{fato.obra}</td>
                      <td>{fato.statusVinculo}{fato.custoDisponivel ? "" : " / custo pendente"}</td>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedFatos.includes(fato.id)}
                          disabled={fato.statusVinculo === "VINCULADO"}
                          onChange={(event) => {
                            setSelectedFatos((current) => event.target.checked
                              ? [...current, fato.id]
                              : current.filter((id) => id !== fato.id));
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                  {!fatos.length ? (
                    <tr>
                      <td colSpan={9}>Nenhum fato encontrado para os filtros atuais.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>

          <section className="execucoes-panel">
            <div className="execucoes-panel-heading">
              <span className="page-kicker">Recursos do boletim</span>
              <strong>{selectedBoletim ? `Boletim ${new Date(selectedBoletim.dataBoletim).toLocaleDateString("pt-BR", { timeZone: "UTC" })}` : "Nenhum boletim selecionado"}</strong>
            </div>
            <div className="data-table-wrap">
              <table className="data-table data-table-compact">
                <thead>
                  <tr>
                    <th>Origem</th>
                    <th>Recurso</th>
                    <th>Quantidade</th>
                    <th>Unidade</th>
                    <th>Custo</th>
                    <th>Referencia</th>
                    <th>Observacoes</th>
                    <th>Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedBoletim?.recursos ?? []).map((recurso) => (
                    <tr key={recurso.id}>
                      <td>{recurso.origem}{recurso.editavel === false ? " / Fato existente" : " / Manual"}</td>
                      <td>{recurso.nomeSnapshot}</td>
                      <td>{number(recurso.quantidadeRealizada)}</td>
                      <td>{recurso.unidadeRealizada}</td>
                      <td>{money(toNumber(recurso.snapshotTecnicoEconomico?.valorCusto))} {String(recurso.snapshotTecnicoEconomico?.unidadeCusto ?? "")}</td>
                      <td>{recurso.origemRegistroTipo ? `${recurso.origemRegistroTipo} ${recurso.origemRegistroId}` : "-"}</td>
                      <td>{recurso.observacao || "-"}</td>
                      <td>
                        {selectedBoletim?.status === "ABERTO" ? (
                          <button className="button-secondary" type="button" disabled={loading} onClick={() => handleDesvincularRecurso(recurso.id)}>
                            Desvincular
                          </button>
                        ) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {selectedBoletim?.status === "ABERTO" ? (
              <form className="execucoes-resource-form" onSubmit={handleAddRecurso}>
                <select value={recursoForm.frenteExecutadaId} onChange={(event) => setRecursoForm((current) => ({ ...current, frenteExecutadaId: event.target.value }))} required>
                  {(selected?.frentes ?? []).map((frente) => <option key={frente.id} value={frente.id}>{frente.nome}</option>)}
                </select>
                <select value={recursoForm.equipamentoId} onChange={(event) => applyEquipamento(event.target.value)}>
                  <option value="">Recurso provisorio</option>
                  {equipamentos.map((equipamento) => <option key={equipamento.id} value={equipamento.id}>{equipamento.placaOuTag} - {equipamento.descricao}</option>)}
                </select>
                <input placeholder="Nome do recurso" value={recursoForm.nomeSnapshot} onChange={(event) => setRecursoForm((current) => ({ ...current, nomeSnapshot: event.target.value }))} required />
                <div className="execucoes-inline">
                  <input type="number" step="0.0001" placeholder="Quantidade" value={recursoForm.quantidadeRealizada} onChange={(event) => setRecursoForm((current) => ({ ...current, quantidadeRealizada: event.target.value }))} required />
                  <select value={recursoForm.unidadeRealizada} onChange={(event) => setRecursoForm((current) => ({ ...current, unidadeRealizada: event.target.value }))}>
                    {unidades.map((unidade) => <option key={unidade} value={unidade}>{unidade}</option>)}
                  </select>
                </div>
                <div className="execucoes-inline">
                  <input type="number" step="0.0001" placeholder="Qtd recursos" value={recursoForm.quantidadeRecursos} onChange={(event) => setRecursoForm((current) => ({ ...current, quantidadeRecursos: event.target.value }))} />
                  <select value={recursoForm.baseEconomica} onChange={(event) => setRecursoForm((current) => ({ ...current, baseEconomica: event.target.value }))}>
                    {basesEconomicas.map((base) => <option key={base} value={base}>{base}</option>)}
                  </select>
                </div>
                <div className="execucoes-inline">
                  <input type="number" step="0.01" placeholder="Custo unitario" value={recursoForm.valorCusto} onChange={(event) => setRecursoForm((current) => ({ ...current, valorCusto: event.target.value }))} required />
                  <input placeholder="Unidade economica" value={recursoForm.unidadeCusto} onChange={(event) => setRecursoForm((current) => ({ ...current, unidadeCusto: event.target.value }))} required />
                </div>
                <textarea placeholder="Observacoes" value={recursoForm.observacao} onChange={(event) => setRecursoForm((current) => ({ ...current, observacao: event.target.value }))} />
                <button className="button-primary" type="submit" disabled={loading}>Adicionar recurso</button>
              </form>
            ) : null}
          </section>

          <section className="execucoes-panel">
            <div className="execucoes-panel-heading">
              <span className="page-kicker">Resultado</span>
              <strong>{comparativo?.referenciaDisponivel ? "Comparativo Orcado x Realizado" : "Resultado realizado"}</strong>
            </div>
            {!comparativo?.referenciaDisponivel ? (
              <>
                <div className="empty-state">
                  Execucao sem referencia prevista. O resultado abaixo representa apenas o realizado consolidado pelos boletins.
                </div>
                <div className="execucoes-comparison-grid">
                  <Info label="Quantidade realizada" value={number(realizado.quantidade, selected?.frentes?.[0]?.unidade ? ` ${selected.frentes[0].unidade}` : "")} />
                  <Info label="Custo realizado" value={money(realizado.custo)} />
                  <Info label="Receita realizada" value={money(realizado.receita)} />
                  <Info label="Resultado realizado" value={money(realizado.resultado)} />
                  <Info label="Margem realizada" value={realizado.margem === null ? "-" : number(realizado.margem, "%")} />
                </div>
                <div className="data-table-wrap">
                  <table className="data-table data-table-compact">
                    <thead>
                      <tr>
                        <th>Recurso</th>
                        <th>Qtd</th>
                        <th>Unidade</th>
                        <th>Base</th>
                        <th>Custo unit.</th>
                        <th>Custo total</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {realizado.recursos.map((recurso, index) => (
                        <tr key={`${String(recurso.id ?? index)}-${index}`}>
                          <td>{String(recurso.nomeTecnico ?? "-")}</td>
                          <td>{number(recurso.quantidadeOperacional as number)}</td>
                          <td>{String(recurso.unidadeQuantidadeOperacional ?? "-")}</td>
                          <td>{String(recurso.baseEconomica ?? "-")}</td>
                          <td>{money(toNumber(recurso.custoUnitario))}</td>
                          <td>{money(toNumber(recurso.custoTotal))}</td>
                          <td>{String(recurso.statusCalculo ?? "-")}</td>
                        </tr>
                      ))}
                      {!realizado.recursos.length ? (
                        <tr>
                          <td colSpan={7}>Nenhum resultado consolidado ainda. Feche um boletim ou consolide a execucao.</td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <>
                <div className="execucoes-comparison-grid">
                  <Metric title="Quantidade" value={primeiraFrenteComparativo?.quantidade} suffix={primeiraFrenteComparativo?.unidade ? ` ${primeiraFrenteComparativo.unidade}` : ""} />
                  <Metric title="Receita" value={primeiraFrenteComparativo?.receita} moneyValue />
                  <Metric title="Custo" value={primeiraFrenteComparativo?.custo} moneyValue />
                  <Metric title="Resultado" value={primeiraFrenteComparativo?.resultado} moneyValue />
                  <Metric title="Margem" value={primeiraFrenteComparativo?.margem} suffix="%" />
                </div>
                <div className="data-table-wrap">
                  <table className="data-table data-table-compact">
                    <thead>
                      <tr>
                        <th>Recurso</th>
                        <th>Previsto</th>
                        <th>Realizado</th>
                        <th>Diferenca</th>
                        <th>Origem</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(primeiraFrenteComparativo?.recursos ?? []).map((recurso, index) => (
                        <tr key={`${recurso.recurso}-${index}`}>
                          <td>{recurso.recurso}</td>
                          <td>{money(recurso.custo.previsto)}</td>
                          <td>{money(recurso.custo.realizado)}</td>
                          <td>{money(recurso.custo.desvioAbsoluto)}</td>
                          <td>{recurso.origem.previsto ? "Previsto e realizado" : "Fato realizado"}</td>
                          <td>{recurso.status === "CORRESPONDENTE" ? "OK" : recurso.status.replaceAll("_", " ")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="execucoes-info">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Metric({ title, value, moneyValue = false, suffix = "" }: { title: string; value?: ComparativoValor; moneyValue?: boolean; suffix?: string }) {
  const format = (item: number | null | undefined) => (moneyValue ? money(item) : number(item, suffix));

  return (
    <div className="execucoes-metric">
      <span>{title}</span>
      <strong>{format(value?.realizado)}</strong>
      <small>Previsto: {format(value?.previsto)}</small>
      <small>Desvio: {format(value?.desvioAbsoluto)} / {number(value?.desvioPercentual, "%")}</small>
    </div>
  );
}
