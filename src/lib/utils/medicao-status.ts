import { StatusMedicao } from "@prisma/client";

type MedicaoSnapshot = {
  status: StatusMedicao;
};

const editableMedicaoStatuses: StatusMedicao[] = [
  "CRIADA",
  "EM_ABERTO",
  "ENVIADA_AO_CLIENTE",
  "ENVIADA"
];

export function canEditMedicaoContent(status: StatusMedicao) {
  return editableMedicaoStatuses.includes(status);
}

export function canTransitionMedicao(
  medicao: MedicaoSnapshot,
  nextStatus: StatusMedicao
) {
  if (medicao.status === "CANCELADA") {
    return nextStatus === "CANCELADA";
  }

  switch (nextStatus) {
    case "CRIADA":
      return medicao.status === "CRIADA";
    case "EM_ABERTO":
      return medicao.status !== "CONCLUIDA";
    case "ENVIADA_AO_CLIENTE":
      return medicao.status !== "CONCLUIDA";
    case "ENVIADA_PARA_FATURAMENTO":
      return medicao.status !== "CONCLUIDA";
    case "CONCLUIDA":
      return medicao.status === "ENVIADA_PARA_FATURAMENTO" || medicao.status === "CONCLUIDA";
    case "CANCELADA":
      return medicao.status !== "CONCLUIDA";
    default:
      return false;
  }
}
