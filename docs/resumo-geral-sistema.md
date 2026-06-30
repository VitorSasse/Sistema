# Resumo geral do sistema BASEPRO

Atualizado em: 30/06/2026

Este documento resume como o sistema foi construido ate aqui, quais sao seus
modulos, de onde os dados saem, quais regras principais foram implementadas e
quais parametros operacionais precisam ser respeitados.

O objetivo e servir como documento de referencia para desenvolvimento,
manutencao, auditoria e continuidade do projeto.

---

## 1. Visao geral

O sistema e uma plataforma operacional para empresas de terraplenagem, com foco
em controlar a operacao desde o apontamento diario ate medicao, faturamento,
frota, manutencao, compras e dashboards gerenciais.

Nome visual adotado:

- BASEPRO
- Slogan: "Sua operacao pesada, agora sob controle."

Objetivo central:

- registrar fichas/lancamentos diarios;
- controlar equipamentos, horimetro e KM;
- organizar agenda operacional;
- gerar medicoes;
- acompanhar faturamento;
- acompanhar custos e compras;
- acompanhar manutencao preventiva;
- gerar relatorios/PDFs;
- dar leitura gerencial via dashboards.

---

## 2. Stack tecnica

Tecnologias principais:

- Next.js 15 com App Router.
- React 19.
- TypeScript.
- Prisma ORM.
- PostgreSQL/Supabase.
- NextAuth/Auth.js com login por credenciais.
- Zod para validacao de dados.
- React Hook Form em partes de formulario.
- Recharts para graficos.
- React PDF para relatorios em PDF.
- Tailwind CSS instalado, mas grande parte da UI usa CSS global em
  `src/app/globals.css`.

Comandos principais:

```bash
npm install
npm run dev
npm run build
npm run start
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

O build atual executa:

```bash
prisma generate && next build
```

Arquivos de ambiente:

- `.env`
- `.env.example`
- `.env.supabase.example`
- `.env.local-postgres.backup`

Variavel mais importante:

- `DATABASE_URL`

---

## 3. Estrutura principal de pastas

```text
src/app
  Rotas, paginas protegidas e APIs do App Router.

src/app/(protected)
  Paginas internas que exigem sessao autenticada.

src/app/api
  Endpoints REST internos usados pelo frontend.

src/features
  Modulos de interface por area de negocio.

src/components
  Componentes reutilizaveis.

src/lib
  Auth, Prisma, validadores, utilitarios, formatadores e regras auxiliares.

src/server
  Servicos de dominio, sincronizacoes e geracao de PDFs.

prisma
  Schema do banco, migrations e seed.

docs
  Documentacao tecnica e operacional.

scripts
  Scripts auxiliares, incluindo restore/backup.

public
  Assets publicos, logos e imagens.

tmp
  Arquivos temporarios/importacoes/resumos locais.
```

---

## 4. Autenticacao e permissoes

A autenticacao usa NextAuth/Auth.js com provider de credenciais.

Arquivo principal:

- `src/lib/auth.ts`

Fluxo:

1. Usuario informa e-mail e senha.
2. O sistema normaliza o e-mail para minusculo.
3. Busca o usuario na tabela `Usuario`.
4. Verifica se o usuario esta `ATIVO`.
5. Compara a senha com `bcrypt`.
6. Registra `ultimoLoginEm`.
7. Coloca no JWT os papeis do usuario.

Roles existentes:

- `ADMIN`
- `GESTOR`
- `OPERACIONAL`
- `FINANCEIRO`
- `CONSULTA`

Permissoes mapeadas:

- `users.manage`
- `masters.manage`
- `lancamentos.create`
- `lancamentos.update`
- `medicoes.close`
- `medicoes.cancel`
- `auditoria.read`

Arquivo principal de permissoes:

- `src/lib/permissions.ts`

Regras gerais:

- `ADMIN`: acesso total.
- `GESTOR`: cadastros, lancamentos, medicoes e auditoria.
- `OPERACIONAL`: cria e edita lancamentos.
- `FINANCEIRO`: fechamento de medicoes.
- `CONSULTA`: sem permissoes administrativas.

As paginas protegidas usam:

- `requireSession`
- `requirePermission`
- `validateApiPermission`

---

## 5. Navegacao e layout interno

Arquivo principal:

- `src/app/(protected)/layout.tsx`

O menu lateral e agrupado em:

- Dashboards
- Cadastros
- Operacao
- Financeiro
- Frota
- Seguranca, quando o usuario tem permissao

Itens principais atuais:

Dashboards:

- Dashboard de faturamento
- Dashboard de custos
- Dashboard de producao
- Dashboard da frota
- Dashboard executivo

Cadastros:

- Clientes
- Obras
- Equipamentos
- Materiais
- Servicos
- Colaboradores

Operacao:

- Agenda de programacao
- Lancamentos
- Historico
- Medicoes

Financeiro:

- Fornecedores
- Plano de contas
- Centros de custo
- Catalogo de produtos e servicos
- Ordem de compra

Frota:

- Painel de manutencao
- Leituras de horimetro/KM
- Plano preventivo

Seguranca:

- Usuarios e acessos
- Logs de edicao de lancamentos

A logo BASEPRO no menu leva para `/inicio`.

---

## 6. Modelagem do banco de dados

Banco via Prisma:

- `prisma/schema.prisma`

Principais enums:

- `StatusCadastro`: `ATIVO`, `INATIVO`
- `StatusOrdemCompra`: estados da ordem de compra
- `TipoCatalogoCompra`: produto ou servico
- `TipoPlanoConta`: receita/despesa
- `TipoRecurso`: `CAMINHAO`, `MAQUINA`, `CARRETA`, `EQUIPAMENTO_APOIO`, `OUTRO`
- `FuncaoColaborador`: motorista, operador etc.
- `TipoMedicao`: unica, semanal, quinzenal, mensal
- `StatusMedicao`
- `StatusLancamento`
- `OrigemLancamento`
- `RoleCodigo`
- `TipoAnexo`
- `StatusEquipamentoOperacional`
- `TipoControleEquipamento`: `HORIMETRO` ou `KM`
- `UnidadeApontada`: carga, hora, m3, diaria, servico
- `UnidadeFaturada`: carga, hora, m3, diaria, servico
- `OrigemLeituraEquipamento`
- `CriterioControleManutencao`
- `StatusAgendaProgramacao`
- `TurnoAgendaProgramacao`
- `StatusAlertaManutencao`

Principais models:

- `Usuario`
- `Role`
- `UsuarioRole`
- `Cliente`
- `Obra`
- `Fornecedor`
- `CentroCustoCompra`
- `CatalogoCompra`
- `PlanoConta`
- `Equipamento`
- `OrdemCompra`
- `OrdemCompraItem`
- `OrdemCompraParcela`
- `Material`
- `Servico`
- `Colaborador`
- `PrecoClienteObra`
- `Ficha`
- `FichaRomaneio`
- `LancamentoDiario`
- `LancamentoRomaneio`
- `LeituraEquipamento`
- `PlanoManutencao`
- `AgendaManutencao`
- `AgendaProgramacao`
- `ManutencaoExecutada`
- `AlertaManutencao`
- `AnexoManutencao`
- `Medicao`
- `MedicaoItem`
- `HistoricoAlteracao`
- `Anexo`
- `LogAuditoria`

---

## 7. Cadastros mestres

### Clientes

Modulo:

- `src/features/clientes`
- API: `src/app/api/clientes`

Cliente possui:

- codigo
- nome
- tipo de pessoa
- documento
- contato
- telefone/e-mail
- endereco
- status

Regras:

- Cliente pode ter obras, fichas, lancamentos, precos e medicoes.
- Exclusao so deve ocorrer quando nao houver vinculos relevantes.

### Obras

Modulo:

- `src/features/obras`
- API: `src/app/api/obras`

Obra possui:

- codigo unico
- cliente vinculado
- nome
- contrato
- localidade/cidade/UF
- datas
- status
- flag `liberadaParaLancamento`

Regras:

- Obra pode ser bloqueada para lancamentos.
- Obra e referencia central em lancamentos, medicoes, agenda e dashboards.

### Equipamentos

Modulo:

- `src/features/equipamentos`
- API: `src/app/api/equipamentos`

Campos importantes:

- tipo de recurso
- tipo de controle: `HORIMETRO` ou `KM`
- descricao
- placa/tag
- complementar
- fabricante/modelo
- status operacional
- horimetro atual
- KM atual
- periodicidade de manutencao
- capacidade m3
- unidade capacidade

Regras importantes:

- `placaOuTag` e unico.
- `complementar = true` identifica equipamento sem operador/motorista fixo.
- Equipamentos complementares podem ser analisados separadamente.
- Equipamentos de apoio devem evitar poluir agenda e KPIs principais.
- Para medicoes por m3, o campo `capacidadeM3` precisa estar configurado.

### Materiais

Modulo:

- `src/features/materiais`
- API: `src/app/api/materiais`

Usado em lancamentos e medicoes quando o servico exige material.

### Servicos

Modulo:

- `src/features/servicos`
- API: `src/app/api/servicos`

Campos importantes:

- codigo
- tipo de servico
- categoria
- servico tecnico
- faturamento fechado
- valor fechado padrao
- forma de medicao
- unidade de apontamento
- unidade de faturamento
- exige material
- ativo para medicao

Regras:

- Servicos tecnicos podem ser usados para engenharia/topografia/apoio.
- Servico com faturamento fechado usa valor fixo, nao hora/carga/diaria.
- Equipamento pode ser opcional em servico de engenharia.

### Colaboradores

Modulo:

- `src/features/colaboradores`
- API: `src/app/api/colaboradores`

Usado em lancamentos como operador/motorista.

### Fornecedores

Modulo:

- `src/features/fornecedores`
- API: `src/app/api/fornecedores`

Usado em ordens de compra.

### Centros de custo

Modulo:

- `src/features/centros-custo`
- API: `src/app/api/centros-custo`

Usado para ordens de compra e analises financeiras.

### Catalogo de compras

Modulo:

- `src/features/catalogo-compras`
- API: `src/app/api/catalogo-compras`

Usado para cadastrar produtos e servicos compraveis.

Campos importantes:

- codigo
- tipo: produto/servico
- descricao
- unidade padrao
- valor padrao
- status

Regra:

- O valor padrao e sugerido na ordem de compra, mas pode ser alterado.
- O valor gravado na OC fica historico; alterar o cadastro depois nao altera OCs antigas.

### Plano de contas

Modulo:

- `src/features/plano-contas`
- API: `src/app/api/plano-contas`

Usado principalmente em ordens de compra e dashboard de custos.

Regras:

- Classificacao e gerada/organizada para facilitar agrupamento.
- Plano usado em OC deve ser do tipo `DESPESA`.
- Categorias usadas hoje incluem manutencao, combustivel/translado e outras despesas.

---

## 8. Lancamentos diarios e fichas

Modulos:

- `src/features/lancamentos`
- `src/features/historico`

APIs:

- `src/app/api/lancamentos`
- `src/app/api/lancamentos/[id]`
- `src/app/api/historico-alteracoes`

Modelos centrais:

- `Ficha`
- `LancamentoDiario`
- `LancamentoRomaneio`
- `LeituraEquipamento`
- `HistoricoAlteracao`

Campos principais do lancamento:

- data
- numero da ficha
- cliente
- obra
- servico
- material
- equipamento
- colaborador
- quantidade apontada
- unidade apontada
- quantidade faturada
- unidade faturada
- horimetro informado
- KM informado
- observacao
- status de validacao

Status de lancamento:

- `VALIDO`
- `NAO_MEDIDO`
- `PENDENTE_OBRA`
- `PENDENTE_PRECO`
- `DIVERGENTE`
- `MEDIDO`
- `CANCELADO`

Regras importantes:

- Lancamento cancelado ou com `deletedAt` nao deve entrar nos calculos principais.
- Lancamento medido fica vinculado a uma medicao.
- Ao cancelar/excluir medicao, lancamentos medidos devem ser liberados.
- Edicoes relevantes geram historico/auditoria.
- Horimetro e KM podem ser ajustados mesmo quando ha leitura menor, mas o acumulado do equipamento usa a maior leitura encontrada.

### Sincronizacao de leitura

Servico:

- `src/server/services/frota/leitura-sync.ts`

Regra:

- Ao criar/editar lancamento com horimetro/KM, o sistema cria/atualiza uma
  `LeituraEquipamento`.
- Se o lancamento deixa de ter leitura, remove a leitura vinculada.
- O equipamento recalcula `horimetroAtual` e `kmAtual` usando o maior valor de
  leitura registrado para ele.

Isso evita que um apontamento menor derrube o horimetro/KM atual do cadastro.

### Romaneios

Servico:

- `src/server/services/lancamentos/romaneios.ts`

Regras atuais:

- Romaneio fica vinculado ao lancamento, nao apenas a ficha.
- Cada romaneio e cadastrado por numero.
- O sistema permite informar se o lancamento possui romaneio.
- Quando possui romaneio, a quantidade de romaneios deve bater com a quantidade de cargas.
- O preenchimento funciona por entrada sequencial: digita o numero e confirma para pre-gravar na tela; ao salvar o lancamento, grava no banco.
- Quando o lancamento nao possui romaneio, ha confirmacao antes de salvar para reduzir erro operacional.

---

## 9. Agenda de programacao

Modulo:

- `src/features/programacao`

APIs:

- `src/app/api/programacao`
- `src/app/api/programacao/[id]`
- `src/app/api/programacao/dashboard`

Modelo:

- `AgendaProgramacao`

Status principais:

- programado
- em execucao/operando
- finalizado
- disponivel
- sem frente
- manutencao
- falta
- ferias
- feriado
- chuva

Regras importantes:

- A agenda mostra equipamentos por dia/turno.
- A selecao em grupo permite marcar varios dias.
- Status `FERIADO` foi adicionado para leitura operacional.
- Equipamentos complementares podem aparecer na agenda, mas podem ser ignorados em certos graficos.
- Equipamentos de apoio nao devem poluir agenda e KPIs principais quando usados apenas para engenharia/servicos tecnicos.
- A dashboard de distribuicao operacional considera dias uteis e status por equipamento.

---

## 10. Medicoes

Modulo:

- `src/features/medicoes`

APIs:

- `src/app/api/medicoes`
- `src/app/api/medicoes/[id]`
- `src/app/api/medicoes/previsualizar`
- `src/app/api/medicoes/[id]/status`
- `src/app/api/medicoes/[id]/pdf`
- `src/app/api/medicoes/[id]/itens/[itemId]`
- `src/app/api/medicoes/[id]/lancamentos`
- `src/app/api/medicoes/[id]/anexos`

Servicos:

- `src/server/services/medicoes/service.ts`
- `src/server/services/medicoes/queries.ts`

PDF:

- `src/server/pdf/medicao-pdf.tsx`
- `src/server/pdf/romaneios-relatorio-pdf.tsx`

Modelos:

- `Medicao`
- `MedicaoItem`
- `Anexo`

### Geracao de medicao

Regra principal:

- A medicao busca lancamentos elegiveis do cliente/obra/periodo.
- Considera lancamentos com status `NAO_MEDIDO` ou `VALIDO`.
- Ignora lancamentos deletados.
- Ignora lancamentos ja vinculados a outra medicao ativa.
- Ao gerar, cria `MedicaoItem` e marca os lancamentos como `MEDIDO`.

### Numeracao

Regra:

- Codigo segue `MED-XXX`.
- O sistema busca o menor numero disponivel.
- Se uma medicao for excluida/cancelada e liberar o numero, o numero pode ser reaproveitado conforme a regra implementada.

### Periodo

Regra:

- Filtro de periodo considera a data do ultimo item/lancamento vinculado, conforme ajustes feitos na consulta.
- Periodo da medicao pode ser alterado enquanto ela ainda puder ser editada.
- Se a medicao ja foi concluida em algum momento (`fechadoEm`), alterar periodo e bloqueado.
- Novo periodo precisa abranger as datas dos itens ja vinculados.

### Edicao

Regra atual:

- Medicoes podem ser editadas enquanto o status permite, incluindo fases ate envio para faturamento, conforme regras de `canEditMedicaoContent`.
- Numero de pedido e numero de nota fiscal podem ser preenchidos em etapas posteriores antes do fechamento definitivo.

### Cancelamento

Regra:

- Cancelar medicao exige justificativa.
- Ao cancelar:
  - itens sao excluidos logicamente;
  - lancamentos vinculados voltam de `MEDIDO` para `NAO_MEDIDO`;
  - medicao cancelada nao entra no faturamento.

### Exclusao

Regra:

- Exclusao logica marca `deletedAt`.
- Tambem libera lancamentos vinculados quando necessario.

### Desconto

Regra:

- Medicao possui campo de desconto.
- PDFs detalhado e resumido devem exibir valor bruto, desconto e valor final com desconto.

### PDF de medicao

Formato de nome solicitado:

- `MED-129_CURACAO_08MAI_a_22MAI`

Regra:

- Nome deve conter numero da medicao, obra e periodo.

### Relatorio de romaneios

Regra:

- Gerado dentro dos detalhes da medicao.
- Deve seguir cabecalho padrao dos demais relatorios.
- Formato retrato.
- Agrupado por data/ficha/lancamento/romaneio.
- Resumo final por carga/material, por exemplo:
  - Areia suja: X romaneios
  - Bota fora: Y romaneios

### Simulacao de medicao

Regra:

- Existe uma aba de simulacao.
- Ela permite calcular sem comprometer lancamentos reais.
- Simulacao nao deve marcar lancamento como medido.

---

## 11. Faturamento

Dashboards:

- `src/features/dashboard/faturamento-dashboard.tsx`
- `src/features/dashboard/faturamento-mensal-dashboard.tsx`

APIs:

- `src/app/api/dashboard/faturamento`
- `src/app/api/dashboard/faturamento/mensal`

Regras:

- Faturado: medicoes concluidas no periodo.
- A faturar: medicoes ainda nao concluidas no periodo.
- Medicao cancelada nao contabiliza.
- Filtros precisam bater com a regra usada na aba de medicoes.
- Dashboard mensal pode considerar faturado e a faturar.
- Media mensal deve respeitar meses selecionados, para evitar queda artificial quando um mes atual ainda esta incompleto.

Cards usados:

- faturado no periodo;
- medicoes do periodo;
- ticket medio por cliente;
- outros cards conforme versao da tela.

---

## 12. Dashboard de custos

Modulo:

- `src/features/dashboard/custos-dashboard.tsx`

API:

- `src/app/api/dashboard/custos`

Fonte principal:

- `OrdemCompra`
- `OrdemCompraItem`
- `Fornecedor`
- `CentroCustoCompra`
- `PlanoConta`
- `Equipamento`, quando centro de custo esta vinculado a equipamento
- `LancamentoDiario`, apenas como referencia operacional para custo por hora/carga

Regras de classificacao:

- Tenta classificar custos por:
  - categoria do plano de conta;
  - nome do plano;
  - descricao do item;
  - descricao do catalogo.

Categorias gerenciais:

- manutencao
- combustivel
- operacional
- administrativo
- nao informado

Exemplos de palavras usadas na classificacao:

- combustivel: diesel, S10, S500, Arla, abastecimento;
- manutencao: manutencao, mecanica, oficina, peca, pneu, filtro, oleo, revisao;
- administrativo: documento, taxa, licenca, despesas gerais.

Indicadores:

- custo total;
- manutencao;
- combustivel;
- media por equipamento;
- equipamento mais caro;
- maior fornecedor;
- centro principal;
- itens analisados.

Graficos:

- custo por categoria;
- evolucao mensal;
- ranking por equipamento;
- manutencao x combustivel;
- fornecedores;
- centros de custo;
- pareto.

Pontos de atencao:

- OC sem equipamento entra como custo sem equipamento vinculado.
- Custo por hora depende de haver lancamentos operacionais no periodo.
- Itens sem plano/categoria entram como nao informado.

---

## 13. Dashboard da frota

Modulos:

- `src/features/frota`
- `src/app/api/frota/dashboard`
- `src/app/api/frota/dashboard/mensal`

Objetivo:

- Mostrar valor medido por equipamento.
- Mostrar faturamento mensal por equipamento.
- Comparar mais de um equipamento.
- Analisar media mensal por equipamento.

Regra importante:

- A dashboard da frota voltou a considerar a competencia/data do lancamento,
  nao o periodo da medicao, para evitar contar dias fora do mes filtrado.

---

## 14. Dashboard executivo

Modulo:

- `src/features/dashboard/executivo-dashboard.tsx`

API:

- `src/app/api/dashboard/executivo`

Subcategorias:

- equipamentos fixos;
- equipamentos complementares.

Objetivo:

- Utilizacao real da frota.
- Disponibilidade mecanica.
- Pareto operacional.
- Impacto financeiro da indisponibilidade.
- Heatmap operacional.
- Obras com maior hora apontada.
- Recorrencia mecanica.

Regras principais:

- Equipamentos fixos: `complementar = false`.
- Equipamentos complementares: `complementar = true`.
- Equipamentos de apoio devem ser evitados em KPIs principais quando nao fazem parte da frota produtiva.
- Carga de caminhao pode equivaler a 45 minutos em determinadas leituras executivas:
  - `CARGA_EQUIVALENT_HOURS = 0.75`
- Status de agenda sao convertidos em grupos produtivos, ociosos, tecnicos, administrativos e externos.
- O impacto financeiro usa referencia diaria/hora baseada em valor medido ou preco/hora quando disponivel.

Pontos de atencao:

- Nao misturar inferencia de agenda com producao real sem deixar claro.
- Perdas operacionais dependem da agenda, nao dos lancamentos.
- Producao real deve preferir lancamentos.

---

## 15. Dashboard de producao - KM e horimetro por obra

Modulo:

- `src/features/dashboard/km-horimetro-dashboard.tsx`

API:

- `src/app/api/dashboard/km-horimetro`

Objetivo:

- Responder rapidamente: "Quanto cada equipamento produziu e em qual obra?"

Fonte:

- `LancamentoDiario`
- `Equipamento`
- `Obra`
- `Cliente`
- leituras informadas no lancamento:
  - `kmInformado`
  - `horimetroInformado`

Regra principal:

- Equipamento por KM mostra somente KM.
- Equipamento por horimetro mostra somente horas.
- Nunca converte hora em KM.
- Nunca mistura as duas unidades na mesma producao.

Calculo:

- Para KM:
  - producao = leitura atual de KM - maior leitura anterior do equipamento.
- Para horimetro:
  - producao = leitura atual de horimetro - maior leitura anterior do equipamento.
- Se a leitura atual for menor que a anterior:
  - marca inconsistencia;
  - nao soma producao.
- Se equipamento por horimetro nao tiver leitura inicial e o lancamento tiver unidade apontada em hora:
  - usa quantidade apontada como fallback.

Layout atual:

- quatro cards:
  - KM total;
  - horas totais;
  - obra com maior producao;
  - equipamento mais utilizado.
- filtros:
  - periodo;
  - cliente;
  - obra;
  - equipamento.
- tabela principal ordenavel.
- um unico grafico:
  - Producao por Equipamento.
- drawer lateral ao clicar em linha:
  - cliente;
  - obra;
  - datas dos lancamentos;
  - KM ou horas lancadas;
  - quantidade de dias trabalhados.

Cores:

- Azul: KM.
- Verde: horimetro.
- Cinza: sem producao/zero.

---

## 16. Frota e manutencao

Modulos:

- `src/features/frota/leituras`
- `src/features/frota/manutencao`
- `src/features/frota/planos`

APIs:

- `src/app/api/frota/leituras`
- `src/app/api/frota/leituras/[id]`
- `src/app/api/frota/manutencao`
- `src/app/api/frota/planos`
- `src/app/api/frota/planos/[id]`

Modelos:

- `LeituraEquipamento`
- `PlanoManutencao`
- `AgendaManutencao`
- `ManutencaoExecutada`
- `AlertaManutencao`
- `AnexoManutencao`

### Leituras

Regras:

- Leitura pode vir de lancamento diario, manutencao, importacao, ajuste ou manual.
- Tela de leituras permite editar horimetro/KM.
- O equipamento usa sempre o maior valor como leitura atual.

### Plano preventivo

Servico:

- `src/server/services/frota/plano-service.ts`

Regras:

- Plano pode controlar por:
  - horimetro;
  - KM;
  - dias.
- Proxima manutencao:
  - por dias: ultima execucao + periodicidade;
  - por horimetro: ultima leitura + periodicidade;
  - por KM: ultima leitura + periodicidade.
- Quando ha mais de um plano para o mesmo criterio, o sistema seleciona o plano mais relevante/recente.
- Planos inconsistentes perdem prioridade.

Logica de consistencia:

- proxima leitura precisa ser maior que ultima leitura;
- ultima leitura nao pode estar muito acima da leitura atual;
- considera `updatedAt`, `createdAt`, ultima execucao e leituras para desempate.

Ponto de atencao:

- Se plano antigo e plano novo coexistem, o novo precisa ter dados suficientes
  para ser identificado como mais relevante.

---

## 17. Ordem de compra

Modulo:

- `src/features/ordens-compra`

APIs:

- `src/app/api/ordens-compra`
- `src/app/api/ordens-compra/[id]`
- `src/app/api/ordens-compra/[id]/pdf`
- `src/app/api/ordens-compra/[id]/anexos`
- `src/app/api/ordens-compra/[id]/anexos/[anexoId]/arquivo`

PDF:

- `src/server/pdf/ordem-compra-pdf.tsx`

Modelos:

- `OrdemCompra`
- `OrdemCompraItem`
- `OrdemCompraParcela`

### Tipo de ordem

Regra:

- Compra de produto gera codigo `OC`.
- Compra de servico gera codigo `OS`.

### Status atuais desejados

Status operacional exibido ao usuario:

- Em aberto
- Em andamento
- Confirmada
- Cancelada

Observacao:

- No banco ainda pode haver enums mais detalhados, mas a interface foi ajustada
  para o fluxo simplificado.

### Campos principais

- numero da ordem;
- data de emissao;
- status;
- tipo da compra;
- fornecedor;
- centro de custo;
- plano de conta;
- forma de pagamento;
- parcelas;
- vencimento;
- numero da nota fiscal, opcional;
- solicitante;
- observacoes;
- anexos;
- itens.

### Itens

Campos:

- item;
- codigo;
- descricao;
- unidade;
- quantidade;
- valor unitario;
- subtotal.

Regras:

- subtotal = quantidade x valor unitario.
- Tambem e possivel informar valor total/subtotal para o sistema calcular o
  valor unitario.
- Valor padrao vem do catalogo, mas pode ser alterado na ordem.
- Valor gravado no item fica historico.

### Pagamento

Regras:

- Pagamento a vista/PIX/dinheiro/outros nao deve exigir numero de parcelas.
- Pagamento parcelado gera parcelas automaticamente.
- Parcelas ficam em tabela separada.

### Exclusao

Regras:

- Botao de excluir deve excluir realmente a ordem quando permitido.
- Ordem concluida/confirmada nao deve poder ser excluida.
- Cancelamento deve ser feito pelo status, nao pelo botao de excluir.

### Anexos

Regras:

- Permite anexar documentos, notas fiscais e fotos.
- Arquivo pode ser aberto por endpoint dedicado.
- Ajustes foram feitos para upload e visualizacao de imagem/anexo.

### PDF

Regras:

- Deve seguir modelo de compra usado pela empresa.
- Titulo corrigido para evitar `No.` incorreto.
- Usa nome do sistema BASEPRO no rodape:
  - "Documento emitido pelo sistema BASEPRO."
- Deve exibir solicitante e linha de assinatura centralizada.
- Dados de pagamento exibem parcelas e forma de pagamento sem duplicidade.

---

## 18. Relatorios e PDFs

Arquivos principais:

- `src/server/pdf/lancamentos-relatorio-pdf.tsx`
- `src/server/pdf/medicao-pdf.tsx`
- `src/server/pdf/ordem-compra-pdf.tsx`
- `src/server/pdf/romaneios-relatorio-pdf.tsx`
- `src/server/pdf/report-logo.ts`

Relatorios existentes:

- relatorio de lancamentos;
- PDF de medicao;
- PDF de ordem de compra;
- relatorio de romaneios;
- relatorios de dashboard via impressao/exportacao CSV em alguns modulos.

Padrao importante:

- Sempre que possivel reutilizar cabecalho visual existente.
- Evitar criar cabecalho diferente para cada relatorio.

---

## 19. Historico, logs e seguranca

Modulos:

- `src/features/seguranca`
- `src/features/historico`

APIs:

- `src/app/api/seguranca/logs-lancamentos`
- `src/app/api/historico-alteracoes`

Modelos:

- `HistoricoAlteracao`
- `LogAuditoria`

Objetivo:

- Consultar alteracoes feitas em lancamentos.
- Dar rastreabilidade quando valores de ficha, cliente, obra, equipamento,
  quantidade, horimetro, KM, status ou outros campos sao editados.

Tipos de alteracao:

- criacao;
- edicao;
- exclusao logica;
- mudanca de status;
- fechamento de medicao;
- cancelamento de medicao.

---

## 20. Identidade visual

Marca:

- BASEPRO

Paleta aplicada em partes do sistema:

- Laranja principal: `#F97316`
- Preto/base escura: `#0B0B0B`
- Azul escuro: `#0F2A44`
- Branco: `#FFFFFF`
- Cinza escuro: `#111827`
- Cinza claro: `#E5E7EB`

Caracteristicas:

- tema escuro predominante em areas internas;
- cards arredondados;
- botoes principais em laranja;
- azul para gestao/indicadores;
- verde para indicadores positivos;
- layouts de dashboard com visual industrial/ERP.

Arquivo principal de estilos:

- `src/app/globals.css`

Ponto de atencao:

- O arquivo `globals.css` concentra muita regra visual. Alteracoes globais
  precisam ser feitas com cuidado para nao quebrar telas legadas.

---

## 21. Backups e restore

Documentos:

- `docs/backups.md`
- `docs/restore-local.md`
- `docs/supabase-migracao.md`

Workflow:

- `.github/workflows/weekly-supabase-backup.yml`

Script:

- `scripts/restore-backup-local.ps1`

Destino de backup versionado:

- repositorio privado `VitorSasse/Backup-Sistema`

---

## 22. Endpoints principais

Cadastros:

- `/api/clientes`
- `/api/obras`
- `/api/equipamentos`
- `/api/materiais`
- `/api/servicos`
- `/api/colaboradores`
- `/api/fornecedores`
- `/api/centros-custo`
- `/api/catalogo-compras`
- `/api/plano-contas`

Operacao:

- `/api/lancamentos`
- `/api/lancamentos/[id]`
- `/api/lancamentos/relatorio`
- `/api/opcoes/operacionais`

Agenda:

- `/api/programacao`
- `/api/programacao/[id]`
- `/api/programacao/dashboard`

Medicoes:

- `/api/medicoes`
- `/api/medicoes/[id]`
- `/api/medicoes/previsualizar`
- `/api/medicoes/[id]/status`
- `/api/medicoes/[id]/pdf`
- `/api/medicoes/[id]/lancamentos`
- `/api/medicoes/[id]/anexos`

Frota:

- `/api/frota/dashboard`
- `/api/frota/dashboard/mensal`
- `/api/frota/leituras`
- `/api/frota/leituras/[id]`
- `/api/frota/manutencao`
- `/api/frota/planos`
- `/api/frota/planos/[id]`

Dashboards:

- `/api/dashboard/faturamento`
- `/api/dashboard/faturamento/mensal`
- `/api/dashboard/custos`
- `/api/dashboard/executivo`
- `/api/dashboard/km-horimetro`
- `/api/dashboard/resumo`

Financeiro:

- `/api/ordens-compra`
- `/api/ordens-compra/[id]`
- `/api/ordens-compra/[id]/pdf`
- `/api/ordens-compra/[id]/anexos`
- `/api/ordens-compra/[id]/anexos/[anexoId]/arquivo`

Seguranca:

- `/api/usuarios`
- `/api/usuarios/[id]`
- `/api/seguranca/logs-lancamentos`

---

## 23. Parametros e regras operacionais importantes

### Complementar

Campo:

- `Equipamento.complementar`

Uso:

- `false`: equipamento fixo/com operador ou motorista fixo.
- `true`: equipamento complementar/apoio/terceiro, analisado separadamente.

Impacto:

- dashboards executivos fixos ignoram complementares;
- subdashboard complementar mostra apenas complementares;
- agenda pode mostrar, mas graficos podem excluir conforme regra.

### Tipo de recurso

Valores:

- `CAMINHAO`
- `MAQUINA`
- `CARRETA`
- `EQUIPAMENTO_APOIO`
- `OUTRO`

Uso:

- agenda;
- frota;
- custos;
- medicoes;
- dashboards.

### Tipo de controle

Valores:

- `KM`
- `HORIMETRO`

Regra:

- Caminhoes/veiculos geralmente usam KM.
- Maquinas geralmente usam horimetro.
- Dashboards de producao respeitam esse cadastro.

### Capacidade m3

Campo:

- `Equipamento.capacidadeM3`

Uso:

- medicao por m3.

Regra operacional adotada:

- caminhoes convencionais devem ter capacidade cadastrada;
- AUQ6157 pode ter capacidade diferente;
- se a capacidade estiver ausente, a medicao por m3 bloqueia e informa o equipamento sem capacidade.

### Carga equivalente em horas

Parametro usado na dashboard executiva:

- 1 carga de caminhao = 0,75 hora = 45 minutos.

Uso:

- somente para estimativa executiva/operacional.
- nao altera lancamento real.

### Datas

Regras:

- Datas de input devem ser tratadas como data local para evitar salvar dia anterior.
- Para filtros:
  - inicio do dia: 00:00:00;
  - fim do dia: 23:59:59.999.

### Cancelamentos

Regra:

- Cancelar medicao exige justificativa.
- Medicao cancelada nao entra em faturamento.
- Cancelar medicao libera lancamentos.
- Ordem de compra cancelada nao deve entrar em custo operacional normal.

---

## 24. Pontos de atencao tecnica

1. `globals.css` esta grande.
   - Evitar alteracoes globais sem escopo.
   - Preferir classes por modulo.

2. Algumas regras de dashboard usam inferencia.
   - Dashboard executiva usa agenda/status.
   - Dashboard de producao usa lancamentos/leitura.
   - Dashboard de custos usa ordem de compra.
   - Nao misturar as fontes sem explicar.

3. Leitura de horimetro/KM usa maior leitura.
   - Isso evita que erro de apontamento derrube leitura atual.
   - Mas dashboards de producao precisam tratar leitura menor como inconsistencia.

4. Medicoes e lancamentos possuem vinculo sensivel.
   - Ao medir, lancamento muda status.
   - Ao cancelar/excluir medicao, lancamento precisa liberar.

5. Ordens de compra dependem de cadastros auxiliares.
   - Fornecedor.
   - Centro de custo.
   - Plano de conta.
   - Catalogo de produto/servico.

6. PDFs sao criticos para operacao.
   - Alterar layout exige conferir cabecalho, nome do arquivo e totais.

7. Dashboards precisam respeitar periodo.
   - Faturamento: regra da medicao.
   - Frota/producao: regra do lancamento.
   - Custos: regra da data de emissao da OC.

8. Importacoes e ajustes manuais devem ser validados.
   - Conferir duplicidade.
   - Conferir centro de custo.
   - Conferir plano de conta.
   - Conferir status.

---

## 25. Estado atual de desenvolvimento

Ultimas alteracoes relevantes no codigo local:

- Nova dashboard de producao em `/dashboard/km-horimetro`.
- Menu alterado para exibir "Dashboard de producao".
- Tela simplificada conforme pedido:
  - 4 cards;
  - filtros de periodo, cliente, obra e equipamento;
  - uma tabela principal ordenavel;
  - um grafico unico;
  - drawer lateral de detalhe.

Validacao recente:

- `npm run build` executado com sucesso apos a alteracao da dashboard de producao.

Observacao:

- No momento da criacao deste documento, havia alteracoes locais nao commitadas
  relacionadas a essa dashboard e ao CSS.

---

## 26. Recomendo manter como padrao daqui para frente

Para novas funcionalidades:

1. Criar API propria em `src/app/api/...`.
2. Criar tela propria em `src/features/...`.
3. Reutilizar componentes existentes.
4. Evitar mexer no banco se a informacao ja existir.
5. Nao mudar fluxo existente sem necessidade.
6. Rodar `npm run build`.
7. Conferir dashboards contra telas operacionais antes de considerar certo.
8. Documentar a fonte do dado:
   - lancamento;
   - medicao;
   - agenda;
   - ordem de compra;
   - manutencao.
9. Separar claramente:
   - dado real;
   - dado inferido;
   - dado financeiro;
   - dado operacional.
10. Evitar calculos duplicados no frontend quando puder agregar no backend.

---

## 27. Mapa rapido por pergunta operacional

"Quanto foi faturado?"

- Dashboard de faturamento.
- Fonte: medicoes.

"Quanto tenho a faturar?"

- Dashboard de faturamento.
- Fonte: medicoes nao concluidas.

"Quanto cada equipamento produziu por obra?"

- Dashboard de producao.
- Fonte: lancamentos diarios e leituras.

"Quanto cada equipamento faturou mensalmente?"

- Dashboard da frota mensal.
- Fonte: medicoes/lancamentos medidos.

"Onde estou gastando mais?"

- Dashboard de custos.
- Fonte: ordens de compra.

"Qual equipamento esta perto de revisao?"

- Painel de manutencao/plano preventivo.
- Fonte: planos de manutencao e leituras atuais.

"Qual equipamento ficou parado ou em manutencao?"

- Dashboard executivo.
- Fonte: agenda/status.

"Quais lancamentos foram alterados?"

- Logs de seguranca.
- Fonte: historico de alteracoes/logs.

---

## 28. Conclusao

O sistema hoje esta estruturado como um ERP operacional de terraplenagem, com
base forte em quatro fontes de verdade:

1. Lancamentos diarios.
2. Medicoes.
3. Ordens de compra.
4. Agenda/manutencao da frota.

As dashboards sao camadas de leitura sobre essas fontes. Para evitar divergencia,
cada dashboard deve sempre deixar claro qual fonte esta usando e qual periodo
esta considerando.

O ponto mais importante de manutencao daqui para frente e preservar a separacao:

- producao real vem de lancamentos;
- faturamento vem de medicoes;
- custos vem de ordens de compra;
- disponibilidade/perdas vem da agenda;
- manutencao vem de planos e leituras.

