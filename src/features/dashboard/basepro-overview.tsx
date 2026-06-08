import type { Route } from "next";
import Link from "next/link";
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

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(value);
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
    openMeasurementCount,
    latestActivities
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
    }),
    prisma.historicoAlteracao.findMany({
      orderBy: {
        createdAt: "desc"
      },
      take: 4,
      include: {
        usuario: {
          select: {
            nome: true
          }
        }
      }
    })
  ]);

  const quickLinks = [
    { href: "/lancamentos" as Route, title: "Fichas de bordo", copy: "Registrar e validar apontamentos diarios." },
    { href: "/programacao" as Route, title: "Agenda de servicos", copy: "Organizar frente, equipamento e turno." },
    { href: "/frota/planos" as Route, title: "Manutencao", copy: "Executar preventivas e controlar vencimentos." },
    { href: "/medicoes" as Route, title: "Producoes e medicoes", copy: "Conferir quantidades e fechar faturamento." }
  ];

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

      <div className="basepro-dashboard-grid fade-up fade-up-delay-2">
        <article className="surface section-card basepro-activity-card">
          <div className="section-header">
            <div>
              <p className="section-copy">Ultimas atividades</p>
              <h2 className="section-title">Movimentacoes recentes</h2>
            </div>
          </div>

          <div className="basepro-activity-list">
            {latestActivities.length > 0 ? (
              latestActivities.map((activity) => (
                <div key={activity.id} className="basepro-activity-item">
                  <strong>{activity.entidade}</strong>
                  <span>
                    {activity.tipoAlteracao} por {activity.usuario.nome}
                  </span>
                  <small>{formatDateTime(activity.createdAt)}</small>
                </div>
              ))
            ) : (
              <div className="basepro-empty-state">Nenhuma atividade recente encontrada.</div>
            )}
          </div>
        </article>

        <article className="surface section-card basepro-quick-card">
          <div className="section-header">
            <div>
              <p className="section-copy">Acesso rapido</p>
              <h2 className="section-title">Modulos principais</h2>
            </div>
          </div>

          <div className="basepro-quick-grid">
            {quickLinks.map((item) => (
              <Link key={item.href} href={item.href} className="basepro-quick-link">
                <strong>{item.title}</strong>
                <span>{item.copy}</span>
              </Link>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
