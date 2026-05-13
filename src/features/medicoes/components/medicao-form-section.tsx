import { useMemo, useState } from "react";
import type { OperationalOption } from "@/lib/client/operational-options";
import type { MedicaoFormState, MedicaoTipo } from "@/features/medicoes/types";
import { MedicaoField } from "@/features/medicoes/components/shared";

function optionLabel(option: OperationalOption) {
  return [
    option.codigo,
    option.codigoMaterial,
    option.nome,
    option.tipoServico,
    option.descricao,
    option.placaOuTag
  ]
    .filter(Boolean)
    .join(" - ");
}

export function MedicaoFormSection(props: {
  form: MedicaoFormState;
  clientes: OperationalOption[];
  obrasDisponiveis: OperationalOption[];
  isPending: boolean;
  message: string;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onGenerate: () => void;
  onChange: <K extends keyof MedicaoFormState>(key: K, value: MedicaoFormState[K]) => void;
  canGenerate: boolean;
}) {
  const { form, clientes, obrasDisponiveis, isPending, message, onSubmit, onGenerate, onChange, canGenerate } = props;
  const [clienteSearch, setClienteSearch] = useState("");
  const [obraSearch, setObraSearch] = useState("");

  const clientesFiltrados = useMemo(
    () =>
      clientes.filter((item) =>
        optionLabel(item).toLocaleLowerCase("pt-BR").includes(clienteSearch.toLocaleLowerCase("pt-BR"))
      ),
    [clientes, clienteSearch]
  );

  const obrasFiltradas = useMemo(
    () =>
      obrasDisponiveis.filter((item) =>
        optionLabel(item).toLocaleLowerCase("pt-BR").includes(obraSearch.toLocaleLowerCase("pt-BR"))
      ),
    [obrasDisponiveis, obraSearch]
  );

  return (
    <section className="surface section-card">
      <div className="section-header">
        <div>
          <h2 className="section-title">Gerar medicao por obra</h2>
          <p className="section-copy">
            Selecione o periodo, carregue os lancamentos da obra e ajuste o que for
            necessario antes de consolidar, incluindo o valor unitario de cada item.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 24 }}>
        <div className="form-grid-4">
          <MedicaoField label="Periodo inicial">
            <input className="field-control" type="date" value={form.periodoInicial} onChange={(e) => onChange("periodoInicial", e.target.value)} />
          </MedicaoField>
          <MedicaoField label="Periodo final">
            <input className="field-control" type="date" value={form.periodoFinal} onChange={(e) => onChange("periodoFinal", e.target.value)} />
          </MedicaoField>
          <MedicaoField label="Tipo de medicao">
            <select className="field-control" value={form.tipoMedicao} onChange={(e) => onChange("tipoMedicao", e.target.value as MedicaoTipo)}>
              <option value="UNICA">Unica</option>
              <option value="SEMANAL">Semanal</option>
              <option value="QUINZENAL">Quinzenal</option>
              <option value="MENSAL">Mensal</option>
            </select>
          </MedicaoField>
          <MedicaoField label="Cliente">
            <input
              className="field-control"
              value={clienteSearch}
              onChange={(e) => setClienteSearch(e.target.value)}
              placeholder="Buscar cliente"
              style={{ marginBottom: 8 }}
            />
            <select className="field-control" value={form.clienteId} onChange={(e) => onChange("clienteId", e.target.value)}>
              <option value="">Selecione</option>
              {clientesFiltrados.map((item) => (
                <option key={item.id} value={item.id}>
                  {optionLabel(item)}
                </option>
              ))}
            </select>
          </MedicaoField>
          <MedicaoField label="Obra">
            <input
              className="field-control"
              value={obraSearch}
              onChange={(e) => setObraSearch(e.target.value)}
              placeholder="Buscar obra"
              style={{ marginBottom: 8 }}
            />
            <select className="field-control" value={form.obraId} onChange={(e) => onChange("obraId", e.target.value)}>
              <option value="">Selecione a obra</option>
              {obrasFiltradas.map((item) => (
                <option key={item.id} value={item.id}>
                  {optionLabel(item)}
                </option>
              ))}
            </select>
          </MedicaoField>
        </div>

        <MedicaoField label="Observacao da medicao">
          <textarea className="field-control textarea-lg" value={form.observacao} onChange={(e) => onChange("observacao", e.target.value)} />
        </MedicaoField>

        <div className="toolbar-actions">
          <button type="submit" disabled={isPending} className="button-primary">
            {isPending ? "Processando..." : "Buscar lancamentos validos"}
          </button>
          <button type="button" disabled={isPending || !canGenerate} className="button-secondary" onClick={onGenerate}>
            Gerar medicao
          </button>
        </div>

        {message ? <p className="message-inline">{message}</p> : null}
      </form>
    </section>
  );
}
