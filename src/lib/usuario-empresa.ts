import { RoleCodigo, RoleUsuarioEmpresa, StatusCadastro, type PrismaClient } from "@prisma/client";
import { normalizeModulePermissions, type ModulePermissionMap } from "@/lib/permissions";

export const USUARIO_EMPRESA_COOKIE = "basepro_empresa_ativa";

type DbClient = PrismaClient;

export type UsuarioEmpresaAcesso = {
  empresaId: string;
  nome: string;
  nomeFantasia: string | null;
  razaoSocial: string | null;
  roleEmpresa: RoleUsuarioEmpresa;
  roles: RoleCodigo[];
  modoSomenteLeitura: boolean;
  permissoesAcesso: ModulePermissionMap;
  padrao: boolean;
};

export function roleLegadaPorRoleEmpresa(roleEmpresa: RoleUsuarioEmpresa): RoleCodigo {
  const mapa: Record<RoleUsuarioEmpresa, RoleCodigo> = {
    MASTER: RoleCodigo.ADMIN,
    ADMIN_EMPRESA: RoleCodigo.ADMIN,
    GERENTE: RoleCodigo.GESTOR,
    OPERADOR: RoleCodigo.OPERACIONAL,
    FINANCEIRO: RoleCodigo.FINANCEIRO,
    VISUALIZADOR: RoleCodigo.CONSULTA
  };

  return mapa[roleEmpresa];
}

export async function listarEmpresasUsuario(db: DbClient, usuarioId: string): Promise<UsuarioEmpresaAcesso[]> {
  const vinculos = await db.usuarioEmpresa.findMany({
    where: {
      usuarioId,
      status: StatusCadastro.ATIVO,
      empresa: {
        status: StatusCadastro.ATIVO,
        deletedAt: null
      }
    },
    include: {
      empresa: {
        select: {
          id: true,
          nome: true,
          nomeFantasia: true,
          razaoSocial: true
        }
      }
    },
    orderBy: [{ padrao: "desc" }, { empresa: { nome: "asc" } }]
  });

  return vinculos.map((vinculo) => {
    const role = roleLegadaPorRoleEmpresa(vinculo.roleEmpresa);
    const readOnly = vinculo.modoSomenteLeitura || vinculo.roleEmpresa === RoleUsuarioEmpresa.VISUALIZADOR;

    return {
      empresaId: vinculo.empresaId,
      nome: vinculo.empresa.nome,
      nomeFantasia: vinculo.empresa.nomeFantasia,
      razaoSocial: vinculo.empresa.razaoSocial,
      roleEmpresa: vinculo.roleEmpresa,
      roles: [role],
      modoSomenteLeitura: readOnly,
      permissoesAcesso: normalizeModulePermissions(vinculo.permissoesAcesso),
      padrao: vinculo.padrao
    };
  });
}

export function selecionarEmpresaUsuario(params: {
  acessos: UsuarioEmpresaAcesso[];
  empresaSelecionadaId?: string | null;
  empresaLegadaId?: string | null;
}) {
  const { acessos, empresaSelecionadaId, empresaLegadaId } = params;

  if (empresaSelecionadaId) {
    const selecionada = acessos.find((acesso) => acesso.empresaId === empresaSelecionadaId);

    if (selecionada) {
      return selecionada;
    }
  }

  return (
    acessos.find((acesso) => acesso.padrao) ??
    acessos.find((acesso) => acesso.empresaId === empresaLegadaId) ??
    acessos[0] ??
    null
  );
}
