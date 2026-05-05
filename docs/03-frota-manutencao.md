# Modulo de Frota e Manutencao

## ETAPA 1 — Analise e Estrutura

### Resumo funcional

O modulo de frota e manutencao centraliza no sistema o que hoje esta espalhado em planilhas de agenda, manutencao e controle de frota. Ele amplia o cadastro atual de `equipamentos` e cria uma linha completa de controle para:

- leituras de horimetro e quilometragem
- plano preventivo por equipamento
- agenda operacional de manutencao
- historico de manutencoes executadas
- alertas automaticos
- dashboard de frota
- integracao futura com os lancamentos diarios de fichas

O foco do MVP deste modulo e eliminar a dependencia operacional de planilhas paralelas, mantendo a arquitetura atual em `Next.js + TypeScript + Prisma + PostgreSQL`.

### Regras de negocio organizadas

#### 1. Equipamentos

- O cadastro de equipamento continua sendo a entidade central da frota.
- `status` continua representando se o cadastro esta ativo ou inativo.
- `statusOperacional` passa a representar o estado dinamico do recurso:
  - `ATIVO`
  - `EM_OPERACAO`
  - `EM_MANUTENCAO`
  - `PARADO`
  - `INATIVO`
- O equipamento passa a guardar:
  - fabricante
  - modelo
  - data de entrada
  - horimetro atual
  - km atual
  - periodicidades padrao de manutencao

#### 2. Leituras de horimetro e KM

- Toda leitura deve ficar historica, nunca sobrescrita.
- Uma leitura pode ser originada por:
  - lancamento manual
  - lancamento diario
  - manutencao
  - importacao
  - ajuste
- Cada leitura deve registrar:
  - equipamento
  - data
  - horimetro
  - km
  - origem
  - usuario
  - observacao
- Leituras inconsistentes devem gerar alerta:
  - queda de horimetro
  - queda de km
  - salto fora do padrao
  - equipamento sem leitura recente

#### 3. Plano preventivo

- Um equipamento pode possuir varios planos preventivos.
- Cada plano e controlado por apenas um criterio:
  - `HORIMETRO`
  - `KM`
  - `DIAS`
- Cada plano deve guardar:
  - tipo de manutencao
  - periodicidade
  - tolerancia
  - ultima execucao
  - proxima execucao estimada
  - proxima leitura alvo
  - responsavel
  - status

#### 4. Agenda de manutencao

- A agenda representa a camada operacional do plano.
- Ela precisa exibir:
  - pendentes
  - agendadas
  - em execucao
  - concluidas
  - canceladas
  - vencidas
- A agenda pode nascer:
  - automaticamente a partir do plano preventivo
  - manualmente pelo escritorio

#### 5. Historico de manutencao

- Toda manutencao executada deve gerar historico imutavel.
- Campos minimos:
  - equipamento
  - data da execucao
  - tipo de manutencao
  - descricao do servico
  - horimetro no momento
  - km no momento
  - pecas trocadas
  - fornecedor/oficina
  - custo
  - observacao
  - usuario que registrou
  - anexos

#### 6. Alertas automaticos

- O sistema deve gerar alertas para:
  - `HORIMETRO_VENCIDO`
  - `KM_VENCIDO`
  - `DATA_VENCIDA`
  - `PROXIMO_VENCIMENTO`
  - `SEM_ATUALIZACAO`
  - `EQUIPAMENTO_PARADO`
  - `LEITURA_INCONSISTENTE`
- Os alertas precisam registrar:
  - equipamento
  - plano ou agenda relacionados, se existirem
  - prioridade
  - status
  - data e leitura de referencia
  - se a origem foi automatica

#### 7. Integracao com lancamentos

- O modulo deve usar o `equipamentoId` ja existente em `lancamentos_diarios`.
- A estrutura fica preparada para:
  - gerar leituras a partir do lancamento
  - consolidar utilizacao por equipamento
  - estimar horas trabalhadas
  - futuramente correlacionar producao x uso do recurso

### Modelagem do banco

#### Entidades novas

- `LeituraEquipamento`
- `PlanoManutencao`
- `AgendaManutencao`
- `ManutencaoExecutada`
- `AlertaManutencao`
- `AnexoManutencao`

#### Entidades existentes ampliadas

- `Equipamento`
- `Usuario`
- `LancamentoDiario`

### Diagrama textual de relacionamentos

```text
Equipamento 1 --- N LeituraEquipamento
Equipamento 1 --- N PlanoManutencao
Equipamento 1 --- N AgendaManutencao
Equipamento 1 --- N ManutencaoExecutada
Equipamento 1 --- N AlertaManutencao

PlanoManutencao 1 --- N AgendaManutencao
PlanoManutencao 1 --- N ManutencaoExecutada
PlanoManutencao 1 --- N AlertaManutencao

AgendaManutencao 1 --- N ManutencaoExecutada
AgendaManutencao 1 --- N AlertaManutencao

ManutencaoExecutada 1 --- N AnexoManutencao

Usuario 1 --- N LeituraEquipamento
Usuario 1 --- N PlanoManutencao (responsavel)
Usuario 1 --- N AgendaManutencao (responsavel)
Usuario 1 --- N ManutencaoExecutada (registrado por)
Usuario 1 --- N ManutencaoExecutada (executado por)

LancamentoDiario 1 --- N LeituraEquipamento
```

### Fluxo operacional do usuario

#### Fluxo 1. Controle basico da frota

1. O usuario cadastra ou atualiza o equipamento.
2. O sistema passa a guardar horimetro, km e status operacional.
3. O escritorio consulta rapidamente a situacao atual do recurso.

#### Fluxo 2. Leitura operacional

1. O usuario registra leitura manual.
2. O sistema compara com a ultima leitura.
3. Se houver inconsistencias, gera alerta.
4. O equipamento atualiza `horimetroAtual` e `kmAtual`.

#### Fluxo 3. Plano preventivo

1. O usuario cria o plano preventivo.
2. O sistema calcula a proxima previsao.
3. O plano alimenta agenda e alertas.

#### Fluxo 4. Execucao de manutencao

1. O usuario abre uma agenda ou cria manutencao direta.
2. Registra servico, leituras, pecas, custo e oficina.
3. O sistema fecha a agenda, recalcula o plano e atualiza o status do equipamento.

#### Fluxo 5. Acompanhamento diario

1. O escritorio abre o dashboard da frota.
2. Enxerga vencidos, proximos de vencer, parados e em manutencao.
3. Atua diretamente nas filas da agenda e do historico.

## ETAPA 2 — Arquitetura

### Estrutura de pastas sugerida

```text
src/
  app/
    (protected)/
      frota/
        dashboard/page.tsx
        equipamentos/page.tsx
        leituras/page.tsx
        planos/page.tsx
        agenda/page.tsx
        manutencoes/page.tsx
        alertas/page.tsx
    api/
      frota/
        dashboard/route.ts
        equipamentos/route.ts
        equipamentos/[id]/route.ts
        leituras/route.ts
        leituras/[id]/route.ts
        planos/route.ts
        planos/[id]/route.ts
        agenda/route.ts
        agenda/[id]/route.ts
        manutencoes/route.ts
        manutencoes/[id]/route.ts
        manutencoes/[id]/anexos/route.ts
        alertas/route.ts
        alertas/[id]/route.ts
        alertas/[id]/resolver/route.ts
        automacoes/recalcular/route.ts
  features/
    frota/
      dashboard/
      equipamentos/
      leituras/
      planos/
      agenda/
      manutencoes/
      alertas/
  lib/
    validators/
      frota/
        equipamento-leitura.ts
        plano-manutencao.ts
        agenda-manutencao.ts
        manutencao-executada.ts
        alerta-manutencao.ts
    utils/
      frota/
        previsao.ts
        alertas.ts
        status-equipamento.ts
  server/
    services/
      frota/
        leitura-service.ts
        plano-service.ts
        agenda-service.ts
        alerta-service.ts
        dashboard-service.ts
```

### Models Prisma introduzidos no schema inicial

- `StatusEquipamentoOperacional`
- `OrigemLeituraEquipamento`
- `CriterioControleManutencao`
- `StatusPlanoManutencao`
- `StatusAgendaManutencao`
- `PrioridadeManutencao`
- `StatusAlertaManutencao`
- `TipoAlertaManutencao`

Novos models:

- `LeituraEquipamento`
- `PlanoManutencao`
- `AgendaManutencao`
- `ManutencaoExecutada`
- `AlertaManutencao`
- `AnexoManutencao`

Extensoes no model `Equipamento`:

- `fabricante`
- `modelo`
- `dataEntrada`
- `statusOperacional`
- `horimetroAtual`
- `kmAtual`
- `periodicidadeManutencaoHoras`
- `periodicidadeManutencaoKm`
- `periodicidadeManutencaoDias`

### Rotas principais da API

#### Equipamentos

- `GET /api/frota/equipamentos`
- `POST /api/frota/equipamentos`
- `PATCH /api/frota/equipamentos/[id]`

#### Leituras

- `GET /api/frota/leituras`
- `POST /api/frota/leituras`
- `PATCH /api/frota/leituras/[id]`

#### Plano preventivo

- `GET /api/frota/planos`
- `POST /api/frota/planos`
- `PATCH /api/frota/planos/[id]`

#### Agenda

- `GET /api/frota/agenda`
- `POST /api/frota/agenda`
- `PATCH /api/frota/agenda/[id]`

#### Manutencoes executadas

- `GET /api/frota/manutencoes`
- `POST /api/frota/manutencoes`
- `PATCH /api/frota/manutencoes/[id]`
- `POST /api/frota/manutencoes/[id]/anexos`

#### Alertas

- `GET /api/frota/alertas`
- `PATCH /api/frota/alertas/[id]`
- `POST /api/frota/alertas/[id]/resolver`

#### Dashboard

- `GET /api/frota/dashboard`

#### Automacoes

- `POST /api/frota/automacoes/recalcular`

### Camada de services

#### `leitura-service.ts`

- validar consistencia de leitura
- atualizar acumulados do equipamento
- gerar alerta de leitura inconsistente
- preparar integracao com lancamentos

#### `plano-service.ts`

- calcular proxima execucao
- recalcular previsao apos manutencao
- projetar alvo por horas, km ou dias

#### `agenda-service.ts`

- gerar agenda a partir de planos
- classificar vencidas, proximas e agendadas
- controlar fila de manutencao

#### `alerta-service.ts`

- criar alertas automaticos
- consolidar prioridades
- resolver/cancelar alertas

#### `dashboard-service.ts`

- consolidar indicadores da frota
- listar proximos servicos
- contar alertas e recursos parados

### Validacoes principais

- leitura nao pode regredir horimetro ou km sem justificativa
- plano preventivo deve ter criterio e periodicidade validos
- manutencao executada deve registrar equipamento e data
- agenda concluida deve possuir manutencao executada ou justificativa
- status `CONCLUIDA` nao pode existir com alerta critico em aberto sem decisao manual
- equipamento `INATIVO` nao deve receber plano ativo novo

## ETAPA 3 — Telas do modulo

### 1. Dashboard da frota

- cards:
  - equipamentos ativos
  - em manutencao
  - parados
  - alertas ativos
  - vencidos
  - proximos de vencer
- blocos:
  - ultimas leituras
  - proximos servicos
  - agenda critica

### 2. Equipamentos

- listagem
- filtros por tipo, status e status operacional
- cadastro/edicao
- painel lateral com:
  - ultimas leituras
  - proximos planos
  - historico resumido

### 3. Leituras

- formulario rapido
- filtros por equipamento, periodo e origem
- grade historica
- badges de consistencia

### 4. Plano preventivo

- cadastro do plano
- previsao automatica
- listagem por criterio
- status do plano

### 5. Agenda de manutencao

- filtros por periodo, status, prioridade e responsavel
- lista de vencidas
- lista de proximas
- lista de agendadas

### 6. Historico de manutencoes

- tabela com custo, pecas, oficina e observacoes
- filtros por equipamento, periodo, plano e fornecedor
- acao para anexos

### 7. Alertas

- fila operacional
- filtros por prioridade e status
- acao de resolver, ler ou cancelar

## ETAPA 4 — Automacoes

### Calculo automatico da proxima manutencao

- `HORIMETRO`
  - `proximoHorimetro = ultimaLeituraHorimetro + periodicidadeValor`
- `KM`
  - `proximoKm = ultimaLeituraKm + periodicidadeValor`
- `DIAS`
  - `proximaExecucaoEm = ultimaExecucaoEm + periodicidadeValor`

### Geracao de alertas

- vencido por hora
- vencido por km
- vencido por data
- proximo do vencimento
- sem leitura recente
- equipamento parado
- leitura inconsistente

### Mudanca automatica de status

- se agenda entrar em execucao:
  - `Equipamento.statusOperacional = EM_MANUTENCAO`
- se manutencao for concluida e nao houver agenda/alerta impeditivo:
  - `Equipamento.statusOperacional = ATIVO` ou `EM_OPERACAO`
- se sem leitura por periodo acima do limite:
  - gerar alerta e opcionalmente marcar `PARADO`

### Integracao futura com lancamentos diarios

- `LancamentoDiario` ja possui `equipamentoId`
- `LeituraEquipamento.lancamentoDiarioId` prepara o vinculo futuro
- backlog da v2:
  - derivar utilizacao por equipamento
  - sugerir leitura com base na ficha
  - cruzar manutencao x producao

## Backlog por sprints

### Sprint 1 — Fundacao da frota

- aplicar schema inicial
- ampliar `Equipamento`
- criar API e tela de leituras
- criar dashboard basico da frota

### Sprint 2 — Plano preventivo

- CRUD de `PlanoManutencao`
- calculo de previsoes
- listagem por equipamento

### Sprint 3 — Agenda operacional

- CRUD de `AgendaManutencao`
- filtros operacionais
- classificacao de vencidas e proximas

### Sprint 4 — Historico de manutencoes

- CRUD de `ManutencaoExecutada`
- anexos
- custo, pecas e oficina

### Sprint 5 — Alertas e automacoes

- gerador de alertas
- servico de recalculo
- ajuste automatico de status operacional

### Sprint 6 — Integracao com lancamentos e refinamento

- vinculo de leitura com lancamentos
- dashboard consolidado
- relatórios operacionais
- endurecimento de regras e testes

## Recomendacao de primeira versao

A primeira versao deve comecar por:

1. ampliar `Equipamento`
2. criar `LeituraEquipamento`
3. construir `Dashboard da Frota`
4. depois entrar em `PlanoManutencao`

Essa ordem entrega valor rapido porque substitui primeiro a parte mais consultada da planilha: situacao atual do recurso, leitura historica e risco de manutencao.
