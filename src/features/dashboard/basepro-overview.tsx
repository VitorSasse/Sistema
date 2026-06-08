import type { Route } from "next";
import { prisma } from "@/lib/prisma";

const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0
});

const numberFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1
});

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function endOfToday() {
  const date = startOfToday();
  date.setDate(date.getDate() + 1);
  return date;
}

function startOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function endOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

function formatHours(value: number) {
  return `${numberFormatter.format(value)} h`;
}

function formatQuantity(value: number) {
  return numberFormatter.format(value);
}

export async function BaseproOverview() {
  const todayStart = startOfToday();
  const todayEnd = endOfToday();
  const monthStart = startOfMonth();
  const monthEnd = endOfMonth();

  const [
    productionToday,
    hoursToday,
    monthlyRevenue,
    monthlyCosts,
    activeEquipmentCount,
    maintenancePendingCount,
    openMeasurementCount
  ] = await Promise.all([
    prisma.lancamentoDiario.aggregate({
      where: {
        deletedAt: null,
        data: {
          gte: todayStart,
          lt: todayEnd
        }
      },
      _sum: {
        quantidadeApontada: true
      },
      _count: {
        id: true
      }
    }),
    prisma.lancamentoDiario.aggregate({
      where: {
        deletedAt: null,
        unidadeApontada: "HORA",
        data: {
          gte: todayStart,
          lt: todayEnd
        }
      },
      _sum: {
        quantidadeApontada: true
      }
    }),
    prisma.medicao.aggregate({
      where: {
        deletedAt: null,
        status: {
          not: "CANCELADA"
        },
        periodoFinal: {
          gte: monthStart,
          lt: monthEnd
        }
      },
      _sum: {
        valorTotal: true
      }
    }),
    prisma.manutencaoExecutada.aggregate({
      where: {
        dataExecucao: {
          gte: monthStart,
          lt: monthEnd
        }
      },
      _sum: {
        custo: true
      }
    }),
    prisma.equipamento.count({
      where: {
        status: "ATIVO",
        statusOperacional: "EM_OPERACAO"
      }
    }),
    prisma.agendaManutencao.count({
      where: {
        status: {
          in: ["PENDENTE", "VENCIDA", "EM_EXECUCAO"]
        }
      }
    }),
    prisma.medicao.count({
      where: {
        deletedAt: null,
        status: {
          in: ["EM_ABERTO", "ENVIADA_AO_CLIENTE", "ENVIADA_PARA_FATURAMENTO", "AGUARDANDO_APROVACAO"]
        }
      }
    })
  ]);

  const insights = [
    {
      label: "Producao hoje",
      value: formatQuantity(Number(productionToday._sum.quantidadeApontada ?? 0)),
      note: `${productionToday._count.id} lancamento(s) apontado(s) hoje.`,
      tone: "orange"
    },
    {
      label: "Horas trabalhadas",
      value: formatHours(Number(hoursToday._sum.quantidadeApontada ?? 0)),
      note: "Horas registradas em recursos com apontamento horario.",
      tone: "blue"
    },
    {
      label: "Faturamento do mes",
      value: moneyFormatter.format(Number(monthlyRevenue._sum.valorTotal ?? 0)),
      note: "Valor das medicoes ativas com competencia neste mes.",
      tone: "orange"
    },
    {
      label: "Custos do mes",
      value: moneyFormatter.format(Number(monthlyCosts._sum.custo ?? 0)),
      note: "Custos lancados em manutencoes executadas no periodo.",
      tone: "neutral"
    },
    {
      label: "Equipamentos em operacao",
      value: String(activeEquipmentCount),
      note: "Recursos ativos marcados como EM_OPERACAO.",
      tone: "green"
    },
    {
      label: "Alertas e pendencias",
      value: String(maintenancePendingCount + openMeasurementCount),
      note: `${maintenancePendingCount} manutencao(oes) e ${openMeasurementCount} medicao(oes) abertas.`,
      tone: "orange"
    }
  ];

  return (
    <section className="basepro-overview">
      <div className="basepro-hero surface section-card fade-up">
        <div className="basepro-hero-copy">
          <span className="basepro-kicker">BASEPRO</span>
          <h1 className="basepro-title">Sua operacao pesada, agora sob controle.</h1>
          <p className="basepro-copy">
            Controle total da sua operacao de terraplenagem. Do campo ao faturamento, sem erros.
          </p>
        </div>

        <div className="basepro-hero-panel">
          <strong>Gestao completa para quem nao pode parar.</strong>
          <span>Producao medida. Lucro garantido.</span>
          <p>
            Pare de perder dinheiro por falta de controle. A BASEPRO conecta lancamento, manutencao,
            agenda, RH operacional, financeiro e relatorios na mesma cabine de comando.
          </p>
        </div>
      </div>

      <div className="basepro-kpi-grid fade-up fade-up-delay-1">
        {insights.map((item) => (
          <article key={item.label} className={`basepro-kpi-card tone-${item.tone}`}>
            <span className="basepro-kpi-label">{item.label}</span>
            <strong className="basepro-kpi-value">{item.value}</strong>
            <p className="basepro-kpi-note">{item.note}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
