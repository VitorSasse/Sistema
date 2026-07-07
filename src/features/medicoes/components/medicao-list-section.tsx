import { SearchableSelect } from "@/components/form/searchable-select";
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
import { formatDateInputValue } from "@/lib/utils/date";
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

function calcularValorLiquidoMedicao(medicao: MedicaoListItem) {
  const bruto = Number(medicao.valorTotal);
  const desconto = Number(medicao.descontoValor ?? 0);
  const permutaPercentual = Number(medicao.permutaPercentual ?? 0);
  const base = Math.max(0, bruto - desconto);
  const valorPermuta = base * (permutaPercentual / 100);

  return {
    bruto,
    desconto,
    permutaPercentual,
    valorPermuta,
    liquido: Math.max(0, base - valorPermuta)
  };
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
  const hasActiveFilters = Boolean(
    filters.clienteId ||
      filters.obraId ||
      filters.tipoMedicao ||
      filters.status ||
      filters.periodoInicial ||
      filters.periodoFinal ||
      filters.numeroPedido ||
      filters.numeroNotaFiscal
  );
  const visibleItems = hasActiveFilters ? items : items.slice(0, 5);
  const statusLabel = filters.status
    ? medicaoStatusLabels[filters.status as keyof typeof medicaoStatusLabels] ?? filters.status
    : "";
  const emptyStateTitle = filters.numeroPedido || filters.numeroNotaFiscal
    ? "Nenhuma medicao encontrada para pedido ou nota"
    : filters.status
      ? "Nenhuma medicao encontrada para o status informado"
      : "Nenhuma medicao encontrada";
  const emptyStateDescription = filters.numeroPedido || filters.numeroNotaFiscal
    ? [
        filters.numeroPedido ? `Pedido: ${filters.numeroPedido}` : null,
        filters.numeroNotaFiscal ? `Nota: ${filters.numeroNotaFiscal}` : null
      ]
        .filter(Boolean)
        .join(" | ")
    : filters.status
      ? `Nao existe medicao com status ${statusLabel.toLowerCase()} para os filtros aplicados.`
      : hasActiveFilters
        ? "Nenhuma medicao corresponde aos filtros aplicados."
        : "Ainda nao existe nenhuma medicao cadastrada.";

  return (
    <section className="surface section-card">
      <div className="section-header">
        <div>
          <h2 className="section-title">Relatorio completo de medicoes</h2>
          <p className="section-copy">
            {hasActiveFilters
              ? "Consulte as medicoes conforme os filtros aplicados."
              : "Mostrando as 5 medicoes mais recentes para facilitar o acesso rapido aos detalhes."}
          </p>
        </div>
        <button type="button" className="button-secondary" onClick={onRefresh}>
          Atualizar listagem
        </button>
      </div>

      <div className="form-grid-4" style={{ marginBottom: 20 }}>
        <MedicaoField label="Cliente">
          <SearchableSelect
            value={filters.clienteId}
            onChange={(value) => onChangeFilter("clienteId", value)}
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
            value={filters.obraId}
            onChange={(value) => onChangeFilter("obraId", value)}
            options={obras.map((item) => ({
              value: item.id,
              label: optionLabel(item)
            }))}
            placeholder="Digite a primeira letra da obra"
            emptyLabel="Nenhuma obra encontrada."
          />
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
        <MedicaoField label="Numero do pedido">
          <input
            className="field-control"
            type="text"
            value={filters.numeroPedido}
            onChange={(e) => onChangeFilter("numeroPedido", e.target.value)}
            placeholder="Filtrar por pedido"
          />
        </MedicaoField>
        <MedicaoField label="Numero da nota">
          <input
            className="field-control"
            type="text"
            value={filters.numeroNotaFiscal}
            onChange={(e) => onChangeFilter("numeroNotaFiscal", e.target.value)}
            placeholder="Filtrar por nota"
          />
        </MedicaoField>
      </div>
      <p className="subtle" style={{ marginTop: -8, marginBottom: 20 }}>
        O filtro de periodo considera a data do ultimo lancamento vinculado a cada medicao.
      </p>

      {visibleItems.length === 0 ? (
        <div className="billing-empty-state billing-empty-state-compact">
          <strong>{emptyStateTitle}</strong>
          <p>{emptyStateDescription}</p>
        </div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Tipo</th>
                <th>Cliente</th>
                <th>Obra</th>
                <th>Periodo</th>
                <th>Pedido</th>
                <th>Nota</th>
                <th>Status</th>
                <th>Itens</th>
                <th>Valor total</th>
                <th>Anexos</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((medicao) => {
                const valores = calcularValorLiquidoMedicao(medicao);

                return (
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
                  <td>
                    {formatDateInputValue(medicao.periodoInicial)} ate {formatDateInputValue(medicao.periodoFinal)}
                  </td>
                  <td>{medicao.numeroPedido?.trim() || "-"}</td>
                  <td>{medicao.numeroNotaFiscal?.trim() || "-"}</td>
                  <td>
                    <span className={medicaoStatusClasses[medicao.status]}>
                      {medicaoStatusLabels[medicao.status]}
                    </span>
                  </td>
                  <td>{medicao.itens.length}</td>
                  <td>
                    <div>{formatCurrency(valores.liquido)}</div>
                    {valores.desconto > 0 || valores.valorPermuta > 0 ? (
                      <div className="subtle">
                        Bruto: {formatCurrency(valores.bruto)}
                        {valores.desconto > 0 ? ` | Desc.: ${formatCurrency(valores.desconto)}` : ""}
                        {valores.valorPermuta > 0
                          ? ` | Permuta ${valores.permutaPercentual.toFixed(2).replace(".", ",")}%: ${formatCurrency(valores.valorPermuta)}`
                          : ""}
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
                      <button
                        type="button"
                        className="button-danger"
                        onClick={() => onRequestDelete(medicao)}
                      >
                        Excluir medicao
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
