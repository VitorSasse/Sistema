import { useEffect, useRef } from "react";
import type { OperationalOption } from "@/lib/client/operational-options";
import type { MedicaoEditState } from "@/features/medicoes/types";
import { MedicaoEditForm } from "@/features/medicoes/components/medicao-edit-form";

export function MedicaoEditDialog(props: {
  editing: MedicaoEditState | null;
  servicoLabel: string;
  servicos: OperationalOption[];
  materiais: OperationalOption[];
  equipamentos: OperationalOption[];
  colaboradores: OperationalOption[];
  exigeMaterial: boolean;
  isPending: boolean;
  feedback: string;
  onChange: <K extends keyof MedicaoEditState>(key: K, value: MedicaoEditState[K]) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  const {
    editing,
    servicoLabel,
    servicos,
    materiais,
    equipamentos,
    colaboradores,
    exigeMaterial,
    isPending,
    feedback,
    onChange,
    onSubmit,
    onCancel
  } = props;
  const dialogRef = useRef<HTMLElement | null>(null);
  const onCancelRef = useRef(onCancel);
  const isPendingRef = useRef(isPending);
  const isOpen = editing !== null;

  onCancelRef.current = onCancel;
  isPendingRef.current = isPending;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPendingRef.current) {
        onCancelRef.current();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (!editing) {
    return null;
  }

  return (
    <div
      className="medicao-edit-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isPending) {
          onCancel();
        }
      }}
    >
      <section
        ref={dialogRef}
        className="medicao-edit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="medicao-edit-modal-title"
        tabIndex={-1}
      >
        <div className="medicao-edit-modal-header">
          <div>
            <span className="section-kicker">Editar lancamento</span>
            <h2 id="medicao-edit-modal-title" className="section-title">
              Editar lancamento
            </h2>
            <div className="medicao-edit-modal-context">
              <span>Ficha: {editing.fichaNumero || "-"}</span>
              <span>Servico: {servicoLabel}</span>
            </div>
          </div>
          <button
            type="button"
            className="button-ghost"
            disabled={isPending}
            onClick={onCancel}
            aria-label="Fechar edicao do lancamento"
          >
            Fechar
          </button>
        </div>

        {feedback ? (
          <div className="message-inline message-inline-danger" role="alert">
            {feedback}
          </div>
        ) : null}

        <MedicaoEditForm
          editing={editing}
          servicos={servicos}
          materiais={materiais}
          equipamentos={equipamentos}
          colaboradores={colaboradores}
          exigeMaterial={exigeMaterial}
          isPending={isPending}
          variant="modal"
          onChange={onChange}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      </section>
    </div>
  );
}
