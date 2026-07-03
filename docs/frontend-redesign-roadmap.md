# Plano de reestruturacao do frontend BASEPRO

Este documento registra a Etapa 1 da reestruturacao visual do sistema e define um rollout seguro para evoluir a interface sem alterar regra de negocio.

## Diagnostico atual

- O sistema ja possui uma estrutura funcional em Next.js, TypeScript, Prisma e PostgreSQL/Supabase.
- A maior parte das telas esta organizada por `src/features`, com rotas protegidas em `src/app/(protected)`.
- Existe suporte a tema claro e escuro por `data-theme` no `body`, controlado por `ThemeToggle`.
- A sidebar e o layout administrativo existem, mas ainda concentram muitas decisoes visuais em CSS global.
- O arquivo `src/app/globals.css` acumula muitos estilos especificos por modulo, o que dificulta consistencia e manutencao.
- Algumas telas ja tem padroes mais modernos, principalmente dashboards, mas cadastros e formularios ainda possuem variacao visual.
- Componentes de formulario reutilizaveis ja existem para busca e multiselect, mas ainda faltam primitivas padrao para cards, estados vazios, badges, filtros e cabecalhos.

## Direcao visual

A direcao escolhida para o BASEPRO e um ERP industrial premium:

- Base escura com contraste forte e acento laranja operacional.
- Tema claro preservado com tokens equivalentes.
- Layout denso, mas legivel, adequado para uso diario em operacao.
- Elementos com bordas arredondadas, sombras discretas e hierarquia clara.
- Uso de icones Lucide para reforcar leitura rapida dos modulos.
- Animacoes discretas apenas em navegacao, cards, menus e estados interativos.

## Prioridade tecnica

1. Preservar regra de negocio, APIs e contratos existentes.
2. Criar componentes reutilizaveis antes de refatorar telas grandes.
3. Atualizar o shell administrativo primeiro, pois ele impacta todas as telas.
4. Migrar telas por grupos: dashboards, lancamentos, medicoes, cadastros e manutencao.
5. Validar build a cada etapa para evitar regressao.

## Etapas de entrega

### Etapa 1 - Auditoria e fundacao

- Documentar problemas atuais.
- Criar base inicial de layout moderno.
- Padronizar navegacao principal com icones.
- Criar header superior com breadcrumb, busca rapida e usuario logado.

### Etapa 2 - Design system operacional

- Criar componentes reutilizaveis:
  - `SectionCard`
  - `StatCard`
  - `StatusBadge`
  - `EmptyState`
  - `LoadingState`
  - `FilterBar`
  - `DataTable`
  - `ConfirmDialog`
- Reduzir estilos duplicados no CSS global.

### Etapa 3 - Dashboards

- Unificar cards e filtros.
- Padronizar tooltips, legends e cores via tokens.
- Melhorar leitura em light/dark.

### Etapa 4 - Lancamentos

- Reorganizar blocos de formulario.
- Dar destaque para ficha, operacao, apontado, faturado, horimetro/KM e romaneios.
- Reduzir cliques e melhorar fluxo de teclado.

### Etapa 5 - Medicoes

- Modernizar listagem, filtros, resumo e detalhes.
- Padronizar estados de status, PDFs e acoes principais.

### Etapa 6 - Cadastros e manutencao

- Aplicar componentes reutilizaveis.
- Padronizar formularios, tabelas e filtros.

## Regras de implementacao

- Nao alterar regras de negocio durante o redesign.
- Nao mudar payloads de API sem necessidade.
- Nao substituir telas inteiras de uma vez quando houver risco operacional.
- Todo componente novo deve respeitar `data-theme="dark"` e `data-theme="light"`.
- Evitar cor fixa em componentes; usar tokens CSS.
- Rodar `npx tsc --noEmit` e `npm run build` antes de subir cada etapa.

