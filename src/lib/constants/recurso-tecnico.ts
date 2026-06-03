export const RECURSO_TECNICO_PADRAO_TAG = "SEM_RECURSO_TECNICO";
export const RECURSO_TECNICO_PADRAO_NOME = "RECURSO TECNICO GENERICO";

export function isRecursoTecnicoPadrao(placaOuTag?: string | null) {
  return placaOuTag === RECURSO_TECNICO_PADRAO_TAG;
}
