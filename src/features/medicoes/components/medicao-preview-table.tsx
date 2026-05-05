import type {
  MedicaoPreviewResumo,
  MedicaoPreviewValueMap,
  PreviewItem
} from "@/features/medicoes/types";
import { formatQuantidadeComUnidade, formatUnidade } from "@/lib/utils/unidades";
import { formatCurrency } from "@/lib/utils/formatters";

export function MedicaoPreviewTable(props: {
  items: PreviewItem[];
  resumo: MedicaoPreviewResumo | null;
  itemValues: MedicaoPreviewValueMap;
  editingId: string | null;
  onChangeItemValue: (itemId: string, value: string) => void;
  onEdit: (item: PreviewItem) => void;
}) {
  const { items, resumo, itemValues, editingId, onChangeItemValue, onEdit } = props;
  const valorTotalPreview = items.reduce((acc, item) => {
    const value = itemValues[item.id]?.replace(",", ".").trim() ?? "";
    const valorUnitario = value ? Number(value) : 0;

    return acc + Number(item.quantidadeFaturada) * (Number.isFinite(valorUnitario) ? valorUnitario : 0);
  }, 0);

  return (
    <section className="surface section-card">
      <div className="section-header">
        <div>
          <h2 className="section-title">Itens elegiveis</h2>
          <p className="section-copy">
            {resumo
              ? `${resumo.totalLancamentos} lancamentos somando ${resumo.quantidadeTotal.toFixed(2)} no faturado.`
              : "Nenhuma pre-visualizacao carregada."}
          </p>
        </div>
      </div>

      {resumo ? (
        <div className="glass-band" style={{ marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <strong>Totais faturados:</strong>
          {Object.entries(resumo.totaisPorUnidade).length === 0 ? (
            <span className="subtle">Nenhum total consolidado.</span>
          ) : (
            Object.entries(resumo.totaisPorUnidade).map(([unidade, quantidade]) => (
              <span key={unidade} className="badge badge-neutral">
                {quantidade.toFixed(2)} {formatUnidade(unidade as PreviewItem["unidadeFaturada"])}
              </span>
            ))
          )}
          <span className="badge badge-success">Valor previsto: {formatCurrency(valorTotalPreview)}</span>
        </div>
      ) : null}

      <div className="data-table-wrap">
        <table className="data-table data-table-compact">
          <thead>
            <tr>
              <th>Data</th>
              <th>Ficha</th>
              <th>Obra</th>
              <th>Servico</th>
              <th>Recurso</th>
              <th>Colaborador</th>
              <th>Faturado</th>
              <th>Valor unit.</th>
              <th>Valor total</th>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const rawValue = itemValues[item.id] ?? "";
              const parsedValue = rawValue.trim() ? Number(rawValue.replace(",", ".")) : null;
              const valorTotalItem =
                parsedValue !== null && Number.isFinite(parsedValue)
                  ? Number(item.quantidadeFaturada) * parsedValue
                  : null;

              return (
                <tr
                  key={item.id}
                  style={
                    editingId === item.id
                      ? { background: "rgba(18, 91, 80, 0.06)" }
                      : undefined
                  }
                >
                  <td>{item.data.slice(0, 10)}</td>
                  <td>{item.ficha.numero}</td>
                  <td>{item.obra?.nome ?? "-"}</td>
                  <td>
                    <div>{item.servico.tipoServico}</div>
                    <div className="subtle">{item.material?.descricao ?? "-"}</div>
                  </td>
                  <td>
                    <div>{item.equipamento.descricao}</div>
                    <div className="subtle">{item.equipamento.placaOuTag}</div>
                  </td>
                  <td>{item.colaborador.nome}</td>
                  <td>
                    {formatQuantidadeComUnidade(item.quantidadeFaturada, item.unidadeFaturada)}
                  </td>
                  <td style={{ minWidth: 140 }}>
                    <input
                      className="field-control"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0,00"
                      value={rawValue}
                      onChange={(event) => onChangeItemValue(item.id, event.target.value)}
                    />
                  </td>
                  <td>{valorTotalItem !== null ? formatCurrency(valorTotalItem) : "--"}</td>
                  <td>
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={() => onEdit(item)}
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
