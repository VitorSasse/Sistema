"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  carregarOpcoesMedicoes,
  previsualizarMedicao
} from "@/features/medicoes/api";
import { MedicaoFormSection } from "@/features/medicoes/components/medicao-form-section";
import { MedicaoPreviewTable } from "@/features/medicoes/components/medicao-preview-table";
import { initialMedicaoForm } from "@/features/medicoes/constants";
import type {
  MedicaoFormState,
  MedicaoOptionsState,
  MedicaoPreviewResumo,
  MedicaoPreviewValueMap,
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

export function SimulacaoMedicaoManager() {
  const [options, setOptions] = useState<MedicaoOptionsState>(emptyOptions);
  const [form, setForm] = useState<MedicaoFormState>(initialMedicaoForm);
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [previewItemValues, setPreviewItemValues] = useState<MedicaoPreviewValueMap>({});
  const [previewResumo, setPreviewResumo] = useState<MedicaoPreviewResumo | null>(null);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function loadOptions() {
      const base = await carregarOpcoesMedicoes();
      setOptions({
        clientes: base.clientes.filter((item) => item.status === "ATIVO"),
        obras: base.obras,
        servicos: base.servicos.filter(
          (item) => item.status === "ATIVO" && item.usarEmMedicoes !== false
        ),
        materiais: base.materiais.filter((item) => item.status === "ATIVO"),
        equipamentos: base.equipamentos.filter((item) => item.status === "ATIVO"),
        colaboradores: base.colaboradores.filter((item) => item.status === "ATIVO")
      });
    }

    void loadOptions();
  }, []);

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

  function updatePreviewItemValue(itemId: string, value: string) {
    setPreviewItemValues((current) => ({
      ...current,
      [itemId]: value
    }));
  }

  async function loadPreview(nextForm: MedicaoFormState) {
    const { response, data } = await previsualizarMedicao(nextForm);

    if (!response.ok) {
      setMessage(data.message ?? "Nao foi possivel carregar a simulacao.");
      setPreviewItems([]);
      setPreviewItemValues({});
      setPreviewResumo(null);
      return;
    }

    const nextItems = data.items ?? [];
    setPreviewItems(nextItems);
    setPreviewItemValues((current) =>
      Object.fromEntries(nextItems.map((item) => [item.id, current[item.id] ?? ""]))
    );
    setPreviewResumo(data.resumo ?? null);
    setMessage(
      "Simulacao carregada. Nenhum lancamento foi marcado como medido ou reservado."
    );
  }

  function handlePreviewSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    startTransition(async () => {
      await loadPreview(form);
    });
  }

  return (
    <main className="page-stack">
      <section className="page-header fade-up">
        <span className="page-kicker">Medicoes comerciais</span>
        <h1 className="page-title">Simulacao de medicao</h1>
        <p className="page-copy">
          Projete valores para o cliente sem comprometer a medicao real nem travar os lancamentos elegiveis.
        </p>
      </section>

      <section className="surface section-card">
        <div className="section-header">
          <div>
            <h2 className="section-title">Simulacao sem comprometer lancamentos</h2>
            <p className="section-copy">
              Use esta aba para projetar o valor que pode entrar para o cliente sem
              gerar medicao real, sem marcar lancamento como medido e sem reservar itens
              para o fechamento operacional.
            </p>
          </div>
        </div>
        <div className="glass-band" style={{ marginTop: 16 }}>
          <span className="badge badge-info">Nao altera status dos lancamentos</span>
          <span className="badge badge-neutral">Nao gera codigo de medicao</span>
          <span className="badge badge-success">Serve apenas para estimativa comercial</span>
        </div>
      </section>

      <MedicaoFormSection
        form={form}
        clientes={options.clientes}
        obrasDisponiveis={obrasDisponiveis}
        isPending={isPending}
        message={message}
        onSubmit={handlePreviewSubmit}
        onChange={updateForm}
        onGenerate={undefined}
        canGenerate={false}
        title="Simular medicao por obra"
        description="Carregue os mesmos lancamentos elegiveis da medicao real, mas apenas para projetar valores e repassar uma estimativa ao cliente."
        submitLabel="Simular medicao"
      />

      <MedicaoPreviewTable
        items={previewItems}
        resumo={previewResumo}
        itemValues={previewItemValues}
        editingId={null}
        onChangeItemValue={updatePreviewItemValue}
        title="Itens da simulacao"
        description="A simulacao usa os lancamentos elegiveis atuais sem comprometer o fechamento real."
        emptyDescription="Nenhuma simulacao carregada ainda."
      />
    </main>
  );
}
