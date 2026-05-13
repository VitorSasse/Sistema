import { loadOperationalOptions } from "@/lib/client/operational-options";
import type { LancamentoFormState, LancamentoItem } from "@/features/lancamentos/types";

function buildPayload(form: LancamentoFormState) {
  return {
    ...form,
    obraId: form.obraId || null,
    materialId: form.materialId || null
  };
}

export async function carregarOpcoesLancamento() {
  return loadOperationalOptions();
}

export async function carregarLancamentosDoDia(date: string) {
  const response = await fetch(`/api/lancamentos?date=${date}`, { cache: "no-store" });
  const data = (await response.json()) as { items?: LancamentoItem[]; message?: string };

  if (!response.ok) {
    throw new Error(data.message ?? "Nao foi possivel carregar os lancamentos.");
  }

  return data.items ?? [];
}

export async function criarLancamento(form: LancamentoFormState) {
  const response = await fetch("/api/lancamentos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildPayload(form))
  });

  return {
    response,
    data: (await response.json()) as { message?: string }
  };
}

export async function cancelarLancamento(id: string) {
  const response = await fetch(`/api/lancamentos/${id}`, { method: "DELETE" });

  return {
    response,
    data: (await response.json()) as { message?: string }
  };
}

export async function excluirLancamento(id: string) {
  const response = await fetch(`/api/lancamentos/${id}?mode=delete`, {
    method: "DELETE"
  });

  return {
    response,
    data: (await response.json()) as { message?: string }
  };
}

export async function atualizarLancamento(
  id: string,
  form: LancamentoFormState & { motivoAlteracao: string }
) {
  const response = await fetch(`/api/lancamentos/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildPayload(form))
  });

  return {
    response,
    data: (await response.json()) as { message?: string }
  };
}
