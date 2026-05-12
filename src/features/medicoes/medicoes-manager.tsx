"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  carregarBaseMedicoes,
  carregarDetalheMedicao,
  atualizarValorItemMedicao,
  editarLancamentoNaMedicao,
  excluirMedicao,
  gerarMedicaoComValores,
  anexarMedicao,
  previsualizarMedicao,
  atualizarStatusMedicao,
  atualizarObservacaoMedicao
} from "@/features/medicoes/api";
import { MedicaoDeleteDialog } from "@/features/medicoes/components/medicao-delete-dialog";
import { formatCurrency } from "@/lib/utils/formatters";
import {
  initialMedicaoFilters,
  initialMedicaoForm,
  initialMedicaoUpload
} from "@/features/medicoes/constants";
import { MedicaoDetailSection } from "@/features/medicoes/components/medicao-detail-section";
import { MedicaoEditForm } from "@/features/medicoes/components/medicao-edit-form";
import { MedicaoFormSection } from "@/features/medicoes/components/medicao-form-section";
import { MedicaoListSection } from "@/features/medicoes/components/medicao-list-section";
import { MedicaoPreviewTable } from "@/features/medicoes/components/medicao-preview-table";
import type {
  MedicaoDetail,
  MedicaoEditState,
  MedicaoFilters,
  MedicaoFormState,
  MedicaoListItem,
  MedicaoOptionsState,
  MedicaoPreviewValueMap,
  MedicaoPreviewResumo,
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

function buildEditState(
  item: PreviewItem | MedicaoDetail["itens"][number]
): MedicaoEditState {
  const isPreviewItem = "servicoId" in item;
  const lancamento = isPreviewItem ? item : item.lancamento;
  const ficha = isPreviewItem ? item.ficha : item.lancamento.ficha;

  return {
    id: isPreviewItem ? item.id : item.lancamentoId,
    data: item.data.slice(0, 10),
    fichaNumero: ficha.numero,
    fichaObservacao: ficha.observacao ?? "",
    servicoId: lancamento.servicoId,
    materialId: lancamento.materialId ?? "",
    equipamentoId: lancamento.equipamentoId,
    colaboradorId: lancamento.colaboradorId,
    quantidadeApontada: String(lancamento.quantidadeApontada),
    unidadeApontada: lancamento.unidadeApontada,
    quantidadeFaturada: String(lancamento.quantidadeFaturada),
    unidadeFaturada: lancamento.unidadeFaturada,
    observacao: lancamento.observacao ?? "",
    horimetroInformado: lancamento.horimetroInformado ?? "",
    kmInformado: lancamento.kmInformado ?? "",
    motivoAlteracao: ""
  };
}

export function MedicoesManager() {
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
  const [editingSource, setEditingSource] = useState<"preview" | "detail" | null>(null);
  const [detailObservacao, setDetailObservacao] = useState("");
  const [detailObservacaoInterna, setDetailObservacaoInterna] = useState("");
  const [detailDescontoValor, setDetailDescontoValor] = useState("0");
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    codigoMedicao: string;
    tipoMedicao: MedicaoListItem["tipoMedicao"];
  } | null>(null);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  async function loadBase(activeFilters: MedicaoFilters = filters) {
    const base = await carregarBaseMedicoes(activeFilters);
    setOptions({
      clientes: base.options.clientes.filter((item) => item.status === "ATIVO"),
      obras: base.options.obras,
      servicos: base.options.servicos.filter((item) => item.status === "ATIVO"),
      materiais: base.options.materiais.filter((item) => item.status === "ATIVO"),
      equipamentos: base.options.equipamentos.filter((item) => item.status === "ATIVO"),
      colaboradores: base.options.colaboradores.filter((item) => item.status === "ATIVO")
    });
    setMedicoes(base.medicoes);
  }

  async function loadPreview(nextForm: MedicaoFormState) {
    const { response, data } = await previsualizarMedicao(nextForm);
    if (!response.ok) {
      setMessage(data.message ?? "Nao foi possivel gerar a pre-visualizacao.");
      setPreviewItems([]);
      setPreviewItemValues({});
      setPreviewResumo(null);
      setEditing(null);
      setEditingSource(null);
      return;
    }
    const nextItems = data.items ?? [];
    setPreviewItems(nextItems);
    setPreviewItemValues((current) =>
      Object.fromEntries(nextItems.map((item) => [item.id, current[item.id] ?? ""]))
    );
    setPreviewResumo(data.resumo ?? null);
    setEditing(null);
    setEditingSource(null);
    setMessage("Pre-visualizacao carregada.");
  }

  async function loadDetail(id: string) {
    const { response, data } = await carregarDetalheMedicao(id);
    if (!response.ok) {
      setSelectedMedicaoId(null);
      setSelectedMedicao(null);
      setMessage(
        "message" in data ? data.message ?? "Nao foi possivel carregar os detalhes da medicao." : "Nao foi possivel carregar os detalhes da medicao."
      );
      return;
    }
    const detail = data as MedicaoDetail;
    setSelectedMedicao(detail);
    setNextStatus(detail.status);
    setDetailObservacao(detail.observacao ?? "");
    setDetailObservacaoInterna(detail.observacaoInterna ?? "");
    setDetailDescontoValor(detail.descontoValor ?? "0");
  }

  useEffect(() => {
    void loadBase(initialMedicaoFilters);
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
      mensais: medicoes.filter((item) => item.tipoMedicao === "MENSAL").length,
      concluidas: medicoes.filter((item) => item.status === "CONCLUIDA").length,
      valorTotal: medicoes.reduce(
        (acc, item) => acc + (Number(item.valorTotal) - Number(item.descontoValor ?? 0)),
        0
      )
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

  function updateForm<K extends keyof MedicaoFormState>(
    key: K,
    value: MedicaoFormState[K]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === "clienteId" ? { obraId: "" } : {})
    }));
  }

  function updateFilter<K extends keyof MedicaoFilters>(
    key: K,
    value: MedicaoFilters[K]
  ) {
    setFilters((current) => ({
      ...current,
      [key]: value,
      ...(key === "clienteId" ? { obraId: "" } : {})
    }));
  }

  function updateEditing<K extends keyof MedicaoEditState>(
    key: K,
    value: MedicaoEditState[K]
  ) {
    setEditing((current) => (current ? { ...current, [key]: value } : current));
  }

  function updatePreviewItemValue(itemId: string, value: string) {
    setPreviewItemValues((current) => ({
      ...current,
      [itemId]: value
    }));
  }

  function openPdf(id: string, tipo: "DETALHADO" | "RESUMIDO" = "DETALHADO") {
    window.open(`/api/medicoes/${id}/pdf?tipo=${tipo}`, "_blank", "noopener,noreferrer");
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
      setEditingSource(null);
      setSelectedMedicaoId(data.id ?? null);
      await loadBase();
    });
  }

  function handleStartEdit(item: PreviewItem) {
    setEditing(buildEditState(item));
    setEditingSource("preview");
  }

  function handleStartDetailEdit(item: MedicaoDetail["itens"][number]) {
    setEditing(buildEditState(item));
    setEditingSource("detail");
  }

  function handleEditSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;

    startTransition(async () => {
      const { response, data } = await editarLancamentoNaMedicao({
        edit: editing,
        form:
          editingSource === "detail" && selectedMedicao
            ? {
                periodoInicial: selectedMedicao.periodoInicial.slice(0, 10),
                periodoFinal: selectedMedicao.periodoFinal.slice(0, 10),
                clienteId: selectedMedicao.cliente.id,
                obraId: selectedMedicao.obra?.id ?? "",
                tipoMedicao: selectedMedicao.tipoMedicao,
                observacao: selectedMedicao.observacao ?? ""
              }
            : form,
        exigeMaterial: Boolean(servicoEditado?.exigeMaterial)
      });
      if (!response.ok) {
        setMessage(data.message ?? "Nao foi possivel atualizar o lancamento.");
        return;
      }
      setMessage("Lancamento atualizado dentro da medicao. Totais recalculados.");
      if (editingSource === "preview") {
        await loadPreview(form);
      }
      if (editingSource === "detail" && selectedMedicaoId) {
        await loadDetail(selectedMedicaoId);
      }
      await loadBase(filters);
      setEditingSource(null);
    });
  }

  function handleRefreshList() {
    void loadBase(filters);
  }

  function handleRequestDelete(medicao: {
    id: string;
    codigoMedicao: string;
    tipoMedicao: MedicaoListItem["tipoMedicao"];
  }) {
    if (medicao.tipoMedicao === "MENSAL") {
      setMessage("Nao e possivel excluir uma medicao mensal.");
      return;
    }

    setDeleteTarget(medicao);
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;

    startTransition(async () => {
      const { response, data } = await excluirMedicao(deleteTarget.id);

      if (!response.ok) {
        setMessage(data.message ?? "Nao foi possivel excluir a medicao.");
        return;
      }

      setDeleteTarget(null);
      setSelectedMedicaoId((current) => (current === deleteTarget.id ? null : current));
      setSelectedMedicao((current) => (current?.id === deleteTarget.id ? null : current));
      setEditing(null);
      setEditingSource(null);
      setMessage("Medicao excluida com sucesso.");
      await loadBase(filters);
    });
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
      await loadBase(filters);
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
      await loadBase(filters);
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
      setMessage("Valor unitario atualizado.");
      await loadBase(filters);
    });
  }

  function handleUpdateItemFaturamento(
    itemId: string,
    valorUnitario: number,
    quantidadeFaturada: number,
    unidadeFaturada: "CARGA" | "HORA" | "M3" | "DIARIA"
  ) {
    if (!selectedMedicaoId) return;

    startTransition(async () => {
      const { response, data } = await atualizarValorItemMedicao({
        medicaoId: selectedMedicaoId,
        itemId,
        valorUnitario,
        quantidadeFaturada,
        unidadeFaturada
      });

      if (!response.ok) {
        setMessage(
          "message" in data ? data.message ?? "Nao foi possivel atualizar o item da medicao." : "Nao foi possivel atualizar o item da medicao."
        );
        return;
      }

      setSelectedMedicao(data as MedicaoDetail);
      setDetailObservacao((data as MedicaoDetail).observacao ?? "");
      setDetailObservacaoInterna((data as MedicaoDetail).observacaoInterna ?? "");
      setDetailDescontoValor((data as MedicaoDetail).descontoValor ?? "0");
      setMessage("Item da medicao atualizado.");
      await loadBase(filters);
    });
  }

  function handleSaveObservacao() {
    if (!selectedMedicaoId) return;

    startTransition(async () => {
      const { response, data } = await atualizarObservacaoMedicao(
        selectedMedicaoId,
        detailObservacao,
        detailObservacaoInterna,
        detailDescontoValor
      );

      if (!response.ok) {
        setMessage(
          "message" in data ? data.message ?? "Nao foi possivel salvar a observacao da medicao." : "Nao foi possivel salvar a observacao da medicao."
        );
        return;
      }

      setSelectedMedicao(data as MedicaoDetail);
      setDetailObservacao((data as MedicaoDetail).observacao ?? "");
      setDetailObservacaoInterna((data as MedicaoDetail).observacaoInterna ?? "");
      setDetailDescontoValor((data as MedicaoDetail).descontoValor ?? "0");
      setMessage("Dados da medicao atualizados.");
      await loadBase(filters);
    });
  }

  return (
    <main className="page-stack">
      <section className="page-header">
        <div>
          <h1 className="page-title">Medicoes operacionais</h1>
          <p className="page-copy">
            Consolide apontamentos por obra, diferencie medicoes unicas,
            quinzenais e fechadas, e ajuste lancamentos antes de fechar.
          </p>
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <p className="stat-card-label">Total filtrado</p>
          <p className="stat-card-value">{resumo.total}</p>
          <p className="stat-card-copy">Medicoes retornadas no relatorio atual.</p>
        </article>
        <article className="stat-card">
          <p className="stat-card-label">Em aberto</p>
          <p className="stat-card-value">{resumo.abertas}</p>
          <p className="stat-card-copy">Fechamentos que ainda exigem acao do escritorio.</p>
        </article>
        <article className="stat-card">
          <p className="stat-card-label">Concluidas</p>
          <p className="stat-card-value">{resumo.concluidas}</p>
          <p className="stat-card-copy">Medicoes com fluxo encerrado.</p>
        </article>
        <article className="stat-card">
          <p className="stat-card-label">Valor filtrado</p>
          <p className="stat-card-value">{formatCurrency(resumo.valorTotal)}</p>
          <p className="stat-card-copy">
            {resumo.mensais} medicao(oes) mensal(is) no filtro atual.
          </p>
        </article>
      </section>

      <MedicaoFormSection
        form={form}
        clientes={options.clientes}
        obrasDisponiveis={obrasDisponiveis}
        isPending={isPending}
        message={message}
        onSubmit={handlePreviewSubmit}
        onGenerate={handleGenerate}
        onChange={updateForm}
        canGenerate={previewValoresValidos}
      />

      <MedicaoPreviewTable
        items={previewItems}
        resumo={previewResumo}
        itemValues={previewItemValues}
        editingId={editing?.id ?? null}
        onChangeItemValue={updatePreviewItemValue}
        onEdit={handleStartEdit}
      />

      {editing ? (
        <MedicaoEditForm
          editing={editing}
          servicos={options.servicos}
          materiais={options.materiais}
          equipamentos={options.equipamentos}
          colaboradores={options.colaboradores}
          exigeMaterial={Boolean(servicoEditado?.exigeMaterial)}
          isPending={isPending}
          onChange={updateEditing}
          onSubmit={handleEditSubmit}
          onCancel={() => {
            setEditing(null);
            setEditingSource(null);
          }}
        />
      ) : null}

      <MedicaoListSection
        filters={filters}
        clientes={options.clientes}
        obras={obrasFiltro}
        items={medicoes}
        onChangeFilter={updateFilter}
        onRefresh={handleRefreshList}
        onOpenDetail={setSelectedMedicaoId}
        onOpenPdf={openPdf}
        onRequestDelete={handleRequestDelete}
      />

      {selectedMedicao ? (
        <MedicaoDetailSection
          detail={selectedMedicao}
          nextStatus={nextStatus}
          upload={upload}
          isPending={isPending}
          onChangeStatus={setNextStatus}
          onUpdateStatus={handleStatusUpdate}
          onChangeUpload={setUpload}
          onUpload={handleUpload}
          onUpdateItemValue={handleUpdateItemValue}
          onUpdateItemFaturamento={handleUpdateItemFaturamento}
          editingLancamentoId={editingSource === "detail" ? editing?.id ?? null : null}
          onStartDetailEdit={handleStartDetailEdit}
          observacao={detailObservacao}
          onChangeObservacao={setDetailObservacao}
          observacaoInterna={detailObservacaoInterna}
          onChangeObservacaoInterna={setDetailObservacaoInterna}
          descontoValor={detailDescontoValor}
          onChangeDescontoValor={setDetailDescontoValor}
          onSaveObservacao={handleSaveObservacao}
          onOpenPdf={openPdf}
          onRequestDelete={handleRequestDelete}
          onClose={() => setSelectedMedicaoId(null)}
        />
      ) : null}

      <MedicaoDeleteDialog
        target={deleteTarget}
        isPending={isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />
    </main>
  );
}
