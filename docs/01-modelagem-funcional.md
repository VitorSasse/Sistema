# ETAPA 1 - Levantamento e Modelagem

## 1. Resumo funcional do sistema

O sistema substitui o controle operacional hoje mantido em planilhas Excel por uma aplicacao web com foco em cadastro mestre, lancamento diario de fichas, rastreabilidade completa, consolidacao operacional e medicao quinzenal.

O processo continua com digitacao manual das fichas recebidas em campo ou no escritorio. A partir desse ponto, o sistema passa a controlar validacoes, relacionamento com cliente e obra, consolidacao de producao, precificacao, auditoria e emissao de relatorio formal de medicao.

## 2. Objetivos do produto

- Centralizar os dados operacionais em uma unica base.
- Eliminar divergencias tipicas de planilha.
- Garantir rastreabilidade de alteracoes.
- Acelerar o fechamento quinzenal.
- Reduzir lancamentos sem obra, sem preco e com duplicidade.
- Preparar a base para evolucao futura com importacao, app mobile e BI.

## 3. Modulos do MVP

- Autenticacao e controle de acesso
- Dashboard operacional
- Cadastros mestres
- Lancamento diario de fichas
- Consulta e historico
- Tabela de precos por cliente e obra
- Medicao quinzenal
- Relatorio PDF
- Auditoria e historico de alteracoes

## 4. Regras de negocio organizadas

### 4.1 Regras de cadastro

- Cliente pode estar `ATIVO` ou `INATIVO`.
- Obra pertence a um cliente.
- Obra so pode receber lancamento se estiver `ATIVA` e `liberada_para_lancamento = true`.
- Equipamento possui tipo de recurso e pode ficar indisponivel por baixa ou inativacao.
- Colaborador pode ser operador, motorista ou outra funcao operacional.
- Servico define forma de medicao e unidade de faturamento permitida.
- Preco deve ser versionavel por combinacao operacional e vigencia.

### 4.2 Regras de lancamento diario

- Cada linha representa um apontamento operacional unitario e rastreavel.
- Um mesmo recurso pode ter varios lancamentos no mesmo dia, desde que em obras distintas ou servicos distintos.
- O sistema deve permitir ficha sem obra, mas marcar como inconsistente e bloquear medicao.
- Ficha duplicada precisa ser sinalizada; a decisao de bloquear ou permitir depende do mesmo cliente, obra, data e recurso.
- Lancamento sem preco configurado fica `PENDENTE_PRECO` e nao entra automaticamente em medicao.
- Unidade informada deve ser compativel com o servico.
- Recurso, colaborador, cliente e obra inativos bloqueiam novo lancamento.
- O sistema deve registrar origem do lancamento, inicialmente `MANUAL`.

### 4.3 Regras de historico e auditoria

- Nenhum ajuste apaga o registro anterior para fins de rastreabilidade.
- Alteracoes relevantes devem gerar historico com campo alterado, valor anterior, valor novo, motivo e usuario.
- Exclusao logica de lancamentos deve registrar quem excluiu, quando e motivo.
- Acoes sensiveis devem constar em logs de auditoria.

### 4.4 Regras de medicao

- Medicao usa apenas lancamentos validos e nao medidos.
- O fechamento pode ser quinzenal, mensal ou avulso, mas o MVP prioriza quinzenal.
- Uma medicao pode ser filtrada por cliente e obra.
- Cada item de medicao deve copiar os dados essenciais do lancamento no momento do fechamento para preservar historico financeiro.
- Itens medidos ficam travados contra reutilizacao em outra medicao.
- A medicao possui status: `EM_ELABORACAO`, `ENVIADA`, `APROVADA`, `CANCELADA`.
- Cancelamento de medicao deve liberar os lancamentos apenas se houver permissao adequada e justificativa.

### 4.5 Regras financeiras

- Preco e identificado por cliente, obra, servico, unidade e opcionalmente material e equipamento.
- Na ausencia de preco especifico por equipamento, pode ser usado preco generico do servico para a obra, se configurado.
- O valor do item da medicao e calculado no fechamento, preservando snapshot do preco unitario.
- Alteracoes futuras na tabela de precos nao devem mudar medicoes ja fechadas.

## 5. Estados principais

### 5.1 Lancamento diario

- `RASCUNHO`: uso opcional futuro.
- `VALIDO`: apto para medicao.
- `PENDENTE_OBRA`: sem obra vinculada.
- `PENDENTE_PRECO`: sem preco encontrado.
- `DIVERGENTE`: inconsistencia operacional.
- `MEDIDO`: vinculado a medicao fechada.
- `CANCELADO`: excluido logicamente.

### 5.2 Medicao

- `EM_ELABORACAO`
- `ENVIADA`
- `APROVADA`
- `CANCELADA`

## 6. Modelagem do banco de dados

### 6.1 Entidades centrais

- `usuarios`
- `roles`
- `usuario_roles`
- `clientes`
- `obras`
- `equipamentos`
- `materiais`
- `servicos`
- `colaboradores`
- `precos_cliente_obra`
- `fichas`
- `lancamentos_diarios`
- `medicoes`
- `medicao_itens`
- `historico_alteracoes`
- `logs_auditoria`
- `anexos`

### 6.2 Decisoes de modelagem

- `fichas` foi separada de `lancamentos_diarios` para permitir uma ficha com varias linhas, anexos e trilha propria.
- `lancamentos_diarios` representa o item operacional detalhado que entra em consolidacao e medicao.
- `medicao_itens` armazena snapshot textual e financeiro para proteger o historico de alteracoes posteriores nos cadastros.
- `precos_cliente_obra` recebe vigencia para suportar reajustes futuros sem reescrever historico.
- `historico_alteracoes` concentra diff de campos relevantes de entidades criticas.
- `logs_auditoria` captura eventos de autenticacao, fechamento, cancelamento, exportacao e operacoes sensiveis.

## 7. Diagrama textual de entidades e relacionamentos

```text
usuarios 1---N fichas
usuarios 1---N lancamentos_diarios (criado_por / atualizado_por)
usuarios N---N roles (via usuario_roles)

clientes 1---N obras
clientes 1---N fichas
clientes 1---N lancamentos_diarios
clientes 1---N medicoes

obras 1---N fichas
obras 1---N lancamentos_diarios
obras 1---N medicoes

fichas 1---N lancamentos_diarios
fichas 1---N anexos

servicos 1---N lancamentos_diarios
servicos 1---N precos_cliente_obra

materiais 1---N lancamentos_diarios
materiais 1---N precos_cliente_obra

equipamentos 1---N lancamentos_diarios
equipamentos 1---N precos_cliente_obra

colaboradores 1---N lancamentos_diarios

precos_cliente_obra N---1 clientes
precos_cliente_obra N---1 obras
precos_cliente_obra N---1 servicos
precos_cliente_obra N---0 materiais
precos_cliente_obra N---0 equipamentos

medicoes 1---N medicao_itens
medicao_itens N---1 lancamentos_diarios

historico_alteracoes N---1 usuarios
logs_auditoria N---1 usuarios
```

## 8. Principais fluxos do usuario

### 8.1 Fluxo de cadastro mestre

1. Usuario administrativo cria ou atualiza cliente.
2. Usuario vincula obras ao cliente.
3. Usuario cadastra equipamentos, servicos, materiais e colaboradores.
4. Usuario define tabela de precos por cliente e obra.

### 8.2 Fluxo de lancamento diario

1. Operador administrativo seleciona a data.
2. Informa numero da ficha e dados principais.
3. Adiciona uma ou mais linhas de lancamento para a mesma ficha.
4. Sistema valida duplicidade, status dos cadastros e disponibilidade de preco.
5. Sistema grava ficha e itens, registra auditoria e exibe status visual.

### 8.3 Fluxo de consulta e correcao

1. Usuario filtra por ficha, periodo, obra, cliente ou recurso.
2. Abre detalhes do lancamento.
3. Altera campos permitidos e informa motivo.
4. Sistema grava alteracao, historico e log de auditoria.

### 8.4 Fluxo de medicao quinzenal

1. Gestor informa periodo inicial e final.
2. Filtra cliente e obra.
3. Sistema busca lancamentos elegiveis.
4. Usuario revisa inconsistencias e exclui itens que nao devem entrar.
5. Sistema calcula precos e totaliza valores.
6. Usuario fecha a medicao.
7. Itens ficam travados, status do lancamento muda para `MEDIDO`.
8. Sistema gera relatorio PDF.

### 8.5 Fluxo de cancelamento de medicao

1. Usuario com permissao elevada abre a medicao.
2. Informa motivo do cancelamento.
3. Sistema registra auditoria e desfaz o travamento dos lancamentos, se permitido pela politica.

## 9. Indicadores do dashboard

- Total de lancamentos no periodo
- Fichas com divergencia
- Fichas sem obra
- Lancamentos sem preco
- Horas por maquina
- Horas por caminhao
- Medicoes em aberto
- Valor previsto por periodo

## 10. Decisoes de escala

- IDs tecnicos em UUID para integracao futura.
- Campos de status em enum.
- Soft delete apenas em entidades operacionais criticas.
- Auditoria orientada a evento desde o MVP.
- Separacao entre dado operacional (`lancamentos_diarios`) e dado faturado (`medicao_itens`).
