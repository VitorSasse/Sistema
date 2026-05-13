import { SearchableSelect } from "@/components/form/searchable-select";
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
            <SearchableSelect
              value={form.clienteId}
              onChange={(value) => onChange("clienteId", value)}
              options={clientes.map((item) => ({
                value: item.id,
                label: optionLabel(item)
              }))}
              placeholder="Digite a primeira letra do cliente"
              emptyLabel="Nenhum cliente encontrado."
            />
          </MedicaoField>
          <MedicaoField label="Obra">
            <SearchableSelect
              value={form.obraId}
              onChange={(value) => onChange("obraId", value)}
              options={obrasDisponiveis.map((item) => ({
                value: item.id,
                label: optionLabel(item)
              }))}
              placeholder="Digite a primeira letra da obra"
              emptyLabel="Nenhuma obra encontrada para esse cliente."
            />
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
