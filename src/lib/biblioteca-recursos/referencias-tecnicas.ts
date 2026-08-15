export type ClasseOperacionalExistente = {
  empresaId: string;
  classeOperacional?: string | null;
};

export function normalizarNomeReferenciaTecnica(nome: string) {
  return nome.trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
}

export function nomeReferenciaTecnicaValido(nome: string) {
  return nome.trim().replace(/\s+/g, " ");
}

export function criarReferenciasAPartirDeClasses(
  equipamentos: ClasseOperacionalExistente[]
) {
  const referencias = new Map<string, { empresaId: string; nome: string; nomeNormalizado: string }>();

  for (const equipamento of equipamentos) {
    const nome = nomeReferenciaTecnicaValido(equipamento.classeOperacional ?? "");
    if (!nome) continue;

    const nomeNormalizado = normalizarNomeReferenciaTecnica(nome);
    const key = `${equipamento.empresaId}:${nomeNormalizado}`;
    if (!referencias.has(key)) {
      referencias.set(key, {
        empresaId: equipamento.empresaId,
        nome,
        nomeNormalizado
      });
    }
  }

  return [...referencias.values()];
}
