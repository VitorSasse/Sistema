"use client";

import { Building2, Camera, KeyRound, ShieldCheck, Trash2, Upload, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useRef, useState, useTransition } from "react";
import { PasswordDialog } from "@/features/perfil/password-dialog";
import { useThemePreference, type ThemePreference } from "@/hooks/use-theme-preference";
import { getUserInitials, type PerfilUsuario } from "@/lib/perfil";
import { formatTelefone } from "@/lib/utils/document";

type PerfilManagerProps = {
  initialProfile: PerfilUsuario;
  openPasswordInitially?: boolean;
};

type ProfileField = "nome" | "email" | "telefone" | "cargo" | "fotoPerfilUrl";
type ProfileForm = Pick<PerfilUsuario, ProfileField>;
type FieldErrors = Partial<Record<ProfileField, string>>;

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const allowedImageTypes = new Set(["image/gif", "image/jpeg", "image/png", "image/webp"]);

function getFieldErrors(value: unknown): FieldErrors {
  if (!value || typeof value !== "object" || !("fieldErrors" in value)) {
    return {};
  }

  const fieldErrors = (value as { fieldErrors?: Record<string, string[]> }).fieldErrors ?? {};
  return Object.fromEntries(
    Object.entries(fieldErrors).flatMap(([field, messages]) => messages?.[0] ? [[field, messages[0]]] : [])
  ) as FieldErrors;
}

function formatLastAccess(value: string | null) {
  if (!value) {
    return "Primeiro acesso ainda nao registrado";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeStyle: "short"
  }).format(new Date(value));
}

function readImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Nao foi possivel ler a imagem."));
    reader.readAsDataURL(file);
  });
}

export function PerfilManager({ initialProfile, openPasswordInitially = false }: PerfilManagerProps) {
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile);
  const [form, setForm] = useState<ProfileForm>({
    nome: initialProfile.nome,
    email: initialProfile.email,
    telefone: initialProfile.telefone,
    cargo: initialProfile.cargo,
    fotoPerfilUrl: initialProfile.fotoPerfilUrl
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [isPasswordOpen, setIsPasswordOpen] = useState(openPasswordInitially);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { preference, changePreference } = useThemePreference();

  function updateField(field: Exclude<ProfileField, "fotoPerfilUrl">, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setMessage("");
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!allowedImageTypes.has(file.type)) {
      setErrors((current) => ({ ...current, fotoPerfilUrl: "Selecione uma imagem PNG, JPG, GIF ou WebP." }));
      event.target.value = "";
      return;
    }

    if (file.size > MAX_AVATAR_BYTES) {
      setErrors((current) => ({ ...current, fotoPerfilUrl: "A foto deve ter no maximo 2 MB." }));
      event.target.value = "";
      return;
    }

    try {
      const preview = await readImage(file);
      setForm((current) => ({ ...current, fotoPerfilUrl: preview }));
      setSelectedFileName(file.name);
      setErrors((current) => ({ ...current, fotoPerfilUrl: undefined }));
      setMessage("");
    } catch {
      setErrors((current) => ({ ...current, fotoPerfilUrl: "Nao foi possivel preparar a imagem selecionada." }));
    }
  }

  function removePhoto() {
    setForm((current) => ({ ...current, fotoPerfilUrl: null }));
    setSelectedFileName("");
    setErrors((current) => ({ ...current, fotoPerfilUrl: undefined }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setMessage("");

    startTransition(async () => {
      try {
        const response = await fetch("/api/perfil", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form)
        });
        const data = (await response.json()) as {
          message?: string;
          perfil?: PerfilUsuario;
          issues?: { fieldErrors?: Record<string, string[]> };
        };

        if (!response.ok || !data.perfil) {
          setErrors(getFieldErrors(data.issues));
          setMessageType("error");
          setMessage(data.message ?? "Nao foi possivel atualizar o perfil.");
          return;
        }

        setProfile(data.perfil);
        setForm({
          nome: data.perfil.nome,
          email: data.perfil.email,
          telefone: data.perfil.telefone,
          cargo: data.perfil.cargo,
          fotoPerfilUrl: data.perfil.fotoPerfilUrl
        });
        setSelectedFileName("");
        setMessageType("success");
        setMessage(data.message ?? "Perfil atualizado com sucesso.");
        router.refresh();
      } catch {
        setMessageType("error");
        setMessage("Nao foi possivel conectar ao servidor. Tente novamente.");
      }
    });
  }

  return (
    <main className="profile-page">
      <section className="profile-hero">
        <div>
          <span className="profile-kicker">Identidade e acesso</span>
          <h1>Meu perfil</h1>
          <p>Atualize seus dados pessoais sem alterar o vinculo com a empresa ou suas permissoes.</p>
        </div>
        <div className="profile-hero-badge">
          <ShieldCheck size={19} />
          <span>
            <small>Nivel de acesso</small>
            <strong>{profile.roleLabel}</strong>
          </span>
        </div>
      </section>

      <div className="profile-layout">
        <aside className="profile-summary-card">
          <div className="profile-avatar-large">
            {form.fotoPerfilUrl ? <img src={form.fotoPerfilUrl} alt={`Foto de ${form.nome}`} /> : <span>{getUserInitials(form.nome)}</span>}
            <span className="profile-avatar-status" title="Usuario ativo" />
          </div>
          <h2>{form.nome || "Usuario BASEPRO"}</h2>
          <p>{form.cargo || profile.roleLabel}</p>
          <div className="profile-summary-divider" />
          <dl className="profile-summary-list">
            <div>
              <dt><Building2 size={15} /> Empresa</dt>
              <dd>{profile.empresa.nomeFantasia || profile.empresa.razaoSocial || "Empresa nao informada"}</dd>
            </div>
            <div>
              <dt><ShieldCheck size={15} /> Permissao</dt>
              <dd>{profile.roleLabel}</dd>
            </div>
            <div>
              <dt><UserRound size={15} /> Ultimo acesso</dt>
              <dd>{formatLastAccess(profile.ultimoLoginEm)}</dd>
            </div>
          </dl>
        </aside>

        <div className="profile-content-stack">
          <section className="profile-section-card">
            <header className="profile-section-header">
              <div>
                <span className="profile-kicker">Dados pessoais</span>
                <h2>Informacoes do usuario</h2>
                <p>Esses dados identificam voce nas telas e registros do sistema.</p>
              </div>
              <button type="button" className="button-secondary profile-password-shortcut" onClick={() => setIsPasswordOpen(true)}>
                <KeyRound size={17} /> Alterar senha
              </button>
            </header>

            <form className="profile-form" onSubmit={handleSubmit}>
              <div className="profile-form-grid">
                <label className="field">
                  <span className="field-label">Nome completo</span>
                  <input className="field-control" value={form.nome} onChange={(event) => updateField("nome", event.target.value)} aria-invalid={Boolean(errors.nome)} required />
                  {errors.nome ? <small className="profile-field-error">{errors.nome}</small> : null}
                </label>
                <label className="field">
                  <span className="field-label">E-mail</span>
                  <input className="field-control" type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} aria-invalid={Boolean(errors.email)} required />
                  {errors.email ? <small className="profile-field-error">{errors.email}</small> : null}
                </label>
                <label className="field">
                  <span className="field-label">Telefone</span>
                  <input className="field-control" value={form.telefone ?? ""} onChange={(event) => updateField("telefone", formatTelefone(event.target.value))} placeholder="(47) 9 0000-0000" aria-invalid={Boolean(errors.telefone)} />
                  {errors.telefone ? <small className="profile-field-error">{errors.telefone}</small> : null}
                </label>
                <label className="field">
                  <span className="field-label">Cargo ou funcao</span>
                  <input className="field-control" value={form.cargo ?? ""} onChange={(event) => updateField("cargo", event.target.value)} placeholder="Ex.: Gestor de operacoes" aria-invalid={Boolean(errors.cargo)} />
                  {errors.cargo ? <small className="profile-field-error">{errors.cargo}</small> : null}
                </label>
              </div>

              <div className="profile-photo-field">
                <div className="profile-photo-preview">
                  {form.fotoPerfilUrl ? <img src={form.fotoPerfilUrl} alt="Pre-visualizacao da foto" /> : <Camera size={24} />}
                </div>
                <div className="profile-photo-copy">
                  <strong>Foto de perfil</strong>
                  <span>{selectedFileName || "PNG, JPG, GIF ou WebP. Tamanho maximo de 2 MB."}</span>
                  {errors.fotoPerfilUrl ? <small className="profile-field-error">{errors.fotoPerfilUrl}</small> : null}
                </div>
                <label className="profile-upload-button">
                  <Upload size={17} /> Selecionar foto
                  <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={handleFileChange} />
                </label>
                {form.fotoPerfilUrl ? (
                  <button type="button" className="profile-remove-photo" onClick={removePhoto}>
                    <Trash2 size={17} /> Remover
                  </button>
                ) : null}
              </div>

              {message ? (
                <p className={`message-inline${messageType === "error" ? " message-inline-danger" : ""}`} role="status">{message}</p>
              ) : null}

              <div className="profile-form-actions">
                <button type="submit" className="button-primary" disabled={isPending}>
                  {isPending ? "Salvando perfil..." : "Salvar alteracoes"}
                </button>
              </div>
            </form>
          </section>

          <section className="profile-section-card profile-preferences-card">
            <header className="profile-section-header">
              <div>
                <span className="profile-kicker">Preferencias</span>
                <h2>Aparencia do sistema</h2>
                <p>Escolha um tema fixo ou acompanhe a configuracao do seu dispositivo.</p>
              </div>
            </header>
            <div className="profile-theme-options" role="radiogroup" aria-label="Preferencia de tema">
              {([
                ["dark", "Escuro", "Maior contraste para operacao"],
                ["light", "Claro", "Leitura em ambientes iluminados"],
                ["system", "Sistema", "Segue o seu dispositivo"]
              ] as Array<[ThemePreference, string, string]>).map(([value, label, description]) => (
                <button key={value} type="button" className={preference === value ? "is-active" : ""} onClick={() => changePreference(value)} role="radio" aria-checked={preference === value}>
                  <span className={`profile-theme-swatch is-${value}`} />
                  <span><strong>{label}</strong><small>{description}</small></span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>

      <PasswordDialog open={isPasswordOpen} onClose={() => setIsPasswordOpen(false)} />
    </main>
  );
}
