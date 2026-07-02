"use client";

import { useEffect, useMemo, useState } from "react";
import { SearchableSelect } from "@/components/form/searchable-select";

type TipoOrcamento = "COMERCIAL" | "OPERACIONAL";
type StatusOrcamento =
  | "RASCUNHO"
  | "EM_ELABORACAO"
  | "EM_REVISAO"
  | "PRONTO_PARA_PROPOSTA"
  | "PROPOSTA_EMITIDA"
  | "EM_NEGOCIACAO"
  | "APROVADO"
  | "REPROVADO"
  | "ARQUIVADO";
type TipoItemOrcamento =
  | "COMERCIAL"
  | "SERVICO_PRINCIPAL"
  | "SERVICO_AUXILIAR"
  | "RECURSO"
  | "MATERIAL"
  | "OUTRO";
type TipoPremissaOrcamento = "PREMISSA" | "CONDICAO" | "EXCLUSAO" | "OBSERVACAO";

type ClienteOption = {
  id: string;
  codigo: string;
  nome: string;
};

type ObraOption = {
  id: string;
  codigo: string;
  nome: string;
  clienteId: string;
};

type ServicoOption = {
  id: string;
  codigo: string;
  tipoServico: string;
  unidadeFaturamento?: string | null;
};

type MaterialOption = {
  id: string;
  codigoMaterial: string;
  descricao: string;
};

type EquipamentoOption = {
  id: string;
  placaOuTag: string;
  descricao: string;
  tipoRecurso: string;
};

type UsuarioOption = {
  id: string;
  nome: string;
  email: string;
  status: string;
};

type OptionsState = {
  clientes: ClienteOption[];
  obras: ObraOption[];
  servicos: ServicoOption[];
  materiais: MaterialOption[];
  equipamentos: EquipamentoOption[];
  usuarios: UsuarioOption[];
};

type FrenteForm = {
  localId: string;
  ordem: number;
  nome: string;
  descricao: string;
  metodoExecutivo: string;
  unidadeProducao: string;
  quantidadePrevista: string;
  produtividadeDia: string;
  prazoEstimadoDias: string;
  observacao: string;
};

type ItemForm = {
  localId: string;
  frenteTempId: string;
  tipoItem: TipoItemOrcamento;
  servicoId: string;
  materialId: string;
  equipamentoId: string;
  ordem: number;
  codigo: string;
  descricao: string;
  unidade: string;
  quantidade: string;
  produtividade: string;
  custoUnitario: string;
  valorUnitario: string;
  observacao: string;
};

type FormacaoPrecoForm = {
  custoDireto: string;
  custoIndireto: string;
  impostosPercentual: string;
  impostosValor: string;
  margemPercentual: string;
  margemValor: string;
  precoSugerido: string;
  precoFinal: string;
  observacao: string;
};

type PremissaForm = {
  localId: string;
  tipo: TipoPremissaOrcamento;
  ordem: number;
  titulo: string;
  descricao: string;
};

type OrcamentoForm = {
  id?: string;
  tipo: TipoOrcamento;
  status: StatusOrcamento;
  clienteId: string;
  obraId: string;
  responsavelId: string;
  dataOrcamento: string;
  validadeAte: string;
  titulo: string;
  objeto: string;
  observacaoInterna: string;
  observacaoCliente: string;
  valorDesconto: string;
  valorAcrescimo: string;
  formacaoPreco: FormacaoPrecoForm;
  frentes: FrenteForm[];
  itens: ItemForm[];
  premissas: PremissaForm[];
};

type OrcamentoApi = {
  id: string;
  codigo: string;
  tipo: TipoOrcamento;
  status: StatusOrcamento;
  clienteId: string;
  obraId: string | null;
  responsavelId: string | null;
  dataOrcamento: string;
  validadeAte: string | null;
  titulo: string | null;
  objeto: string | null;
  observacaoInterna: string | null;
  observacaoCliente: string | null;
  valorSubtotal: string | number;
  valorDesconto: string | number;
  valorAcrescimo: string | number;
  valorTotal: string | number;
  cliente?: {
    nome: string;
    codigo?: string | null;
  };
  obra?: {
    nome: string;
    codigo?: string | null;
  } | null;
  responsavel?: {
    nome: string;
  } | null;
  formacaoPreco?: Partial<FormacaoPrecoForm> | null;
  frentes: Array<{
    id: string;
    ordem: number;
    nome: string;
    descricao: string | null;
    metodoExecutivo: string | null;
    unidadeProducao: string | null;
    quantidadePrevista: string | number | null;
    produtividadeDia: string | number | null;
    prazoEstimadoDias: number | null;
    observacao: string | null;
  }>;
  itens: Array<{
    id: string;
    frenteId: string | null;
    tipoItem: TipoItemOrcamento;
    servicoId: string | null;
    materialId: string | null;
    equipamentoId: string | null;
    ordem: number;
    codigo: string | null;
    descricao: string;
    unidade: string;
    quantidade: string | number;
    produtividade: string | number | null;
    custoUnitario: string | number;
    valorUnitario: string | number;
    observacao: string | null;
  }>;
  premissas: Array<{
    id: string;
    tipo: TipoPremissaOrcamento;
    ordem: number;
    titulo: string | null;
    descricao: string;
  }>;
};

const statusOptions: { value: StatusOrcamento; label: string }[] = [
  { value: "RASCUNHO", label: "Rascunho" },
  { value: "EM_ELABORACAO", label: "Em elaboracao" },
  { value: "EM_REVISAO", label: "Em revisao" },
  { value: "PRONTO_PARA_PROPOSTA", label: "Pronto para proposta" },
  { value: "PROPOSTA_EMITIDA", label: "Proposta emitida" },
  { value: "EM_NEGOCIACAO", label: "Em negociacao" },
  { value: "APROVADO", label: "Aprovado" },
  { value: "REPROVADO", label: "Reprovado" },
  { value: "ARQUIVADO", label: "Arquivado" }
];

const tipoOptions: { value: TipoOrcamento; label: string }[] = [
  { value: "COMERCIAL", label: "Comercial" },
  { value: "OPERACIONAL", label: "Operacional" }
];

const tipoItemOptions: { value: TipoItemOrcamento; label: string }[] = [
  { value: "COMERCIAL", label: "Comercial" },
  { value: "SERVICO_PRINCIPAL", label: "Servico principal" },
  { value: "SERVICO_AUXILIAR", label: "Servico auxiliar" },
  { value: "RECURSO", label: "Recurso" },
  { value: "MATERIAL", label: "Material" },
  { value: "OUTRO", label: "Outro" }
];

const premissaTipoOptions: { value: TipoPremissaOrcamento; label: string; helper: string }[] = [
  {
    value: "PREMISSA",
    label: "Premissas tecnicas",
    helper: "Base tecnica considerada para executar e precificar o escopo."
  },
  {
    value: "CONDICAO",
    label: "Condicoes comerciais",
    helper: "Prazo, pagamento, validade e criterios comerciais da proposta."
  },
  {
    value: "EXCLUSAO",
    label: "Exclusoes do escopo",
    helper: "Itens explicitamente nao considerados na proposta."
  },
  {
    value: "OBSERVACAO",
    label: "Observacoes complementares",
    helper: "Notas gerais para contextualizar a proposta ao cliente."
  }
];

const emptyOptions: OptionsState = {
  clientes: [],
  obras: [],
  servicos: [],
  materiais: [],
  equipamentos: [],
  usuarios: []
};

function todayInput() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createEmptyForm(): OrcamentoForm {
  return {
    tipo: "COMERCIAL",
    status: "RASCUNHO",
    clienteId: "",
    obraId: "",
    responsavelId: "",
    dataOrcamento: todayInput(),
    validadeAte: "",
    titulo: "",
    objeto: "",
    observacaoInterna: "",
    observacaoCliente: "",
    valorDesconto: "0",
    valorAcrescimo: "0",
    formacaoPreco: {
      custoDireto: "0",
      custoIndireto: "0",
      impostosPercentual: "0",
      impostosValor: "0",
      margemPercentual: "0",
      margemValor: "0",
      precoSugerido: "0",
      precoFinal: "0",
      observacao: ""
    },
    frentes: [],
    itens: [createEmptyItem("COMERCIAL", 1)],
    premissas: createInitialPremissas()
  };
}

function createEmptyFrente(ordem: number): FrenteForm {
  return {
    localId: uid("frente"),
    ordem,
    nome: `Frente ${ordem}`,
    descricao: "",
    metodoExecutivo: "",
    unidadeProducao: "",
    quantidadePrevista: "",
    produtividadeDia: "",
    prazoEstimadoDias: "",
    observacao: ""
  };
}

function createEmptyItem(tipoItem: TipoItemOrcamento, ordem: number, frenteTempId = ""): ItemForm {
  return {
    localId: uid("item"),
    frenteTempId,
    tipoItem,
    servicoId: "",
    materialId: "",
    equipamentoId: "",
    ordem,
    codigo: "",
    descricao: "",
    unidade: "UN",
    quantidade: "1",
    produtividade: "",
    custoUnitario: "0",
    valorUnitario: "0",
    observacao: ""
  };
}

function createInitialPremissas() {
  return premissaTipoOptions.map((option, index) => createEmptyPremissa(option.value, index + 1));
}

function createEmptyPremissa(tipo: TipoPremissaOrcamento, ordem: number): PremissaForm {
  return {
    localId: uid("premissa"),
    tipo,
    ordem,
    titulo: "",
    descricao: ""
  };
}

function formatCurrency(value: unknown) {
  const number = Number(value ?? 0);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number.isFinite(number) ? number : 0);
}

function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("pt-BR");
}

function toDateInput(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toStringValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
}

function getStatusLabel(value: StatusOrcamento) {
  return statusOptions.find((option) => option.value === value)?.label ?? value;
}

function getTipoLabel(value: TipoOrcamento) {
  return tipoOptions.find((option) => option.value === value)?.label ?? value;
}

function calcItemTotal(item: Pick<ItemForm, "quantidade" | "valorUnitario">) {
  return (Number(item.quantidade) || 0) * (Number(item.valorUnitario) || 0);
}

function calcItemCost(item: Pick<ItemForm, "quantidade" | "custoUnitario">) {
  return (Number(item.quantidade) || 0) * (Number(item.custoUnitario) || 0);
}

export function OrcamentosManager() {
  const [items, setItems] = useState<OrcamentoApi[]>([]);
  const [options, setOptions] = useState<OptionsState>(emptyOptions);
  const [form, setForm] = useState<OrcamentoForm>(() => createEmptyForm());
  const [selectedId, setSelectedId] = useState<string>("");
  const [filters, setFilters] = useState({
    search: "",
    tipo: "TODOS",
    status: "TODOS"
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const clienteOptions = useMemo(
    () =>
      options.clientes.map((cliente) => ({
        value: cliente.id,
        label: `${cliente.codigo} - ${cliente.nome}`
      })),
    [options.clientes]
  );

  const obraOptions = useMemo(
    () =>
      options.obras
        .filter((obra) => !form.clienteId || obra.clienteId === form.clienteId)
        .map((obra) => ({
          value: obra.id,
          label: `${obra.codigo} - ${obra.nome}`
        })),
    [form.clienteId, options.obras]
  );

  const responsavelOptions = useMemo(
    () =>
      options.usuarios
        .filter((usuario) => usuario.status === "ATIVO")
        .map((usuario) => ({
          value: usuario.id,
          label: `${usuario.nome} - ${usuario.email}`
        })),
    [options.usuarios]
  );

  const servicoOptions = useMemo(
    () =>
      options.servicos.map((servico) => ({
        value: servico.id,
        label: `${servico.codigo} - ${servico.tipoServico}`
      })),
    [options.servicos]
  );

  const materialOptions = useMemo(
    () =>
      options.materiais.map((material) => ({
        value: material.id,
        label: `${material.codigoMaterial} - ${material.descricao}`
      })),
    [options.materiais]
  );

  const equipamentoOptions = useMemo(
    () =>
      options.equipamentos.map((equipamento) => ({
        value: equipamento.id,
        label: `${equipamento.placaOuTag} - ${equipamento.descricao}`
      })),
    [options.equipamentos]
  );

  const subtotalForm = useMemo(
    () => form.itens.reduce((sum, item) => sum + calcItemTotal(item), 0),
    [form.itens]
  );
  const custoItensForm = useMemo(
    () => form.itens.reduce((sum, item) => sum + calcItemCost(item), 0),
    [form.itens]
  );
  const custoDiretoForm = custoItensForm > 0 ? custoItensForm : Number(form.formacaoPreco.custoDireto) || 0;
  const custoIndiretoForm = Number(form.formacaoPreco.custoIndireto) || 0;
  const baseCustosForm = custoDiretoForm + custoIndiretoForm;
  const margemValorForm =
    Number(form.formacaoPreco.margemValor) ||
    baseCustosForm * ((Number(form.formacaoPreco.margemPercentual) || 0) / 100);
  const impostosValorForm =
    Number(form.formacaoPreco.impostosValor) ||
    (baseCustosForm + margemValorForm) *
      ((Number(form.formacaoPreco.impostosPercentual) || 0) / 100);
  const precoSugeridoForm =
    Number(form.formacaoPreco.precoSugerido) ||
    baseCustosForm + margemValorForm + impostosValorForm;
  const precoFinalManual = Number(form.formacaoPreco.precoFinal) || 0;
  const baseVendaForm =
    precoFinalManual > 0 ? precoFinalManual : subtotalForm > 0 ? subtotalForm : precoSugeridoForm;
  const totalForm = Math.max(
    0,
    baseVendaForm - (Number(form.valorDesconto) || 0) + (Number(form.valorAcrescimo) || 0)
  );
  const prazoEstimadoForm = useMemo(
    () =>
      form.frentes.reduce(
        (maiorPrazo, frente) => Math.max(maiorPrazo, Number(frente.prazoEstimadoDias) || 0),
        0
      ),
    [form.frentes]
  );

  useEffect(() => {
    loadOptions();
    loadOrcamentos();
  }, []);

  async function loadOptions() {
    const [operacionaisResponse, usuariosResponse] = await Promise.all([
      fetch("/api/opcoes/operacionais"),
      fetch("/api/usuarios")
    ]);

    const operacionais = operacionaisResponse.ok ? await operacionaisResponse.json() : emptyOptions;
    const usuarios = usuariosResponse.ok ? await usuariosResponse.json() : { items: [] };

    setOptions({
      clientes: operacionais.clientes ?? [],
      obras: operacionais.obras ?? [],
      servicos: operacionais.servicos ?? [],
      materiais: operacionais.materiais ?? [],
      equipamentos: operacionais.equipamentos ?? [],
      usuarios: usuarios.items ?? []
    });
  }

  async function loadOrcamentos(nextFilters = filters) {
    setLoading(true);
    setError("");

    const params = new URLSearchParams();
    if (nextFilters.search.trim()) params.set("search", nextFilters.search.trim());
    if (nextFilters.tipo !== "TODOS") params.set("tipo", nextFilters.tipo);
    if (nextFilters.status !== "TODOS") params.set("status", nextFilters.status);

    const response = await fetch(`/api/orcamentos?${params.toString()}`);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(data.message ?? "Nao foi possivel carregar os orcamentos.");
      setLoading(false);
      return;
    }

    setItems(data.items ?? []);
    setLoading(false);
  }

  function updateFilter(key: keyof typeof filters, value: string) {
    const next = {
      ...filters,
      [key]: value
    };
    setFilters(next);
    loadOrcamentos(next);
  }

  function updateForm<K extends keyof OrcamentoForm>(key: K, value: OrcamentoForm[K]) {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  function updateFormacao(key: keyof FormacaoPrecoForm, value: string) {
    setForm((current) => ({
      ...current,
      formacaoPreco: {
        ...current.formacaoPreco,
        [key]: value
      }
    }));
  }

  function updateFrente(localId: string, key: keyof FrenteForm, value: string | number) {
    setForm((current) => ({
      ...current,
      frentes: current.frentes.map((frente) =>
        frente.localId === localId ? { ...frente, [key]: value } : frente
      )
    }));
  }

  function updateItem(localId: string, key: keyof ItemForm, value: string | number) {
    setForm((current) => ({
      ...current,
      itens: current.itens.map((item) =>
        item.localId === localId ? { ...item, [key]: value } : item
      )
    }));
  }

  function handleTipoChange(tipo: TipoOrcamento) {
    setForm((current) => {
      if (tipo === "OPERACIONAL" && current.frentes.length === 0) {
        const frente = createEmptyFrente(1);
        return {
          ...current,
          tipo,
          status: current.status === "RASCUNHO" ? "EM_ELABORACAO" : current.status,
          frentes: [frente],
          itens: current.itens.map((item) => ({
            ...item,
            tipoItem: item.tipoItem === "COMERCIAL" ? "SERVICO_PRINCIPAL" : item.tipoItem,
            frenteTempId: item.frenteTempId || frente.localId
          }))
        };
      }

      if (tipo === "COMERCIAL") {
        return {
          ...current,
          tipo,
          frentes: [],
          itens: current.itens.map((item) => ({
            ...item,
            tipoItem: "COMERCIAL",
            frenteTempId: ""
          }))
        };
      }

      return {
        ...current,
        tipo
      };
    });
  }

  function addFrente() {
    setForm((current) => ({
      ...current,
      frentes: [...current.frentes, createEmptyFrente(current.frentes.length + 1)]
    }));
  }

  function removeFrente(localId: string) {
    setForm((current) => ({
      ...current,
      frentes: current.frentes.filter((frente) => frente.localId !== localId),
      itens: current.itens.map((item) =>
        item.frenteTempId === localId ? { ...item, frenteTempId: "" } : item
      )
    }));
  }

  function addItem() {
    setForm((current) => {
      const firstFrente = current.frentes[0]?.localId ?? "";
      const tipoItem: TipoItemOrcamento =
        current.tipo === "OPERACIONAL" ? "SERVICO_AUXILIAR" : "COMERCIAL";

      return {
        ...current,
        itens: [...current.itens, createEmptyItem(tipoItem, current.itens.length + 1, firstFrente)]
      };
    });
  }

  function removeItem(localId: string) {
    setForm((current) => ({
      ...current,
      itens: current.itens.filter((item) => item.localId !== localId)
    }));
  }

  function addPremissa(tipo: TipoPremissaOrcamento) {
    setForm((current) => {
      const ordem =
        current.premissas.filter((premissa) => premissa.tipo === tipo).length + 1;

      return {
        ...current,
        premissas: [...current.premissas, createEmptyPremissa(tipo, ordem)]
      };
    });
  }

  function removePremissa(localId: string) {
    setForm((current) => ({
      ...current,
      premissas: current.premissas.filter((premissa) => premissa.localId !== localId)
    }));
  }

  function updatePremissa(localId: string, key: keyof PremissaForm, value: string | number) {
    setForm((current) => ({
      ...current,
      premissas: current.premissas.map((premissa) =>
        premissa.localId === localId ? { ...premissa, [key]: value } : premissa
      )
    }));
  }

  function novoOrcamento() {
    setSelectedId("");
    setForm(createEmptyForm());
    setMessage("");
    setError("");
  }

  async function abrirOrcamento(orcamento: OrcamentoApi) {
    setSelectedId(orcamento.id);
    setMessage("");
    setError("");

    const response = await fetch(`/api/orcamentos/${orcamento.id}`);
    const data = await response.json();

    if (!response.ok) {
      setError(data.message ?? "Nao foi possivel abrir o orcamento.");
      return;
    }

    setForm(mapApiToForm(data));
  }

  async function salvarOrcamento() {
    setSaving(true);
    setMessage("");
    setError("");

    const payload = buildPayload(form);
    const response = await fetch(selectedId ? `/api/orcamentos/${selectedId}` : "/api/orcamentos", {
      method: selectedId ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(data.message ?? "Nao foi possivel salvar o orcamento.");
      setSaving(false);
      return;
    }

    setSelectedId(data.id);
    setForm(mapApiToForm(data));
    setMessage(selectedId ? "Orcamento atualizado." : "Orcamento criado.");
    await loadOrcamentos();
    setSaving(false);
  }

  async function duplicar(id: string) {
    setMessage("");
    setError("");

    const response = await fetch(`/api/orcamentos/${id}/duplicar`, {
      method: "POST"
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(data.message ?? "Nao foi possivel duplicar o orcamento.");
      return;
    }

    setSelectedId(data.id);
    setForm(mapApiToForm(data));
    setMessage("Orcamento duplicado como rascunho.");
    await loadOrcamentos();
  }

  async function evoluirParaOperacional() {
    if (!selectedId) {
      return;
    }

    if (!window.confirm("Evoluir este orcamento comercial para operacional?")) {
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    const response = await fetch(`/api/orcamentos/${selectedId}/evoluir`, {
      method: "POST"
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(data.message ?? "Nao foi possivel evoluir o orcamento.");
      setSaving(false);
      return;
    }

    setForm(mapApiToForm(data));
    setMessage("Orcamento evoluido para operacional.");
    await loadOrcamentos();
    setSaving(false);
  }

  function gerarPdf() {
    if (!selectedId) {
      setError("Salve ou selecione um orcamento antes de gerar o PDF.");
      return;
    }

    window.open(`/api/orcamentos/${selectedId}/pdf`, "_blank", "noopener,noreferrer");
  }

  async function arquivar(id: string) {
    if (!window.confirm("Arquivar este orcamento?")) {
      return;
    }

    setMessage("");
    setError("");

    const response = await fetch(`/api/orcamentos/${id}`, {
      method: "DELETE"
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(data.message ?? "Nao foi possivel arquivar o orcamento.");
      return;
    }

    if (selectedId === id) {
      novoOrcamento();
    }

    setMessage("Orcamento arquivado.");
    await loadOrcamentos();
  }

  return (
    <section className="orcamentos-shell">
      <div className="orcamentos-hero">
        <div>
          <span className="orcamentos-kicker">BasePro propostas</span>
          <h1>Orcamentos</h1>
          <p>
            Fluxo inicial para cadastrar propostas comerciais e estruturacoes operacionais sem
            interferir nos modulos de medicao, compras ou lancamentos.
          </p>
        </div>
        <div className="orcamentos-hero-card">
          <span>Carteira em tela</span>
          <strong>{items.length}</strong>
          <small>orcamento(s) no filtro atual</small>
        </div>
      </div>

      <div className="orcamentos-grid">
        <aside className="orcamentos-list-panel">
          <div className="orcamentos-panel-header">
            <div>
              <span className="orcamentos-section-label">Lista</span>
              <h2>Pipeline comercial</h2>
            </div>
            <button type="button" className="button-primary" onClick={novoOrcamento}>
              Novo
            </button>
          </div>

          <div className="orcamentos-filter-grid">
            <label className="manager-field">
              <span className="manager-field-label">Pesquisar</span>
              <input
                className="field-control"
                value={filters.search}
                placeholder="Codigo, cliente, obra ou item"
                onChange={(event) => updateFilter("search", event.target.value)}
              />
            </label>
            <label className="manager-field">
              <span className="manager-field-label">Tipo</span>
              <select
                className="field-control"
                value={filters.tipo}
                onChange={(event) => updateFilter("tipo", event.target.value)}
              >
                <option value="TODOS">Todos</option>
                {tipoOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="manager-field">
              <span className="manager-field-label">Status</span>
              <select
                className="field-control"
                value={filters.status}
                onChange={(event) => updateFilter("status", event.target.value)}
              >
                <option value="TODOS">Todos</option>
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {loading ? (
            <p className="orcamentos-empty">Carregando orcamentos...</p>
          ) : items.length === 0 ? (
            <p className="orcamentos-empty">Nenhum orcamento encontrado para o filtro atual.</p>
          ) : (
            <div className="orcamentos-list">
              {items.map((orcamento) => (
                <article
                  key={orcamento.id}
                  className={`orcamentos-list-card ${
                    selectedId === orcamento.id ? "orcamentos-list-card-active" : ""
                  }`}
                >
                  <button type="button" onClick={() => abrirOrcamento(orcamento)}>
                    <span className="orcamentos-code">{orcamento.codigo}</span>
                    <strong>{orcamento.titulo || orcamento.objeto || "Sem titulo"}</strong>
                    <small>
                      {orcamento.cliente?.nome ?? "Cliente nao informado"}
                      {orcamento.obra?.nome ? ` / ${orcamento.obra.nome}` : ""}
                    </small>
                    <span className="orcamentos-list-meta">
                      {getTipoLabel(orcamento.tipo)} | {getStatusLabel(orcamento.status)} |{" "}
                      {formatCurrency(orcamento.valorTotal)}
                    </span>
                  </button>
                  <div className="orcamentos-list-actions">
                    <button type="button" onClick={() => duplicar(orcamento.id)}>
                      Duplicar
                    </button>
                    <button type="button" onClick={() => arquivar(orcamento.id)}>
                      Arquivar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </aside>

        <div className="orcamentos-workspace">
          <div className="orcamentos-panel-header">
            <div>
              <span className="orcamentos-section-label">
                {selectedId ? "Edicao" : "Cadastro"}
              </span>
              <h2>{selectedId ? "Ajustar orcamento" : "Novo orcamento"}</h2>
            </div>
            <div className="orcamentos-total-card">
              <span>Total previsto</span>
              <strong>{formatCurrency(totalForm)}</strong>
            </div>
          </div>

          {message ? <div className="message-inline">{message}</div> : null}
          {error ? <div className="message-inline message-inline-danger">{error}</div> : null}

          <div className="orcamentos-mode-switch">
            {tipoOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={form.tipo === option.value ? "orcamentos-mode-active" : ""}
                onClick={() => handleTipoChange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="orcamentos-form-section">
            <div className="orcamentos-form-heading">
              <span>01</span>
              <h3>Cabecalho</h3>
            </div>
            <div className="orcamentos-form-grid">
              <label className="manager-field orcamentos-span-2">
                <span className="manager-field-label">Cliente</span>
                <SearchableSelect
                  value={form.clienteId}
                  options={clienteOptions}
                  placeholder="Digite para buscar o cliente"
                  onChange={(value) => {
                    updateForm("clienteId", value);
                    updateForm("obraId", "");
                  }}
                />
              </label>
              <label className="manager-field">
                <span className="manager-field-label">Obra</span>
                <SearchableSelect
                  value={form.obraId}
                  options={obraOptions}
                  placeholder="Digite para buscar a obra"
                  onChange={(value) => updateForm("obraId", value)}
                />
              </label>
              <label className="manager-field">
                <span className="manager-field-label">Responsavel</span>
                <SearchableSelect
                  value={form.responsavelId}
                  options={responsavelOptions}
                  placeholder="Digite para buscar"
                  emptyLabel="Sem usuarios disponiveis para selecao."
                  onChange={(value) => updateForm("responsavelId", value)}
                />
              </label>
              <label className="manager-field">
                <span className="manager-field-label">Data</span>
                <input
                  type="date"
                  className="field-control"
                  value={form.dataOrcamento}
                  onChange={(event) => updateForm("dataOrcamento", event.target.value)}
                />
              </label>
              <label className="manager-field">
                <span className="manager-field-label">Validade</span>
                <input
                  type="date"
                  className="field-control"
                  value={form.validadeAte}
                  onChange={(event) => updateForm("validadeAte", event.target.value)}
                />
              </label>
              <label className="manager-field">
                <span className="manager-field-label">Status</span>
                <select
                  className="field-control"
                  value={form.status}
                  onChange={(event) => updateForm("status", event.target.value as StatusOrcamento)}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="manager-field orcamentos-span-2">
                <span className="manager-field-label">Titulo</span>
                <input
                  className="field-control"
                  value={form.titulo}
                  placeholder="Ex: Locacao de escavadeira para obra centro"
                  onChange={(event) => updateForm("titulo", event.target.value)}
                />
              </label>
              <label className="manager-field orcamentos-span-3">
                <span className="manager-field-label">Objeto da proposta</span>
                <textarea
                  className="field-control"
                  rows={3}
                  value={form.objeto}
                  placeholder="Descreva o escopo de forma simples."
                  onChange={(event) => updateForm("objeto", event.target.value)}
                />
              </label>
            </div>
          </div>

          {form.tipo === "OPERACIONAL" ? (
            <FrentesSection
              frentes={form.frentes}
              onAdd={addFrente}
              onRemove={removeFrente}
              onUpdate={updateFrente}
            />
          ) : null}

          <ItensSection
            tipo={form.tipo}
            itens={form.itens}
            frentes={form.frentes}
            servicoOptions={servicoOptions}
            materialOptions={materialOptions}
            equipamentoOptions={equipamentoOptions}
            onAdd={addItem}
            onRemove={removeItem}
            onUpdate={updateItem}
          />

          <div className="orcamentos-form-section">
            <div className="orcamentos-form-heading">
              <span>04</span>
              <h3>Formacao preliminar</h3>
            </div>
            <div className="orcamentos-form-grid">
              <label className="manager-field">
                <span className="manager-field-label">Custo direto</span>
                <input
                  className="field-control"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.formacaoPreco.custoDireto}
                  onChange={(event) => updateFormacao("custoDireto", event.target.value)}
                />
              </label>
              <label className="manager-field">
                <span className="manager-field-label">Custo indireto</span>
                <input
                  className="field-control"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.formacaoPreco.custoIndireto}
                  onChange={(event) => updateFormacao("custoIndireto", event.target.value)}
                />
              </label>
              <label className="manager-field">
                <span className="manager-field-label">Margem %</span>
                <input
                  className="field-control"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.formacaoPreco.margemPercentual}
                  onChange={(event) => updateFormacao("margemPercentual", event.target.value)}
                />
              </label>
              <label className="manager-field">
                <span className="manager-field-label">Impostos %</span>
                <input
                  className="field-control"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.formacaoPreco.impostosPercentual}
                  onChange={(event) => updateFormacao("impostosPercentual", event.target.value)}
                />
              </label>
              <label className="manager-field">
                <span className="manager-field-label">Preco final manual</span>
                <input
                  className="field-control"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.formacaoPreco.precoFinal}
                  onChange={(event) => updateFormacao("precoFinal", event.target.value)}
                />
              </label>
              <label className="manager-field">
                <span className="manager-field-label">Desconto</span>
                <input
                  className="field-control"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.valorDesconto}
                  onChange={(event) => updateForm("valorDesconto", event.target.value)}
                />
              </label>
              <label className="manager-field">
                <span className="manager-field-label">Acrescimo</span>
                <input
                  className="field-control"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.valorAcrescimo}
                  onChange={(event) => updateForm("valorAcrescimo", event.target.value)}
                />
              </label>
              <label className="manager-field orcamentos-span-3">
                <span className="manager-field-label">Observacoes internas</span>
                <textarea
                  className="field-control"
                  rows={3}
                  value={form.observacaoInterna}
                  onChange={(event) => updateForm("observacaoInterna", event.target.value)}
                />
              </label>
            </div>

            <div className="orcamentos-summary-strip">
              <span>Subtotal: {formatCurrency(subtotalForm)}</span>
              <span>Desconto: {formatCurrency(form.valorDesconto)}</span>
              <span>Acrescimo: {formatCurrency(form.valorAcrescimo)}</span>
              <strong>Total: {formatCurrency(totalForm)}</strong>
            </div>

            <div className="orcamentos-resumo-grid">
              <article>
                <span>Preco sugerido</span>
                <strong>{formatCurrency(precoSugeridoForm)}</strong>
                <small>Custo + margem + impostos.</small>
              </article>
              <article>
                <span>Custo estimado</span>
                <strong>{formatCurrency(baseCustosForm)}</strong>
                <small>Direto dos itens ou valor manual + indireto.</small>
              </article>
              <article>
                <span>Margem estimada</span>
                <strong>{formatCurrency(margemValorForm)}</strong>
                <small>{form.formacaoPreco.margemPercentual || 0}% sobre a base de custos.</small>
              </article>
              <article>
                <span>Prazo operacional</span>
                <strong>{prazoEstimadoForm ? `${prazoEstimadoForm} dia(s)` : "-"}</strong>
                <small>Maior prazo informado nas frentes.</small>
              </article>
            </div>
          </div>

          <PremissasSection
            premissas={form.premissas}
            onAdd={addPremissa}
            onRemove={removePremissa}
            onUpdate={updatePremissa}
          />

          <div className="orcamentos-actions">
            {selectedId && form.tipo === "COMERCIAL" ? (
              <button
                type="button"
                className="button-secondary"
                disabled={saving}
                onClick={evoluirParaOperacional}
              >
                Evoluir para operacional
              </button>
            ) : null}
            {selectedId ? (
              <button type="button" className="button-secondary" onClick={gerarPdf}>
                PDF proposta
              </button>
            ) : null}
            <button type="button" className="button-primary" disabled={saving} onClick={salvarOrcamento}>
              {saving ? "Salvando..." : selectedId ? "Atualizar orcamento" : "Criar orcamento"}
            </button>
            <button type="button" className="button-secondary" onClick={novoOrcamento}>
              Limpar formulario
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function FrentesSection(props: {
  frentes: FrenteForm[];
  onAdd: () => void;
  onRemove: (localId: string) => void;
  onUpdate: (localId: string, key: keyof FrenteForm, value: string | number) => void;
}) {
  return (
    <div className="orcamentos-form-section">
      <div className="orcamentos-form-heading">
        <span>02</span>
        <h3>Frentes de servico</h3>
        <button type="button" className="button-secondary" onClick={props.onAdd}>
          Adicionar frente
        </button>
      </div>

      <div className="orcamentos-card-stack">
        {props.frentes.map((frente) => (
          <article key={frente.localId} className="orcamentos-subcard">
            <div className="orcamentos-subcard-title">
              <strong>#{frente.ordem}</strong>
              <button type="button" onClick={() => props.onRemove(frente.localId)}>
                Remover
              </button>
            </div>
            <div className="orcamentos-form-grid">
              <label className="manager-field">
                <span className="manager-field-label">Nome da frente</span>
                <input
                  className="field-control"
                  value={frente.nome}
                  onChange={(event) => props.onUpdate(frente.localId, "nome", event.target.value)}
                />
              </label>
              <label className="manager-field">
                <span className="manager-field-label">Unidade</span>
                <input
                  className="field-control"
                  value={frente.unidadeProducao}
                  placeholder="m3, dia, hora"
                  onChange={(event) =>
                    props.onUpdate(frente.localId, "unidadeProducao", event.target.value)
                  }
                />
              </label>
              <label className="manager-field">
                <span className="manager-field-label">Prazo estimado</span>
                <input
                  className="field-control"
                  type="number"
                  min="0"
                  value={frente.prazoEstimadoDias}
                  onChange={(event) =>
                    props.onUpdate(frente.localId, "prazoEstimadoDias", event.target.value)
                  }
                />
              </label>
              <label className="manager-field orcamentos-span-3">
                <span className="manager-field-label">Metodo executivo</span>
                <textarea
                  className="field-control"
                  rows={2}
                  value={frente.metodoExecutivo}
                  onChange={(event) =>
                    props.onUpdate(frente.localId, "metodoExecutivo", event.target.value)
                  }
                />
              </label>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function ItensSection(props: {
  tipo: TipoOrcamento;
  itens: ItemForm[];
  frentes: FrenteForm[];
  servicoOptions: { value: string; label: string }[];
  materialOptions: { value: string; label: string }[];
  equipamentoOptions: { value: string; label: string }[];
  onAdd: () => void;
  onRemove: (localId: string) => void;
  onUpdate: (localId: string, key: keyof ItemForm, value: string | number) => void;
}) {
  return (
    <div className="orcamentos-form-section">
      <div className="orcamentos-form-heading">
        <span>{props.tipo === "OPERACIONAL" ? "03" : "02"}</span>
        <h3>{props.tipo === "OPERACIONAL" ? "Itens da frente" : "Itens comerciais"}</h3>
        <button type="button" className="button-secondary" onClick={props.onAdd}>
          Adicionar item
        </button>
      </div>

      <div className="orcamentos-items-list">
        {props.itens.map((item) => (
          <article key={item.localId} className="orcamentos-item-card">
            <div className="orcamentos-item-head">
              <strong>Item {item.ordem}</strong>
              <span>{formatCurrency(calcItemTotal(item))}</span>
              <button type="button" onClick={() => props.onRemove(item.localId)}>
                Remover
              </button>
            </div>
            <div className="orcamentos-form-grid">
              {props.tipo === "OPERACIONAL" ? (
                <label className="manager-field">
                  <span className="manager-field-label">Frente</span>
                  <select
                    className="field-control"
                    value={item.frenteTempId}
                    onChange={(event) =>
                      props.onUpdate(item.localId, "frenteTempId", event.target.value)
                    }
                  >
                    <option value="">Sem frente</option>
                    {props.frentes.map((frente) => (
                      <option key={frente.localId} value={frente.localId}>
                        {frente.ordem} - {frente.nome}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label className="manager-field">
                <span className="manager-field-label">Tipo de item</span>
                <select
                  className="field-control"
                  value={item.tipoItem}
                  onChange={(event) =>
                    props.onUpdate(item.localId, "tipoItem", event.target.value as TipoItemOrcamento)
                  }
                >
                  {tipoItemOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="manager-field">
                <span className="manager-field-label">Servico</span>
                <SearchableSelect
                  value={item.servicoId}
                  options={props.servicoOptions}
                  placeholder="Buscar servico"
                  onChange={(value) => props.onUpdate(item.localId, "servicoId", value)}
                />
              </label>

              <label className="manager-field">
                <span className="manager-field-label">Equipamento</span>
                <SearchableSelect
                  value={item.equipamentoId}
                  options={props.equipamentoOptions}
                  placeholder="Opcional"
                  onChange={(value) => props.onUpdate(item.localId, "equipamentoId", value)}
                />
              </label>

              <label className="manager-field">
                <span className="manager-field-label">Material</span>
                <SearchableSelect
                  value={item.materialId}
                  options={props.materialOptions}
                  placeholder="Opcional"
                  onChange={(value) => props.onUpdate(item.localId, "materialId", value)}
                />
              </label>

              <label className="manager-field orcamentos-span-2">
                <span className="manager-field-label">Descricao</span>
                <input
                  className="field-control"
                  value={item.descricao}
                  onChange={(event) =>
                    props.onUpdate(item.localId, "descricao", event.target.value)
                  }
                />
              </label>

              <label className="manager-field">
                <span className="manager-field-label">Unidade</span>
                <input
                  className="field-control"
                  value={item.unidade}
                  onChange={(event) => props.onUpdate(item.localId, "unidade", event.target.value)}
                />
              </label>
              <label className="manager-field">
                <span className="manager-field-label">Quantidade</span>
                <input
                  className="field-control"
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.quantidade}
                  onChange={(event) =>
                    props.onUpdate(item.localId, "quantidade", event.target.value)
                  }
                />
              </label>
              <label className="manager-field">
                <span className="manager-field-label">Valor unitario</span>
                <input
                  className="field-control"
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.valorUnitario}
                  onChange={(event) =>
                    props.onUpdate(item.localId, "valorUnitario", event.target.value)
                  }
                />
              </label>
              {props.tipo === "OPERACIONAL" ? (
                <>
                  <label className="manager-field">
                    <span className="manager-field-label">Custo unitario</span>
                    <input
                      className="field-control"
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.custoUnitario}
                      onChange={(event) =>
                        props.onUpdate(item.localId, "custoUnitario", event.target.value)
                      }
                    />
                  </label>
                  <label className="manager-field">
                    <span className="manager-field-label">Produtividade</span>
                    <input
                      className="field-control"
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.produtividade}
                      onChange={(event) =>
                        props.onUpdate(item.localId, "produtividade", event.target.value)
                      }
                    />
                  </label>
                </>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function PremissasSection(props: {
  premissas: PremissaForm[];
  onAdd: (tipo: TipoPremissaOrcamento) => void;
  onRemove: (localId: string) => void;
  onUpdate: (localId: string, key: keyof PremissaForm, value: string | number) => void;
}) {
  return (
    <div className="orcamentos-form-section">
      <div className="orcamentos-form-heading">
        <span>05</span>
        <div>
          <h3>Premissas e condicoes</h3>
          <small>Arquitetura preparada para futuras sugestoes automaticas.</small>
        </div>
      </div>

      <div className="orcamentos-premissas-grid">
        {premissaTipoOptions.map((option) => {
          const itens = props.premissas.filter((premissa) => premissa.tipo === option.value);

          return (
            <article key={option.value} className="orcamentos-premissa-card">
              <div className="orcamentos-premissa-heading">
                <div>
                  <strong>{option.label}</strong>
                  <small>{option.helper}</small>
                </div>
                <button type="button" onClick={() => props.onAdd(option.value)}>
                  Adicionar
                </button>
              </div>

              <div className="orcamentos-premissa-list">
                {itens.map((premissa) => (
                  <div key={premissa.localId} className="orcamentos-premissa-row">
                    <input
                      className="field-control"
                      value={premissa.titulo}
                      placeholder="Titulo opcional"
                      onChange={(event) =>
                        props.onUpdate(premissa.localId, "titulo", event.target.value)
                      }
                    />
                    <textarea
                      className="field-control"
                      rows={3}
                      value={premissa.descricao}
                      placeholder="Descreva o ponto que precisa aparecer na proposta."
                      onChange={(event) =>
                        props.onUpdate(premissa.localId, "descricao", event.target.value)
                      }
                    />
                    {itens.length > 1 ? (
                      <button type="button" onClick={() => props.onRemove(premissa.localId)}>
                        Remover linha
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function buildPayload(form: OrcamentoForm) {
  const itensPreenchidos = form.itens.filter(isItemPreenchido);
  const formacaoPreco = buildFormacaoPayload(form.formacaoPreco);

  return {
    tipo: form.tipo,
    status: form.status,
    clienteId: form.clienteId,
    obraId: form.obraId || null,
    responsavelId: form.responsavelId || null,
    dataOrcamento: form.dataOrcamento,
    validadeAte: form.validadeAte,
    titulo: form.titulo,
    objeto: form.objeto,
    observacaoInterna: form.observacaoInterna,
    observacaoCliente: form.observacaoCliente,
    valorDesconto: Number(form.valorDesconto) || 0,
    valorAcrescimo: Number(form.valorAcrescimo) || 0,
    formacaoPreco,
    frentes: form.tipo === "OPERACIONAL" ? form.frentes.map(mapFrentePayload) : [],
    itens: itensPreenchidos.map((item) => ({
      frenteTempId: form.tipo === "OPERACIONAL" ? item.frenteTempId : "",
      tipoItem: item.tipoItem,
      servicoId: item.servicoId || null,
      materialId: item.materialId || null,
      equipamentoId: item.equipamentoId || null,
      ordem: item.ordem,
      codigo: item.codigo,
      descricao: item.descricao,
      unidade: item.unidade,
      quantidade: Number(item.quantidade) || 0,
      produtividade: item.produtividade ? Number(item.produtividade) : null,
      custoUnitario: Number(item.custoUnitario) || 0,
      valorUnitario: Number(item.valorUnitario) || 0,
      observacao: item.observacao
    })),
    premissas: form.premissas.filter(isPremissaPreenchida).map((premissa) => ({
      tipo: premissa.tipo,
      ordem: premissa.ordem,
      titulo: premissa.titulo,
      descricao: premissa.descricao
    }))
  };
}

function toNumberOrZero(value: string) {
  if (!value.trim()) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildFormacaoPayload(formacaoPreco: FormacaoPrecoForm) {
  const payload = {
    custoDireto: toNumberOrZero(formacaoPreco.custoDireto),
    custoIndireto: toNumberOrZero(formacaoPreco.custoIndireto),
    impostosPercentual: toNumberOrZero(formacaoPreco.impostosPercentual),
    impostosValor: toNumberOrZero(formacaoPreco.impostosValor),
    margemPercentual: toNumberOrZero(formacaoPreco.margemPercentual),
    margemValor: toNumberOrZero(formacaoPreco.margemValor),
    precoSugerido: toNumberOrZero(formacaoPreco.precoSugerido),
    precoFinal: toNumberOrZero(formacaoPreco.precoFinal),
    observacao: formacaoPreco.observacao.trim()
  };

  const hasNumericValue = Object.entries(payload).some(
    ([key, value]) => key !== "observacao" && typeof value === "number" && value > 0
  );

  if (!hasNumericValue && !payload.observacao) {
    return null;
  }

  return payload;
}

function isItemPreenchido(item: ItemForm) {
  return Boolean(
    item.descricao.trim() ||
      item.servicoId ||
      item.materialId ||
      item.equipamentoId ||
      Number(item.quantidade) !== 1 ||
      Number(item.valorUnitario) > 0 ||
      Number(item.custoUnitario) > 0
  );
}

function isPremissaPreenchida(premissa: PremissaForm) {
  return Boolean(premissa.descricao.trim());
}

function mapFrentePayload(frente: FrenteForm) {
  return {
    tempId: frente.localId,
    ordem: frente.ordem,
    nome: frente.nome,
    descricao: frente.descricao,
    metodoExecutivo: frente.metodoExecutivo,
    unidadeProducao: frente.unidadeProducao,
    quantidadePrevista: frente.quantidadePrevista ? Number(frente.quantidadePrevista) : null,
    produtividadeDia: frente.produtividadeDia ? Number(frente.produtividadeDia) : null,
    prazoEstimadoDias: frente.prazoEstimadoDias ? Number(frente.prazoEstimadoDias) : null,
    observacao: frente.observacao
  };
}

function buildPremissasForm(item: OrcamentoApi): PremissaForm[] {
  const premissasSalvas =
    item.premissas?.map((premissa) => ({
      localId: premissa.id,
      tipo: premissa.tipo,
      ordem: premissa.ordem,
      titulo: premissa.titulo ?? "",
      descricao: premissa.descricao
    })) ?? [];

  const withEmptyCategories = [...premissasSalvas];

  for (const option of premissaTipoOptions) {
    if (!withEmptyCategories.some((premissa) => premissa.tipo === option.value)) {
      withEmptyCategories.push(createEmptyPremissa(option.value, 1));
    }
  }

  return withEmptyCategories.sort((first, second) => {
    const firstType = premissaTipoOptions.findIndex((option) => option.value === first.tipo);
    const secondType = premissaTipoOptions.findIndex((option) => option.value === second.tipo);

    if (firstType !== secondType) {
      return firstType - secondType;
    }

    return first.ordem - second.ordem;
  });
}

function mapApiToForm(item: OrcamentoApi): OrcamentoForm {
  const frentes: FrenteForm[] = item.frentes.map((frente) => ({
    localId: frente.id,
    ordem: frente.ordem,
    nome: frente.nome,
    descricao: frente.descricao ?? "",
    metodoExecutivo: frente.metodoExecutivo ?? "",
    unidadeProducao: frente.unidadeProducao ?? "",
    quantidadePrevista: toStringValue(frente.quantidadePrevista),
    produtividadeDia: toStringValue(frente.produtividadeDia),
    prazoEstimadoDias: toStringValue(frente.prazoEstimadoDias),
    observacao: frente.observacao ?? ""
  }));

  return {
    id: item.id,
    tipo: item.tipo,
    status: item.status,
    clienteId: item.clienteId,
    obraId: item.obraId ?? "",
    responsavelId: item.responsavelId ?? "",
    dataOrcamento: toDateInput(item.dataOrcamento),
    validadeAte: toDateInput(item.validadeAte),
    titulo: item.titulo ?? "",
    objeto: item.objeto ?? "",
    observacaoInterna: item.observacaoInterna ?? "",
    observacaoCliente: item.observacaoCliente ?? "",
    valorDesconto: toStringValue(item.valorDesconto || 0),
    valorAcrescimo: toStringValue(item.valorAcrescimo || 0),
    formacaoPreco: {
      custoDireto: toStringValue(item.formacaoPreco?.custoDireto ?? 0),
      custoIndireto: toStringValue(item.formacaoPreco?.custoIndireto ?? 0),
      impostosPercentual: toStringValue(item.formacaoPreco?.impostosPercentual ?? 0),
      impostosValor: toStringValue(item.formacaoPreco?.impostosValor ?? 0),
      margemPercentual: toStringValue(item.formacaoPreco?.margemPercentual ?? 0),
      margemValor: toStringValue(item.formacaoPreco?.margemValor ?? 0),
      precoSugerido: toStringValue(item.formacaoPreco?.precoSugerido ?? 0),
      precoFinal: toStringValue(item.formacaoPreco?.precoFinal ?? 0),
      observacao: toStringValue(item.formacaoPreco?.observacao ?? "")
    },
    frentes,
    itens:
      item.itens.length > 0
        ? item.itens.map((orcamentoItem) => ({
            localId: orcamentoItem.id,
            frenteTempId: orcamentoItem.frenteId ?? "",
            tipoItem: orcamentoItem.tipoItem,
            servicoId: orcamentoItem.servicoId ?? "",
            materialId: orcamentoItem.materialId ?? "",
            equipamentoId: orcamentoItem.equipamentoId ?? "",
            ordem: orcamentoItem.ordem,
            codigo: orcamentoItem.codigo ?? "",
            descricao: orcamentoItem.descricao,
            unidade: orcamentoItem.unidade,
            quantidade: toStringValue(orcamentoItem.quantidade),
            produtividade: toStringValue(orcamentoItem.produtividade),
            custoUnitario: toStringValue(orcamentoItem.custoUnitario),
            valorUnitario: toStringValue(orcamentoItem.valorUnitario),
            observacao: orcamentoItem.observacao ?? ""
          }))
        : [createEmptyItem(item.tipo === "OPERACIONAL" ? "SERVICO_PRINCIPAL" : "COMERCIAL", 1)],
    premissas: buildPremissasForm(item)
  };
}
