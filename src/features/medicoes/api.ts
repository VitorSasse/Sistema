import { loadOperationalOptions } from "@/lib/client/operational-options";
import type {
  MedicaoDetail,
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
  return params.toString();
}

function toPayload(form: MedicaoFormState) {
  return {
    ...form,
    obraId: form.obraId || null
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
  const response = await fetch(`/api/medicoes${query ? `?${query}` : ""}`, {
    cache: "no-store"
  });
  const data = (await response.json()) as { items: MedicaoListItem[] };
  return data.items;
}

export async function previsualizarMedicao(form: MedicaoFormState) {
  const response = await fetch("/api/medicoes/previsualizar", {
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
  const response = await fetch("/api/medicoes", {
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
  const response = await fetch(`/api/medicoes/${id}`, { cache: "no-store" });
  return {
    response,
    data: (await response.json()) as MedicaoDetail | { message?: string }
  };
}

export async function excluirMedicao(id: string) {
  const response = await fetch(`/api/medicoes/${id}`, {
    method: "DELETE"
  });
  return {
    response,
    data: (await response.json()) as { message?: string }
  };
}

export async function atualizarStatusMedicao(id: string, status: MedicaoStatus) {
  const response = await fetch(`/api/medicoes/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status })
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
  const response = await fetch(`/api/medicoes/${id}/anexos`, {
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
  unidadeFaturada?: "CARGA" | "HORA" | "M3" | "DIARIA";
}) {
  const response = await fetch(`/api/medicoes/${params.medicaoId}/itens/${params.itemId}`, {
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

export async function atualizarObservacaoMedicao(
  id: string,
  observacao: string,
  observacaoInterna: string,
  descontoValor: string
) {
  const response = await fetch(`/api/medicoes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      observacao,
      observacaoInterna,
      descontoValor: descontoValor.trim() ? Number(descontoValor.replace(",", ".")) : 0
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
  const response = await fetch(`/api/lancamentos/${edit.id}`, {
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
      quantidadeApontada: Number(edit.quantidadeApontada),
      unidadeApontada: edit.unidadeApontada,
      quantidadeFaturada: Number(edit.quantidadeFaturada),
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
