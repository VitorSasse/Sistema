import { useEffect, useState } from "react";
import {
  medicaoStatusClasses,
  medicaoStatusLabels,
  medicaoStatusOptions,
  medicaoTipoClasses,
  medicaoTipoLabels
} from "@/features/medicoes/constants";
import { MedicaoField, MedicaoInfoCard } from "@/features/medicoes/components/shared";
import { formatQuantidadeComUnidade, formatUnidade } from "@/lib/utils/unidades";
import { formatCurrency } from "@/lib/utils/formatters";
import type {
  MedicaoDetail,
  MedicaoStatus,
  MedicaoUploadState
} from "@/features/medicoes/types";

function formatDate(value: string | null) {
  return value ? new Date(value).toISOString().slice(0, 10) : "-";
}

export function MedicaoDetailSection(props: {
  detail: MedicaoDetail;
  nextStatus: MedicaoStatus;
  upload: MedicaoUploadState;
  isPending: boolean;
  onChangeStatus: (status: MedicaoStatus) => void;
  onUpdateStatus: () => void;
  onChangeUpload: (next: MedicaoUploadState) => void;
  onUpload: (event: React.FormEvent<HTMLFormElement>) => void;
  onUpdateItemValue: (itemId: string, valorUnitario: number) => void;
  onUpdateItemFaturamento: (
    itemId: string,
    valorUnitario: number,
    quantidadeFaturada: number,
    unidadeFaturada: "CARGA" | "HORA" | "M3" | "DIARIA"
  ) => void;
  editingLancamentoId: string | null;
  onStartDetailEdit: (item: MedicaoDetail["itens"][number]) => void;
  observacao: string;
  onChangeObservacao: (value: string) => void;
  observacaoInterna: string;
  onChangeObservacaoInterna: (value: string) => void;
  onSaveObservacao: () => void;
  onOpenPdf: (id: string, tipo: "DETALHADO" | "RESUMIDO") => void;
  onRequestDelete: (detail: MedicaoDetail) => void;
  onClose: () => void;
}) {
  const {
    detail,
    nextStatus,
    upload,
    isPending,
    onChangeStatus,
    onUpdateStatus,
    onChangeUpload,
    onUpload,
    onUpdateItemValue,
    onUpdateItemFaturamento,
    editingLancamentoId,
    onStartDetailEdit,
    observacao,
    onChangeObservacao,
    observacaoInterna,
    onChangeObservacaoInterna,
    onSaveObservacao,
    onOpenPdf,
    onRequestDelete,
    onClose
  } = props;
  const [itemDrafts, setItemDrafts] = useState<
    Record<
      string,
      {
        valorUnitario: string;
        quantidadeFaturada: string;
        unidadeFaturada: "CARGA" | "HORA" | "M3" | "DIARIA";
      }
    >
  >({});

  useEffect(() => {
    setItemDrafts(
      Object.fromEntries(
        detail.itens.map((item) => [
          item.id,
          {
            valorUnitario: item.valorUnitario ?? "0",
            quantidadeFaturada: item.quantidadeFaturada ?? "0",
            unidadeFaturada: item.unidadeFaturada
          }
        ])
      )
    );
  }, [detail]);

  const totaisPorUnidade = detail.itens.reduce<Record<string, number>>((acc, item) => {
    const quantidadeFaturada = Number(
      itemDrafts[item.id]?.quantidadeFaturada ?? item.quantidadeFaturada
    );
    const unidadeFaturada = itemDrafts[item.id]?.unidadeFaturada ?? item.unidadeFaturada;

    acc[unidadeFaturada] = (acc[unidadeFaturada] ?? 0) + quantidadeFaturada;
    return acc;
  }, {});
  const valorTotalAtual = detail.itens.reduce((acc, item) => {
    return (
      acc +
      Number(itemDrafts[item.id]?.quantidadeFaturada ?? item.quantidadeFaturada) *
        Number(itemDrafts[item.id]?.valorUnitario ?? item.valorUnitario ?? 0)
    );
  }, 0);

  return (
    <section className="surface section-card surface-strong">
      <div className="section-header">
        <div>
          <h2 className="section-title">Detalhes da medicao</h2>
          <p className="section-copy">
            {detail.codigoMedicao} - {detail.cliente.nome}
          </p>
          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className={medicaoTipoClasses[detail.tipoMedicao]}>
              {medicaoTipoLabels[detail.tipoMedicao]}
            </span>
            <span className={medicaoStatusClasses[detail.status]}>
              {medicaoStatusLabels[detail.status]}
            </span>
          </div>
        </div>
        <div className="toolbar-actions">
          <button
            type="button"
            className="button-secondary"
            onClick={() => onOpenPdf(detail.id, "DETALHADO")}
          >
            PDF detalhado
          </button>
          <button
            type="button"
            className="button-ghost"
            onClick={() => onOpenPdf(detail.id, "RESUMIDO")}
          >
            PDF para cliente
          </button>
          <span
            title={
              detail.tipoMedicao === "MENSAL"
                ? "Medicoes mensais nao podem ser excluidas."
                : ""
            }
          >
            <button
              type="button"
              className="button-danger"
              disabled={detail.tipoMedicao === "MENSAL"}
              onClick={() => onRequestDelete(detail)}
            >
              Excluir medicao
            </button>
          </span>
          <button type="button" className="button-ghost" onClick={onClose}>
            Fechar detalhes
          </button>
        </div>
      </div>

      <div className="tile-grid" style={{ marginBottom: 20 }}>
        <MedicaoInfoCard title="Cliente" lines={[`${detail.cliente.codigo} - ${detail.cliente.nome}`, detail.cliente.cnpj ?? detail.cliente.cpf ?? "-", detail.cliente.email ?? detail.cliente.telefone ?? "-"]} />
        <MedicaoInfoCard title="Obra" lines={[detail.obra ? `${detail.obra.codigo} - ${detail.obra.nome}` : "Sem obra vinculada", detail.obra?.localidade ?? "-", [detail.obra?.cidade, detail.obra?.uf].filter(Boolean).join("/") || "-"]} />
        <MedicaoInfoCard
          title="Resumo"
          lines={[
            `${formatDate(detail.periodoInicial)} ate ${formatDate(detail.periodoFinal)}`,
            `${detail.itens.length} item(ns) / ${detail.anexos.length} anexo(s)`,
            `Valor total: ${formatCurrency(valorTotalAtual)}`
          ]}
        />
        <MedicaoInfoCard
          title="Totais faturados"
          lines={
            Object.entries(totaisPorUnidade).length > 0
              ? Object.entries(totaisPorUnidade).map(
                  ([unidade, quantidade]) =>
                    `${quantidade.toFixed(2)} ${formatUnidade(itemUnidade(unidade))}`
                )
              : ["Nenhum item faturado consolidado."]
          }
        />
      </div>

      <div className="split-grid" style={{ display: "grid", gap: 16, gridTemplateColumns: "1.1fr 0.9fr" }}>
        <article className="tile-card">
          <h3 style={{ marginTop: 0, marginBottom: 16 }}>Controle de status</h3>
          <div className="form-grid-2">
            <MedicaoField label="Proximo status">
              <select className="field-control" value={nextStatus} onChange={(e) => onChangeStatus(e.target.value as MedicaoStatus)}>
                {medicaoStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {medicaoStatusLabels[status]}
                  </option>
                ))}
              </select>
            </MedicaoField>
            <MedicaoField label="Linha do tempo">
              <div className="timeline-card">
                <span>Enviada: {formatDate(detail.enviadaAoClienteEm)}</span>
                <span>Faturamento: {formatDate(detail.enviadaParaFaturamentoEm)}</span>
                <span>Concluida: {formatDate(detail.fechadoEm ?? null)}</span>
              </div>
            </MedicaoField>
          </div>
          <div className="toolbar-actions" style={{ marginTop: 16 }}>
            <button type="button" disabled={isPending} className="button-primary" onClick={onUpdateStatus}>
              {isPending ? "Atualizando..." : "Atualizar status"}
            </button>
          </div>
          <div style={{ marginTop: 20, display: "grid", gap: 12 }}>
            <MedicaoField label="Observacao da medicao">
              <textarea
                className="field-control textarea-lg"
                value={observacao}
                onChange={(e) => onChangeObservacao(e.target.value)}
              />
            </MedicaoField>
            <MedicaoField label="Observacao interna">
              <textarea
                className="field-control textarea-lg"
                value={observacaoInterna}
                onChange={(e) => onChangeObservacaoInterna(e.target.value)}
                placeholder="Use para numero do pedido, numero da nota fiscal e observacoes internas."
              />
            </MedicaoField>
            <div className="toolbar-actions">
              <button
                type="button"
                disabled={isPending}
                className="button-secondary"
                onClick={onSaveObservacao}
              >
                {isPending ? "Salvando..." : "Salvar observacoes"}
              </button>
            </div>
          </div>
        </article>

        <article className="tile-card">
          <h3 style={{ marginTop: 0, marginBottom: 16 }}>Anexos</h3>
          <form onSubmit={onUpload} style={{ display: "grid", gap: 14 }}>
            <MedicaoField label="Tipo de anexo">
              <select className="field-control" value={upload.tipo} onChange={(e) => onChangeUpload({ ...upload, tipo: e.target.value as MedicaoUploadState["tipo"] })}>
                <option value="RELATORIO_MEDICAO">Relatorio da medicao</option>
                <option value="PEDIDO">Pedido</option>
                <option value="NOTA_FISCAL">Nota fiscal</option>
                <option value="OUTRO">Outro</option>
              </select>
            </MedicaoField>
            <MedicaoField label="Arquivo PDF">
              <input className="field-control" type="file" accept="application/pdf,.pdf" onChange={(e) => onChangeUpload({ ...upload, file: e.target.files?.[0] ?? null })} />
            </MedicaoField>
            <button type="submit" disabled={isPending} className="button-secondary">
              {isPending ? "Enviando..." : "Anexar PDF"}
            </button>
          </form>
        </article>
      </div>

      <div className="split-grid" style={{ display: "grid", gap: 16, gridTemplateColumns: "0.95fr 1.05fr", marginTop: 20 }}>
        <article className="tile-card">
          <h3 style={{ marginTop: 0, marginBottom: 16 }}>Documentos vinculados</h3>
          <div className="list-stack">
            {detail.anexos.length === 0 ? (
              <p className="subtle" style={{ margin: 0 }}>
                Nenhum anexo vinculado a esta medicao.
              </p>
            ) : (
              detail.anexos.map((anexo) => (
                <div key={anexo.id} className="list-item">
                  <div>
                    <div>{anexo.nomeArquivo}</div>
                    <div className="subtle">
                      {anexo.tipo} - {formatDate(anexo.createdAt)}
                    </div>
                  </div>
                  <a href={anexo.urlArquivo} target="_blank" rel="noreferrer" className="button-ghost">
                    Abrir
                  </a>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="tile-card">
          <h3 style={{ marginTop: 0, marginBottom: 16 }}>Itens medidos</h3>
          <div className="data-table-wrap">
            <table className="data-table data-table-compact">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Ficha</th>
                  <th>Recurso</th>
                  <th>Servico</th>
                  <th>Material</th>
                  <th>Faturado</th>
                  <th>Unid. faturada</th>
                  <th>Valor unit.</th>
                  <th>Total</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {detail.itens.map((item) => (
                  <tr
                    key={item.id}
                    style={
                      editingLancamentoId === item.lancamentoId
                        ? { background: "rgba(18, 91, 80, 0.06)" }
                        : undefined
                    }
                  >
                    <td>{formatDate(item.data)}</td>
                    <td>{item.ficha}</td>
                    <td>{item.placaOuTag}</td>
                    <td>{item.tipoServico}</td>
                    <td>{item.material ?? "-"}</td>
                    <td style={{ minWidth: 150 }}>
                      <div style={{ display: "grid", gap: 6 }}>
                        <input
                          className="field-control"
                          type="number"
                          min="0"
                          step="0.01"
                          value={
                            itemDrafts[item.id]?.quantidadeFaturada ?? item.quantidadeFaturada
                          }
                          onChange={(event) =>
                            setItemDrafts((current) => ({
                              ...current,
                              [item.id]: {
                                valorUnitario: current[item.id]?.valorUnitario ?? item.valorUnitario,
                                quantidadeFaturada: event.target.value,
                                unidadeFaturada: current[item.id]?.unidadeFaturada ?? item.unidadeFaturada
                              }
                            }))
                          }
                        />
                        <span className="subtle">
                          {formatQuantidadeComUnidade(
                            itemDrafts[item.id]?.quantidadeFaturada ?? item.quantidadeFaturada,
                            itemDrafts[item.id]?.unidadeFaturada ?? item.unidadeFaturada
                          )}
                        </span>
                      </div>
                    </td>
                    <td style={{ minWidth: 140 }}>
                      <select
                        className="field-control"
                        value={itemDrafts[item.id]?.unidadeFaturada ?? item.unidadeFaturada}
                        onChange={(event) =>
                          setItemDrafts((current) => ({
                            ...current,
                            [item.id]: {
                              valorUnitario: current[item.id]?.valorUnitario ?? item.valorUnitario,
                              quantidadeFaturada:
                                current[item.id]?.quantidadeFaturada ?? item.quantidadeFaturada,
                              unidadeFaturada: event.target.value as "CARGA" | "HORA" | "M3" | "DIARIA"
                            }
                          }))
                        }
                      >
                        <option value="CARGA">CARGA</option>
                        <option value="HORA">HORA</option>
                        <option value="M3">M3</option>
                        <option value="DIARIA">DIARIA</option>
                      </select>
                    </td>
                    <td style={{ minWidth: 140 }}>
                      <div style={{ display: "grid", gap: 8 }}>
                        <input
                          className="field-control"
                          type="number"
                          step="0.01"
                          value={itemDrafts[item.id]?.valorUnitario ?? item.valorUnitario}
                          onChange={(event) =>
                            setItemDrafts((current) => ({
                            ...current,
                            [item.id]: {
                                valorUnitario: event.target.value,
                                quantidadeFaturada:
                                  current[item.id]?.quantidadeFaturada ?? item.quantidadeFaturada,
                                unidadeFaturada: current[item.id]?.unidadeFaturada ?? item.unidadeFaturada
                              }
                            }))
                          }
                        />
                        <button
                          type="button"
                          className="button-ghost"
                          onClick={() => {
                            const draft = itemDrafts[item.id];
                            const valorUnitario = Number(draft?.valorUnitario ?? item.valorUnitario ?? 0);
                            const quantidadeFaturada = Number(
                              draft?.quantidadeFaturada ?? item.quantidadeFaturada ?? 0
                            );
                            const unidadeFaturada = draft?.unidadeFaturada ?? item.unidadeFaturada;

                            const teveMudancaFaturamento =
                              unidadeFaturada !== item.unidadeFaturada ||
                              quantidadeFaturada !== Number(item.quantidadeFaturada);

                            if (teveMudancaFaturamento) {
                              onUpdateItemFaturamento(
                                item.id,
                                valorUnitario,
                                quantidadeFaturada,
                                unidadeFaturada
                              );
                              return;
                            }

                            onUpdateItemValue(item.id, valorUnitario);
                          }}
                        >
                          Salvar item
                        </button>
                      </div>
                    </td>
                    <td>
                      {formatCurrency(
                        Number(itemDrafts[item.id]?.quantidadeFaturada ?? item.quantidadeFaturada) *
                          Number(itemDrafts[item.id]?.valorUnitario ?? item.valorUnitario ?? 0)
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="button-secondary"
                        onClick={() => onStartDetailEdit(item)}
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </section>
  );
}

function itemUnidade(value: string): "CARGA" | "HORA" | "M3" | "DIARIA" {
  if (value === "CARGA" || value === "HORA" || value === "M3" || value === "DIARIA") {
    return value;
  }
  return "HORA";
}
