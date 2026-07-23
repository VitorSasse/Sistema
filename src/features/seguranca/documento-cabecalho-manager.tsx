"use client";

import { Image as ImageIcon, Loader2, Save, Trash2, Upload } from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useState } from "react";

type TipoDocumentoCabecalho = "ORCAMENTO" | "ORDEM_COMPRA" | "MEDICAO" | "RELATORIO";

type DocumentoCabecalhoForm = {
  tipo: TipoDocumentoCabecalho;
  label: string;
  nomeEmpresa: string;
  cnpj: string;
  endereco: string;
  cidade: string;
  estado: string;
  cep: string;
  telefone: string;
  email: string;
  logoUrl: string;
};

type CabecalhosResponse = {
  usarLogoGlobal: boolean;
  logoGlobalUrl: string;
  documentos: DocumentoCabecalhoForm[];
};

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

const emptyState: CabecalhosResponse = {
  usarLogoGlobal: false,
  logoGlobalUrl: "",
  documentos: []
};

function isImageFile(file: File) {
  return file.type.startsWith("image/");
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Nao foi possivel ler o arquivo."));
    reader.readAsDataURL(file);
  });
}

function formatCidadeUfCep(documento: DocumentoCabecalhoForm) {
  const cidadeUf = [documento.cidade, documento.estado].filter(Boolean).join("/");
  const cep = documento.cep ? `CEP: ${documento.cep}` : "";

  return [cidadeUf, cep].filter(Boolean).join(" - ");
}

export function DocumentoCabecalhoManager() {
  const [data, setData] = useState<CabecalhosResponse>(emptyState);
  const [activeTipo, setActiveTipo] = useState<TipoDocumentoCabecalho>("ORCAMENTO");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/seguranca/cabecalhos-documentos", {
          cache: "no-store"
        });

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.message ?? "Nao foi possivel carregar os cabecalhos.");
        }

        if (active) {
          setData(payload);
          setActiveTipo(payload.documentos[0]?.tipo ?? "ORCAMENTO");
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Nao foi possivel carregar os cabecalhos.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  const activeDocumento = useMemo(
    () => data.documentos.find((documento) => documento.tipo === activeTipo) ?? data.documentos[0],
    [activeTipo, data.documentos]
  );
  const globalLogoOwnerTipo = data.documentos[0]?.tipo;
  const logoUploadDisabled = Boolean(data.usarLogoGlobal && activeDocumento?.tipo !== globalLogoOwnerTipo);

  function updateDocumento(tipo: TipoDocumentoCabecalho, patch: Partial<DocumentoCabecalhoForm>) {
    setData((current) => ({
      ...current,
      documentos: current.documentos.map((documento) =>
        documento.tipo === tipo
          ? {
              ...documento,
              ...patch
            }
          : documento
      )
    }));
  }

  async function handleLogoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !activeDocumento) {
      return;
    }

    setError(null);
    setMessage(null);

    if (!isImageFile(file)) {
      setError("Envie apenas arquivos de imagem.");
      return;
    }

    if (file.size > MAX_LOGO_BYTES) {
      setError("A logo deve ter no maximo 2 MB.");
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);

      if (data.usarLogoGlobal) {
        setData((current) => ({
          ...current,
          logoGlobalUrl: dataUrl,
          documentos: current.documentos.map((documento) => ({
            ...documento,
            logoUrl: dataUrl
          }))
        }));
      } else {
        updateDocumento(activeDocumento.tipo, { logoUrl: dataUrl });
      }
    } catch {
      setError("Nao foi possivel carregar a logo selecionada.");
    }
  }

  function handleRemoveLogo() {
    if (!activeDocumento) {
      return;
    }

    if (data.usarLogoGlobal) {
      setData((current) => ({
        ...current,
        logoGlobalUrl: "",
        documentos: current.documentos.map((documento) => ({
          ...documento,
          logoUrl: ""
        }))
      }));
    } else {
      updateDocumento(activeDocumento.tipo, { logoUrl: "" });
    }
  }

  function handleToggleGlobalLogo(checked: boolean) {
    setData((current) => {
      const currentLogo =
        current.logoGlobalUrl ||
        current.documentos.find((documento) => documento.tipo === activeTipo)?.logoUrl ||
        current.documentos.find((documento) => documento.logoUrl)?.logoUrl ||
        "";

      return {
        ...current,
        usarLogoGlobal: checked,
        logoGlobalUrl: checked ? currentLogo : "",
        documentos: checked
          ? current.documentos.map((documento) => ({
              ...documento,
              logoUrl: currentLogo
            }))
          : current.documentos
      };
    });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/seguranca/cabecalhos-documentos", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.errors?.join("\n") ?? payload?.message ?? "Nao foi possivel salvar os cabecalhos.");
      }

      setMessage(payload?.message ?? "Cabecalhos atualizados com sucesso.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel salvar os cabecalhos.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="document-header-panel">
        <div className="document-header-loading">
          <Loader2 size={18} />
          Carregando cabecalhos...
        </div>
      </section>
    );
  }

  return (
    <section className="document-header-panel">
      <header className="profile-hero">
        <div>
          <span className="profile-kicker">DOCUMENTOS</span>
          <h1>Cabecalho dos Documentos</h1>
          <p>Configure os dados exibidos no cabecalho de cada PDF emitido pela empresa.</p>
        </div>
        <button className="button-primary" type="button" onClick={handleSave} disabled={saving || data.documentos.length === 0}>
          {saving ? <Loader2 size={16} /> : <Save size={16} />}
          {saving ? "Salvando..." : "Salvar cabecalhos"}
        </button>
      </header>

      {error ? <div className="form-error">{error}</div> : null}
      {message ? <div className="form-success">{message}</div> : null}

      <div className="document-header-tabs" role="tablist" aria-label="Tipos de documento">
        {data.documentos.map((documento) => (
          <button
            key={documento.tipo}
            type="button"
            role="tab"
            className={documento.tipo === activeDocumento?.tipo ? "is-active" : ""}
            onClick={() => setActiveTipo(documento.tipo)}
          >
            {documento.label}
          </button>
        ))}
      </div>

      {activeDocumento ? (
        <div className="document-header-grid">
          <div className="profile-section-card document-header-form-card">
            <div className="profile-section-header">
              <div>
                <span className="profile-kicker">{activeDocumento.label}</span>
                <h2>Dados do cabecalho</h2>
                <p>Essas informacoes serao usadas apenas nos PDFs deste tipo de documento.</p>
              </div>
            </div>

            <label className="document-header-toggle">
              <input
                type="checkbox"
                checked={data.usarLogoGlobal}
                onChange={(event) => handleToggleGlobalLogo(event.target.checked)}
              />
              <span>Utilizar a mesma logo para todos os documentos</span>
            </label>

            <div className="document-header-logo-row">
              <div className="document-header-logo-preview">
                {activeDocumento.logoUrl ? <img src={activeDocumento.logoUrl} alt="Logo do documento" /> : <ImageIcon size={28} />}
              </div>
              <div className="document-header-logo-copy">
                <strong>{data.usarLogoGlobal ? "Logo compartilhada" : "Logo deste documento"}</strong>
                <span>
                  {logoUploadDisabled
                    ? `A logo compartilhada deve ser alterada pela aba ${data.documentos[0]?.label ?? "principal"}.`
                    : data.usarLogoGlobal
                    ? "A logo enviada aqui sera aplicada em todos os documentos."
                    : "Envie uma logo propria para este tipo de PDF."}
                </span>
              </div>
              <label className={`profile-upload-button${logoUploadDisabled ? " is-disabled" : ""}`}>
                <Upload size={15} />
                Enviar logo
                <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={logoUploadDisabled} />
              </label>
              <button className="profile-remove-photo" type="button" onClick={handleRemoveLogo} disabled={!activeDocumento.logoUrl || logoUploadDisabled}>
                <Trash2 size={15} />
                Remover
              </button>
            </div>

            <div className="profile-form-grid">
              {[
                ["nomeEmpresa", "Nome da empresa"],
                ["cnpj", "CNPJ"],
                ["endereco", "Endereco"],
                ["cidade", "Cidade"],
                ["estado", "Estado"],
                ["cep", "CEP"],
                ["telefone", "Telefone"],
                ["email", "E-mail"]
              ].map(([field, label]) => (
                <label key={field} className="manager-field">
                  <span className="manager-field-label">{label}</span>
                  <input
                    className="input manager-field-control"
                    value={String(activeDocumento[field as keyof DocumentoCabecalhoForm] ?? "")}
                    onChange={(event) =>
                      updateDocumento(activeDocumento.tipo, {
                        [field]: event.target.value
                      } as Partial<DocumentoCabecalhoForm>)
                    }
                  />
                </label>
              ))}
            </div>
          </div>

          <aside className="profile-summary-card document-header-preview-card">
            <span className="profile-kicker">PRE-VISUALIZACAO</span>
            <h2>{activeDocumento.label}</h2>
            <div className="document-pdf-preview">
              {activeDocumento.logoUrl ? (
                <img src={activeDocumento.logoUrl} alt="Preview da logo" />
              ) : (
                <div className="document-pdf-preview-empty">Logo</div>
              )}
              <strong>{activeDocumento.nomeEmpresa || "Nome da empresa"}</strong>
              <span>CNPJ: {activeDocumento.cnpj || "-"}</span>
              <span>{activeDocumento.endereco || "-"}</span>
              <span>{formatCidadeUfCep(activeDocumento) || "-"}</span>
              <span>{activeDocumento.telefone || "-"}</span>
              <span>{activeDocumento.email || "-"}</span>
            </div>
          </aside>
        </div>
      ) : (
        <div className="ui-empty-state">Nenhum tipo de documento disponivel.</div>
      )}
    </section>
  );
}
