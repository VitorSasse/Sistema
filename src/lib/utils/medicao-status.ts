import { StatusMedicao } from "@prisma/client";

type MedicaoSnapshot = {
  status: StatusMedicao;
};

export function canTransitionMedicao(
  medicao: MedicaoSnapshot,
  nextStatus: StatusMedicao
) {
  switch (nextStatus) {
    case "EM_ABERTO":
      return true;
    case "ENVIADA_AO_CLIENTE":
      return medicao.status !== "CONCLUIDA";
    case "ENVIADA_PARA_FATURAMENTO":
      return medicao.status !== "CONCLUIDA";
    case "CONCLUIDA":
      return medicao.status === "ENVIADA_PARA_FATURAMENTO" || medicao.status === "CONCLUIDA";
    default:
      return false;
  }
}
