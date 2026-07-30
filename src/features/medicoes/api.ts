import { loadOperationalOptions } from "@/lib/client/operational-options";
import { performanceFetch } from "@/lib/performance/client";
import { parseDecimalInput } from "@/lib/utils/decimal-input";
import type {
  MedicaoDetail,
  MedicaoEligiblePayload,
  MedicaoEditState,
  MedicaoFilters,
  MedicaoFormState,
  MedicaoListItem,
  MedicaoPreviewValueMap,
  MedicaoPreviewResumo,
  MedicaoStatus,
  MedicaoUploadState,
  PreviewItem
} from "@/features/medicoes/types";

function buildListQuery(filters: MedicaoFilters) {
  const params = new URLSearchParams();
  if (filters.clienteId) params.set("clienteId", filters.clienteId);
  if (filters.obraId) params.set("obraId", filters.obraId);
  if (filters.tipoMedicao) params.set("tipoMedicao", filters.tipoMedicao);
  if (filters.status) params.set("status", filters.status);
  if (filters.periodoInicial) params.set("periodoInicial", filters.periodoInicial);
  if (filters.periodoFinal) params.set("periodoFinal", filters.periodoFinal);
  if (filters.numeroPedido) params.set("numeroPedido", filters.numeroPedido);
  if (filters.numeroNotaFiscal) params.set("numeroNotaFiscal", filters.numeroNotaFiscal);
  return params.toString();
}

function toPayload(form: MedicaoFormState) {
  return {
    ...form,
    obraId: form.obraId || null,
    permutaPercentual: form.permutaPercentual.trim()
      ? Number(form.permutaPercentual.replace(",", "."))
      : 0
  };
}

export async function carregarBaseMedicoes(filters: MedicaoFilters) {
  const [options, medicoes] = await Promise.all([
    carregarOpcoesMedicoes(),
    carregarListagemMedicoes(filters)
  ]);
  return { options, medicoes };
}

export async function carregarOpcoesMedicoes() {
  return loadOperationalOptions();
}

export async function carregarListagemMedicoes(filters: MedicaoFilters) {
  const query = buildListQuery(filters);
  const response = await performanceFetch("listMeasurements", `/api/medicoes${query ? `?${query}` : ""}`, {
    cache: "no-store"
  });
  const data = (await response.json()) as { items: MedicaoListItem[] };
  return data.items;
}

export async function previsualizarMedicao(form: MedicaoFormState) {
  const response = await performanceFetch("previewMeasurement", "/api/medicoes/previsualizar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toPayload(form))
  });
  return {
    response,
    data: (await response.json()) as {
      message?: string;
      items?: PreviewItem[];
      resumo?: MedicaoPreviewResumo;
    }
  };
}

export async function gerarMedicaoComValores(
  form: MedicaoFormState,
  itemValues: MedicaoPreviewValueMap
) {
  const response = await performanceFetch("createMeasurement", "/api/medicoes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...toPayload(form),
      itens: Object.entries(itemValues).map(([lancamentoId, valorUnitario]) => ({
        lancamentoId,
        valorUnitario: valorUnitario.trim() ? Number(valorUnitario.replace(",", ".")) : null
      }))
    })
  });
  return {
    response,
    data: (await response.json()) as { id?: string; message?: string }
  };
}

export async function carregarDetalheMedicao(id: string) {
  const response = await performanceFetch("loadMeasurementDetail", `/api/medicoes/${id}`, { cache: "no-store" });
  return {
    response,
    data: (await response.json()) as MedicaoDetail | { message?: string }
  };
}

export async function carregarLancamentosElegiveisDaMedicao(
  id: string,
  cobrancaMaterial?: MedicaoFormState["cobrancaMaterial"]
) {
  const query = cobrancaMaterial
    ? `?cobrancaMaterial=${encodeURIComponent(cobrancaMaterial)}`
    : "";
  const response = await performanceFetch("loadMeasurementEligibleEntries", `/api/medicoes/${id}/lancamentos${query}`, {
    cache: "no-store"
  });
  return {
    response,
    data: (await response.json()) as MedicaoEligiblePayload | { message?: string }
  };
}

export async function adicionarLancamentosNaMedicao(
  id: string,
  lancamentoIds: string[],
  cobrancaMaterial: MedicaoFormState["cobrancaMaterial"]
) {
  const response = await performanceFetch("addEntriesToMeasurement", `/api/medicoes/${id}/lancamentos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      lancamentoIds,
      cobrancaMaterial
    })
  });
  return {
    response,
    data: (await response.json()) as MedicaoDetail | { message?: string }
  };
}

export async function excluirMedicao(id: string) {
  const response = await performanceFetch("deleteMeasurement", `/api/medicoes/${id}`, {
    method: "DELETE"
  });
  return {
    response,
    data: (await response.json()) as { message?: string }
  };
}

export async function atualizarStatusMedicao(
  id: string,
  status: MedicaoStatus,
  justificativaCancelamento?: string
) {
  const response = await performanceFetch("updateMeasurementStatus", `/api/medicoes/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, justificativaCancelamento })
  });
  return {
    response,
    data: (await response.json()) as { message?: string }
  };
}

export async function anexarMedicao(id: string, upload: MedicaoUploadState) {
  const body = new FormData();
  body.append("tipo", upload.tipo);
  body.append("file", upload.file as File);
  const response = await performanceFetch("attachMeasurementFile", `/api/medicoes/${id}/anexos`, {
    method: "POST",
    body
  });
  return {
    response,
    data: (await response.json()) as { message?: string }
  };
}

export async function atualizarValorItemMedicao(params: {
  medicaoId: string;
  itemId: string;
  valorUnitario: number;
  quantidadeFaturada?: number;
  unidadeFaturada?: "CARGA" | "HORA" | "M3" | "DIARIA" | "SERVICO";
}) {
  const response = await performanceFetch("updateMeasurementItem", `/api/medicoes/${params.medicaoId}/itens/${params.itemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      valorUnitario: params.valorUnitario,
      quantidadeFaturada: params.quantidadeFaturada,
      unidadeFaturada: params.unidadeFaturada
    })
  });
  return {
    response,
    data: (await response.json()) as MedicaoDetail | { message?: string }
  };
}

export async function atualizarDadosMedicao(
  id: string,
  periodoInicial: string,
  periodoFinal: string,
  observacao: string,
  observacaoInterna: string,
  descontoValor: string,
  permutaPercentual: string,
  numeroPedido: string,
  numeroNotaFiscal: string
) {
  const response = await performanceFetch("updateMeasurementData", `/api/medicoes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      periodoInicial,
      periodoFinal,
      observacao,
      observacaoInterna,
      descontoValor: descontoValor.trim() ? Number(descontoValor.replace(",", ".")) : 0,
      permutaPercentual: permutaPercentual.trim()
        ? Number(permutaPercentual.replace(",", "."))
        : 0,
      numeroPedido,
      numeroNotaFiscal
    })
  });
  return {
    response,
    data: (await response.json()) as MedicaoDetail | { message?: string }
  };
}

export async function editarLancamentoNaMedicao(params: {
  edit: MedicaoEditState;
  form: MedicaoFormState;
  exigeMaterial: boolean;
}) {
  const { edit, form, exigeMaterial } = params;
  const response = await performanceFetch("updateEntryFromMeasurement", `/api/lancamentos/${edit.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      data: edit.data,
      fichaNumero: edit.fichaNumero,
      fichaObservacao: edit.fichaObservacao,
      clienteId: form.clienteId,
      obraId: form.obraId || null,
      servicoId: edit.servicoId,
      materialId: exigeMaterial ? edit.materialId || null : null,
      equipamentoId: edit.equipamentoId,
      colaboradorId: edit.colaboradorId,
      quantidadeApontada: parseDecimalInput(edit.quantidadeApontada),
      unidadeApontada: edit.unidadeApontada,
      quantidadeFaturada: parseDecimalInput(edit.quantidadeFaturada),
      unidadeFaturada: edit.unidadeFaturada,
      horimetroInformado: edit.horimetroInformado.trim()
        ? Number(edit.horimetroInformado)
        : null,
      kmInformado: edit.kmInformado.trim() ? Number(edit.kmInformado) : null,
      observacao: edit.observacao,
      motivoAlteracao: edit.motivoAlteracao
    })
  });
  return {
    response,
    data: (await response.json()) as { message?: string }
  };
}
