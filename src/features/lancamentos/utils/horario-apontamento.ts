import type { OperationalOption } from "@/lib/client/operational-options";
import type { HorarioApontamentoState } from "@/features/lancamentos/types";

const servicosComApontamentoPorHorario = new Set([
  "HORA_MAQUINA",
  "HORA_CAMINHAO",
  "SERVICO_DIARIA",
  "DIARIA"
]);

type CalculoHorariosOk = {
  ok: true;
  quantidadeApontada: string;
  totalMinutos: number;
  message: string;
};

type CalculoHorariosError = {
  ok: false;
  message: string;
};

export type CalculoHorariosResult = CalculoHorariosOk | CalculoHorariosError;

function normalizeServiceType(value?: string | null) {
  if (!value) {
    return "";
  }

  return value
    .trim()
    .toLocaleUpperCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function parseHorario(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) {
    return null;
  }

  const [hora, minuto] = value.split(":").map(Number);

  if (
    Number.isNaN(hora) ||
    Number.isNaN(minuto) ||
    hora < 0 ||
    hora > 23 ||
    minuto < 0 ||
    minuto > 59
  ) {
    return null;
  }

  return hora * 60 + minuto;
}

function formatDecimalHours(totalMinutos: number) {
  const totalHoras = Number((totalMinutos / 60).toFixed(2));
  return totalHoras.toString();
}

export function formatHorarioInput(value: string) {
  const sanitized = value.replace(/[^\d:]/g, "").slice(0, 5);

  if (sanitized.includes(":")) {
    const [hora = "", minuto = ""] = sanitized.split(":");
    return `${hora.slice(0, 2)}:${minuto.slice(0, 2)}`.replace(/:$/, ":");
  }

  const digits = sanitized.replace(/\D/g, "").slice(0, 4);

  if (digits.length <= 2) {
    return digits;
  }

  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

export function hasAnyHorarioFilled(horarios: HorarioApontamentoState) {
  return Object.values(horarios).some((value) => value.trim().length > 0);
}

export function isServicoMedidoPorHorario(
  servico?: Pick<OperationalOption, "tipoServico"> | null
) {
  return servicosComApontamentoPorHorario.has(normalizeServiceType(servico?.tipoServico));
}

export function calcularQuantidadeApontadaPorHorarios(
  horarios: HorarioApontamentoState
): CalculoHorariosResult {
  const inicioBruto = horarios.inicioServico.trim();
  const saidaBruto = horarios.saidaAlmoco.trim();
  const retornoBruto = horarios.retornoAlmoco.trim();
  const fimBruto = horarios.fimServico.trim();

  if (!inicioBruto) {
    return { ok: false, message: "Informe o inicio do servico." };
  }

  if (!fimBruto) {
    return { ok: false, message: "Informe o fim do servico." };
  }

  const inicio = parseHorario(inicioBruto);
  const fim = parseHorario(fimBruto);

  if (inicio === null || fim === null) {
    return { ok: false, message: "Use horarios validos no formato HH:mm." };
  }

  const hasSaidaAlmoco = saidaBruto.length > 0;
  const hasRetornoAlmoco = retornoBruto.length > 0;

  if (hasSaidaAlmoco !== hasRetornoAlmoco) {
    return {
      ok: false,
      message: hasSaidaAlmoco
        ? "Informe o retorno do almoco para completar o calculo."
        : "Nao informe retorno sem a saida para almoco."
    };
  }

  if (!hasSaidaAlmoco) {
    if (fim <= inicio) {
      return {
        ok: false,
        message: "O fim do servico precisa ser depois do inicio."
      };
    }

    const totalMinutos = fim - inicio;
    const quantidadeApontada = formatDecimalHours(totalMinutos);

    return {
      ok: true,
      quantidadeApontada,
      totalMinutos,
      message: `Quantidade apontada preenchida com ${quantidadeApontada} hora(s).`
    };
  }

  const saidaAlmoco = parseHorario(saidaBruto);
  const retornoAlmoco = parseHorario(retornoBruto);

  if (saidaAlmoco === null || retornoAlmoco === null) {
    return { ok: false, message: "Use horarios validos no formato HH:mm." };
  }

  if (saidaAlmoco <= inicio) {
    return {
      ok: false,
      message: "A saida para almoco precisa ser depois do inicio."
    };
  }

  if (retornoAlmoco <= saidaAlmoco) {
    return {
      ok: false,
      message: "O retorno do almoco precisa ser depois da saida."
    };
  }

  if (fim <= retornoAlmoco) {
    return {
      ok: false,
      message: "O fim do servico precisa ser depois do retorno do almoco."
    };
  }

  const totalManha = saidaAlmoco - inicio;
  const totalTarde = fim - retornoAlmoco;
  const totalMinutos = totalManha + totalTarde;

  if (totalMinutos <= 0) {
    return {
      ok: false,
      message: "Os horarios informados nao geram horas validas de trabalho."
    };
  }

  const quantidadeApontada = formatDecimalHours(totalMinutos);

  return {
    ok: true,
    quantidadeApontada,
    totalMinutos,
    message: `Quantidade apontada preenchida com ${quantidadeApontada} hora(s).`
  };
}
