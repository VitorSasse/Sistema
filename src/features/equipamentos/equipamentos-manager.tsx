"use client";

import type { ReactNode } from "react";
import {
  NaturezaRecursoEquipamento,
  StatusEquipamentoOperacional,
  TipoControleEquipamento,
  TipoRecurso,
  UnidadeEconomicaCusto
} from "@prisma/client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { confirmDeleteAction } from "@/lib/utils/confirm-delete";

type Equipamento = {
  id: string;
  naturezaRecurso: NaturezaRecursoEquipamento;
  tipoRecurso: TipoRecurso;
  tipoControle: TipoControleEquipamento;
  descricao: string;
  descricaoOperacional: string | null;
  placaOuTag: string;
  classeOperacional: string | null;
  complementar: boolean;
  fabricante: string | null;
  modelo: string | null;
  marcaModelo: string | null;
  anoFabricacao: number | null;
  dataEntrada: string | null;
  capacidadeM3: string | null;
  unidadeCapacidade: string | null;
  unidadeEconomicaPadrao: UnidadeEconomicaCusto | null;
  custoPadrao: string | null;
  permitirEdicaoOrcamento: boolean;
  caracteristicasTecnicas: Record<string, unknown> | null;
  apelido: string | null;
  observacao: string | null;
  status: "ATIVO" | "INATIVO";
  statusOperacional: StatusEquipamentoOperacional;
  horimetroAtual: string | null;
  kmAtual: string | null;
  periodicidadeManutencaoHoras: number | null;
  periodicidadeManutencaoKm: number | null;
  formasCusteio?: FormaCusteioRecurso[];
};

type UnidadeCusteio = {
  id: string;
  codigo: string;
  rotulo: string;
  baseEconomica: string;
  sufixo: string;
  ativo: boolean;
};

type FormaCusteioRecurso = {
  id?: string;
  clientId?: string;
  nome: string;
  unidadeCusteioId: string;
  valorReferencia: string | number;
  preferencial: boolean;
  ativo: boolean;
  observacao: string | null;
  unidadeCusteio?: UnidadeCusteio;
};

type FormState = {
  id?: string;
  naturezaRecurso: NaturezaRecursoEquipamento;
  tipoRecurso: TipoRecurso;
  tipoControle: TipoControleEquipamento;
  descricao: string;
  descricaoOperacional: string;
  placaOuTag: string;
  classeOperacional: string;
  complementar: boolean;
  fabricante: string;
  modelo: string;
  marcaModelo: string;
  anoFabricacao: string;
  dataEntrada: string;
  capacidadeM3: string;
  unidadeCapacidade: string;
  unidadeEconomicaPadrao: UnidadeEconomicaCusto | "";
  custoPadrao: string;
  permitirEdicaoOrcamento: boolean;
  caracteristicasTecnicas: Record<string, unknown> | null;
  apelido: string;
  observacao: string;
  status: "ATIVO" | "INATIVO";
  statusOperacional: StatusEquipamentoOperacional;
  horimetroAtual: string;
  kmAtual: string;
  periodicidadeManutencaoHoras: string;
  periodicidadeManutencaoKm: string;
  formasCusteio: FormaCusteioRecurso[];
};

const initialForm: FormState = {
  naturezaRecurso: "PROPRIO",
  tipoRecurso: "CAMINHAO",
  tipoControle: "HORIMETRO",
  descricao: "",
  descricaoOperacional: "",
  placaOuTag: "",
  classeOperacional: "",
  complementar: false,
  fabricante: "",
  modelo: "",
  marcaModelo: "",
  anoFabricacao: "",
  dataEntrada: "",
  capacidadeM3: "",
  unidadeCapacidade: "m3",
  unidadeEconomicaPadrao: "",
  custoPadrao: "",
  permitirEdicaoOrcamento: true,
  caracteristicasTecnicas: null,
  apelido: "",
  observacao: "",
  status: "ATIVO",
  statusOperacional: "ATIVO",
  horimetroAtual: "",
  kmAtual: "",
  periodicidadeManutencaoHoras: "",
  periodicidadeManutencaoKm: "",
  formasCusteio: []
};

const tipoRecursoOptions: TipoRecurso[] = [
  "CAMINHAO",
  "MAQUINA",
  "CARRETA",
  "EQUIPAMENTO_APOIO",
  "OUTRO"
];

const naturezaRecursoOptions: Array<{
  value: NaturezaRecursoEquipamento;
  label: string;
}> = [
  { value: "PROPRIO", label: "Proprio" },
  { value: "TERCEIRIZADO", label: "Terceirizado" },
  { value: "LOCADO", label: "Locado" },
  { value: "SUBCONTRATADO", label: "Subcontratado" },
  { value: "BIBLIOTECA_TECNICA", label: "Biblioteca Tecnica (futuro)" }
];

const unidadeEconomicaOptions: Array<{ value: UnidadeEconomicaCusto; label: string }> = [
  { value: "CUSTO_FIXO", label: "Custo fixo" },
  { value: "DIA", label: "Por dia (R$/dia)" },
  { value: "HORA", label: "Por hora (R$/hora)" },
  { value: "KM", label: "Por km (R$/km)" },
  { value: "M3", label: "Por m3 (R$/m3)" },
  { value: "M2", label: "Por m2 (R$/m2)" },
  { value: "VIAGEM", label: "Por viagem" },
  { value: "CARGA", label: "Por carga" },
  { value: "MES", label: "Por mes" },
  { value: "UNIDADE_PRODUZIDA", label: "Por unidade produzida" },
  { value: "UNIDADE", label: "Por unidade de recurso" },
  { value: "VALOR_TOTAL", label: "Valor total" }
];

const statusOperacionalOptions: StatusEquipamentoOperacional[] = [
  "ATIVO",
  "EM_OPERACAO",
  "EM_MANUTENCAO",
  "PARADO",
  "INATIVO"
];

const tipoControleOptions: TipoControleEquipamento[] = ["HORIMETRO", "KM"];

function isRecursoApoio(tipoRecurso: TipoRecurso) {
  return tipoRecurso === "EQUIPAMENTO_APOIO";
}

function isRecursoPatrimonial(natureza: NaturezaRecursoEquipamento) {
  return natureza === "PROPRIO";
}

function getUnidadeEconomica(unidade: UnidadeEconomicaCusto | "") {
  const unidades: Partial<Record<UnidadeEconomicaCusto, string>> = {
    CUSTO_FIXO: "R$ fixo",
    DIA: "R$/dia",
    HORA: "R$/hora",
    KM: "R$/km",
    M3: "R$/m3",
    M2: "R$/m2",
    VIAGEM: "R$/viagem",
    CARGA: "R$/carga",
    MES: "R$/mes",
    UNIDADE_PRODUZIDA: "R$/unidade produzida",
    UNIDADE: "R$/unidade",
    VALOR_TOTAL: "R$ total"
  };

  return unidade ? unidades[unidade] ?? "R$" : "Selecione a forma de contratacao";
}

function newFormaCusteio(unidadeCusteioId = ""): FormaCusteioRecurso {
  return {
    clientId: globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
    nome: "",
    unidadeCusteioId,
    valorReferencia: "",
    preferencial: false,
    ativo: true,
    observacao: ""
  };
}

function Field({ label, help, children }: { label: string; help: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      <small className="manager-field-hint">{help}</small>
    </label>
  );
}

function FormBlock(props: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="equipment-library-block">
      <header className="equipment-library-block-header">
        <span>{props.title}</span>
        <p>{props.description}</p>
      </header>
      <div className="form-grid-4">{props.children}</div>
    </section>
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
  const [unidadesCusteio, setUnidadesCusteio] = useState<UnidadeCusteio[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState<"TODOS" | TipoRecurso>("TODOS");
  const [statusFilter, setStatusFilter] = useState<"TODOS" | "ATIVO" | "INATIVO">("TODOS");
  const [operacionalFilter, setOperacionalFilter] = useState<
    "TODOS" | StatusEquipamentoOperacional
  >("TODOS");
  const [isPending, startTransition] = useTransition();
  const recursoApoioSelecionado = isRecursoApoio(form.tipoRecurso);
  const recursoPatrimonial = isRecursoPatrimonial(form.naturezaRecurso);

  async function loadEquipamentos() {
    const response = await fetch("/api/equipamentos", { cache: "no-store" });
    const data = (await response.json()) as { items: Equipamento[]; unidadesCusteio?: UnidadeCusteio[] };
    setEquipamentos(data.items);
    setUnidadesCusteio(data.unidadesCusteio ?? []);
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
          equipamento.classeOperacional ?? "",
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

  function addFormaCusteio() {
    setForm((current) => ({
      ...current,
      formasCusteio: [
        ...current.formasCusteio,
        newFormaCusteio(unidadesCusteio.find((unidade) => unidade.ativo)?.id ?? "")
      ]
    }));
  }

  function updateFormaCusteio(index: number, patch: Partial<FormaCusteioRecurso>) {
    setForm((current) => ({
      ...current,
      formasCusteio: current.formasCusteio.map((forma, currentIndex) => {
        if (currentIndex !== index) {
          return patch.preferencial ? { ...forma, preferencial: false } : forma;
        }

        return {
          ...forma,
          ...patch,
          preferencial: patch.preferencial === true ? true : patch.preferencial === false ? false : forma.preferencial
        };
      })
    }));
  }

  function removeFormaCusteio(index: number) {
    setForm((current) => ({
      ...current,
      formasCusteio: current.formasCusteio.filter((_, currentIndex) => currentIndex !== index)
    }));
  }

  function updateTipoRecurso(tipoRecurso: TipoRecurso) {
    setForm((current) => {
      if (!isRecursoApoio(tipoRecurso)) {
        return { ...current, tipoRecurso };
      }

      return {
        ...current,
        tipoRecurso,
        complementar: false,
        tipoControle: "HORIMETRO",
        horimetroAtual: "",
        kmAtual: "",
        statusOperacional: "ATIVO",
        periodicidadeManutencaoHoras: "",
        periodicidadeManutencaoKm: ""
      };
    });
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

      const data = (await response.json()) as { message?: string; detail?: string };

      if (!response.ok) {
        setMessage(
          [data.message, data.detail].filter(Boolean).join(" ")
            || "Nao foi possivel salvar o equipamento."
        );
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
      naturezaRecurso: equipamento.naturezaRecurso,
      tipoRecurso: equipamento.tipoRecurso,
      tipoControle: equipamento.tipoControle,
      descricao: equipamento.descricao,
      descricaoOperacional: equipamento.descricaoOperacional ?? "",
      placaOuTag: equipamento.placaOuTag,
      classeOperacional: equipamento.classeOperacional ?? "",
      complementar: equipamento.complementar,
      fabricante: equipamento.fabricante ?? "",
      modelo: equipamento.modelo ?? "",
      marcaModelo: equipamento.marcaModelo ?? "",
      anoFabricacao: equipamento.anoFabricacao ? String(equipamento.anoFabricacao) : "",
      dataEntrada: equipamento.dataEntrada ? equipamento.dataEntrada.slice(0, 10) : "",
      capacidadeM3: equipamento.capacidadeM3 ?? "",
      unidadeCapacidade: equipamento.unidadeCapacidade ?? "",
      unidadeEconomicaPadrao: equipamento.unidadeEconomicaPadrao ?? "",
      custoPadrao: equipamento.custoPadrao ?? "",
      permitirEdicaoOrcamento: equipamento.permitirEdicaoOrcamento,
      caracteristicasTecnicas: equipamento.caracteristicasTecnicas ?? null,
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
        : "",
      formasCusteio: (equipamento.formasCusteio ?? []).map((forma) => ({
        id: forma.id,
        clientId: forma.id,
        nome: forma.nome,
        unidadeCusteioId: forma.unidadeCusteioId,
        valorReferencia: String(forma.valorReferencia ?? ""),
        preferencial: forma.preferencial,
        ativo: forma.ativo,
        observacao: forma.observacao ?? "",
        unidadeCusteio: forma.unidadeCusteio
      }))
    });
    setMessage(`Editando ${equipamento.descricao}.`);
  }

  async function handleDisable(id: string) {
    startTransition(async () => {
      const response = await fetch(`/api/equipamentos/${id}`, { method: "DELETE" });
      const data = (await response.json()) as { message?: string; detail?: string };

      if (!response.ok) {
        setMessage(
          [data.message, data.detail].filter(Boolean).join(" ")
            || "Nao foi possivel inativar o equipamento."
        );
        return;
      }

      setMessage("Equipamento inativado.");
      await loadEquipamentos();
    });
  }

  async function handleDelete(id: string) {
    if (!confirmDeleteAction("este equipamento")) {
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/equipamentos/${id}?mode=delete`, { method: "DELETE" });
      const data = (await response.json()) as { message?: string; detail?: string };

      if (!response.ok) {
        setMessage(
          [data.message, data.detail].filter(Boolean).join(" ")
            || "Nao foi possivel excluir o equipamento."
        );
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
      <section className="page-header fade-up">
        <span className="page-kicker">Cadastro mestre</span>
        <h1 className="page-title">Equipamentos</h1>
        <p className="page-copy">
          Controle a frota operacional, recursos de apoio e regras de manutencao em um unico fluxo.
        </p>
      </section>

      <section className="surface section-card">
        <div className="section-header">
          <div>
            <h2 className="section-title">{form.id ? "Editar equipamento" : "Novo equipamento"}</h2>
            <p className="section-copy">
              {recursoApoioSelecionado
                ? "Cadastro generico para recursos de apoio tecnico usados em servicos de engenharia e topografia."
                : "Cadastro simplificado com tipo de controle por horimetro ou KM."}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 24 }}>
          <div className="glass-band">
            <strong>{form.id ? "Edicao em andamento" : "Cadastro operacional"}</strong>
            <span className="subtle">
              Padrao visual unificado para leitura clara no tema claro e no tema escuro.
            </span>
          </div>

          {recursoApoioSelecionado ? (
            <p className="section-copy" style={{ margin: 0 }}>
              Recursos de apoio nao entram na agenda operacional nem nos KPIs das dashboards. Eles
              ficam disponiveis apenas para lancamentos tecnicos e medicoes.
            </p>
          ) : null}
          <FormBlock
            title="IDENTIFICACAO"
            description="Define o recurso e como ele pertence a operacao da empresa."
          >
            <Field
              label="Natureza do recurso"
              help="Define como este recurso pertence a empresa e quais informacoes serao necessarias."
            >
              <select
                className="field-control"
                value={form.naturezaRecurso}
                onChange={(event) =>
                  updateField("naturezaRecurso", event.target.value as NaturezaRecursoEquipamento)
                }
              >
                {naturezaRecursoOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Nome do recurso" help="Nome utilizado para localizar o recurso em toda a BasePro.">
              <input
                className="field-control"
                value={form.descricao}
                onChange={(event) => updateField("descricao", event.target.value)}
                placeholder="Ex.: Caminhao basculante 14 m3"
              />
            </Field>
            <Field label="Categoria" help="Agrupa o recurso nas rotinas operacionais e de custos.">
              <select
                className="field-control"
                value={form.tipoRecurso}
                onChange={(event) => updateTipoRecurso(event.target.value as TipoRecurso)}
              >
                {tipoRecursoOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </Field>
            <Field label="Classe operacional" help="Identifica recursos tecnicamente equivalentes no planejamento.">
              <input
                className="field-control"
                value={form.classeOperacional}
                onChange={(event) => updateField("classeOperacional", event.target.value)}
                placeholder="Ex.: Caminhao basculante 14 m3"
              />
            </Field>
            <Field label="Apelido" help="Nome curto opcional para facilitar a identificacao interna.">
              <input
                className="field-control"
                value={form.apelido}
                onChange={(event) => updateField("apelido", event.target.value)}
              />
            </Field>
            <Field label="Status do cadastro" help="Controla se o recurso pode ser selecionado em novos registros.">
              <select
                className="field-control"
                value={form.status}
                onChange={(event) => updateField("status", event.target.value as FormState["status"])}
              >
                <option value="ATIVO">ATIVO</option>
                <option value="INATIVO">INATIVO</option>
              </select>
            </Field>
          </FormBlock>

          <FormBlock
            title="CARACTERISTICAS TECNICAS"
            description="Conhecimento permanente usado pelo planejamento e pelo Motor Operacional."
          >
            <Field label="Descricao operacional" help="Explica como o recurso participa da execucao da obra.">
              <textarea
                className="field-control textarea-lg"
                value={form.descricaoOperacional}
                onChange={(event) => updateField("descricaoOperacional", event.target.value)}
              />
            </Field>
            <Field label="Fabricante" help="Referencia tecnica opcional do fabricante do recurso.">
              <input className="field-control" value={form.fabricante} onChange={(event) => updateField("fabricante", event.target.value)} />
            </Field>
            <Field label="Modelo" help="Modelo tecnico usado para diferenciar capacidades e configuracoes.">
              <input className="field-control" value={form.modelo} onChange={(event) => updateField("modelo", event.target.value)} />
            </Field>
            <Field label="Capacidade" help="Capacidade operacional utilizada para calculos do recurso.">
              <input
                className="field-control"
                type="number"
                min="0"
                step="0.01"
                value={form.capacidadeM3}
                onChange={(event) => updateField("capacidadeM3", event.target.value)}
                placeholder="Ex.: 14"
              />
            </Field>
            <Field label="Unidade da capacidade" help="Unidade que representa a capacidade, como m3, t, litros ou kg.">
              <input
                className="field-control"
                value={form.unidadeCapacidade}
                onChange={(event) => updateField("unidadeCapacidade", event.target.value)}
                placeholder="Ex.: m3"
              />
            </Field>
          </FormBlock>

          <FormBlock
            title="CONFIGURACAO ECONOMICA"
            description="Padroes herdados automaticamente pelos novos recursos dos orcamentos."
          >
            <Field label="Forma de contratacao padrao" help="Utilizada automaticamente nos orcamentos.">
              <select
                className="field-control"
                value={form.unidadeEconomicaPadrao}
                onChange={(event) =>
                  updateField("unidadeEconomicaPadrao", event.target.value as FormState["unidadeEconomicaPadrao"])
                }
              >
                <option value="">Nao definida</option>
                {unidadeEconomicaOptions
                  .filter((option) => !["UNIDADE", "VALOR_TOTAL", "UNIDADE_PRODUZIDA"].includes(option.value))
                  .map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
              </select>
            </Field>
            <Field label="Custo padrao (opcional)" help="Valor de referencia que pode ser personalizado no orcamento.">
              <input
                className="field-control"
                type="number"
                min="0"
                step="0.01"
                value={form.custoPadrao}
                onChange={(event) => updateField("custoPadrao", event.target.value)}
                placeholder="0,00"
              />
            </Field>
            <Field label="Unidade economica" help="Unidade economica utilizada pelo Motor Operacional.">
              <input className="field-control" value={getUnidadeEconomica(form.unidadeEconomicaPadrao)} readOnly />
            </Field>
            <label className="field equipment-library-check">
              <span className="field-label">Permitir edicao no orcamento</span>
              <span className="equipment-library-check-control">
                <input
                  type="checkbox"
                  checked={form.permitirEdicaoOrcamento}
                  onChange={(event) => updateField("permitirEdicaoOrcamento", event.target.checked)}
                />
                Sim
              </span>
              <small className="manager-field-hint">Permite personalizar forma e custo apenas naquele orcamento.</small>
            </label>
          </FormBlock>

          <FormBlock
            title="FORMAS DE CUSTEIO"
            description="Referencias reutilizaveis da Biblioteca. Nesta etapa elas ainda nao substituem os campos legados acima."
          >
            <div style={{ gridColumn: "1 / -1", display: "grid", gap: 12 }}>
              {form.formasCusteio.length === 0 ? (
                <div className="empty-state">
                  Nenhuma forma cadastrada. O equipamento continua valido e os campos legados seguem funcionando.
                </div>
              ) : null}

              {form.formasCusteio.map((forma, index) => {
                const unidade = unidadesCusteio.find((item) => item.id === forma.unidadeCusteioId) ?? forma.unidadeCusteio;

                return (
                  <div className="surface" key={forma.clientId ?? forma.id ?? index} style={{ padding: 16 }}>
                    <div className="form-grid-4">
                      <Field label="Nome da forma" help="Identificacao interna da referencia de custeio.">
                        <input
                          className="field-control"
                          value={forma.nome}
                          onChange={(event) => updateFormaCusteio(index, { nome: event.target.value })}
                          placeholder="Ex.: referencia de contratacao"
                        />
                      </Field>
                      <Field label="Unidade de custeio" help="Unidade economica independente da unidade operacional.">
                        <select
                          className="field-control"
                          value={forma.unidadeCusteioId}
                          onChange={(event) => updateFormaCusteio(index, { unidadeCusteioId: event.target.value })}
                        >
                          <option value="">Selecione</option>
                          {unidadesCusteio.filter((item) => item.ativo || item.id === forma.unidadeCusteioId).map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.rotulo}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Valor de referencia" help={unidade ? `Referencia em ${unidade.rotulo}.` : "Valor usado apenas como referencia da Biblioteca."}>
                        <input
                          className="field-control"
                          type="number"
                          min="0"
                          step="0.0001"
                          value={forma.valorReferencia}
                          onChange={(event) => updateFormaCusteio(index, { valorReferencia: event.target.value })}
                          placeholder="0,0000"
                        />
                      </Field>
                      <Field label="Status" help="Formas inativas ficam preservadas, mas nao devem ser sugeridas futuramente.">
                        <select
                          className="field-control"
                          value={forma.ativo ? "ATIVO" : "INATIVO"}
                          onChange={(event) => updateFormaCusteio(index, {
                            ativo: event.target.value === "ATIVO",
                            preferencial: event.target.value === "ATIVO" ? forma.preferencial : false
                          })}
                        >
                          <option value="ATIVO">Ativa</option>
                          <option value="INATIVO">Inativa</option>
                        </select>
                      </Field>
                      <label className="field equipment-library-check">
                        <span className="field-label">Forma preferencial</span>
                        <span className="equipment-library-check-control">
                          <input
                            type="checkbox"
                            checked={forma.preferencial && forma.ativo}
                            disabled={!forma.ativo}
                            onChange={(event) => updateFormaCusteio(index, { preferencial: event.target.checked })}
                          />
                          Sugerir como preferencial
                        </span>
                        <small className="manager-field-hint">Opcional. Ao marcar esta forma, as demais sao desmarcadas.</small>
                      </label>
                      <Field label="Observacao" help="Informacao opcional sobre negociacao, origem ou uso da referencia.">
                        <input
                          className="field-control"
                          value={forma.observacao ?? ""}
                          onChange={(event) => updateFormaCusteio(index, { observacao: event.target.value })}
                        />
                      </Field>
                      <div className="field">
                        <span className="field-label">Acao</span>
                        <button type="button" className="button-danger" onClick={() => removeFormaCusteio(index)}>
                          Remover
                        </button>
                        <small className="manager-field-hint">Remove esta linha do cadastro ao salvar.</small>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="toolbar-actions">
                <button type="button" className="button-secondary" onClick={addFormaCusteio}>
                  Adicionar forma de custeio
                </button>
              </div>
            </div>
          </FormBlock>

          <FormBlock
            title="CONFIGURACAO OPERACIONAL"
            description={recursoPatrimonial ? "Controle atual do equipamento dentro da frota." : "Configuracao minima para uso do recurso no planejamento."}
          >
            {recursoPatrimonial ? (
              <>
                <Field label="Tipo de controle" help="Define controle por horimetro ou quilometragem.">
                  <select
                    className="field-control"
                    value={form.tipoControle}
                    disabled={recursoApoioSelecionado}
                    onChange={(event) => updateField("tipoControle", event.target.value as TipoControleEquipamento)}
                  >
                    {tipoControleOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </Field>
                <Field label="Status operacional" help="Situacao atual usada na agenda e nos indicadores da frota.">
                  <select
                    className="field-control"
                    value={form.statusOperacional}
                    disabled={recursoApoioSelecionado}
                    onChange={(event) => updateField("statusOperacional", event.target.value as StatusEquipamentoOperacional)}
                  >
                    {statusOperacionalOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </Field>
                <Field label="Horimetro atual" help="Leitura usada no acompanhamento de producao e manutencao.">
                  <input className="field-control" type="number" min="0" step="0.01" value={form.horimetroAtual} disabled={recursoApoioSelecionado} onChange={(event) => updateField("horimetroAtual", event.target.value)} />
                </Field>
                <Field label="KM atual" help="Leitura usada no acompanhamento de rodagem e manutencao.">
                  <input className="field-control" type="number" min="0" step="0.1" value={form.kmAtual} disabled={recursoApoioSelecionado} onChange={(event) => updateField("kmAtual", event.target.value)} />
                </Field>
                <Field label="Periodicidade em horas" help="Intervalo padrao entre manutencoes controladas por horimetro.">
                  <input className="field-control" type="number" min="1" value={form.periodicidadeManutencaoHoras} disabled={recursoApoioSelecionado} onChange={(event) => updateField("periodicidadeManutencaoHoras", event.target.value)} />
                </Field>
                <Field label="Periodicidade em KM" help="Intervalo padrao entre manutencoes controladas por quilometragem.">
                  <input className="field-control" type="number" min="1" value={form.periodicidadeManutencaoKm} disabled={recursoApoioSelecionado} onChange={(event) => updateField("periodicidadeManutencaoKm", event.target.value)} />
                </Field>
                <Field label="Equipamento complementar" help="Indica participacao de apoio na operacao principal.">
                  <select className="field-control" value={form.complementar ? "SIM" : "NAO"} disabled={recursoApoioSelecionado} onChange={(event) => updateField("complementar", event.target.value === "SIM")}>
                    <option value="NAO">NAO</option>
                    <option value="SIM">SIM</option>
                  </select>
                </Field>
              </>
            ) : (
              <div className="equipment-library-adaptive-note">
                Informacoes de frota e manutencao foram ocultadas porque nao sao necessarias para esta natureza de recurso.
              </div>
            )}
          </FormBlock>

          {recursoPatrimonial ? (
            <FormBlock
              title="GESTAO PATRIMONIAL"
              description="Dados de identificacao e entrada dos recursos pertencentes a empresa."
            >
              <Field label={recursoApoioSelecionado ? "TAG / identificador" : "Placa ou TAG"} help="Identificador unico do equipamento dentro da empresa.">
                <input className="field-control" value={form.placaOuTag} onChange={(event) => updateField("placaOuTag", event.target.value.toUpperCase())} />
              </Field>
              <Field label="Ano de fabricacao" help="Ano usado para referencia patrimonial e manutencao.">
                <input className="field-control" type="number" min="1950" max="2100" value={form.anoFabricacao} onChange={(event) => updateField("anoFabricacao", event.target.value)} />
              </Field>
              <Field label="Data de entrada" help="Data em que o equipamento passou a integrar a operacao.">
                <input className="field-control" type="date" value={form.dataEntrada} onChange={(event) => updateField("dataEntrada", event.target.value)} />
              </Field>
              <Field label="Marca / modelo livre" help="Descricao patrimonial complementar para registros legados.">
                <input className="field-control" value={form.marcaModelo} onChange={(event) => updateField("marcaModelo", event.target.value)} />
              </Field>
            </FormBlock>
          ) : null}

          <FormBlock title="OBSERVACOES" description="Informacoes adicionais relevantes para o uso deste recurso.">
            <Field label="Observacoes" help="Registre particularidades tecnicas ou comerciais que precisem ser conhecidas.">
              <textarea className="field-control textarea-lg" value={form.observacao} onChange={(event) => updateField("observacao", event.target.value)} />
            </Field>
          </FormBlock>

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
              placeholder="Buscar por descricao, placa, classe, fabricante ou apelido"
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
                <th>Formas de custeio</th>
                <th>Complementar</th>
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
                        .join(" | ") || "-"}
                    </div>
                    <div className="subtle">
                      Classe: {equipamento.classeOperacional || "Nao definida"}
                    </div>
                  </td>
                  <td>
                    <div>{equipamento.tipoControle}</div>
                    <div className="subtle">{equipamento.tipoRecurso}</div>
                    <div className="subtle">{equipamento.naturezaRecurso}</div>
                    <div className="subtle">
                      {equipamento.unidadeEconomicaPadrao
                        ? getUnidadeEconomica(equipamento.unidadeEconomicaPadrao)
                        : "Sem base economica"}
                    </div>
                  </td>
                  <td>
                    {equipamento.formasCusteio?.length ? (
                      <div style={{ display: "grid", gap: 6 }}>
                        {equipamento.formasCusteio.slice(0, 3).map((forma) => (
                          <div key={forma.id} className="subtle">
                            <strong>{forma.nome}</strong>{" "}
                            {forma.unidadeCusteio?.rotulo ?? "-"} | R$ {Number(forma.valorReferencia ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                            {forma.preferencial && forma.ativo ? " | Preferencial" : ""}
                            {!forma.ativo ? " | Inativa" : ""}
                          </div>
                        ))}
                        {equipamento.formasCusteio.length > 3 ? (
                          <div className="subtle">+{equipamento.formasCusteio.length - 3} forma(s)</div>
                        ) : null}
                      </div>
                    ) : (
                      <span className="subtle">Sem formas cadastradas</span>
                    )}
                  </td>
                  <td>
                    <span className={equipamento.complementar ? "badge badge-warn" : "badge badge-neutral"}>
                      {equipamento.complementar ? "SIM" : "NAO"}
                    </span>
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
