"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  carregarListagemMedicoes,
  carregarOpcoesMedicoes,
  carregarDetalheMedicao,
  atualizarValorItemMedicao,
  editarLancamentoNaMedicao,
  gerarMedicaoComValores,
  anexarMedicao,
  previsualizarMedicao,
  atualizarStatusMedicao
} from "@/features/medicoes/api";
import {
  initialMedicaoFilters,
  initialMedicaoForm,
  initialMedicaoUpload
} from "@/features/medicoes/constants";
import type {
  MedicaoDetail,
  MedicaoEditState,
  MedicaoFilters,
  MedicaoFormState,
  MedicaoListItem,
  MedicaoOptionsState,
  MedicaoPreviewResumo,
  MedicaoPreviewValueMap,
  MedicaoStatus,
  MedicaoUploadState,
  PreviewItem
} from "@/features/medicoes/types";

const emptyOptions: MedicaoOptionsState = {
  clientes: [],
  obras: [],
  servicos: [],
  materiais: [],
  equipamentos: [],
  colaboradores: []
};

function buildEditState(item: PreviewItem): MedicaoEditState {
  return {
    id: item.id,
    data: item.data.slice(0, 10),
    fichaNumero: item.ficha.numero,
    fichaObservacao: item.ficha.observacao ?? "",
    servicoId: item.servicoId,
    materialId: item.materialId ?? "",
    equipamentoId: item.equipamentoId,
    colaboradorId: item.colaboradorId,
    quantidadeApontada: String(item.quantidadeApontada),
    unidadeApontada: item.unidadeApontada,
    quantidadeFaturada: String(item.quantidadeFaturada),
    unidadeFaturada: item.unidadeFaturada,
    observacao: item.observacao ?? "",
    horimetroInformado: item.horimetroInformado ?? "",
    kmInformado: item.kmInformado ?? "",
    motivoAlteracao: ""
  };
}

export function useMedicoes() {
  const [options, setOptions] = useState<MedicaoOptionsState>(emptyOptions);
  const [medicoes, setMedicoes] = useState<MedicaoListItem[]>([]);
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [previewItemValues, setPreviewItemValues] = useState<MedicaoPreviewValueMap>({});
  const [previewResumo, setPreviewResumo] = useState<MedicaoPreviewResumo | null>(null);
  const [form, setForm] = useState<MedicaoFormState>(initialMedicaoForm);
  const [filters, setFilters] = useState<MedicaoFilters>(initialMedicaoFilters);
  const [selectedMedicaoId, setSelectedMedicaoId] = useState<string | null>(null);
  const [selectedMedicao, setSelectedMedicao] = useState<MedicaoDetail | null>(null);
  const [nextStatus, setNextStatus] = useState<MedicaoStatus>("EM_ABERTO");
  const [upload, setUpload] = useState<MedicaoUploadState>(initialMedicaoUpload);
  const [editing, setEditing] = useState<MedicaoEditState | null>(null);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  async function loadOptions() {
    try {
      const base = await carregarOpcoesMedicoes();
      setOptions({
        clientes: base.clientes.filter((item) => item.status === "ATIVO"),
        obras: base.obras.filter((item) => item.status === "ATIVO"),
        servicos: base.servicos.filter((item) => item.status === "ATIVO"),
        materiais: base.materiais.filter((item) => item.status === "ATIVO"),
        equipamentos: base.equipamentos.filter((item) => item.status === "ATIVO"),
        colaboradores: base.colaboradores.filter((item) => item.status === "ATIVO")
      });
    } catch {
      setMessage("Nao foi possivel carregar as opcoes de medicao.");
    }
  }

  async function loadMedicoes(activeFilters: MedicaoFilters = filters) {
    try {
      const items = await carregarListagemMedicoes(activeFilters);
      setMedicoes(items);
    } catch {
      setMessage("Nao foi possivel carregar a listagem de medicoes.");
    }
  }

  async function loadPreview(nextForm: MedicaoFormState) {
    const { response, data } = await previsualizarMedicao(nextForm);
    if (!response.ok) {
      setMessage(data.message ?? "Nao foi possivel gerar a pre-visualizacao.");
      setPreviewItems([]);
      setPreviewItemValues({});
      setPreviewResumo(null);
      setEditing(null);
      return;
    }
    const nextItems = data.items ?? [];
    setPreviewItems(nextItems);
    setPreviewItemValues((current) =>
      Object.fromEntries(nextItems.map((item) => [item.id, current[item.id] ?? ""]))
    );
    setPreviewResumo(data.resumo ?? null);
    setEditing(null);
    setMessage("Pre-visualizacao carregada.");
  }

  async function loadDetail(id: string) {
    const { response, data } = await carregarDetalheMedicao(id);
    if (!response.ok) {
      setMessage("Nao foi possivel carregar os detalhes da medicao.");
      return;
    }
    const detail = data as MedicaoDetail;
    setSelectedMedicao(detail);
    setNextStatus(detail.status);
  }

  useEffect(() => {
    void Promise.all([loadOptions(), loadMedicoes(initialMedicaoFilters)]);
  }, []);

  useEffect(() => {
    if (selectedMedicaoId) {
      void loadDetail(selectedMedicaoId);
    } else {
      setSelectedMedicao(null);
    }
  }, [selectedMedicaoId]);

  const obrasDisponiveis = useMemo(
    () =>
      options.obras.filter(
        (obra) =>
          (!form.clienteId || obra.clienteId === form.clienteId) &&
          obra.status === "ATIVO" &&
          obra.liberadaParaLancamento !== false
      ),
    [options.obras, form.clienteId]
  );

  const obrasFiltro = useMemo(
    () =>
      options.obras.filter(
        (obra) => !filters.clienteId || obra.clienteId === filters.clienteId
      ),
    [options.obras, filters.clienteId]
  );

  const servicoEditado = useMemo(
    () => options.servicos.find((item) => item.id === editing?.servicoId) ?? null,
    [options.servicos, editing?.servicoId]
  );

  const resumo = useMemo(
    () => ({
      total: medicoes.length,
      abertas: medicoes.filter((item) => item.status === "EM_ABERTO").length,
      concluidas: medicoes.filter((item) => item.status === "CONCLUIDA").length,
      anexadas: medicoes.filter((item) => item.anexos.length > 0).length
    }),
    [medicoes]
  );

  const previewValoresValidos = useMemo(
    () =>
      previewItems.length > 0 &&
      previewItems.every((item) => {
        const rawValue = previewItemValues[item.id]?.replace(",", ".").trim() ?? "";

        if (!rawValue) {
          return false;
        }

        const parsedValue = Number(rawValue);
        return Number.isFinite(parsedValue) && parsedValue >= 0;
      }),
    [previewItemValues, previewItems]
  );

  function updateForm<K extends keyof MedicaoFormState>(key: K, value: MedicaoFormState[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === "clienteId" ? { obraId: "" } : {})
    }));
  }

  function updateFilter<K extends keyof MedicaoFilters>(key: K, value: MedicaoFilters[K]) {
    setFilters((current) => ({
      ...current,
      [key]: value,
      ...(key === "clienteId" ? { obraId: "" } : {})
    }));
  }

  function updateEditing<K extends keyof MedicaoEditState>(key: K, value: MedicaoEditState[K]) {
    setEditing((current) => (current ? { ...current, [key]: value } : current));
  }

  function updatePreviewItemValue(itemId: string, value: string) {
    setPreviewItemValues((current) => ({
      ...current,
      [itemId]: value
    }));
  }

  function openPdf(id: string) {
    window.open(`/api/medicoes/${id}/pdf`, "_blank", "noopener,noreferrer");
  }

  function handlePreviewSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    startTransition(async () => {
      await loadPreview(form);
    });
  }

  function handleGenerate() {
    startTransition(async () => {
      if (!previewItems.length) {
        setMessage("Carregue a pre-visualizacao antes de gerar a medicao.");
        return;
      }

      if (!previewValoresValidos) {
        setMessage(
          "Preencha um valor unitario valido para todos os itens antes de gerar a medicao."
        );
        return;
      }

      const { response, data } = await gerarMedicaoComValores(form, previewItemValues);
      if (!response.ok) {
        setMessage(data.message ?? "Nao foi possivel gerar a medicao.");
        return;
      }
      setMessage("Medicao gerada com sucesso.");
      setPreviewItems([]);
      setPreviewItemValues({});
      setPreviewResumo(null);
      setEditing(null);
      setSelectedMedicaoId(data.id ?? null);
      await loadMedicoes();
    });
  }

  function handleStartEdit(item: PreviewItem) {
    setEditing(buildEditState(item));
  }

  function handleEditSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;

    startTransition(async () => {
      const { response, data } = await editarLancamentoNaMedicao({
        edit: editing,
        form,
        exigeMaterial: Boolean(servicoEditado?.exigeMaterial)
      });
      if (!response.ok) {
        setMessage(data.message ?? "Nao foi possivel atualizar o lancamento.");
        return;
      }
      setMessage("Lancamento atualizado dentro da medicao. Totais recalculados.");
      await loadPreview(form);
      await loadMedicoes(filters);
    });
  }

  function handleRefreshList() {
    void loadMedicoes(filters);
  }

  function handleStatusUpdate() {
    if (!selectedMedicaoId) return;
    startTransition(async () => {
      const { response, data } = await atualizarStatusMedicao(
        selectedMedicaoId,
        nextStatus
      );
      if (!response.ok) {
        setMessage(data.message ?? "Nao foi possivel atualizar o status.");
        return;
      }
      setMessage("Status da medicao atualizado.");
      await loadMedicoes(filters);
      await loadDetail(selectedMedicaoId);
    });
  }

  function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedMedicaoId || !upload.file) {
      setMessage("Selecione um arquivo PDF para anexar.");
      return;
    }
    startTransition(async () => {
      const { response, data } = await anexarMedicao(selectedMedicaoId, upload);
      if (!response.ok) {
        setMessage(data.message ?? "Nao foi possivel anexar o arquivo.");
        return;
      }
      setUpload(initialMedicaoUpload);
      setMessage("Anexo incluido na medicao.");
      await loadMedicoes(filters);
      await loadDetail(selectedMedicaoId);
    });
  }

  function handleUpdateItemValue(itemId: string, valorUnitario: number) {
    if (!selectedMedicaoId) return;

    startTransition(async () => {
      const { response, data } = await atualizarValorItemMedicao({
        medicaoId: selectedMedicaoId,
        itemId,
        valorUnitario
      });

      if (!response.ok) {
        setMessage(
          "message" in data ? data.message ?? "Nao foi possivel atualizar o valor do item." : "Nao foi possivel atualizar o valor do item."
        );
        return;
      }

      setSelectedMedicao(data as MedicaoDetail);
      setMessage("Valor unitario do item atualizado.");
      await loadMedicoes(filters);
    });
  }

  return {
    options,
    medicoes,
    previewItems,
    previewItemValues,
    previewResumo,
    form,
    filters,
    selectedMedicao,
    nextStatus,
    upload,
    editing,
    message,
    isPending,
    obrasDisponiveis,
    obrasFiltro,
    servicoEditado,
    resumo,
    previewValoresValidos,
    updateForm,
    updateFilter,
    updateEditing,
    updatePreviewItemValue,
    openPdf,
    handlePreviewSubmit,
    handleGenerate,
    handleStartEdit,
    handleEditSubmit,
    handleRefreshList,
    handleStatusUpdate,
    handleUpdateItemValue,
    handleUpload,
    setEditing,
    setSelectedMedicaoId,
    setNextStatus,
    setUpload
  };
}
