"use client";

import { useRef, type ReactNode } from "react";
import { SearchableSelect } from "@/components/form/searchable-select";
import { HorarioApontamentoCard } from "@/features/lancamentos/components/horario-apontamento-card";
import {
  lancamentoStatusConfig,
  unidadeApontadaOptions,
  unidadeFaturadaOptions
} from "@/features/lancamentos/constants";
import { useLancamentos } from "@/features/lancamentos/hooks/use-lancamentos";
import { formatQuantidadeComUnidade } from "@/lib/utils/unidades";

function SectionField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

export function LancamentosManager() {
  const quantidadeFaturadaRef = useRef<HTMLInputElement>(null);
  const {
    options,
    lancamentos,
    form,
    message,
    editingLancamentoId,
    motivoAlteracao,
    isPending,
    obrasDisponiveis,
    servicoSelecionado,
    servicoUsaCalculoHoras,
    servicoCalculadoEmDiaria,
    horarios,
    horarioFeedback,
    resumoOperacional,
    updateField,
    updateHorarioField,
    calcularApontamentoPorHorario,
    resetForm,
    handleSubmit,
    duplicateLast,
    startEdit,
    cancelEdit,
    setMotivoAlteracao,
    handleCancel,
    handleDelete
  } = useLancamentos();

  function handleHorarioCalculation() {
    const calculated = calcularApontamentoPorHorario();

    if (calculated) {
      quantidadeFaturadaRef.current?.focus();
      quantidadeFaturadaRef.current?.select();
    }

    return calculated;
  }

  return (
    <main className="page-stack">
      <section className="page-header">
        <div>
          <h1 className="page-title">Lancamentos diarios</h1>
          <p className="page-copy">
            Separe o valor operacional vindo da ficha do valor que seguira para
            medicao e faturamento, sem perder a leitura real do equipamento.
          </p>
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <p className="stat-card-label">Total do dia</p>
          <p className="stat-card-value">{resumoOperacional.total}</p>
          <p className="stat-card-copy">Apontamentos carregados para a data selecionada.</p>
        </article>
        <article className="stat-card">
          <p className="stat-card-label">Validos</p>
          <p className="stat-card-value">{resumoOperacional.validos}</p>
          <p className="stat-card-copy">Itens liberados para consolidacao e medicao.</p>
        </article>
        <article className="stat-card">
          <p className="stat-card-label">Pendentes</p>
          <p className="stat-card-value">{resumoOperacional.pendentes}</p>
          <p className="stat-card-copy">Lancamentos aguardando vinculacao correta.</p>
        </article>
        <article className="stat-card">
          <p className="stat-card-label">Com horimetro</p>
          <p className="stat-card-value">{resumoOperacional.comHorimetro}</p>
          <p className="stat-card-copy">
            Fichas do dia que atualizaram a leitura do equipamento.
          </p>
        </article>
      </section>

      <section className="surface section-card">
        <div className="section-header">
          <div>
            <h2 className="section-title">
              {editingLancamentoId ? "Editar lancamento" : "Nova ficha / apontamento"}
            </h2>
            <p className="section-copy">
              {editingLancamentoId
                ? "Ajuste o lancamento na propria tela e informe o motivo da alteracao antes de salvar."
                : "Lance a producao apontada, defina a quantidade faturada e informe o horimetro do equipamento no mesmo fluxo."}
            </p>
          </div>
        </div>

        <div className="glass-band">
          <strong>Atalhos:</strong>
          <span className="subtle">
            duplique o ultimo lancamento para acelerar rotinas repetitivas
          </span>
          <span className="subtle">
            o horimetro da ficha continua atualizando a leitura do equipamento
          </span>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 24, marginTop: 20 }}>
          <div className="form-grid-4">
            <SectionField label="Data">
              <input
                className="field-control"
                type="date"
                value={form.data}
                onChange={(e) => updateField("data", e.target.value)}
              />
            </SectionField>
            <SectionField label="Numero da ficha">
              <input
                className="field-control"
                value={form.fichaNumero}
                onChange={(e) => updateField("fichaNumero", e.target.value)}
                placeholder="Ficha do dia"
              />
            </SectionField>
            <SectionField label="Cliente">
              <SearchableSelect
                value={form.clienteId}
                onChange={(value) => updateField("clienteId", value)}
                options={options.clientes.map((cliente) => ({
                  value: cliente.id,
                  label: `${cliente.codigo ?? ""} - ${cliente.nome ?? ""}`.trim()
                }))}
                placeholder="Digite a primeira letra do cliente"
              />
            </SectionField>
            <SectionField label="Obra">
              <SearchableSelect
                value={form.obraId}
                onChange={(value) => updateField("obraId", value)}
                options={obrasDisponiveis.map((obra) => ({
                  value: obra.id,
                  label: `${obra.codigo ?? ""} - ${obra.nome ?? ""}`.trim()
                }))}
                placeholder="Digite a primeira letra da obra"
                emptyLabel="Nenhuma obra encontrada. Deixe vazio se estiver pendente."
              />
            </SectionField>
            <SectionField label="Servico">
              <select
                className="field-control"
                value={form.servicoId}
                onChange={(e) => updateField("servicoId", e.target.value)}
              >
                <option value="">Selecione</option>
                {options.servicos.map((servico) => (
                  <option key={servico.id} value={servico.id}>
                    {(servico.codigo ?? "") + " - " + (servico.tipoServico ?? "")}
                  </option>
                ))}
              </select>
            </SectionField>
            <SectionField label="Material">
              <select
                className="field-control"
                value={form.materialId}
                onChange={(e) => updateField("materialId", e.target.value)}
                disabled={!servicoSelecionado?.exigeMaterial}
              >
                <option value="">
                  {servicoSelecionado?.exigeMaterial ? "Selecione" : "Nao aplicavel"}
                </option>
                {options.materiais.map((material) => (
                  <option key={material.id} value={material.id}>
                    {(material.codigoMaterial ?? "") + " - " + (material.descricao ?? "")}
                  </option>
                ))}
              </select>
            </SectionField>
            <SectionField label="Equipamento / recurso">
              <select
                className="field-control"
                value={form.equipamentoId}
                onChange={(e) => updateField("equipamentoId", e.target.value)}
              >
                <option value="">Selecione</option>
                {options.equipamentos.map((equipamento) => (
                  <option key={equipamento.id} value={equipamento.id}>
                    {(equipamento.descricao ?? "") + " - " + (equipamento.placaOuTag ?? "")}
                  </option>
                ))}
              </select>
            </SectionField>
            <SectionField label="Operador / motorista">
              <select
                className="field-control"
                value={form.colaboradorId}
                onChange={(e) => updateField("colaboradorId", e.target.value)}
              >
                <option value="">Selecione</option>
                {options.colaboradores.map((colaborador) => (
                  <option key={colaborador.id} value={colaborador.id}>
                    {(colaborador.codigo ?? "") + " - " + (colaborador.nome ?? "")}
                  </option>
                ))}
              </select>
            </SectionField>
            <SectionField label="Horimetro da ficha">
              <input
                className="field-control"
                type="number"
                step="0.01"
                value={form.horimetroInformado}
                onChange={(e) => updateField("horimetroInformado", e.target.value)}
                placeholder="0.00"
              />
            </SectionField>
            <SectionField label="KM da ficha">
              <input
                className="field-control"
                type="number"
                step="0.1"
                value={form.kmInformado}
                onChange={(e) => updateField("kmInformado", e.target.value)}
                placeholder="Opcional"
              />
            </SectionField>
          </div>

          <div
            className="split-grid"
            style={{ display: "grid", gap: 20, gridTemplateColumns: "1fr 1fr" }}
          >
            <article className="tile-card">
              <div className="section-header" style={{ marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0 }}>Apontado</h3>
                  <p className="section-copy">Valor operacional informado na ficha.</p>
                </div>
              </div>
              {servicoUsaCalculoHoras ? (
                <HorarioApontamentoCard
                  horarios={horarios}
                  feedback={horarioFeedback}
                  mode={servicoCalculadoEmDiaria ? "DIARIA" : "HORA"}
                  onChange={updateHorarioField}
                  onCalculate={handleHorarioCalculation}
                />
              ) : null}
              <div className="form-grid-2">
                <SectionField label="Quantidade apontada">
                  <input
                    className="field-control"
                    value={form.quantidadeApontada}
                    onChange={(e) => updateField("quantidadeApontada", e.target.value)}
                    placeholder="0,00"
                  />
                </SectionField>
                <SectionField label="Unidade apontada">
                  <select
                    className="field-control"
                    value={form.unidadeApontada}
                    disabled={servicoUsaCalculoHoras}
                    onChange={(e) =>
                      updateField("unidadeApontada", e.target.value as typeof form.unidadeApontada)
                    }
                  >
                    {unidadeApontadaOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </SectionField>
              </div>
            </article>

            <article className="tile-card">
              <div className="section-header" style={{ marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0 }}>Faturado</h3>
                  <p className="section-copy">Valor que sera usado na medicao.</p>
                </div>
              </div>
              <div className="form-grid-2">
                <SectionField label="Quantidade faturada">
                  <input
                    ref={quantidadeFaturadaRef}
                    className="field-control"
                    value={form.quantidadeFaturada}
                    onChange={(e) => updateField("quantidadeFaturada", e.target.value)}
                    placeholder="0,00"
                  />
                </SectionField>
                <SectionField label="Unidade faturada">
                  <select
                    className="field-control"
                    value={form.unidadeFaturada}
                    onChange={(e) =>
                      updateField("unidadeFaturada", e.target.value as typeof form.unidadeFaturada)
                    }
                  >
                    {unidadeFaturadaOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </SectionField>
              </div>
            </article>
          </div>

          <div className="form-grid-2">
            <SectionField label="Observacao da ficha">
              <textarea
                className="field-control textarea-lg"
                value={form.fichaObservacao}
                onChange={(e) => updateField("fichaObservacao", e.target.value)}
                placeholder="Observacao geral da ficha"
              />
            </SectionField>
            <SectionField label="Observacao do lancamento">
              <textarea
                className="field-control textarea-lg"
                value={form.observacao}
                onChange={(e) => updateField("observacao", e.target.value)}
                placeholder="Observacao especifica da linha"
              />
            </SectionField>
          </div>

          {editingLancamentoId ? (
            <SectionField label="Motivo da alteracao">
              <textarea
                className="field-control textarea-lg"
                value={motivoAlteracao}
                onChange={(e) => setMotivoAlteracao(e.target.value)}
                placeholder="Descreva o motivo da alteracao"
              />
            </SectionField>
          ) : null}

          <div className="toolbar-actions">
            <button type="submit" disabled={isPending} className="button-primary">
              {isPending
                ? "Salvando..."
                : editingLancamentoId
                  ? "Salvar alteracao"
                  : "Salvar lancamento"}
            </button>
            <button type="button" onClick={duplicateLast} className="button-secondary">
              Duplicar ultimo lancamento
            </button>
            {editingLancamentoId ? (
              <button type="button" onClick={cancelEdit} className="button-ghost">
                Cancelar edicao
              </button>
            ) : (
              <button type="button" onClick={resetForm} className="button-ghost">
                Limpar formulario
              </button>
            )}
          </div>

          {message ? <p className="message-inline">{message}</p> : null}
        </form>
      </section>

      <section className="surface section-card">
        <div className="section-header">
          <div>
            <h2 className="section-title">Lancamentos do dia</h2>
            <p className="section-copy">
              {lancamentos.length} registro(s) carregado(s) em {form.data}.
            </p>
          </div>
        </div>

        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ficha</th>
                <th>Cliente / Obra</th>
                <th>Servico</th>
                <th>Recurso</th>
                <th>Colaborador</th>
                <th>Apontado</th>
                <th>Faturado</th>
                <th>Horimetro</th>
                <th>Status</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {lancamentos.map((item) => (
                <tr key={item.id}>
                  <td>{item.ficha.numero}</td>
                  <td>
                    <div>{item.cliente.nome}</div>
                    <div className="subtle">{item.obra?.nome ?? "Sem obra"}</div>
                  </td>
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
                    {formatQuantidadeComUnidade(item.quantidadeApontada, item.unidadeApontada)}
                  </td>
                  <td>
                    {formatQuantidadeComUnidade(item.quantidadeFaturada, item.unidadeFaturada)}
                  </td>
                  <td>
                    <div>H: {item.horimetroInformado ?? "-"}</div>
                    <div className="subtle">KM: {item.kmInformado ?? "-"}</div>
                  </td>
                  <td>
                    <span className={lancamentoStatusConfig[item.statusValidacao].className}>
                      {lancamentoStatusConfig[item.statusValidacao].label}
                    </span>
                  </td>
                  <td>
                    <div className="toolbar-actions">
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="button-secondary"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="button-danger"
                      >
                        Excluir
                      </button>
                    </div>
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
