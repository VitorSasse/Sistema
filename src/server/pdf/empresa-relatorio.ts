export type EmpresaRelatorioInput = {
  nome?: string | null;
  nomeFantasia?: string | null;
  razaoSocial?: string | null;
  cnpj?: string | null;
  email?: string | null;
  telefone?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
};

export type EmpresaRelatorioPdf = {
  nome: string;
  cnpj: string;
  endereco: string;
  cidadeUfCep: string;
  telefones: string;
  email: string;
};

const empresaRelatorioPadrao: EmpresaRelatorioPdf = {
  nome: process.env.EMPRESA_RELATORIO_NOME?.trim() || "BasePro OS",
  cnpj: process.env.EMPRESA_RELATORIO_CNPJ?.trim() || "-",
  endereco: process.env.EMPRESA_RELATORIO_ENDERECO?.trim() || "-",
  cidadeUfCep: process.env.EMPRESA_RELATORIO_CIDADE_UF_CEP?.trim() || "-",
  telefones: process.env.EMPRESA_RELATORIO_TELEFONES?.trim() || "-",
  email: process.env.EMPRESA_RELATORIO_EMAIL?.trim() || "-"
};

function joinCidadeUfCep(empresa: EmpresaRelatorioInput) {
  const cidadeUf = [empresa.cidade, empresa.estado].filter(Boolean).join("/");
  const cep = empresa.cep ? `CEP: ${empresa.cep}` : "";

  return [cidadeUf, cep].filter(Boolean).join(" - ");
}

export function buildEmpresaRelatorioPdf(empresa?: EmpresaRelatorioInput | null): EmpresaRelatorioPdf {
  if (!empresa) {
    return empresaRelatorioPadrao;
  }

  return {
    nome: empresa.nomeFantasia?.trim() || empresa.nome?.trim() || empresa.razaoSocial?.trim() || empresaRelatorioPadrao.nome,
    cnpj: empresa.cnpj?.trim() || empresaRelatorioPadrao.cnpj,
    endereco: empresa.endereco?.trim() || empresaRelatorioPadrao.endereco,
    cidadeUfCep: joinCidadeUfCep(empresa) || empresaRelatorioPadrao.cidadeUfCep,
    telefones: empresa.telefone?.trim() || empresaRelatorioPadrao.telefones,
    email: empresa.email?.trim() || empresaRelatorioPadrao.email
  };
}
