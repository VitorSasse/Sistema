import type { OperationalOption } from "@/lib/client/operational-options";
import {
  medicaoStatusClasses,
  medicaoStatusLabels,
  medicaoStatusOptions,
  medicaoTipoClasses,
  medicaoTipoLabels
} from "@/features/medicoes/constants";
import type { MedicaoFilters, MedicaoListItem } from "@/features/medicoes/types";
import { formatCurrency } from "@/lib/utils/formatters";
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

export function MedicaoListSection(props: {
  filters: MedicaoFilters;
  clientes: OperationalOption[];
  obras: OperationalOption[];
  items: MedicaoListItem[];
  onChangeFilter: <K extends keyof MedicaoFilters>(key: K, value: MedicaoFilters[K]) => void;
  onRefresh: () => void;
  onOpenDetail: (id: string) => void;
  onOpenPdf: (id: string) => void;
  onRequestDelete: (medicao: MedicaoListItem) => void;
}) {
  const {
    filters,
    clientes,
    obras,
    items,
    onChangeFilter,
    onRefresh,
    onOpenDetail,
    onOpenPdf,
    onRequestDelete
  } = props;

  return (
    <section className="surface section-card">
      <div className="section-header">
        <div>
          <h2 className="section-title">Relatorio completo de medicoes</h2>
          <p className="section-copy">
            Consulte todas as medicoes e diferencie unicas, quinzenais e fechadas.
          </p>
        </div>
        <button type="button" className="button-secondary" onClick={onRefresh}>
          Atualizar listagem
        </button>
      </div>

      <div className="form-grid-4" style={{ marginBottom: 20 }}>
        <MedicaoField label="Cliente">
          <select className="field-control" value={filters.clienteId} onChange={(e) => onChangeFilter("clienteId", e.target.value)}>
            <option value="">Todos</option>
            {clientes.map((item) => (
              <option key={item.id} value={item.id}>
                {optionLabel(item)}
              </option>
            ))}
          </select>
        </MedicaoField>
        <MedicaoField label="Obra">
          <select className="field-control" value={filters.obraId} onChange={(e) => onChangeFilter("obraId", e.target.value)}>
            <option value="">Todas</option>
            {obras.map((item) => (
              <option key={item.id} value={item.id}>
                {optionLabel(item)}
              </option>
            ))}
          </select>
        </MedicaoField>
        <MedicaoField label="Tipo">
          <select className="field-control" value={filters.tipoMedicao} onChange={(e) => onChangeFilter("tipoMedicao", e.target.value as MedicaoFilters["tipoMedicao"])}>
            <option value="">Todos</option>
            <option value="UNICA">Unica</option>
            <option value="SEMANAL">Semanal</option>
            <option value="QUINZENAL">Quinzenal</option>
            <option value="MENSAL">Mensal</option>
          </select>
        </MedicaoField>
        <MedicaoField label="Status">
          <select className="field-control" value={filters.status} onChange={(e) => onChangeFilter("status", e.target.value)}>
            <option value="">Todos</option>
            {medicaoStatusOptions.map((status) => (
              <option key={status} value={status}>
                {medicaoStatusLabels[status]}
              </option>
            ))}
          </select>
        </MedicaoField>
        <MedicaoField label="Periodo inicial">
          <input className="field-control" type="date" value={filters.periodoInicial} onChange={(e) => onChangeFilter("periodoInicial", e.target.value)} />
        </MedicaoField>
        <MedicaoField label="Periodo final">
          <input className="field-control" type="date" value={filters.periodoFinal} onChange={(e) => onChangeFilter("periodoFinal", e.target.value)} />
        </MedicaoField>
      </div>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Codigo</th>
              <th>Tipo</th>
              <th>Cliente</th>
              <th>Obra</th>
              <th>Periodo</th>
              <th>Status</th>
              <th>Itens</th>
              <th>Valor total</th>
              <th>Anexos</th>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {items.map((medicao) => (
              <tr key={medicao.id}>
                <td>{medicao.codigoMedicao}</td>
                <td>
                  <span className={medicaoTipoClasses[medicao.tipoMedicao]}>
                    {medicaoTipoLabels[medicao.tipoMedicao]}
                  </span>
                </td>
                <td>
                  <div>{medicao.cliente.nome}</div>
                  <div className="subtle">{medicao.cliente.codigo}</div>
                </td>
                <td>
                  {medicao.obra ? (
                    <>
                      <div>{medicao.obra.nome}</div>
                      <div className="subtle">{medicao.obra.codigo}</div>
                    </>
                  ) : (
                    "-"
                  )}
                </td>
                <td>{new Date(medicao.periodoInicial).toISOString().slice(0, 10)} ate {new Date(medicao.periodoFinal).toISOString().slice(0, 10)}</td>
                <td>
                  <span className={medicaoStatusClasses[medicao.status]}>
                    {medicaoStatusLabels[medicao.status]}
                  </span>
                </td>
                <td>{medicao.itens.length}</td>
                <td>
                  <div>{formatCurrency(Number(medicao.valorTotal) - Number(medicao.descontoValor ?? 0))}</div>
                  {Number(medicao.descontoValor ?? 0) > 0 ? (
                    <div className="subtle">
                      Bruto: {formatCurrency(medicao.valorTotal)}
                    </div>
                  ) : null}
                </td>
                <td>{medicao.anexos.length}</td>
                <td>
                  <div className="toolbar-actions">
                    <button type="button" className="button-secondary" onClick={() => onOpenDetail(medicao.id)}>
                      Detalhes
                    </button>
                    <button type="button" className="button-ghost" onClick={() => onOpenPdf(medicao.id)}>
                      PDF
                    </button>
                    <span
                      title={
                        medicao.tipoMedicao === "MENSAL"
                          ? "Medicoes mensais nao podem ser excluidas."
                          : ""
                      }
                    >
                      <button
                        type="button"
                        className="button-danger"
                        disabled={medicao.tipoMedicao === "MENSAL"}
                        onClick={() => onRequestDelete(medicao)}
                      >
                        Excluir medicao
                      </button>
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
