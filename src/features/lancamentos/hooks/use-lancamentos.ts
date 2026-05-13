"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  atualizarLancamento,
  cancelarLancamento,
  carregarLancamentosDoDia,
  carregarOpcoesLancamento,
  criarLancamento,
  excluirLancamento
} from "@/features/lancamentos/api";
import {
  emptyHorarioApontamentoFeedback,
  emptyLancamentoOptions,
  initialHorarioApontamentoState,
  initialLancamentoForm
} from "@/features/lancamentos/constants";
import type {
  HorarioApontamentoFeedback,
  HorarioApontamentoState,
  LancamentoFormState,
  LancamentoItem,
  LancamentoOptionsState
} from "@/features/lancamentos/types";
import {
  calcularQuantidadeApontadaPorHorarios,
  formatHorarioInput,
  hasAnyHorarioFilled,
  isServicoMedidoPorHorario
} from "@/features/lancamentos/utils/horario-apontamento";
import { confirmDeleteAction } from "@/lib/utils/confirm-delete";

function buildDuplicatedState(
  current: LancamentoFormState,
  lancamento: LancamentoItem,
  options: LancamentoOptionsState
) {
  const cliente = options.clientes.find((item) => item.nome === lancamento.cliente.nome);
  const obra = options.obras.find((item) => item.nome === lancamento.obra?.nome);
  const servico = options.servicos.find(
    (item) => item.tipoServico === lancamento.servico.tipoServico
  );
  const material = options.materiais.find(
    (item) => item.descricao === lancamento.material?.descricao
  );
  const equipamento = options.equipamentos.find(
    (item) =>
      item.placaOuTag === lancamento.equipamento.placaOuTag &&
      item.descricao === lancamento.equipamento.descricao
  );
  const colaborador = options.colaboradores.find(
    (item) => item.nome === lancamento.colaborador.nome
  );

  return {
    ...current,
    fichaNumero: lancamento.ficha.numero,
    clienteId: cliente?.id ?? "",
    obraId: obra?.id ?? "",
    servicoId: servico?.id ?? "",
    materialId: material?.id ?? "",
    equipamentoId: equipamento?.id ?? "",
    colaboradorId: colaborador?.id ?? "",
    quantidadeApontada: String(lancamento.quantidadeApontada),
    unidadeApontada: lancamento.unidadeApontada,
    quantidadeFaturada: String(lancamento.quantidadeFaturada),
    unidadeFaturada: lancamento.unidadeFaturada,
    horimetroInformado: lancamento.horimetroInformado ?? "",
    kmInformado: lancamento.kmInformado ?? "",
    observacao: lancamento.observacao ?? ""
  };
}

export function useLancamentos() {
  const [options, setOptions] = useState<LancamentoOptionsState>(emptyLancamentoOptions);
  const [lancamentos, setLancamentos] = useState<LancamentoItem[]>([]);
  const [form, setForm] = useState<LancamentoFormState>(initialLancamentoForm);
  const [horarios, setHorarios] = useState<HorarioApontamentoState>(
    initialHorarioApontamentoState
  );
  const [horarioFeedback, setHorarioFeedback] = useState<HorarioApontamentoFeedback>(
    emptyHorarioApontamentoFeedback
  );
  const [message, setMessage] = useState("");
  const [editingLancamentoId, setEditingLancamentoId] = useState<string | null>(null);
  const [motivoAlteracao, setMotivoAlteracao] = useState("");
  const [isPending, startTransition] = useTransition();

  async function loadOptions() {
    try {
      const data = await carregarOpcoesLancamento();
      setOptions({
        clientes: data.clientes.filter((item) => item.status === "ATIVO"),
        obras: data.obras.filter((item) => item.status === "ATIVO"),
        servicos: data.servicos.filter((item) => item.status === "ATIVO"),
        materiais: data.materiais.filter((item) => item.status === "ATIVO"),
        equipamentos: data.equipamentos.filter((item) => item.status === "ATIVO"),
        colaboradores: data.colaboradores.filter((item) => item.status === "ATIVO")
      });
    } catch {
      setMessage("Nao foi possivel carregar as opcoes operacionais.");
    }
  }

  async function loadLancamentos(date: string) {
    try {
      const items = await carregarLancamentosDoDia(date);
      setLancamentos(items);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Nao foi possivel carregar os lancamentos do dia."
      );
    }
  }

  useEffect(() => {
    void loadOptions();
  }, []);

  useEffect(() => {
    void loadLancamentos(form.data);
  }, [form.data]);

  const obrasDisponiveis = useMemo(
    () =>
      options.obras.filter(
        (obra) =>
          (!form.clienteId || obra.clienteId === form.clienteId) &&
          obra.liberadaParaLancamento
      ),
    [options.obras, form.clienteId]
  );

  const servicoSelecionado = useMemo(
    () => options.servicos.find((servico) => servico.id === form.servicoId),
    [options.servicos, form.servicoId]
  );

  const servicoUsaCalculoHoras = useMemo(
    () => isServicoMedidoPorHorario(servicoSelecionado),
    [servicoSelecionado]
  );

  const resumoOperacional = useMemo(() => {
    const total = lancamentos.length;
    const validos = lancamentos.filter(
      (item) => item.statusValidacao === "NAO_MEDIDO" || item.statusValidacao === "VALIDO"
    ).length;
    const pendentes = lancamentos.filter(
      (item) => item.statusValidacao === "PENDENTE_OBRA"
    ).length;
    const medidos = lancamentos.filter((item) => item.statusValidacao === "MEDIDO").length;
    const comHorimetro = lancamentos.filter(
      (item) => item.horimetroInformado !== null
    ).length;

    return { total, validos, pendentes, medidos, comHorimetro };
  }, [lancamentos]);

  useEffect(() => {
    if (!servicoUsaCalculoHoras) {
      setHorarios(initialHorarioApontamentoState);
      setHorarioFeedback(emptyHorarioApontamentoFeedback);
      return;
    }

    setForm((current) =>
      current.unidadeApontada === "HORA"
        ? current
        : { ...current, unidadeApontada: "HORA" }
    );
  }, [servicoUsaCalculoHoras]);

  function updateField<K extends keyof LancamentoFormState>(
    key: K,
    value: LancamentoFormState[K]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === "clienteId" ? { obraId: "" } : {}),
      ...(key === "servicoId" ? { materialId: "" } : {})
    }));
  }

  function updateHorarioField<K extends keyof HorarioApontamentoState>(
    key: K,
    value: HorarioApontamentoState[K]
  ) {
    setHorarios((current) => ({
      ...current,
      [key]: formatHorarioInput(String(value))
    }));
    setHorarioFeedback(emptyHorarioApontamentoFeedback);
  }

  function calcularApontamentoPorHorario() {
    if (!servicoUsaCalculoHoras) {
      return false;
    }

    const result = calcularQuantidadeApontadaPorHorarios(horarios);

    if (!result.ok) {
      setHorarioFeedback({ tone: "error", message: result.message });
      return false;
    }

    setForm((current) => ({
      ...current,
      quantidadeApontada: result.quantidadeApontada,
      unidadeApontada: result.unidadeApontada
    }));
    setHorarioFeedback({ tone: "success", message: result.message });
    return true;
  }

  function resetForm() {
    setForm((current) => ({
      ...initialLancamentoForm,
      data: current.data
    }));
    setEditingLancamentoId(null);
    setMotivoAlteracao("");
    setHorarios(initialHorarioApontamentoState);
    setHorarioFeedback(emptyHorarioApontamentoFeedback);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const shouldValidateHorarios = servicoUsaCalculoHoras && hasAnyHorarioFilled(horarios);
    let formToSubmit = form;

    if (shouldValidateHorarios) {
      const result = calcularQuantidadeApontadaPorHorarios(horarios);

      if (!result.ok) {
        setHorarioFeedback({ tone: "error", message: result.message });
        setMessage("Corrija os horarios antes de salvar o lancamento.");
        return;
      }

      setForm((current) => ({
        ...current,
        quantidadeApontada: result.quantidadeApontada,
        unidadeApontada: result.unidadeApontada
      }));
      setHorarioFeedback({ tone: "success", message: result.message });
      formToSubmit = {
        ...form,
        quantidadeApontada: result.quantidadeApontada,
        unidadeApontada: result.unidadeApontada
      };
    }

    startTransition(async () => {
      const { response, data } = editingLancamentoId
        ? await atualizarLancamento(editingLancamentoId, {
            ...formToSubmit,
            motivoAlteracao
          })
        : await criarLancamento(formToSubmit);

      if (!response.ok) {
        setMessage(
          data.message ??
            (editingLancamentoId
              ? "Nao foi possivel atualizar o lancamento."
              : "Nao foi possivel salvar o lancamento.")
        );
        return;
      }

      setMessage(
        editingLancamentoId
          ? "Lancamento atualizado com sucesso."
          : "Lancamento salvo com sucesso e leitura do equipamento sincronizada."
      );
      const snapshot = { ...formToSubmit };
      resetForm();
      await loadLancamentos(snapshot.data);
    });
  }

  function duplicateLast() {
    const last = lancamentos[0];

    if (!last) {
      setMessage("Nao ha lancamento anterior para duplicar.");
      return;
    }

    setForm((current) => buildDuplicatedState(current, last, options));
    setHorarios(initialHorarioApontamentoState);
    setHorarioFeedback(emptyHorarioApontamentoFeedback);
    setMessage("Ultimo lancamento carregado no formulario.");
  }

  function startEdit(item: LancamentoItem) {
    setForm((current) => buildDuplicatedState(current, item, options));
    setEditingLancamentoId(item.id);
    setMotivoAlteracao("");
    setHorarios(initialHorarioApontamentoState);
    setHorarioFeedback(emptyHorarioApontamentoFeedback);
    setMessage("Lancamento carregado para edicao.");
  }

  function cancelEdit() {
    resetForm();
    setMessage("Edicao cancelada.");
  }

  function handleCancel(id: string) {
    startTransition(async () => {
      const { response, data } = await cancelarLancamento(id);

      if (!response.ok) {
        setMessage(data.message ?? "Nao foi possivel cancelar o lancamento.");
        return;
      }

      setMessage("Lancamento cancelado.");
      await loadLancamentos(form.data);
    });
  }

  function handleDelete(id: string) {
    if (!confirmDeleteAction("este lancamento")) {
      return;
    }

    startTransition(async () => {
      const { response, data } = await excluirLancamento(id);

      if (!response.ok) {
        setMessage(data.message ?? "Nao foi possivel excluir o lancamento.");
        return;
      }

      setMessage("Lancamento excluido.");
      await loadLancamentos(form.data);
    });
  }

  return {
    options,
    lancamentos,
    form,
    message,
    editingLancamentoId,
    motivoAlteracao,
    isPending,
    obrasDisponiveis,
    servicoSelecionado,
    servicoUsaCalculoHoras,
    horarios,
    horarioFeedback,
    resumoOperacional,
    updateField,
    updateHorarioField,
    calcularApontamentoPorHorario,
    resetForm,
    handleSubmit,
    duplicateLast,
    startEdit,
    cancelEdit,
    setMotivoAlteracao,
    handleCancel,
    handleDelete
  };
}
