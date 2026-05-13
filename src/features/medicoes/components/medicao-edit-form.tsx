import type { OperationalOption } from "@/lib/client/operational-options";
import type { MedicaoEditState } from "@/features/medicoes/types";
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

export function MedicaoEditForm(props: {
  editing: MedicaoEditState;
  servicos: OperationalOption[];
  materiais: OperationalOption[];
  equipamentos: OperationalOption[];
  colaboradores: OperationalOption[];
  exigeMaterial: boolean;
  isPending: boolean;
  onChange: <K extends keyof MedicaoEditState>(key: K, value: MedicaoEditState[K]) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  const { editing, servicos, materiais, equipamentos, colaboradores, exigeMaterial, isPending, onChange, onSubmit, onCancel } = props;

  return (
    <section className="surface section-card">
      <div className="section-header">
        <div>
          <h2 className="section-title">Editar lancamento dentro da medicao</h2>
          <p className="section-copy">
            Ajuste o lancamento sem sair desta tela. Ao salvar, a previa e os totais
            sao recalculados.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 20 }}>
        <div className="form-grid-4">
          <MedicaoField label="Data">
            <input className="field-control" type="date" value={editing.data} onChange={(e) => onChange("data", e.target.value)} />
          </MedicaoField>
          <MedicaoField label="Ficha">
            <input className="field-control" value={editing.fichaNumero} onChange={(e) => onChange("fichaNumero", e.target.value)} />
          </MedicaoField>
          <MedicaoField label="Servico">
            <select className="field-control" value={editing.servicoId} onChange={(e) => onChange("servicoId", e.target.value)}>
              <option value="">Selecione</option>
              {servicos.map((item) => (
                <option key={item.id} value={item.id}>
                  {optionLabel(item)}
                </option>
              ))}
            </select>
          </MedicaoField>
          <MedicaoField label="Material">
            <select className="field-control" value={editing.materialId} onChange={(e) => onChange("materialId", e.target.value)} disabled={!exigeMaterial}>
              <option value="">{exigeMaterial ? "Selecione" : "Nao aplicavel"}</option>
              {materiais.map((item) => (
                <option key={item.id} value={item.id}>
                  {optionLabel(item)}
                </option>
              ))}
            </select>
          </MedicaoField>
          <MedicaoField label="Equipamento">
            <select className="field-control" value={editing.equipamentoId} onChange={(e) => onChange("equipamentoId", e.target.value)}>
              <option value="">Selecione</option>
              {equipamentos.map((item) => (
                <option key={item.id} value={item.id}>
                  {optionLabel(item)}
                </option>
              ))}
            </select>
          </MedicaoField>
          <MedicaoField label="Colaborador">
            <select className="field-control" value={editing.colaboradorId} onChange={(e) => onChange("colaboradorId", e.target.value)}>
              <option value="">Selecione</option>
              {colaboradores.map((item) => (
                <option key={item.id} value={item.id}>
                  {optionLabel(item)}
                </option>
              ))}
            </select>
          </MedicaoField>
          <MedicaoField label="Quantidade apontada">
            <input className="field-control" type="number" step="0.01" value={editing.quantidadeApontada} onChange={(e) => onChange("quantidadeApontada", e.target.value)} />
          </MedicaoField>
          <MedicaoField label="Unidade apontada">
            <select className="field-control" value={editing.unidadeApontada} onChange={(e) => onChange("unidadeApontada", e.target.value as MedicaoEditState["unidadeApontada"])}>
              <option value="CARGA">CARGA</option>
              <option value="HORA">HORA</option>
              <option value="M3">M3</option>
              <option value="DIARIA">DIARIA</option>
            </select>
          </MedicaoField>
          <MedicaoField label="Quantidade faturada">
            <input className="field-control" type="number" step="0.01" value={editing.quantidadeFaturada} onChange={(e) => onChange("quantidadeFaturada", e.target.value)} />
          </MedicaoField>
          <MedicaoField label="Unidade faturada">
            <select className="field-control" value={editing.unidadeFaturada} onChange={(e) => onChange("unidadeFaturada", e.target.value as MedicaoEditState["unidadeFaturada"])}>
              <option value="CARGA">CARGA</option>
              <option value="HORA">HORA</option>
              <option value="M3">M3</option>
              <option value="DIARIA">DIARIA</option>
            </select>
          </MedicaoField>
          <MedicaoField label="Horimetro">
            <input className="field-control" type="number" step="0.01" value={editing.horimetroInformado} onChange={(e) => onChange("horimetroInformado", e.target.value)} />
          </MedicaoField>
          <MedicaoField label="KM">
            <input className="field-control" type="number" step="0.1" value={editing.kmInformado} onChange={(e) => onChange("kmInformado", e.target.value)} />
          </MedicaoField>
        </div>

        <MedicaoField label="Observacao da ficha">
          <textarea className="field-control textarea-lg" value={editing.fichaObservacao} onChange={(e) => onChange("fichaObservacao", e.target.value)} />
        </MedicaoField>
        <MedicaoField label="Observacao do lancamento">
          <textarea className="field-control textarea-lg" value={editing.observacao} onChange={(e) => onChange("observacao", e.target.value)} />
        </MedicaoField>
        <MedicaoField label="Motivo da alteracao">
          <textarea className="field-control textarea-lg" value={editing.motivoAlteracao} onChange={(e) => onChange("motivoAlteracao", e.target.value)} placeholder="Descreva o motivo do ajuste" />
        </MedicaoField>

        <div className="toolbar-actions">
          <button type="submit" disabled={isPending} className="button-primary">
            {isPending ? "Salvando..." : "Salvar ajuste do lancamento"}
          </button>
          <button type="button" className="button-ghost" onClick={onCancel}>
            Cancelar edicao
          </button>
        </div>
      </form>
    </section>
  );
}
