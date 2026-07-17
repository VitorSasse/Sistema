export type PropostaOpcionalRevisionDraft = {
  localId: string;
  ordem: number;
  codigo: string;
  descricao: string;
  unidade: string;
  quantidade: string;
  valorUnitario: string;
  condicoes: string;
  observacao: string;
};

export type PropostaRevisionDraft = {
  localId: string;
  cenarioTempId: string;
  codigo: string;
  revisao: string;
  titulo: string;
  status: string;
  modoExibicaoValoresPdf: string;
  condicoesComerciais: string;
  observacao: string;
  opcionais: PropostaOpcionalRevisionDraft[];
};

type CriarNovaRevisaoParams = {
  propostaEmitida: PropostaRevisionDraft;
  propostasExistentes: PropostaRevisionDraft[];
  criarPropostaId: () => string;
  criarOpcionalId: () => string;
};

function normalizeCodigo(codigo: string) {
  return codigo.trim().toLocaleUpperCase("pt-BR");
}

export function criarNovaRevisaoProposta({
  propostaEmitida,
  propostasExistentes,
  criarPropostaId,
  criarOpcionalId
}: CriarNovaRevisaoParams): PropostaRevisionDraft {
  const codigoNormalizado = normalizeCodigo(propostaEmitida.codigo);
  const maiorRevisao = propostasExistentes.reduce((maior, proposta) => {
    if (normalizeCodigo(proposta.codigo) !== codigoNormalizado) {
      return maior;
    }

    return Math.max(maior, Number(proposta.revisao) || 0);
  }, Number(propostaEmitida.revisao) || 0);

  return {
    localId: criarPropostaId(),
    cenarioTempId: propostaEmitida.cenarioTempId,
    codigo: propostaEmitida.codigo,
    revisao: String(maiorRevisao + 1),
    titulo: propostaEmitida.titulo,
    status: "RASCUNHO",
    modoExibicaoValoresPdf: propostaEmitida.modoExibicaoValoresPdf,
    condicoesComerciais: propostaEmitida.condicoesComerciais,
    observacao: propostaEmitida.observacao,
    opcionais: propostaEmitida.opcionais.map((opcional) => ({
      ...opcional,
      localId: criarOpcionalId()
    }))
  };
}
