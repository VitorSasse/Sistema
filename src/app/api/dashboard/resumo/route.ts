import { NextResponse } from "next/server";

const summary = {
  totalLancamentosPeriodo: 0,
  fichasPendentes: 0,
  fichasSemObra: 0,
  horasMaquinas: 0,
  horasCaminhoes: 0,
  medicoesEmAberto: 0,
  valorPrevistoPeriodo: 0
};

export async function GET() {
  return NextResponse.json(summary);
}
