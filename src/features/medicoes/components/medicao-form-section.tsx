import { SearchableSelect } from "@/components/form/searchable-select";
import type { OperationalOption } from "@/lib/client/operational-options";
import type {
  MedicaoCobrancaMaterial,
  MedicaoFormState,
  MedicaoTipo
} from "@/features/medicoes/types";
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
  onGenerate?: () => void;
  onChange: <K extends keyof MedicaoFormState>(key: K, value: MedicaoFormState[K]) => void;
  canGenerate?: boolean;
  title?: string;
  description?: string;
  submitLabel?: string;
  generateLabel?: string;
}) {
  const {
    form,
    clientes,
    obrasDisponiveis,
    isPending,
    message,
    onSubmit,
    onGenerate,
    onChange,
    canGenerate = false,
    title = "Gerar medicao por obra",
    description = "Selecione o periodo, carregue os lancamentos da obra e ajuste o que for necessario antes de consolidar, incluindo o valor unitario de cada item.",
    submitLabel = "Buscar lancamentos validos",
    generateLabel = "Gerar medicao"
  } = props;
  const permutaPercentual = Number(form.permutaPercentual.replace(",", ".") || 0);
  const possuiPermuta = Number.isFinite(permutaPercentual) && permutaPercentual > 0;

  return (
    <section className="surface section-card">
      <div className="section-header">
        <div>
          <h2 className="section-title">{title}</h2>
          <p className="section-copy">{description}</p>
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
          <MedicaoField label="Cobranca de material">
            <select
              className="field-control"
              value={form.cobrancaMaterial}
              onChange={(e) =>
                onChange("cobrancaMaterial", e.target.value as MedicaoCobrancaMaterial)
              }
            >
              <option value="CARGA">Por carga</option>
              <option value="M3">Por m3</option>
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
          <MedicaoField label="Permuta">
            <select
              className="field-control"
              value={possuiPermuta ? "SIM" : "NAO"}
              onChange={(event) =>
                onChange(
                  "permutaPercentual",
                  event.target.value === "SIM"
                    ? form.permutaPercentual.trim() && form.permutaPercentual !== "0"
                      ? form.permutaPercentual
                      : "100"
                    : "0"
                )
              }
            >
              <option value="NAO">Nao</option>
              <option value="SIM">Sim</option>
            </select>
          </MedicaoField>
          <MedicaoField label="Percentual da permuta (%)">
            <input
              className="field-control"
              type="number"
              min="0"
              max="100"
              step="0.000001"
              value={possuiPermuta ? form.permutaPercentual : ""}
              onChange={(event) => onChange("permutaPercentual", event.target.value)}
              placeholder="Ex.: 24,857512"
              disabled={!possuiPermuta}
            />
          </MedicaoField>
        </div>

        <MedicaoField label="Observacao da medicao">
          <textarea className="field-control textarea-lg" value={form.observacao} onChange={(e) => onChange("observacao", e.target.value)} />
        </MedicaoField>

        {form.cobrancaMaterial === "M3" ? (
          <p className="message-inline">
            Para lancamentos de material em carga, a pre-visualizacao vai usar a capacidade
            m3 do caminhao para calcular a quantidade faturada automaticamente.
          </p>
        ) : null}

        <div className="toolbar-actions">
          <button type="submit" disabled={isPending} className="button-primary">
            {isPending ? "Processando..." : submitLabel}
          </button>
          {onGenerate ? (
            <button
              type="button"
              disabled={isPending || !canGenerate}
              className="button-secondary"
              onClick={onGenerate}
            >
              {generateLabel}
            </button>
          ) : null}
        </div>

        {message ? <p className="message-inline">{message}</p> : null}
      </form>
    </section>
  );
}
