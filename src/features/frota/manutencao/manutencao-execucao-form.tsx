"use client";

import { TipoItemManutencaoExecutada } from "@prisma/client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { formatDateDisplay } from "@/lib/utils/date";

type EquipamentoOption = {
  id: string;
  descricao: string;
  placaOuTag: string;
  status: "ATIVO" | "INATIVO";
};

type PlanoOption = {
  id: string;
  tipoManutencao: string;
  equipamento: {
    descricao: string;
    placaOuTag: string;
  };
};

type LinhaExecutada = {
  id: string;
  tipo: TipoItemManutencaoExecutada;
  descricao: string;
  quantidade: string;
  unidade: string;
  observacao: string;
};

type HistoricoManutencao = {
  id: string;
  dataExecucao: string;
  tipoManutencao: string;
  descricaoServico: string;
  equipamento: {
    descricao: string;
    placaOuTag: string;
  };
  plano: {
    tipoManutencao: string;
  } | null;
  itensServicos: Array<{
    id: string;
    tipo: TipoItemManutencaoExecutada;
    descricao: string;
    quantidade: string | null;
    unidade: string | null;
    observacao: string | null;
  }>;
};

type FormState = {
  equipamentoId: string;
  planoId: string;
  dataExecucao: string;
  tipoManutencao: string;
  descricaoServico: string;
  horimetroMomento: string;
  kmMomento: string;
  fornecedorOficina: string;
  custo: string;
  observacao: string;
  itensServicos: LinhaExecutada[];
};

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function novaLinha(tipo: TipoItemManutencaoExecutada = TipoItemManutencaoExecutada.PECA): LinhaExecutada {
  return {
    id: crypto.randomUUID(),
    tipo,
    descricao: "",
    quantidade: "",
    unidade: "",
    observacao: ""
  };
}

const initialForm: FormState = {
  equipamentoId: "",
  planoId: "",
  dataExecucao: todayInputValue(),
  tipoManutencao: "",
  descricaoServico: "",
  horimetroMomento: "",
  kmMomento: "",
  fornecedorOficina: "",
  custo: "",
  observacao: "",
  itensServicos: [novaLinha()]
};

function cleanNumber(value: string) {
  return value.trim() ? Number(value) : null;
}

export function ManutencaoExecucaoForm() {
  const [equipamentos, setEquipamentos] = useState<EquipamentoOption[]>([]);
  const [planos, setPlanos] = useState<PlanoOption[]>([]);
  const [historico, setHistorico] = useState<HistoricoManutencao[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const planosDoEquipamento = useMemo(() => {
    const equipamento = equipamentos.find((item) => item.id === form.equipamentoId);

    if (!equipamento) {
      return [];
    }

    return planos.filter(
      (plano) =>
        plano.equipamento.descricao === equipamento.descricao &&
        plano.equipamento.placaOuTag === equipamento.placaOuTag
    );
  }, [equipamentos, form.equipamentoId, planos]);

  async function loadBaseData() {
    const [equipamentosResponse, planosResponse, historicoResponse] = await Promise.all([
      fetch("/api/equipamentos", { cache: "no-store" }),
      fetch("/api/frota/planos", { cache: "no-store" }),
      fetch("/api/frota/manutencoes-executadas", { cache: "no-store" })
    ]);
    const equipamentosPayload = (await equipamentosResponse.json()) as { items: EquipamentoOption[] };
    const planosPayload = (await planosResponse.json()) as { items: PlanoOption[] };
    const historicoPayload = (await historicoResponse.json()) as { items: HistoricoManutencao[] };
    const ativos = equipamentosPayload.items.filter((item) => item.status === "ATIVO");

    setEquipamentos(ativos);
    setPlanos(planosPayload.items);
    setHistorico(historicoPayload.items);
    setForm((current) => ({
      ...current,
      equipamentoId: current.equipamentoId || ativos[0]?.id || ""
    }));
  }

  useEffect(() => {
    void loadBaseData();
  }, []);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateLinha(id: string, patch: Partial<LinhaExecutada>) {
    setForm((current) => ({
      ...current,
      itensServicos: current.itensServicos.map((item) =>
        item.id === id
          ? {
              ...item,
              ...patch,
              quantidade:
                patch.tipo === TipoItemManutencaoExecutada.SERVICO ? "" : patch.quantidade ?? item.quantidade,
              unidade: patch.tipo === TipoItemManutencaoExecutada.SERVICO ? "" : patch.unidade ?? item.unidade
            }
          : item
      )
    }));
  }

  function removeLinha(id: string) {
    setForm((current) => ({
      ...current,
      itensServicos:
        current.itensServicos.length > 1
          ? current.itensServicos.filter((item) => item.id !== id)
          : [novaLinha()]
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    startTransition(async () => {
      const response = await fetch("/api/frota/manutencoes-executadas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          planoId: form.planoId || null,
          horimetroMomento: cleanNumber(form.horimetroMomento),
          kmMomento: cleanNumber(form.kmMomento),
          custo: cleanNumber(form.custo),
          itensServicos: form.itensServicos
            .map((item) => ({
              tipo: item.tipo,
              descricao: item.descricao,
              quantidade: item.tipo === TipoItemManutencaoExecutada.PECA ? cleanNumber(item.quantidade) : null,
              unidade: item.tipo === TipoItemManutencaoExecutada.PECA ? item.unidade : "",
              observacao: item.observacao
            }))
            .filter((item) => item.descricao.trim().length > 0)
        })
      });
      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(payload.message ?? "Nao foi possivel registrar a manutencao executada.");
        return;
      }

      setMessage("Manutencao executada registrada.");
      setForm((current) => ({
        ...initialForm,
        equipamentoId: current.equipamentoId
      }));
      await loadBaseData();
    });
  }

  return (
    <section className="surface section-card">
      <div className="section-header">
        <div>
          <span className="page-kicker">Ordem de servico</span>
          <h2 className="section-title">Registrar ordem de servico de manutencao</h2>
          <p className="section-copy">
            Lance o atendimento realizado, os servicos executados, as pecas aplicadas e as observacoes da OS.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 24 }}>
        <div className="form-grid-4">
          <label className="field">
            <span className="field-label">Equipamento</span>
            <select
              className="field-control"
              value={form.equipamentoId}
              onChange={(event) => {
                updateField("equipamentoId", event.target.value);
                updateField("planoId", "");
              }}
            >
              {equipamentos.map((equipamento) => (
                <option key={equipamento.id} value={equipamento.id}>
                  {equipamento.descricao} - {equipamento.placaOuTag}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field-label">Plano preventivo vinculado (opcional)</span>
            <select
              className="field-control"
              value={form.planoId}
              onChange={(event) => updateField("planoId", event.target.value)}
            >
              <option value="">Sem plano vinculado</option>
              {planosDoEquipamento.map((plano) => (
                <option key={plano.id} value={plano.id}>
                  {plano.tipoManutencao}
                </option>
              ))}
            </select>
            <small className="manager-field-hint">
              Use somente quando esta OS estiver baixando uma revisao planejada no Plano preventivo.
            </small>
          </label>

          <label className="field">
            <span className="field-label">Data da execucao</span>
            <input
              className="field-control"
              type="date"
              value={form.dataExecucao}
              onChange={(event) => updateField("dataExecucao", event.target.value)}
            />
          </label>

          <label className="field">
            <span className="field-label">Classificacao da OS</span>
            <input
              className="field-control"
              value={form.tipoManutencao}
              onChange={(event) => updateField("tipoManutencao", event.target.value)}
              placeholder="Corretiva, preventiva avulsa, atendimento externo..."
            />
          </label>
        </div>

        <label className="field">
          <span className="field-label">Resumo do que foi feito</span>
          <textarea
            className="field-control textarea-lg"
            value={form.descricaoServico}
            onChange={(event) => updateField("descricaoServico", event.target.value)}
            placeholder="Descreva o diagnostico, o reparo realizado e o motivo do atendimento."
          />
        </label>

        <div className="form-grid-4">
          <label className="field">
            <span className="field-label">Horimetro</span>
            <input
              className="field-control"
              type="number"
              step="0.01"
              value={form.horimetroMomento}
              onChange={(event) => updateField("horimetroMomento", event.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">KM</span>
            <input
              className="field-control"
              type="number"
              step="0.1"
              value={form.kmMomento}
              onChange={(event) => updateField("kmMomento", event.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">Fornecedor/oficina</span>
            <input
              className="field-control"
              value={form.fornecedorOficina}
              onChange={(event) => updateField("fornecedorOficina", event.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">Custo atual</span>
            <input
              className="field-control"
              type="number"
              step="0.01"
              value={form.custo}
              onChange={(event) => updateField("custo", event.target.value)}
            />
          </label>
        </div>

        <div className="surface-subtle" style={{ display: "grid", gap: 16 }}>
          <div className="section-header">
            <div>
              <span className="page-kicker">Detalhamento da OS</span>
              <h3 className="section-title">Pecas e servicos executados</h3>
              <p className="section-copy">
                Monte a ordem de servico com cada atividade realizada e cada peca/material aplicado.
              </p>
            </div>
            <div className="toolbar-actions">
              <button
                type="button"
                className="button-secondary"
                onClick={() =>
                  updateField("itensServicos", [...form.itensServicos, novaLinha(TipoItemManutencaoExecutada.SERVICO)])
                }
              >
                Adicionar servico
              </button>
              <button
                type="button"
                className="button-primary"
                onClick={() =>
                  updateField("itensServicos", [...form.itensServicos, novaLinha(TipoItemManutencaoExecutada.PECA)])
                }
              >
                Adicionar peca
              </button>
            </div>
          </div>

          {form.itensServicos.map((item, index) => (
            <div key={item.id} className="surface section-card" style={{ padding: 16 }}>
              <div className="section-header" style={{ marginBottom: 12 }}>
                <div>
                  <span className="page-kicker">Item da OS {index + 1}</span>
                  <h4 className="section-title" style={{ fontSize: "1rem" }}>
                    {item.tipo === TipoItemManutencaoExecutada.PECA ? "Peca/material aplicado" : "Servico executado"}
                  </h4>
                </div>
                <button type="button" className="button-secondary" onClick={() => removeLinha(item.id)}>
                  Remover
                </button>
              </div>
              <div className="form-grid-4">
                <label className="field">
                  <span className="field-label">Tipo</span>
                  <select
                    className="field-control"
                    value={item.tipo}
                    onChange={(event) =>
                      updateLinha(item.id, { tipo: event.target.value as TipoItemManutencaoExecutada })
                    }
                  >
                    <option value={TipoItemManutencaoExecutada.PECA}>Peca</option>
                    <option value={TipoItemManutencaoExecutada.SERVICO}>Servico</option>
                  </select>
                </label>

                <label className="field" style={{ gridColumn: "span 2" }}>
                  <span className="field-label">
                    {item.tipo === TipoItemManutencaoExecutada.PECA ? "Descricao da peca/material" : "Descricao do servico"}
                  </span>
                  <input
                    className="field-control"
                    value={item.descricao}
                    onChange={(event) => updateLinha(item.id, { descricao: event.target.value })}
                    placeholder={item.tipo === TipoItemManutencaoExecutada.PECA ? "Filtro, oleo, correia..." : "Troca, regulagem, solda, limpeza..."}
                  />
                </label>

                {item.tipo === TipoItemManutencaoExecutada.PECA ? (
                  <>
                    <label className="field">
                      <span className="field-label">Quantidade</span>
                      <input
                        className="field-control"
                        type="number"
                        step="0.0001"
                        value={item.quantidade}
                        onChange={(event) => updateLinha(item.id, { quantidade: event.target.value })}
                      />
                    </label>
                    <label className="field">
                      <span className="field-label">Unidade</span>
                      <input
                        className="field-control"
                        value={item.unidade}
                        onChange={(event) => updateLinha(item.id, { unidade: event.target.value })}
                        placeholder="un, litro, kg..."
                      />
                    </label>
                  </>
                ) : null}

                <label className="field" style={{ gridColumn: item.tipo === TipoItemManutencaoExecutada.PECA ? "span 2" : "span 4" }}>
                  <span className="field-label">Observacao</span>
                  <input
                    className="field-control"
                    value={item.observacao}
                    onChange={(event) => updateLinha(item.id, { observacao: event.target.value })}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>

        <label className="field">
          <span className="field-label">Observacao geral</span>
          <textarea
            className="field-control textarea-lg"
            value={form.observacao}
            onChange={(event) => updateField("observacao", event.target.value)}
          />
        </label>

        <div className="toolbar-actions">
          <button type="submit" className="button-primary" disabled={isPending}>
            {isPending ? "Salvando..." : "Salvar ordem de servico"}
          </button>
        </div>

        {message ? <p className="message-inline">{message}</p> : null}
        {error ? <p className="message-inline message-inline-danger">{error}</p> : null}
      </form>

      <div className="data-table-wrap" style={{ marginTop: 28 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Equipamento</th>
              <th>Ordem de servico</th>
              <th>Pecas e servicos</th>
            </tr>
          </thead>
          <tbody>
            {historico.map((item) => (
              <tr key={item.id}>
                <td>{formatDateDisplay(item.dataExecucao)}</td>
                <td>
                  <div>{item.equipamento.descricao}</div>
                  <div className="subtle">{item.equipamento.placaOuTag}</div>
                </td>
                <td>
                  <div>{item.tipoManutencao}</div>
                  <div className="subtle">{item.descricaoServico}</div>
                </td>
                <td>
                  {item.itensServicos.length === 0 ? (
                    <span className="subtle">Sem detalhamento informado.</span>
                  ) : (
                    <div style={{ display: "grid", gap: 6 }}>
                      {item.itensServicos.map((linha) => (
                        <span key={linha.id} className="badge badge-neutral">
                          {linha.tipo === TipoItemManutencaoExecutada.PECA ? "Peca" : "Servico"}: {linha.descricao}
                          {linha.quantidade ? ` - ${linha.quantidade}${linha.unidade ? ` ${linha.unidade}` : ""}` : ""}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
