type EmpresaRelatorioInput = {
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
  nome: process.env.EMPRESA_RELATORIO_NOME?.trim() || "JMIX",
  cnpj: process.env.EMPRESA_RELATORIO_CNPJ?.trim() || "20.613.463/0001-36",
  endereco:
    process.env.EMPRESA_RELATORIO_ENDERECO?.trim() ||
    "AV. NEREU RAMOS, 899 (DEPOSITO JMIX) - CENTRO",
  cidadeUfCep:
    process.env.EMPRESA_RELATORIO_CIDADE_UF_CEP?.trim() || "Penha/SC - CEP: 88385-000",
  telefones:
    process.env.EMPRESA_RELATORIO_TELEFONES?.trim() || "(47) 98803-1610 - (47) 99251-4414",
  email:
    process.env.EMPRESA_RELATORIO_EMAIL?.trim() || "financeiro@jtbterraplenagem.com.br"
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
