# Passo 3 - Contratos comuns de entrada e saida do Nucleo

## Objetivo

Criar a primeira fronteira tecnica neutra do Nucleo de Engenharia Operacional, sem mover o motor atual, sem alterar formulas e sem alterar comportamento visivel.

Fluxo implementado:

```text
Orcamento
  -> Adaptador de Orcamento
  -> EntradaNucleoEngenharia
  -> Conversao temporaria para cost-engine atual
  -> cost-engine atual
  -> ResultadoNucleoEngenharia
```

## Arquivos criados

- `src/lib/engineering-core/contexts.ts`
- `src/lib/engineering-core/contracts.ts`
- `src/lib/engineering-core/legacy-cost-engine-bridge.ts`
- `src/lib/engineering-core/adapters/orcamento-adapter.ts`
- `src/lib/engineering-core/index.ts`
- `src/lib/engineering-core/engineering-core.test.ts`
- `docs/nucleo-engenharia-operacional-passo-3-contratos.md`

## Contratos neutros criados

### ContextoDeCalculo

Contextos oficiais:

- `ORCAMENTO`
- `PLANEJAMENTO_EXECUTIVO`
- `EXECUCAO`
- `SIMULACAO`

Nesta etapa, somente `ORCAMENTO` e usado como contexto produtivo. Os demais foram criados apenas como linguagem comum futura.

### EntradaNucleoEngenharia

Contrato neutro de entrada do Nucleo.

Contem:

- contexto de calculo;
- identificacao tecnica opcional;
- metadados tecnicos neutros;
- unidades operacionais;
- recursos operacionais.

Nao contem:

- cliente;
- obra;
- proposta;
- revisao;
- status;
- validade;
- PDF;
- preco de venda;
- forma de apresentacao comercial;
- item referencial.

### UnidadeOperacionalNucleoInput

Representa a unidade tecnica de analise, equivalente conceitual a uma frente, mas sem dependencia do modulo de Orcamentos.

Campos principais:

- id tecnico;
- nome;
- quantidade;
- unidade;
- produtividade;
- prazo estimado/teorico/adotado;
- origem do prazo;
- modo de custo;
- custo manual;
- recursos.

### RecursoOperacionalNucleoInput

Representa o recurso tecnico usado pela unidade operacional.

Campos principais:

- identificacao tecnica;
- nome/descricao tecnica;
- categoria;
- quantidade de recursos;
- quantidade operacional;
- unidade operacional;
- origem da quantidade;
- base economica;
- custo unitario;
- capacidade;
- unidade da capacidade;
- distancia;
- horas;
- viagens;
- cargas;
- meses;
- jornada;
- metadados de origem/heranca/personalizacao.

### ResultadoNucleoEngenharia

Contrato neutro de saida.

Contem:

- consolidado tecnico/economico operacional;
- resultados por unidade operacional;
- resultados por recurso;
- grupos de unidade;
- memoria de calculo;
- avisos tecnicos.

Nao contem:

- preco de venda;
- margem comercial;
- impostos;
- markup;
- ajuste comercial;
- valor da proposta;
- aceite;
- PDF.

## Adaptador de Orcamento

Arquivo:

`src/lib/engineering-core/adapters/orcamento-adapter.ts`

Funcao principal:

`adaptarOrcamentoParaEntradaNucleo`

Responsabilidade:

- receber estruturas atuais do modulo de Orcamentos;
- selecionar apenas frentes operacionais;
- selecionar apenas itens do tipo `RECURSO`;
- converter os dados tecnicos para `EntradaNucleoEngenharia`;
- excluir itens comerciais, itens referenciais, PDF, proposta e informacoes comerciais;
- nao calcular custo;
- nao calcular viagens;
- nao calcular prazo;
- nao formar preco.

Principio aplicado:

> O adaptador traduz. O Nucleo interpreta e calcula.

## Conversao de entrada

Arquivo:

`src/lib/engineering-core/legacy-cost-engine-bridge.ts`

Funcao:

`converterEntradaNucleoParaCostEngine`

Estrategia temporaria escolhida:

> Contrato neutro convertido temporariamente para o input legado do cost-engine.

Motivo:

- menor risco;
- preserva o motor atual;
- preserva formulas;
- permite comparar resultado antigo e neutro;
- nao exige migrar consumidores existentes neste passo.

## Conversao de saida

Funcao:

`converterResultadoCostEngineParaNucleo`

Responsabilidade:

- receber `CostEngineResultado`;
- produzir `ResultadoNucleoEngenharia`;
- preservar custo, prazo, produtividade, viagens, km, custo por viagem, memoria e avisos;
- remover qualquer dependencia semantica de Orcamentos na saida.

## Funcao de execucao controlada

Funcao:

`executarNucleoComMotorAtual`

Fluxo:

```text
EntradaNucleoEngenharia
  -> converterEntradaNucleoParaCostEngine
  -> calcularMotorCustos
  -> converterResultadoCostEngineParaNucleo
```

Essa funcao nao substitui o fluxo produtivo atual. Ela existe para provar a equivalencia e preparar a migracao gradual.

## Tipos neutros x tipos legados

### Novos e neutros

- `ContextoDeCalculo`
- `EntradaNucleoEngenharia`
- `UnidadeOperacionalNucleoInput`
- `RecursoOperacionalNucleoInput`
- `ResultadoNucleoEngenharia`
- `ResultadoUnidadeOperacionalNucleo`
- `ResultadoRecursoOperacionalNucleo`
- `MemoriaCalculoNucleo`
- `AvisoNucleoEngenharia`

### Legados e compativeis

- `CostEngineFrenteInput`
- `CostEngineRecursoInput`
- `CostEngineResultado`
- `CostEngineMemoriaRecurso`
- `OrcamentoInput`
- `OrcamentoFrente`
- `OrcamentoItem`
- `NormalizedOperationalResource`

Esses tipos nao foram removidos nem renomeados.

## Equivalencia comprovada

Teste criado:

`src/lib/engineering-core/engineering-core.test.ts`

Casos cobertos:

1. Escavadeira por dia.
2. Recurso por hora.
3. Caminhao por km.
4. Frente em m2 com caminhao em m3.
5. Recurso personalizado.
6. Recurso herdado.
7. Custo manual sem recursos.
8. Orcamento misto.
9. Item referencial fora do contrato neutro.
10. L.Flex - Frente 1 - baseline orcado de aterro compactado.
11. Contextos oficiais aceitos sem regra nova.

Comparacoes realizadas:

- custo total;
- custo por unidade/frente;
- custo por recurso;
- quantidade operacional;
- unidade operacional;
- prazo;
- produtividade;
- viagens;
- quilometros;
- custo por viagem;
- memoria de calculo;
- avisos.

Resultado:

```text
Fluxo atual = Fluxo neutro
```

Nenhuma diferenca foi aceita.

## Limitacoes temporarias

- O motor continua fisicamente em `src/lib/orcamentos/cost-engine.ts`.
- O contrato neutro ainda usa ponte para o input legado.
- Os consumidores produtivos ainda nao foram migrados.
- O adaptador implementado e apenas do contexto `ORCAMENTO`.
- `PLANEJAMENTO_EXECUTIVO`, `EXECUCAO` e `SIMULACAO` ainda nao possuem adaptadores.
- A camada economica/comercial continua fora do Nucleo.

## Nao alterado neste passo

- formulas do motor;
- `economic-engine`;
- `pricing`;
- snapshots comerciais;
- proposta;
- PDF;
- status;
- banco;
- migrations;
- interface.

## Validacoes executadas

- `npx vitest run src/lib/engineering-core/engineering-core.test.ts`
- `npx vitest run src/lib/orcamentos/cost-engine.test.ts src/lib/orcamentos/operational-resource-domain.test.ts src/lib/validators/orcamento.test.ts src/server/services/orcamentos/pricing.test.ts`
- `npx tsc --noEmit`

As validacoes completas finais devem ser registradas no relatorio de fechamento do Passo 3.

## Proximos passos recomendados

1. Homologar os contratos neutros.
2. Criar testes de equivalencia adicionais se surgirem novos casos reais.
3. No passo futuro, integrar o adaptador de Orcamento em uma borda compartilhada, sem alterar formulas.
4. Somente depois avaliar extracao fisica gradual com re-exports.

## Confirmacoes

- Nao houve migration.
- Nao houve mudanca visual.
- Nao houve alteracao de comportamento.
- Nao houve alteracao de proposta ou PDF.
- Nao houve remocao de tipos legados.
- Nao deve haver commit ou push antes da homologacao.
