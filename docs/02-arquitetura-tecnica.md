# ETAPA 2 - Arquitetura Tecnica

## 1. Stack definida

### 1.1 Escolha principal

- Frontend e backend: Next.js 15 com App Router
- Linguagem: TypeScript
- Banco: PostgreSQL
- ORM: Prisma
- Autenticacao: Auth.js com strategy de credenciais
- Validacao: Zod
- Formularios: React Hook Form
- UI: Tailwind CSS + shadcn/ui como base operacional
- PDF: `@react-pdf/renderer` no MVP
- Testes: Vitest para unidade e Playwright para fluxo critico

### 1.2 Motivo da escolha

- Next.js acelera o MVP sem separar dois projetos.
- App Router permite combinar paginas de escritorio, acoes de servidor e APIs.
- Prisma reduz custo de manutencao da camada de dados.
- PostgreSQL oferece consistencia, indexes e evolucao futura para BI.
- Auth.js atende autenticacao local agora e pode crescer depois.
- React PDF permite gerar relatorio formal com layout controlado no servidor.

### 1.3 Quando migrar para NestJS

Migrar para NestJS faz sentido se o sistema passar a exigir:

- integracao pesada com terceiros
- filas e workers separados
- API publica multi-consumidor
- modulos muito grandes com squads diferentes

Para o MVP, o custo adicional nao se paga.

## 2. Arquitetura logica

```text
src/
  app/                 -> rotas web e endpoints HTTP
  components/          -> componentes reutilizaveis
  features/            -> modulos por dominio da UI
  lib/                 -> utilitarios, auth, prisma, zod, formatadores
  server/
    repositories/      -> acesso a dados
    services/          -> regras de negocio
    policies/          -> autorizacao
    audit/             -> logs e historico
    pdf/               -> templates de medicao
  types/               -> tipos compartilhados
```

Decisao: separar `features` e `server` desde o inicio evita acoplamento direto entre pagina e banco.

## 3. Estrutura de pastas do projeto

```text
.
|-- docs
|   |-- 01-modelagem-funcional.md
|   `-- 02-arquitetura-tecnica.md
|-- prisma
|   |-- schema.prisma
|   `-- seed.ts
|-- public
|-- src
|   |-- app
|   |   |-- (auth)
|   |   |   `-- login/page.tsx
|   |   |-- (protected)
|   |   |   |-- dashboard/page.tsx
|   |   |   |-- clientes/page.tsx
|   |   |   |-- obras/page.tsx
|   |   |   |-- equipamentos/page.tsx
|   |   |   |-- materiais/page.tsx
|   |   |   |-- servicos/page.tsx
|   |   |   |-- colaboradores/page.tsx
|   |   |   |-- precos/page.tsx
|   |   |   |-- fichas/page.tsx
|   |   |   |-- lancamentos/page.tsx
|   |   |   |-- historico/page.tsx
|   |   |   `-- medicoes/page.tsx
|   |   |-- api
|   |   |   |-- auth/[...nextauth]/route.ts
|   |   |   |-- clientes/route.ts
|   |   |   |-- obras/route.ts
|   |   |   |-- equipamentos/route.ts
|   |   |   |-- materiais/route.ts
|   |   |   |-- servicos/route.ts
|   |   |   |-- colaboradores/route.ts
|   |   |   |-- precos/route.ts
|   |   |   |-- fichas/route.ts
|   |   |   |-- lancamentos/route.ts
|   |   |   |-- medicoes/route.ts
|   |   |   `-- relatorios/medicoes/[id]/route.ts
|   |   |-- globals.css
|   |   |-- layout.tsx
|   |   `-- page.tsx
|   |-- components
|   |   |-- layout
|   |   |-- tables
|   |   |-- forms
|   |   |-- badges
|   |   `-- charts
|   |-- features
|   |   |-- dashboard
|   |   |-- clientes
|   |   |-- obras
|   |   |-- equipamentos
|   |   |-- materiais
|   |   |-- servicos
|   |   |-- colaboradores
|   |   |-- precos
|   |   |-- fichas
|   |   |-- lancamentos
|   |   `-- medicoes
|   |-- lib
|   |   |-- auth.ts
|   |   |-- prisma.ts
|   |   |-- db-errors.ts
|   |   |-- permissions.ts
|   |   |-- validations
|   |   `-- utils
|   |-- server
|   |   |-- audit
|   |   |-- policies
|   |   |-- repositories
|   |   |-- services
|   |   `-- pdf
|   `-- types
|-- package.json
|-- tsconfig.json
`-- next.config.mjs
```

## 4. Definicao do schema Prisma

O schema inicial foi desenhado para:

- suportar ficha com multiplos itens
- manter snapshot de medicao
- separar historico de alteracoes e log de auditoria
- permitir evolucao para tabela de precos com vigencia

Arquivo real: `prisma/schema.prisma`

## 5. Perfis de acesso

### 5.1 Perfis do MVP

- `ADMIN`
- `GESTOR`
- `OPERACIONAL`
- `FINANCEIRO`
- `CONSULTA`

### 5.2 Matriz resumida

| Acao | ADMIN | GESTOR | OPERACIONAL | FINANCEIRO | CONSULTA |
|---|---|---|---|---|---|
| Gerir usuarios | Sim | Nao | Nao | Nao | Nao |
| CRUD cadastros mestres | Sim | Sim | Parcial | Nao | Nao |
| Lancar fichas | Sim | Sim | Sim | Nao | Nao |
| Corrigir lancamentos | Sim | Sim | Sim, com motivo | Nao | Nao |
| Fechar medicao | Sim | Sim | Nao | Sim | Nao |
| Cancelar medicao | Sim | Sim, com politica | Nao | Nao | Nao |
| Exportar PDF | Sim | Sim | Sim | Sim | Sim |
| Ver auditoria | Sim | Sim | Nao | Nao | Nao |

## 6. Definicao das rotas da API

### 6.1 Autenticacao

- `POST /api/auth/signin`
- `POST /api/auth/signout`
- `GET /api/auth/session`

### 6.2 Cadastros mestres

- `GET /api/clientes`
- `POST /api/clientes`
- `GET /api/clientes/:id`
- `PATCH /api/clientes/:id`
- `DELETE /api/clientes/:id`

- `GET /api/obras`
- `POST /api/obras`
- `GET /api/obras/:id`
- `PATCH /api/obras/:id`
- `DELETE /api/obras/:id`

- `GET /api/equipamentos`
- `POST /api/equipamentos`
- `GET /api/equipamentos/:id`
- `PATCH /api/equipamentos/:id`
- `DELETE /api/equipamentos/:id`

- `GET /api/materiais`
- `POST /api/materiais`
- `GET /api/materiais/:id`
- `PATCH /api/materiais/:id`
- `DELETE /api/materiais/:id`

- `GET /api/servicos`
- `POST /api/servicos`
- `GET /api/servicos/:id`
- `PATCH /api/servicos/:id`
- `DELETE /api/servicos/:id`

- `GET /api/colaboradores`
- `POST /api/colaboradores`
- `GET /api/colaboradores/:id`
- `PATCH /api/colaboradores/:id`
- `DELETE /api/colaboradores/:id`

- `GET /api/precos`
- `POST /api/precos`
- `GET /api/precos/:id`
- `PATCH /api/precos/:id`
- `DELETE /api/precos/:id`

### 6.3 Operacao

- `GET /api/fichas`
- `POST /api/fichas`
- `GET /api/fichas/:id`
- `PATCH /api/fichas/:id`
- `POST /api/fichas/:id/anexos`

- `GET /api/lancamentos`
- `POST /api/lancamentos`
- `GET /api/lancamentos/:id`
- `PATCH /api/lancamentos/:id`
- `DELETE /api/lancamentos/:id`
- `POST /api/lancamentos/:id/duplicar`
- `POST /api/lancamentos/validar`

### 6.4 Medicao e relatorios

- `GET /api/medicoes`
- `POST /api/medicoes/previsualizar`
- `POST /api/medicoes`
- `GET /api/medicoes/:id`
- `PATCH /api/medicoes/:id/status`
- `POST /api/medicoes/:id/cancelar`
- `GET /api/relatorios/medicoes/:id/pdf`

### 6.5 Apoio

- `GET /api/dashboard/resumo`
- `GET /api/historico-alteracoes`
- `GET /api/logs-auditoria`
- `GET /api/opcoes/autocomplete`

## 7. Padrao dos servicos de dominio

### 7.1 Servicos previstos

- `ClienteService`
- `ObraService`
- `EquipamentoService`
- `ColaboradorService`
- `PrecoService`
- `FichaService`
- `LancamentoService`
- `MedicaoService`
- `AuditoriaService`
- `RelatorioMedicaoService`

### 7.2 Regra de orquestracao

- Route handlers recebem request e autenticacao.
- Schemas Zod validam entrada.
- Services aplicam regra de negocio e autorizacao.
- Repositories encapsulam Prisma.
- Auditoria roda como dependencia de servico e nao como detalhe de rota.

## 8. Estrategia de permissao

- Autorizacao baseada em role com matriz declarativa em `src/lib/permissions.ts`.
- Regras de negocio criticas tambem validam contexto.
- Exemplo: `OPERACIONAL` pode editar lancamento, mas nao pode cancelar medicao.

## 9. Estrategia de dados e indices

### 9.1 Indices obrigatorios

- `clientes.codigo`
- `obras(cliente_id, codigo)`
- `equipamentos.codigo_recurso`
- `equipamentos.placa_ou_tag`
- `fichas(numero, data)`
- `lancamentos_diarios(data, cliente_id, obra_id)`
- `lancamentos_diarios(ficha_id)`
- `lancamentos_diarios(equipamento_id, data)`
- `precos_cliente_obra(cliente_id, obra_id, servico_id, vigencia_inicial)`
- `medicoes(cliente_id, obra_id, periodo_inicial, periodo_final)`

### 9.2 Restricoes

- Unicidade de codigo por entidade mestre.
- Unicidade condicional da ficha por numero e data.
- Constraint de compatibilidade basica entre unidade do lancamento e unidade do servico via aplicacao no MVP.

## 10. Estrategia de UI

- Layout desktop-first com menu lateral fixo.
- Barra superior com busca rapida e filtros contextuais.
- Tabelas com paginação, filtros salvos e destaque visual de pendencias.
- Formulario de lancamento otimizado para teclado.
- Modais apenas para edicoes curtas; detalhes complexos abrem em pagina dedicada.

## 11. Primeiras telas a desenvolver

1. Login
2. Dashboard
3. Lista de clientes
4. Lista de obras
5. Lista de equipamentos
6. Lista de servicos
7. Lista de colaboradores
8. Lista de precos
9. Lancamento diario de fichas
10. Consulta de historico
11. Fechamento de medicao
12. Visualizacao e exportacao do PDF de medicao

## 12. Roadmap do MVP em sprints

### Sprint 1 - Fundacao tecnica

- Criar projeto Next.js com App Router
- Configurar Prisma, PostgreSQL e Auth.js
- Criar layout protegido
- Implementar `usuarios`, `roles` e login
- Seed inicial com admin

### Sprint 2 - Cadastros mestres

- CRUD de clientes, obras, equipamentos, materiais, servicos e colaboradores
- Listagens com filtro e status
- Validacoes base de ativo/inativo

### Sprint 3 - Precos e lancamento diario

- CRUD de tabela de precos
- Criacao de ficha e itens de lancamento
- Validacao de duplicidade, obra inativa e preco ausente
- Tela com duplicar linha e historico do dia

### Sprint 4 - Historico e dashboard

- Dashboard operacional
- Consulta avancada de lancamentos
- Historico de alteracoes
- Logs de auditoria

### Sprint 5 - Medicao quinzenal

- Preview de medicao
- Fechamento e travamento dos itens
- Status da medicao
- Calculo de valor total

### Sprint 6 - Relatorio e endurecimento

- Geracao de PDF
- Testes criticos
- Tratamento de erros
- Ajustes de performance e UX

## 13. Primeira versao recomendada

Implementar primeiro o eixo `cadastro -> preco -> lancamento -> medicao`.

Sem isso, dashboard e relatorios ficam cosmeticos. O valor do sistema nasce quando o apontamento entra com consistencia e pode ser fechado sem retrabalho.
