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
  MedicaoCobrancaMaterial,
  MedicaoDetail,
  MedicaoPreviewResumo,
  MedicaoStatus,
  MedicaoUploadState,
  PreviewItem
} from "@/features/medicoes/types";

function formatDate(value: string | null) {
  return value ? new Date(value).toISOString().slice(0, 10) : "-";
}

function buildWarnings(detail: MedicaoDetail, descontoValor: string) {
  const warnings: string[] = [];

  if (detail.status === "CANCELADA") {
    return warnings;
  }

  if (detail.itens.length === 0) {
    warnings.push("Esta medicao esta sem itens vinculados.");
  }

  if (detail.itens.some((item) => Number(item.quantidadeFaturada) <= 0)) {
    warnings.push("Existe item com quantidade faturada zerada ou invalida.");
  }

  const valorTotal = detail.itens.reduce(
    (acc, item) => acc + Number(item.quantidadeFaturada) * Number(item.valorUnitario),
    0
  );
  const desconto = Number(descontoValor.replace(",", ".") || 0);

  if (desconto > valorTotal) {
    warnings.push("O desconto esta maior que o valor bruto da medicao.");
  }

  return warnings;
}

export function MedicaoDetailSection(props: {
  detail: MedicaoDetail;
  canEditContent: boolean;
  detailCobrancaMaterial: MedicaoCobrancaMaterial;
  eligibleItems: PreviewItem[];
  eligibleResumo: MedicaoPreviewResumo | null;
  selectedLancamentoIds: string[];
  nextStatus: MedicaoStatus;
  upload: MedicaoUploadState;
  isPending: boolean;
  onChangeDetailCobrancaMaterial: (value: MedicaoCobrancaMaterial) => void;
  onRefreshEligibleLancamentos: () => void;
  onToggleEligibleLancamento: (lancamentoId: string) => void;
  onToggleAllEligibleLancamentos: () => void;
  onAddEligibleLancamentos: () => void;
  onChangeStatus: (status: MedicaoStatus) => void;
  onUpdateStatus: () => void;
  onChangeUpload: (next: MedicaoUploadState) => void;
  onUpload: (event: React.FormEvent<HTMLFormElement>) => void;
  onUpdateItemValue: (itemId: string, valorUnitario: number) => void;
  onUpdateItemFaturamento: (
    itemId: string,
    valorUnitario: number,
    quantidadeFaturada: number,
    unidadeFaturada: "CARGA" | "HORA" | "M3" | "DIARIA" | "SERVICO"
  ) => void;
  editingLancamentoId: string | null;
  onStartDetailEdit: (item: MedicaoDetail["itens"][number]) => void;
  periodoInicial: string;
  onChangePeriodoInicial: (value: string) => void;
  periodoFinal: string;
  onChangePeriodoFinal: (value: string) => void;
  observacao: string;
  onChangeObservacao: (value: string) => void;
  observacaoInterna: string;
  onChangeObservacaoInterna: (value: string) => void;
  justificativaCancelamento: string;
  onChangeJustificativaCancelamento: (value: string) => void;
  descontoValor: string;
  onChangeDescontoValor: (value: string) => void;
  numeroPedido: string;
  onChangeNumeroPedido: (value: string) => void;
  numeroNotaFiscal: string;
  onChangeNumeroNotaFiscal: (value: string) => void;
  onSaveObservacao: () => void;
  onOpenPdf: (id: string, tipo: "DETALHADO" | "RESUMIDO") => void;
  onOpenRomaneiosReport: (id: string) => void;
  onRequestDelete: (detail: MedicaoDetail) => void;
  onClose: () => void;
}) {
  const {
    detail,
    canEditContent,
    detailCobrancaMaterial,
    eligibleItems,
    eligibleResumo,
    selectedLancamentoIds,
    nextStatus,
    upload,
    isPending,
    onChangeDetailCobrancaMaterial,
    onRefreshEligibleLancamentos,
    onToggleEligibleLancamento,
    onToggleAllEligibleLancamentos,
    onAddEligibleLancamentos,
    onChangeStatus,
    onUpdateStatus,
    onChangeUpload,
    onUpload,
    onUpdateItemValue,
    onUpdateItemFaturamento,
    editingLancamentoId,
    onStartDetailEdit,
    periodoInicial,
    onChangePeriodoInicial,
    periodoFinal,
    onChangePeriodoFinal,
    observacao,
    onChangeObservacao,
    observacaoInterna,
    onChangeObservacaoInterna,
    justificativaCancelamento,
    onChangeJustificativaCancelamento,
    descontoValor,
    onChangeDescontoValor,
    numeroPedido,
    onChangeNumeroPedido,
    numeroNotaFiscal,
    onChangeNumeroNotaFiscal,
    onSaveObservacao,
    onOpenPdf,
    onOpenRomaneiosReport,
    onRequestDelete,
    onClose
  } = props;
  const [itemDrafts, setItemDrafts] = useState<
    Record<
      string,
      {
        valorUnitario: string;
        quantidadeFaturada: string;
        unidadeFaturada: "CARGA" | "HORA" | "M3" | "DIARIA" | "SERVICO";
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
  const descontoAtual = Math.max(0, Number(descontoValor.replace(",", ".") || 0));
  const valorFinalAtual = Math.max(0, valorTotalAtual - descontoAtual);
  const warnings = buildWarnings(detail, descontoValor);
  const allEligibleSelected =
    eligibleItems.length > 0 && selectedLancamentoIds.length === eligibleItems.length;
  const periodoBloqueado = Boolean(detail.fechadoEm);

  return (
    <section className="surface section-card surface-strong">
      <div className="section-header">
        <div>
          <h2 className="section-title">Detalhes da medicao</h2>
          <p className="section-copy">
            {detail.codigoMedicao} - {detail.cliente.nome}
          </p>
          <div className="section-inline-note">
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
          <button
            type="button"
            className="button-ghost"
            onClick={() => onOpenRomaneiosReport(detail.id)}
          >
            Relatorio de romaneios
          </button>
          <span
            title=""
          >
            <button
              type="button"
              className="button-danger"
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
            `Pedido: ${detail.numeroPedido?.trim() || "-"}`,
            `Nota: ${detail.numeroNotaFiscal?.trim() || "-"}`,
            `Valor bruto: ${formatCurrency(valorTotalAtual)}`,
            `Valor final: ${formatCurrency(valorFinalAtual)}`
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

      {warnings.length > 0 ? (
        <div className="message-inline message-inline-danger" style={{ marginBottom: 20 }}>
          <strong>Avisos da medicao:</strong>
          <ul style={{ margin: "8px 0 0 18px" }}>
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {!canEditContent ? (
        <div className="message-inline" style={{ marginBottom: 20 }}>
          O conteudo desta medicao esta bloqueado para edicao neste status. Os itens,
          observacoes e lancamentos vinculados nao podem mais ser alterados.
        </div>
      ) : null}

      <div className="content-split-detail">
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
                <span>Criada: {formatDate(detail.createdAt)}</span>
                <span>Enviada: {formatDate(detail.enviadaAoClienteEm)}</span>
                <span>Faturamento: {formatDate(detail.enviadaParaFaturamentoEm)}</span>
                <span>Concluida: {formatDate(detail.fechadoEm ?? null)}</span>
                <span>Cancelada: {formatDate(detail.canceladaEm ?? null)}</span>
              </div>
            </MedicaoField>
          </div>
          {nextStatus === "CANCELADA" || detail.status === "CANCELADA" ? (
            <div className="section-block">
              <MedicaoField label="Justificativa do cancelamento">
                <textarea
                  className="field-control textarea-lg"
                  value={justificativaCancelamento}
                  onChange={(e) => onChangeJustificativaCancelamento(e.target.value)}
                  placeholder="Informe o motivo do cancelamento. Os lancamentos serao liberados novamente."
                />
              </MedicaoField>
            </div>
          ) : null}
          <div className="toolbar-actions section-block">
            <button type="button" disabled={isPending} className="button-primary" onClick={onUpdateStatus}>
              {isPending ? "Atualizando..." : "Atualizar status"}
            </button>
          </div>
          <div className="section-block section-stack-sm">
            <div className="form-grid-2">
              <MedicaoField label="Periodo inicial">
                <input
                  className="field-control"
                  type="date"
                  value={periodoInicial}
                  onChange={(e) => onChangePeriodoInicial(e.target.value)}
                  disabled={!canEditContent || isPending || periodoBloqueado}
                />
              </MedicaoField>
              <MedicaoField label="Periodo final">
                <input
                  className="field-control"
                  type="date"
                  value={periodoFinal}
                  onChange={(e) => onChangePeriodoFinal(e.target.value)}
                  disabled={!canEditContent || isPending || periodoBloqueado}
                />
              </MedicaoField>
            </div>
            <p className="subtle" style={{ margin: 0 }}>
              {periodoBloqueado
                ? "O periodo ficou travado porque esta medicao ja foi concluida em algum momento."
                : "Ajuste o periodo para ampliar a janela de lancamentos elegiveis. O novo intervalo nao pode deixar itens ja vinculados fora da medicao."}
            </p>
            <MedicaoField label="Observacao da medicao">
              <textarea
                className="field-control textarea-lg"
                value={observacao}
                onChange={(e) => onChangeObservacao(e.target.value)}
                disabled={!canEditContent || isPending}
              />
            </MedicaoField>
            <MedicaoField label="Observacao interna">
              <textarea
                className="field-control textarea-lg"
                value={observacaoInterna}
                onChange={(e) => onChangeObservacaoInterna(e.target.value)}
                placeholder="Use para observacoes internas da medicao."
                disabled={!canEditContent || isPending}
              />
            </MedicaoField>
            <div className="form-grid-2">
              <MedicaoField label="Numero do pedido">
                <input
                  className="field-control"
                  type="text"
                  value={numeroPedido}
                  onChange={(e) => onChangeNumeroPedido(e.target.value)}
                  placeholder="Ex.: PED-2026-014"
                  disabled={!canEditContent || isPending}
                />
              </MedicaoField>
              <MedicaoField label="Numero da nota">
                <input
                  className="field-control"
                  type="text"
                  value={numeroNotaFiscal}
                  onChange={(e) => onChangeNumeroNotaFiscal(e.target.value)}
                  placeholder="Ex.: NF-001254"
                  disabled={!canEditContent || isPending}
                />
              </MedicaoField>
            </div>
            <MedicaoField label="Desconto da medicao">
              <input
                className="field-control"
                type="number"
                min="0"
                step="0.01"
                value={descontoValor}
                onChange={(e) => onChangeDescontoValor(e.target.value)}
                disabled={!canEditContent || isPending}
              />
            </MedicaoField>
            <div className="timeline-card">
              <span>Valor bruto: {formatCurrency(valorTotalAtual)}</span>
              <span>Desconto: {formatCurrency(descontoAtual)}</span>
              <span>Valor final: {formatCurrency(valorFinalAtual)}</span>
              {detail.justificativaCancelamento?.trim() ? (
                <span>Justificativa: {detail.justificativaCancelamento}</span>
              ) : null}
            </div>
            <div className="toolbar-actions">
              <button
                type="button"
                disabled={!canEditContent || isPending}
                className="button-secondary"
                onClick={onSaveObservacao}
              >
                {isPending ? "Salvando..." : "Salvar dados da medicao"}
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

      {canEditContent ? (
        <article className="tile-card section-block">
          <div className="section-row-between" style={{ marginBottom: 16 }}>
            <div>
              <h3 style={{ marginTop: 0, marginBottom: 8 }}>Lancamentos elegiveis</h3>
              <p className="subtle" style={{ margin: 0 }}>
                Use esta area para inserir novos lancamentos na mesma medicao sem
                gerar outra consolidacao.
              </p>
            </div>
            <div className="section-row-actions">
              <MedicaoField label="Cobranca material">
                <select
                  className="field-control"
                  value={detailCobrancaMaterial}
                  onChange={(event) =>
                    onChangeDetailCobrancaMaterial(
                      event.target.value as MedicaoCobrancaMaterial
                    )
                  }
                  disabled={isPending}
                >
                  <option value="CARGA">Por carga</option>
                  <option value="M3">Por m3</option>
                </select>
              </MedicaoField>
              <button
                type="button"
                className="button-ghost"
                disabled={isPending}
                onClick={onRefreshEligibleLancamentos}
              >
                Atualizar elegiveis
              </button>
              <button
                type="button"
                className="button-primary"
                disabled={isPending || selectedLancamentoIds.length === 0}
                onClick={onAddEligibleLancamentos}
              >
                Inserir selecionados
              </button>
            </div>
          </div>

          {eligibleResumo ? (
            <div className="timeline-card" style={{ marginBottom: 16 }}>
              <span>{eligibleResumo.totalLancamentos} lancamento(s) elegiveis.</span>
              {Object.entries(eligibleResumo.totaisPorUnidade).map(([unidade, quantidade]) => (
                <span key={unidade}>
                  {Number(quantidade).toFixed(2)} {formatUnidade(itemUnidade(unidade))}
                </span>
              ))}
            </div>
          ) : null}

          {eligibleItems.length === 0 ? (
            <p className="subtle" style={{ margin: 0 }}>
              Nenhum lancamento elegivel encontrado para esse periodo e essa configuracao.
            </p>
          ) : (
            <>
              <div className="toolbar-actions" style={{ marginBottom: 12 }}>
                <button
                  type="button"
                  className="button-ghost"
                  disabled={isPending}
                  onClick={onToggleAllEligibleLancamentos}
                >
                  {allEligibleSelected ? "Limpar selecao" : "Selecionar todos"}
                </button>
                <span className="subtle">
                  {selectedLancamentoIds.length} de {eligibleItems.length} selecionado(s)
                </span>
              </div>
              <div className="data-table-wrap">
                <table className="data-table data-table-compact">
                  <thead>
                    <tr>
                      <th />
                      <th>Data</th>
                      <th>Ficha</th>
                      <th>Recurso</th>
                      <th>Servico</th>
                      <th>Material</th>
                      <th>Faturado</th>
                      <th>Colaborador</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eligibleItems.map((item) => {
                      const checked = selectedLancamentoIds.includes(item.id);

                      return (
                        <tr key={item.id}>
                          <td>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => onToggleEligibleLancamento(item.id)}
                              disabled={isPending}
                            />
                          </td>
                          <td>{formatDate(item.data)}</td>
                          <td>{item.ficha.numero}</td>
                          <td>{item.equipamento.placaOuTag}</td>
                          <td>{item.servico.tipoServico}</td>
                          <td>{item.material?.descricao ?? "-"}</td>
                          <td>
                            {formatQuantidadeComUnidade(
                              item.quantidadeFaturada,
                              item.unidadeFaturada
                            )}
                          </td>
                          <td>{item.colaborador.nome}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </article>
      ) : null}

      <div className="content-split-detail-alt section-block">
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
                    className={editingLancamentoId === item.lancamentoId ? "table-row-highlight" : undefined}
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
                          disabled={!canEditContent || isPending}
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
                        disabled={!canEditContent || isPending}
                        value={itemDrafts[item.id]?.unidadeFaturada ?? item.unidadeFaturada}
                        onChange={(event) =>
                          setItemDrafts((current) => ({
                            ...current,
                            [item.id]: {
                              valorUnitario: current[item.id]?.valorUnitario ?? item.valorUnitario,
                              quantidadeFaturada:
                                current[item.id]?.quantidadeFaturada ?? item.quantidadeFaturada,
                              unidadeFaturada: event.target.value as "CARGA" | "HORA" | "M3" | "DIARIA" | "SERVICO"
                            }
                          }))
                        }
                      >
                        <option value="CARGA">CARGA</option>
                        <option value="HORA">HORA</option>
                        <option value="M3">M3</option>
                        <option value="DIARIA">DIARIA</option>
                        <option value="SERVICO">SERVICO</option>
                      </select>
                    </td>
                    <td style={{ minWidth: 140 }}>
                      <div style={{ display: "grid", gap: 8 }}>
                        <input
                          className="field-control"
                          type="number"
                          step="0.01"
                          disabled={!canEditContent || isPending}
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
                          disabled={!canEditContent || isPending}
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
                        disabled={!canEditContent || isPending}
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

function itemUnidade(value: string): "CARGA" | "HORA" | "M3" | "DIARIA" | "SERVICO" {
  if (value === "CARGA" || value === "HORA" || value === "M3" || value === "DIARIA" || value === "SERVICO") {
    return value;
  }
  return "HORA";
}
