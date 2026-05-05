"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";

type ObraResumo = {
  id: string;
  codigo: string;
  nome: string;
  status: "ATIVO" | "INATIVO";
};

type Cliente = {
  id: string;
  codigo: string;
  tipoCliente: "CPF" | "CNPJ";
  nome: string;
  nomeFantasia: string | null;
  cpf: string | null;
  cnpj: string | null;
  inscricaoEstadual: string | null;
  contatoNome: string | null;
  telefone: string | null;
  email: string | null;
  enderecoLinha1: string | null;
  enderecoLinha2: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  observacao: string | null;
  status: "ATIVO" | "INATIVO";
  obras: ObraResumo[];
};

type FormState = {
  id?: string;
  tipoCliente: "CPF" | "CNPJ";
  nome: string;
  nomeFantasia: string;
  cpf: string;
  cnpj: string;
  inscricaoEstadual: string;
  contatoNome: string;
  telefone: string;
  email: string;
  enderecoLinha1: string;
  enderecoLinha2: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  observacao: string;
  status: "ATIVO" | "INATIVO";
};

const initialForm: FormState = {
  tipoCliente: "CNPJ",
  nome: "",
  nomeFantasia: "",
  cpf: "",
  cnpj: "",
  inscricaoEstadual: "",
  contatoNome: "",
  telefone: "",
  email: "",
  enderecoLinha1: "",
  enderecoLinha2: "",
  bairro: "",
  cidade: "",
  uf: "",
  cep: "",
  observacao: "",
  status: "ATIVO"
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

export function ClientesManager() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [message, setMessage] = useState<string>("");
  const [search, setSearch] = useState("");
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function loadClientes() {
    const response = await fetch("/api/clientes", { cache: "no-store" });
    const data = (await response.json()) as { items: Cliente[] };
    setClientes(data.items);
  }

  useEffect(() => {
    void loadClientes();
  }, []);

  const filteredClientes = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    if (!normalized) {
      return clientes;
    }

    return clientes.filter((cliente) =>
      [
        cliente.codigo,
        cliente.nome,
        cliente.nomeFantasia ?? "",
        cliente.cpf ?? "",
        cliente.cnpj ?? "",
        cliente.cidade ?? "",
        cliente.email ?? ""
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [clientes, search]);

  const selectedCliente = useMemo(
    () => clientes.find((cliente) => cliente.id === selectedClienteId) ?? null,
    [clientes, selectedClienteId]
  );

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleTipoClienteChange(value: "CPF" | "CNPJ") {
    setForm((current) => ({
      ...current,
      tipoCliente: value,
      cpf: value === "CPF" ? current.cpf : "",
      cnpj: value === "CNPJ" ? current.cnpj : "",
      nomeFantasia: value === "CNPJ" ? current.nomeFantasia : "",
      inscricaoEstadual: value === "CNPJ" ? current.inscricaoEstadual : "",
      contatoNome: value === "CNPJ" ? current.contatoNome : ""
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const method = form.id ? "PATCH" : "POST";
    const url = form.id ? `/api/clientes/${form.id}` : "/api/clientes";

    startTransition(async () => {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setMessage(data.message ?? "Nao foi possivel salvar o cliente.");
        return;
      }

      setForm(initialForm);
      setSelectedClienteId(null);
      setMessage(form.id ? "Cliente atualizado com sucesso." : "Cliente cadastrado com sucesso. O codigo foi gerado automaticamente.");
      await loadClientes();
    });
  }

  function handleEdit(cliente: Cliente) {
    setForm({
      id: cliente.id,
      tipoCliente: cliente.tipoCliente,
      nome: cliente.nome,
      nomeFantasia: cliente.nomeFantasia ?? "",
      cpf: cliente.cpf ?? "",
      cnpj: cliente.cnpj ?? "",
      inscricaoEstadual: cliente.inscricaoEstadual ?? "",
      contatoNome: cliente.contatoNome ?? "",
      telefone: cliente.telefone ?? "",
      email: cliente.email ?? "",
      enderecoLinha1: cliente.enderecoLinha1 ?? "",
      enderecoLinha2: cliente.enderecoLinha2 ?? "",
      bairro: cliente.bairro ?? "",
      cidade: cliente.cidade ?? "",
      uf: cliente.uf ?? "",
      cep: cliente.cep ?? "",
      observacao: cliente.observacao ?? "",
      status: cliente.status
    });
    setSelectedClienteId(cliente.id);
    setMessage(`Editando cliente ${cliente.codigo}.`);
  }

  function handleSelectCliente(clienteId: string) {
    setSelectedClienteId((current) => (current === clienteId ? null : clienteId));
  }

  function handleReset() {
    setForm(initialForm);
    setSelectedClienteId(null);
    setMessage("");
  }

  async function handleDisable(id: string) {
    startTransition(async () => {
      const response = await fetch(`/api/clientes/${id}`, { method: "DELETE" });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setMessage(data.message ?? "Nao foi possivel inativar o cliente.");
        return;
      }

      if (selectedClienteId === id) {
        setSelectedClienteId(null);
      }

      setMessage("Cliente inativado.");
      await loadClientes();
    });
  }

  async function handleDelete(id: string) {
    startTransition(async () => {
      const response = await fetch(`/api/clientes/${id}?mode=delete`, { method: "DELETE" });
      const data = (await response.json()) as { message?: string };

      if (!response.ok) {
        setMessage(data.message ?? "Nao foi possivel excluir o cliente.");
        return;
      }

      if (selectedClienteId === id) {
        setSelectedClienteId(null);
      }

      if (form.id === id) {
        setForm(initialForm);
      }

      setMessage("Cliente excluido.");
      await loadClientes();
    });
  }

  return (
    <main className="page-stack">
      <section className="page-header">
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="page-copy">
            Cadastro mestre com codigo automatico para clientes pessoa fisica ou juridica.
          </p>
        </div>
      </section>

      <section className="surface section-card">
        <div className="section-header">
          <div>
            <h2 className="section-title">{form.id ? "Editar cliente" : "Novo cliente"}</h2>
            <p className="section-copy">
              O codigo do cliente e gerado automaticamente no cadastro.
            </p>
          </div>
        </div>

        <div className="toolbar-actions" style={{ marginBottom: 20 }}>
          <button
            type="button"
            onClick={() => handleTipoClienteChange("CPF")}
            className={form.tipoCliente === "CPF" ? "button-primary" : "button-secondary"}
          >
            Pessoa fisica (CPF)
          </button>
          <button
            type="button"
            onClick={() => handleTipoClienteChange("CNPJ")}
            className={form.tipoCliente === "CNPJ" ? "button-primary" : "button-secondary"}
          >
            Pessoa juridica (CNPJ)
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 24 }}>
          <div className="form-grid-4">
            <Field label={form.tipoCliente === "CPF" ? "Nome completo" : "Razao social"}>
              <input
                className="field-control"
                placeholder={form.tipoCliente === "CPF" ? "Nome completo do cliente" : "Razao social da empresa"}
                value={form.nome}
                onChange={(event) => updateField("nome", event.target.value)}
              />
            </Field>

            {form.tipoCliente === "CNPJ" ? (
              <>
                <Field label="Nome fantasia">
                  <input
                    className="field-control"
                    placeholder="Nome fantasia"
                    value={form.nomeFantasia}
                    onChange={(event) => updateField("nomeFantasia", event.target.value)}
                  />
                </Field>
                <Field label="CNPJ">
                  <input
                    className="field-control"
                    placeholder="00.000.000/0001-00"
                    value={form.cnpj}
                    onChange={(event) => updateField("cnpj", event.target.value)}
                  />
                </Field>
                <Field label="Inscricao estadual">
                  <input
                    className="field-control"
                    placeholder="Inscricao estadual"
                    value={form.inscricaoEstadual}
                    onChange={(event) => updateField("inscricaoEstadual", event.target.value)}
                  />
                </Field>
              </>
            ) : (
              <Field label="CPF">
                <input
                  className="field-control"
                  placeholder="000.000.000-00"
                  value={form.cpf}
                  onChange={(event) => updateField("cpf", event.target.value)}
                />
              </Field>
            )}

            <Field label={form.tipoCliente === "CNPJ" ? "Responsavel pelo contato" : "Contato principal"}>
              <input
                className="field-control"
                placeholder="Nome do responsavel"
                value={form.contatoNome}
                onChange={(event) => updateField("contatoNome", event.target.value)}
              />
            </Field>
            <Field label="Telefone">
              <input
                className="field-control"
                placeholder="(00) 00000-0000"
                value={form.telefone}
                onChange={(event) => updateField("telefone", event.target.value)}
              />
            </Field>
            <Field label="E-mail">
              <input
                className="field-control"
                placeholder="contato@cliente.com.br"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
              />
            </Field>
            <Field label="Endereco principal">
              <input
                className="field-control"
                placeholder="Rua, avenida, rodovia ou referencia"
                value={form.enderecoLinha1}
                onChange={(event) => updateField("enderecoLinha1", event.target.value)}
              />
            </Field>
            <Field label="Complemento">
              <input
                className="field-control"
                placeholder="Bloco, sala, referencia"
                value={form.enderecoLinha2}
                onChange={(event) => updateField("enderecoLinha2", event.target.value)}
              />
            </Field>
            <Field label="Bairro">
              <input
                className="field-control"
                placeholder="Bairro"
                value={form.bairro}
                onChange={(event) => updateField("bairro", event.target.value)}
              />
            </Field>
            <Field label="Cidade">
              <input
                className="field-control"
                placeholder="Cidade"
                value={form.cidade}
                onChange={(event) => updateField("cidade", event.target.value)}
              />
            </Field>
            <Field label="UF">
              <input
                className="field-control"
                placeholder="SP"
                maxLength={2}
                value={form.uf}
                onChange={(event) => updateField("uf", event.target.value.toUpperCase())}
              />
            </Field>
            <Field label="CEP">
              <input
                className="field-control"
                placeholder="00000-000"
                value={form.cep}
                onChange={(event) => updateField("cep", event.target.value)}
              />
            </Field>
            <Field label="Status">
              <select
                className="field-control"
                value={form.status}
                onChange={(event) => updateField("status", event.target.value as FormState["status"])}
              >
                <option value="ATIVO">ATIVO</option>
                <option value="INATIVO">INATIVO</option>
              </select>
            </Field>
          </div>

          <Field label="Observacao">
            <textarea
              className="field-control textarea-lg"
              placeholder="Observacoes comerciais ou operacionais do cliente"
              value={form.observacao}
              onChange={(event) => updateField("observacao", event.target.value)}
            />
          </Field>

          <div className="toolbar-actions">
            <button type="submit" disabled={isPending} className="button-primary">
              {isPending ? "Salvando..." : form.id ? "Atualizar cliente" : "Salvar cliente"}
            </button>
            <button type="button" onClick={handleReset} className="button-ghost">
              Limpar formulario
            </button>
          </div>

          {message ? <p className="message-inline">{message}</p> : null}
        </form>
      </section>

      <section className="surface section-card">
        <div className="section-header">
          <div>
            <h2 className="section-title">Clientes cadastrados</h2>
            <p className="section-copy">
              {filteredClientes.length} registro(s) exibido(s) de {clientes.length}.
            </p>
          </div>
          <input
            className="field-control"
            placeholder="Buscar por codigo, nome, documento, cidade ou e-mail"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={{ width: 360, maxWidth: "100%" }}
          />
        </div>

        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Tipo</th>
                <th>Cliente</th>
                <th>Documento</th>
                <th>Contato</th>
                <th>Obras</th>
                <th>Status</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {filteredClientes.map((cliente) => (
                <tr key={cliente.id}>
                  <td>{cliente.codigo}</td>
                  <td>{cliente.tipoCliente}</td>
                  <td>
                    <div>{cliente.nome}</div>
                    <div className="subtle">{cliente.nomeFantasia ?? "-"}</div>
                  </td>
                  <td>{cliente.cpf ?? cliente.cnpj ?? "-"}</td>
                  <td>
                    <div>{cliente.contatoNome ?? "-"}</div>
                    <div className="subtle">{cliente.telefone ?? cliente.email ?? "-"}</div>
                  </td>
                  <td>{cliente.obras.length}</td>
                  <td>
                    <span className={cliente.status === "ATIVO" ? "badge badge-success" : "badge badge-danger"}>
                      {cliente.status}
                    </span>
                  </td>
                  <td>
                    <div className="toolbar-actions">
                      <button type="button" onClick={() => handleEdit(cliente)} className="button-secondary">
                        Editar
                      </button>
                      <button type="button" onClick={() => handleSelectCliente(cliente.id)} className="button-ghost">
                        {selectedClienteId === cliente.id ? "Ocultar obras" : "Ver obras"}
                      </button>
                      <button type="button" onClick={() => handleDisable(cliente.id)} className="button-danger">
                        Inativar
                      </button>
                      <button type="button" onClick={() => handleDelete(cliente.id)} className="button-danger">
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selectedCliente ? (
          <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid rgba(109, 92, 66, 0.12)" }}>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>
              Obras vinculadas a {selectedCliente.codigo} - {selectedCliente.nome}
            </h3>
            <p className="section-copy" style={{ marginBottom: 16 }}>
              {selectedCliente.obras.length} obra(s) vinculada(s) a este cliente.
            </p>

            {selectedCliente.obras.length === 0 ? (
              <p className="subtle" style={{ margin: 0 }}>
                Nenhuma obra vinculada ate o momento.
              </p>
            ) : (
              <div className="list-stack">
                {selectedCliente.obras.map((obra) => (
                  <div key={obra.id} className="list-item">
                    <div>
                      <strong>{obra.codigo}</strong> - {obra.nome}
                    </div>
                    <span className={obra.status === "ATIVO" ? "badge badge-success" : "badge badge-danger"}>
                      {obra.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </section>
    </main>
  );
}
