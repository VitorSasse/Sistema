import { medicaoTipoLabels } from "@/features/medicoes/constants";
import type { MedicaoTipo } from "@/features/medicoes/types";

type DeleteTarget = {
  codigoMedicao: string;
  tipoMedicao: MedicaoTipo;
};

export function MedicaoDeleteDialog(props: {
  target: DeleteTarget | null;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { target, isPending, onClose, onConfirm } = props;

  if (!target) {
    return null;
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <section
        className="dialog-card surface section-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="medicao-delete-title"
      >
        <div className="section-header" style={{ marginBottom: 12 }}>
          <div>
            <h2 id="medicao-delete-title" className="section-title">
              Excluir medicao
            </h2>
            <p className="section-copy">
              {target.codigoMedicao} · {medicaoTipoLabels[target.tipoMedicao]}
            </p>
          </div>
        </div>

        <div className="dialog-copy">
          <p>Tem certeza que deseja excluir esta medicao?</p>
          <p>Essa acao nao pode ser desfeita.</p>
        </div>

        <div className="toolbar-actions" style={{ justifyContent: "flex-end" }}>
          <button
            type="button"
            className="button-secondary"
            disabled={isPending}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="button-danger"
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending ? "Excluindo..." : "Confirmar exclusao"}
          </button>
        </div>
      </section>
    </div>
  );
}
