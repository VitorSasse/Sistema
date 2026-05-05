"use client";

import { CriterioControleManutencao, StatusPlanoManutencao } from "@prisma/client";
import { useEffect, useMemo, useState, useTransition } from "react";

type EquipamentoOption = {
  id: string;
  descricao: string;
  placaOuTag: string;
  status: "ATIVO" | "INATIVO";
};

type PlanoItem = {
  id: string;
  titulo: string;
  tipoManutencao: string;
  criterioControle: CriterioControleManutencao;
  periodicidadeValor: number;
  toleranciaValor: number;
  ultimaExecucaoEm: string | null;
  ultimaLeituraHorimetro: string | null;
  ultimaLeituraKm: string | null;
  proximaExecucaoEm: string | null;
  proximoHorimetro: string | null;
  proximoKm: string | null;
  status: StatusPlanoManutencao;
  observacao: string | null;
  equipamento: {
    descricao: string;
    placaOuTag: string;
  };
};

type FormState = {
  id?: string;
  equipamentoId: string;
  tipoManutencao: string;
  criterioControle: CriterioControleManutencao;
  periodicidadeValor: string;
  toleranciaValor: string;
  ultimaExecucaoEm: string;
  ultimaLeituraHorimetro: string;
  ultimaLeituraKm: string;
  observacao: string;
  status: StatusPlanoManutencao;
};

const initialForm: FormState = {
  equipamentoId: "",
  tipoManutencao: "",
  criterioControle: "HORIMETRO",
  periodicidadeValor: "",
  toleranciaValor: "0",
  ultimaExecucaoEm: "",
  ultimaLeituraHorimetro: "",
  ultimaLeituraKm: "",
  observacao: "",
  status: "ATIVO"
};

export function PlanosManager() {
  const [equipamentos, setEquipamentos] = useState<EquipamentoOption[]>([]);
  const [planos, setPlanos] = useState<PlanoItem[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  async function loadEquipamentos() {
    const response = await fetch("/api/equipamentos", { cache: "no-store" });
    const data = (await response.json()) as { items: EquipamentoOption[] };
    const ativos = data.items.filter((item) => item.status === "ATIVO");
    setEquipamentos(ativos);
    setForm((current) => ({
      ...current,
      equipamentoId: current.equipamentoId || ativos[0]?.id || ""
    }));
  }

  async function loadPlanos() {
    const response = await fetch("/api/frota/planos", { cache: "no-store" });
    const data = (await response.json()) as { items: PlanoItem[] };
    setPlanos(data.items);
  }

  useEffect(() => {
    void Promise.all([loadEquipamentos(), loadPlanos()]);
  }, []);

  const preview = useMemo(() => {
    const periodicidade = Number(form.periodicidadeValor);

    if (!periodicidade || periodicidade <= 0) {
      return "Defina criterio e intervalo para calcular a proxima revisao.";
    }

    if (form.criterioControle === "HORIMETRO") {
      const base = Number(form.ultimaLeituraHorimetro || 0);
      return `Proxima revisao prevista no horimetro ${base + periodicidade}.`;
    }

    if (form.criterioControle === "KM") {
      const base = Number(form.ultimaLeituraKm || 0);
      return `Proxima revisao prevista no KM ${base + periodicidade}.`;
    }

    if (!form.ultimaExecucaoEm) {
      return "Informe a ultima execucao para calcular revisao por data.";
    }

    const data = new Date(`${form.ultimaExecucaoEm}T00:00:00`);
    data.setDate(data.getDate() + periodicidade);
    return `Proxima revisao prevista para ${data.toLocaleDateString("pt-BR")}.`;
  }, [form]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const method = form.id ? "PATCH" : "POST";
    const url = form.id ? `/api/frota/planos/${form.id}` : "/api/frota/planos";

    startTransition(async () => {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setMessage(data.message ?? "Nao foi possivel salvar o plano preventivo.");
        return;
      }

      setMessage(form.id ? "Plano preventivo atualizado." : "Plano preventivo cadastrado.");
      setForm((current) => ({
        ...initialForm,
        equipamentoId: current.equipamentoId
      }));
      await loadPlanos();
    });
  }

  function handleEdit(item: PlanoItem) {
    setForm({
      id: item.id,
      equipamentoId:
        equipamentos.find(
          (equipamento) =>
            equipamento.descricao === item.equipamento.descricao &&
            equipamento.placaOuTag === item.equipamento.placaOuTag
        )?.id ?? "",
      tipoManutencao: item.tipoManutencao,
      criterioControle: item.criterioControle,
      periodicidadeValor: String(item.periodicidadeValor),
      toleranciaValor: String(item.toleranciaValor),
      ultimaExecucaoEm: item.ultimaExecucaoEm ? item.ultimaExecucaoEm.slice(0, 10) : "",
      ultimaLeituraHorimetro: item.ultimaLeituraHorimetro ?? "",
      ultimaLeituraKm: item.ultimaLeituraKm ?? "",
      observacao: item.observacao ?? "",
      status: item.status
    });
    setMessage(`Editando plano de ${item.equipamento.descricao}.`);
  }

  return (
    <main className="page-stack">
      <section className="surface section-card">
        <div className="glass-band">
          <strong>Previsao automatica:</strong>
          <span className="subtle">{preview}</span>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 24, marginTop: 20 }}>
          <div className="form-grid-4">
            <label className="field">
              <span className="field-label">Equipamento</span>
              <select
                className="field-control"
                value={form.equipamentoId}
                onChange={(event) => updateField("equipamentoId", event.target.value)}
              >
                {equipamentos.map((equipamento) => (
                  <option key={equipamento.id} value={equipamento.id}>
                    {equipamento.descricao} - {equipamento.placaOuTag}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Tipo de revisao</span>
              <input
                className="field-control"
                value={form.tipoManutencao}
                onChange={(event) => updateField("tipoManutencao", event.target.value)}
                placeholder="Troca de oleo"
              />
            </label>
            <label className="field">
              <span className="field-label">Criterio</span>
              <select
                className="field-control"
                value={form.criterioControle}
                onChange={(event) =>
                  updateField(
                    "criterioControle",
                    event.target.value as CriterioControleManutencao
                  )
                }
              >
                <option value="HORIMETRO">HORIMETRO</option>
                <option value="KM">KM</option>
                <option value="DIAS">DIAS</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">Intervalo</span>
              <input
                className="field-control"
                type="number"
                value={form.periodicidadeValor}
                onChange={(event) => updateField("periodicidadeValor", event.target.value)}
              />
            </label>
            <label className="field">
              <span className="field-label">Tolerancia</span>
              <input
                className="field-control"
                type="number"
                value={form.toleranciaValor}
                onChange={(event) => updateField("toleranciaValor", event.target.value)}
              />
            </label>
            <label className="field">
              <span className="field-label">Ultima execucao</span>
              <input
                className="field-control"
                type="date"
                value={form.ultimaExecucaoEm}
                onChange={(event) => updateField("ultimaExecucaoEm", event.target.value)}
              />
            </label>
            <label className="field">
              <span className="field-label">Ultimo horimetro</span>
              <input
                className="field-control"
                type="number"
                step="0.01"
                value={form.ultimaLeituraHorimetro}
                onChange={(event) => updateField("ultimaLeituraHorimetro", event.target.value)}
              />
            </label>
            <label className="field">
              <span className="field-label">Ultimo KM</span>
              <input
                className="field-control"
                type="number"
                step="0.1"
                value={form.ultimaLeituraKm}
                onChange={(event) => updateField("ultimaLeituraKm", event.target.value)}
              />
            </label>
            <label className="field">
              <span className="field-label">Status</span>
              <select
                className="field-control"
                value={form.status}
                onChange={(event) => updateField("status", event.target.value as StatusPlanoManutencao)}
              >
                <option value="ATIVO">ATIVO</option>
                <option value="SUSPENSO">SUSPENSO</option>
                <option value="ENCERRADO">ENCERRADO</option>
              </select>
            </label>
          </div>

          <label className="field">
            <span className="field-label">Observacao</span>
            <textarea
              className="field-control textarea-lg"
              value={form.observacao}
              onChange={(event) => updateField("observacao", event.target.value)}
            />
          </label>

          <div className="toolbar-actions">
            <button type="submit" disabled={isPending} className="button-primary">
              {isPending ? "Salvando..." : form.id ? "Atualizar plano" : "Salvar plano"}
            </button>
          </div>

          {message ? <p className="message-inline">{message}</p> : null}
        </form>
      </section>

      <section className="surface section-card">
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Equipamento</th>
                <th>Revisao</th>
                <th>Criterio</th>
                <th>Ultima revisao</th>
                <th>Proxima previsao</th>
                <th>Status</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {planos.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div>{item.equipamento.descricao}</div>
                    <div className="subtle">{item.equipamento.placaOuTag}</div>
                  </td>
                  <td>{item.tipoManutencao}</td>
                  <td>
                    <div>{item.criterioControle}</div>
                    <div className="subtle">Intervalo: {item.periodicidadeValor}</div>
                  </td>
                  <td>
                    <div>{item.ultimaExecucaoEm ? new Date(item.ultimaExecucaoEm).toLocaleDateString("pt-BR") : "-"}</div>
                    <div className="subtle">
                      H: {item.ultimaLeituraHorimetro ?? "-"} · KM: {item.ultimaLeituraKm ?? "-"}
                    </div>
                  </td>
                  <td>
                    <div>
                      {item.proximaExecucaoEm
                        ? new Date(item.proximaExecucaoEm).toLocaleDateString("pt-BR")
                        : item.proximoHorimetro ?? item.proximoKm ?? "-"}
                    </div>
                  </td>
                  <td>
                    <span className={item.status === "ATIVO" ? "badge badge-success" : "badge badge-neutral"}>
                      {item.status}
                    </span>
                  </td>
                  <td>
                    <button type="button" className="button-secondary" onClick={() => handleEdit(item)}>
                      Editar
                    </button>
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
