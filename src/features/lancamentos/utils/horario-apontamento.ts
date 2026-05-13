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
  unidadeApontada: "HORA";
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

  if (!inicioBruto && !saidaBruto && !retornoBruto && !fimBruto) {
    return { ok: false, message: "Informe ao menos um bloco de horario para calcular." };
  }

  const inicio = parseHorario(inicioBruto);
  const saidaAlmoco = parseHorario(saidaBruto);
  const retornoAlmoco = parseHorario(retornoBruto);
  const fim = parseHorario(fimBruto);

  if (
    (inicioBruto && inicio === null) ||
    (saidaBruto && saidaAlmoco === null) ||
    (retornoBruto && retornoAlmoco === null) ||
    (fimBruto && fim === null)
  ) {
    return { ok: false, message: "Use horarios validos no formato HH:mm." };
  }

  const hasSaidaAlmoco = saidaBruto.length > 0;
  const hasRetornoAlmoco = retornoBruto.length > 0;
  let totalMinutos = 0;

  if (inicio !== null && saidaAlmoco !== null) {
    if (saidaAlmoco <= inicio) {
      return {
        ok: false,
        message: "A saida para almoco precisa ser depois do inicio."
      };
    }

    totalMinutos += saidaAlmoco - inicio;
  }

  if (retornoAlmoco !== null && fim !== null) {
    if (fim <= retornoAlmoco) {
      return {
        ok: false,
        message: "O fim do servico precisa ser depois do retorno do almoco."
      };
    }

    totalMinutos += fim - retornoAlmoco;
  }

  if (!hasSaidaAlmoco && !hasRetornoAlmoco && inicio !== null && fim !== null) {
    if (fim <= inicio) {
      return {
        ok: false,
        message: "O fim do servico precisa ser depois do inicio."
      };
    }

    totalMinutos = fim - inicio;
  }

  if ((hasSaidaAlmoco && !inicioBruto) || (hasSaidaAlmoco && inicio === null)) {
    return {
      ok: false,
      message: "Informe o inicio do servico para calcular o bloco da manha."
    };
  }

  if ((hasRetornoAlmoco && !fimBruto) || (hasRetornoAlmoco && fim === null)) {
    return {
      ok: false,
      message: "Informe o fim do servico para calcular o bloco da tarde."
    };
  }

  if (!hasSaidaAlmoco && hasRetornoAlmoco) {
    return {
      ok: false,
      message: "Nao informe retorno sem um bloco valido de almoco."
    };
  }

  if (totalMinutos <= 0) {
    return {
      ok: false,
      message: "Os horarios informados nao geram quantidade valida de trabalho."
    };
  }

  const quantidadeApontada = formatDecimalHours(totalMinutos);

  return {
    ok: true,
    unidadeApontada: "HORA",
    quantidadeApontada,
    totalMinutos,
    message: `Quantidade apontada preenchida com ${quantidadeApontada} hora(s).`
  };
}
