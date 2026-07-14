import {
  Prisma,
  PrismaClient,
  StatusCadastro,
  StatusEquipamentoOperacional,
  TipoControleEquipamento,
  TipoRecurso
} from "@prisma/client";
import {
  RECURSO_TECNICO_PADRAO_NOME,
  RECURSO_TECNICO_PADRAO_TAG
} from "@/lib/constants/recurso-tecnico";
import { requireActiveTenantEmpresaId } from "@/lib/tenant-store";

type DbClient = PrismaClient | Prisma.TransactionClient;

export async function obterOuCriarRecursoTecnicoPadrao(db: DbClient) {
  const empresaId = requireActiveTenantEmpresaId();

  return db.equipamento.upsert({
    where: {
      empresaId_placaOuTag: {
        empresaId,
        placaOuTag: RECURSO_TECNICO_PADRAO_TAG
      }
    },
    update: {
      descricao: RECURSO_TECNICO_PADRAO_NOME,
      tipoRecurso: TipoRecurso.EQUIPAMENTO_APOIO,
      tipoControle: TipoControleEquipamento.HORIMETRO,
      complementar: false,
      status: StatusCadastro.ATIVO,
      statusOperacional: StatusEquipamentoOperacional.ATIVO
    },
    create: {
      empresaId,
      descricao: RECURSO_TECNICO_PADRAO_NOME,
      placaOuTag: RECURSO_TECNICO_PADRAO_TAG,
      tipoRecurso: TipoRecurso.EQUIPAMENTO_APOIO,
      tipoControle: TipoControleEquipamento.HORIMETRO,
      complementar: false,
      status: StatusCadastro.ATIVO,
      statusOperacional: StatusEquipamentoOperacional.ATIVO
    }
  });
}
