"use client";

import { Eye, EyeOff, KeyRound, X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState, useTransition } from "react";

type PasswordDialogProps = {
  open: boolean;
  onClose: () => void;
};

type PasswordField = "senhaAtual" | "novaSenha" | "confirmarSenha";
type PasswordForm = Record<PasswordField, string>;
type FieldErrors = Partial<Record<PasswordField, string>>;

const emptyForm: PasswordForm = {
  senhaAtual: "",
  novaSenha: "",
  confirmarSenha: ""
};

function getFieldErrors(value: unknown): FieldErrors {
  if (!value || typeof value !== "object" || !("fieldErrors" in value)) {
    return {};
  }

  const fieldErrors = (value as { fieldErrors?: Record<string, string[]> }).fieldErrors ?? {};
  return Object.fromEntries(
    Object.entries(fieldErrors).flatMap(([field, messages]) =>
      messages?.[0] ? [[field, messages[0]]] : []
    )
  ) as FieldErrors;
}

export function PasswordDialog({ open, onClose }: PasswordDialogProps) {
  const [form, setForm] = useState<PasswordForm>(emptyForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [showPasswords, setShowPasswords] = useState(false);
  const [isPending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const isPendingRef = useRef(isPending);

  onCloseRef.current = onClose;
  isPendingRef.current = isPending;

  useEffect(() => {
    if (!open) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPendingRef.current) {
        onCloseRef.current();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (!open) {
    return null;
  }

  function updateField(field: PasswordField, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setMessage("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setMessage("");

    startTransition(async () => {
      try {
        const response = await fetch("/api/perfil/senha", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form)
        });
        const data = (await response.json()) as {
          message?: string;
          issues?: { fieldErrors?: Record<string, string[]> };
        };

        if (!response.ok) {
          setErrors(getFieldErrors(data.issues));
          setMessageType("error");
          setMessage(data.message ?? "Nao foi possivel alterar a senha.");
          return;
        }

        setForm(emptyForm);
        setErrors({});
        setMessageType("success");
        setMessage(data.message ?? "Senha alterada com sucesso.");
      } catch {
        setMessageType("error");
        setMessage("Nao foi possivel conectar ao servidor. Tente novamente.");
      }
    });
  }

  const inputType = showPasswords ? "text" : "password";

  return (
    <div className="profile-dialog-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !isPending) {
        onClose();
      }
    }}>
      <section
        ref={dialogRef}
        className="profile-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="password-dialog-title"
        tabIndex={-1}
      >
        <header className="profile-dialog-header">
          <span className="profile-dialog-icon"><KeyRound size={20} /></span>
          <div>
            <span className="profile-kicker">Seguranca da conta</span>
            <h2 id="password-dialog-title">Alterar senha</h2>
          </div>
          <button type="button" className="profile-icon-button" onClick={onClose} disabled={isPending} aria-label="Fechar">
            <X size={19} />
          </button>
        </header>

        <form className="profile-password-form" onSubmit={handleSubmit}>
          {(["senhaAtual", "novaSenha", "confirmarSenha"] as PasswordField[]).map((field) => {
            const labels: Record<PasswordField, string> = {
              senhaAtual: "Senha atual",
              novaSenha: "Nova senha",
              confirmarSenha: "Confirmar nova senha"
            };

            return (
              <label className="field" key={field}>
                <span className="field-label">{labels[field]}</span>
                <input
                  className="field-control"
                  type={inputType}
                  value={form[field]}
                  onChange={(event) => updateField(field, event.target.value)}
                  autoComplete={field === "senhaAtual" ? "current-password" : "new-password"}
                  aria-invalid={Boolean(errors[field])}
                  required
                />
                {errors[field] ? <small className="profile-field-error">{errors[field]}</small> : null}
              </label>
            );
          })}

          <button type="button" className="profile-show-password" onClick={() => setShowPasswords((current) => !current)}>
            {showPasswords ? <EyeOff size={17} /> : <Eye size={17} />}
            {showPasswords ? "Ocultar senhas" : "Mostrar senhas"}
          </button>

          {message ? (
            <p className={`message-inline${messageType === "error" ? " message-inline-danger" : ""}`} role="status">
              {message}
            </p>
          ) : null}

          <footer className="profile-dialog-actions">
            <button type="button" className="button-secondary" onClick={onClose} disabled={isPending}>Cancelar</button>
            <button type="submit" className="button-primary" disabled={isPending}>
              {isPending ? "Alterando..." : "Alterar senha"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
