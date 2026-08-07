# Passo 2.1 - Decisoes arquiteturais do Nucleo

## 1. Resumo executivo

O Passo 2 concluiu que a BasePro deve **avancar com ressalvas** na formalizacao tecnica do Nucleo de Engenharia Operacional.

Este documento transforma essas ressalvas em decisoes arquiteturais homologaveis para orientar o Passo 3.

Decisao central:

> O Passo 3 deve criar contratos neutros de entrada e saida, sem mover o motor, sem alterar formulas e sem alterar comportamento.

O Nucleo deve calcular engenharia operacional. Os modulos devem contextualizar o problema, adaptar seus dados ao contrato neutro e persistir seus proprios snapshots.

## 2. Ressalvas e decisoes

| Ressalva | Origem no Passo 2 | Risco | Decisao necessaria | Impacto no Passo 3 | Condicao de resolucao | Classificacao |
| --- | --- | --- | --- | --- | --- | --- |
| O motor ainda esta fisicamente em `src/lib/orcamentos`. | Inventario tecnico e riscos. | Confundir propriedade arquitetural e dificultar reuso. | Manter no local atual por enquanto e criar contratos neutros antes da extracao. | Nao mover arquivos no Passo 3. | Contratos neutros aprovados e wrappers equivalentes testados. | RISCO CONTROLAVEL |
| Tipos atuais carregam nomes de orcamento. | Analise dos tipos atuais. | Vazamento de `OrcamentoFrente`/`OrcamentoItem` para o Nucleo. | Criar tipos neutros e adaptador de orcamento. | Passo 3 deve impedir que tipos Prisma entrem no contrato neutro. | Contratos sem dependencia de Prisma ou `OrcamentoInput`. | BLOQUEANTE |
| Frontend monta input tecnico diretamente. | Acoplamentos no frontend. | Divergencia entre calculo da tela e backend. | Criar adaptador compartilhado ou contrato equivalente testado. | Passo 3 deve criar teste de equivalencia entre input atual e contrato neutro. | Mesmo resultado para os casos de regressao. | RISCO CONTROLAVEL |
| Validator normaliza regra tecnica. | Acoplamentos no validator. | Duplicacao de regra de engenharia em validacao de payload. | Separar validacao de contrato e resolucao tecnica em etapa futura. | Passo 3 nao deve ampliar essa duplicacao. | Normalizacao tecnica passa a depender do contrato comum. | NAO BLOQUEANTE |
| `economic-engine` mistura custo e preco. | Fronteira custo/preco. | Usar regra comercial como se fosse engenharia operacional. | Formalizar camadas separadas. | Passo 3 deve excluir preco, margem, impostos e proposta do contrato tecnico. | Entrada/saida do Nucleo sem campos comerciais. | BLOQUEANTE |
| Snapshots comerciais existem e sao imutaveis. | Persistencia e snapshots. | Recalcular ou sobrescrever revisoes emitidas. | Nucleo nao deve usar snapshot comercial como input. | Passo 3 deve tratar snapshot tecnico como metadado de origem, nao fonte de proposta. | Regras de proposta/PDF intocadas. | BLOQUEANTE |
| `OrcamentoItem` representa muitas naturezas. | Inventario e persistencia. | Contrato tecnico ficar poluido por servico, PDF, proposta e preco. | Adaptador deve extrair apenas recurso tecnico. | Passo 3 deve mapear somente campos tecnicos necessarios. | `EngineeringResourceInput` sem campos comerciais. | BLOQUEANTE |
| Casos reais ainda precisam virar baseline formal do contrato. | Casos de nao regressao. | Perder valores homologados. | Congelar casos minimos antes de mudar codigo. | Passo 3 deve incluir testes de equivalencia. | Todos os casos passam sem alterar resultado. | BLOQUEANTE |
| Estrutura fisica futura ainda nao existe. | Estrutura fisica futura recomendada. | Criar diretorios cedo demais e aumentar escopo. | Homologar extracao gradual. | Passo 3 pode criar estrutura minima apenas se necessaria aos contratos. | Imports antigos preservados. | DECISAO FUTURA |

## 3. Fronteira oficial do Nucleo

| Responsabilidade | Pertence ao Nucleo? | Pertence ao modulo? | Justificativa | Observacao |
| --- | --- | --- | --- | --- |
| Normalizacao tecnica | Sim | Nao | Unidade, quantidade e capacidade sao regras reutilizaveis. | Deve sair de validadores especificos com o tempo. |
| Recursos operacionais | Sim | Parcialmente | O recurso e tecnico; sua origem/cadastro pertence ao modulo. | O modulo adapta o recurso ao contrato neutro. |
| Unidades | Sim | Nao | Compatibilidade e interpretacao sao transversais. | Deve existir como dominio comum. |
| Capacidades | Sim | Nao | Capacidade afeta viagens e custo tecnico. | Pode vir de snapshot do cadastro mestre. |
| Produtividade | Sim | Nao | E criterio de engenharia operacional. | Contexto altera significado, nao formula. |
| Prazo | Sim | Parcialmente | Calculo e tecnico; datas/status sao do modulo. | Prazo realizado pertence ao contexto Execucao. |
| Transporte | Sim | Nao | Viagens, km e capacidade sao logistica operacional. | Nao depende de proposta. |
| Viagens | Sim | Nao | Resultado tecnico de transporte. | Deve constar na memoria. |
| Custo operacional | Sim | Parcialmente | Custo direto tecnico pertence ao Nucleo. | Custos indiretos/margem ficam fora. |
| Memoria de calculo | Sim | Parcialmente | Explicacao da formula pertence ao Nucleo. | Apresentacao/PDF e do modulo. |
| Avisos tecnicos | Sim | Parcialmente | Pendente/inconsistente e saida tecnica. | Mensagem visual e do modulo. |
| Compatibilidade operacional | Sim | Nao | Regra tecnica reutilizavel. | Ex.: unidade operacional x capacidade. |
| Cliente | Nao | Sim | Contexto comercial/operacional do modulo. | Adaptador nao deve enviar ao Nucleo. |
| Obra | Nao | Sim | Identificacao de contexto, nao formula. | Pode ser metadado fora do contrato tecnico. |
| Proposta | Nao | Sim | Documento externo. | Nunca fonte do Nucleo. |
| Revisao | Nao | Sim | Controle comercial/historico. | Snapshots preservados pelo modulo. |
| PDF | Nao | Sim | Apresentacao documental. | Deve consumir snapshot, nao calcular engenharia. |
| Aceite | Nao | Sim | Fluxo comercial. | Fora do Nucleo. |
| Status | Nao | Sim | Maquina de estados do modulo. | Nao altera formulas. |
| Validade | Nao | Sim | Regra comercial/documental. | Fora do Nucleo. |
| Preco comercial | Nao | Sim | Resultado de formacao comercial. | Nucleo calcula custo. |
| Faturamento/recebimento | Nao | Sim | Resultado financeiro/realizado. | Pode comparar com custo, nao compor o Nucleo tecnico. |
| Permissoes | Nao | Sim | Controle de acesso. | Fora do contrato. |

## 4. Fronteira custo x preco x resultado

### A. Engenharia Operacional

Responsavel por:

- recursos;
- quantidade;
- produtividade;
- prazo;
- consumo;
- custo operacional;
- custo unitario operacional;
- transporte e viagens;
- memoria de calculo.

Regra: **o Nucleo calcula custo**.

### B. Engenharia Economica / Camada Comercial

Responsavel por:

- custos indiretos;
- impostos;
- markup;
- margem;
- preco sugerido;
- preco de venda;
- ajuste comercial;
- condicoes comerciais.

Regra: **o modulo comercial forma preco**.

### C. Resultado

Responsavel por:

- receita realizada;
- custo realizado;
- lucro;
- margem real;
- comparacao previsto x realizado.

Regra: **o modulo de Resultado compara receita e custo**.

## 5. Entrada tecnica minima

### A. Contexto

Valores oficiais:

- `ORCAMENTO`;
- `PLANEJAMENTO_EXECUTIVO`;
- `EXECUCAO`;
- `SIMULACAO`.

O contexto nao altera formulas. Ele altera origem, obrigatoriedade, interpretacao e uso dos resultados.

### B. Unidade de analise

Dados minimos:

- identificador tecnico;
- nome tecnico opcional;
- quantidade;
- unidade;
- produtividade planejada, real ou simulada;
- prazo previsto, adotado, realizado ou simulado;
- modo de custo;
- custo manual/fallback, quando permitido pelo contexto.

### C. Recursos

Dados minimos:

- identificacao tecnica;
- categoria;
- descricao tecnica;
- quantidade de recursos;
- quantidade operacional;
- unidade operacional;
- origem da quantidade: herdada ou personalizada;
- base economica;
- valor de custo;
- capacidade;
- unidade da capacidade;
- parametros tecnicos necessarios.

### D. Parametros operacionais

Parametros aceitos conforme base economica:

- distancia;
- horas;
- dias;
- viagens;
- cargas;
- meses;
- jornada;
- dias trabalhados no mes;
- capacidade por viagem;
- demais parametros ja usados pelas formulas atuais.

### E. Metadados tecnicos

Metadados permitidos:

- origem do dado;
- indicacao herdado/personalizado;
- snapshot tecnico utilizado;
- avisos relevantes;
- identificadores tecnicos para rastreabilidade.

Campos exclusivamente comerciais nao entram no contrato.

## 6. Saida comum

### Resultado tecnico

- quantidade operacional resolvida;
- unidade operacional resolvida;
- produtividade;
- prazo;
- viagens;
- quilometros;
- cargas;
- horas;
- meses;
- indicadores logisticos.

### Resultado economico operacional

- custo total;
- custo por recurso;
- custo por frente/unidade de analise;
- custo por unidade;
- custo por viagem;
- custo direto consolidado.

### Memoria de calculo

- formula aplicada;
- entradas usadas;
- resultado por etapa;
- rastreabilidade da origem;
- observacoes tecnicas.

### Avisos e validacoes

- recurso pendente;
- unidade incompativel;
- parametro ausente;
- quantidade invalida;
- capacidade invalida;
- impossibilidade de calculo tecnico.

Nao entram na saida comum:

- preco de venda;
- proposta;
- margem comercial;
- imposto;
- ajuste comercial;
- PDF.

## 7. Tipos proibidos no contrato neutro

| Tipo/campo | Por que nao pertence ao Nucleo | Adaptador responsavel | Informacao tecnica extraivel |
| --- | --- | --- | --- |
| `Orcamento` | Entidade de modulo com cliente, obra, status e valores comerciais. | Orcamento -> Nucleo | Lista de frentes e recursos. |
| `OrcamentoFrente` | Modelo Prisma com cenario, status e persistencia. | Orcamento -> Nucleo | Quantidade, unidade, produtividade, prazo, custo manual. |
| `OrcamentoItem` | Mistura recurso, item comercial, PDF, preco e fornecedor. | Orcamento -> Nucleo | Recurso operacional e parametros tecnicos. |
| `OrcamentoCenario` | Estrutura de estudo interno do orcamento. | Orcamento -> Nucleo | Escopo de frentes a analisar. |
| `OrcamentoPropostaComercial` | Documento comercial externo. | Nenhum adaptador tecnico direto | Nenhuma fonte primaria tecnica. |
| Snapshot comercial | Preserva revisao emitida e apresentacao comercial. | Modulo de Orcamentos | Apenas referencia historica, nao input do Nucleo. |
| Status | Fluxo do modulo. | Modulo | Nenhum calculo tecnico. |
| Cliente/obra | Contexto comercial/operacional. | Modulo | Pode aparecer como metadado externo, nao formula. |
| Validade | Regra documental/comercial. | Modulo | Nenhuma. |
| Forma de apresentacao comercial | Define PDF/proposta. | Modulo de Orcamentos | Nenhuma regra tecnica. |
| Preco unitario referencial | Valor comercial para futura medicao. | Camada comercial | Nao compoe custo operacional. |
| Dados de PDF | Apresentacao. | PDF/Modulo | Nenhuma. |

## 8. Papel dos adaptadores

Cada modulo converte seu proprio contexto para o contrato neutro do Nucleo.

Adaptadores previstos:

- Orcamento -> Nucleo;
- Planejamento Executivo -> Nucleo;
- Execucao -> Nucleo;
- Simulacao -> Nucleo.

Responsabilidades:

- selecionar dados relevantes;
- converter tipos especificos;
- preservar origem;
- fornecer snapshots tecnicos;
- nao recalcular regras de engenharia;
- nao duplicar formulas;
- remover dados comerciais antes de chamar o Nucleo.

Principio:

> O adaptador traduz. O Nucleo interpreta e calcula.

## 9. Estrategia de extracao

Estrategia homologada: **extracao gradual com compatibilidade e re-exports**.

Fluxo oficial:

1. Criar contratos neutros.
2. Criar adaptador de Orcamento.
3. Manter funcoes atuais funcionando.
4. Migrar consumidores progressivamente.
5. Preservar imports antigos temporariamente.
6. Eliminar acoplamentos somente apos testes.
7. Remover compatibilidade antiga apenas em etapa futura.

Extracao fisica imediata fica rejeitada para o Passo 3 por risco de regressao.

## 10. Estrutura fisica inicial

Estrutura futura minima recomendada:

```text
src/lib/engineering-core/
  contracts/
  units/
  resources/
  planning/
  transport/
  costing/
  memory/
  adapters/
```

Responsabilidades:

- `contracts`: tipos neutros de entrada, saida e contexto.
- `units`: normalizacao e compatibilidade de unidades.
- `resources`: dominio do recurso operacional.
- `planning`: prazo, produtividade e planejamento.
- `transport`: viagens, km, capacidade e demanda logistica.
- `costing`: custo operacional.
- `memory`: memoria de calculo.
- `adapters`: conversores de modulos consumidores.

Para o Passo 3, criar somente o necessario para contratos e, se autorizado, adaptador inicial.

O que permanece temporariamente em `src/lib/orcamentos`:

- `cost-engine.ts`;
- `operational-resource-domain.ts`;
- `economic-engine.ts`;
- `resource-inheritance.ts`;
- testes atuais.

Re-exports poderao ser usados temporariamente apos a extracao fisica futura, nao necessariamente no Passo 3.

## 11. Persistencia e snapshots

Decisoes:

- O Nucleo nao depende de Prisma.
- O Nucleo nao busca dados no banco.
- O Nucleo recebe contratos completos.
- Cada modulo persiste seu proprio contexto.
- O Nucleo deve ser deterministico.
- Derivados persistidos sao snapshots/cache, nao fonte primaria.
- Revisoes historicas preservam memoria de calculo.
- Novos calculos nao sobrescrevem silenciosamente baselines antigas.

Fluxo oficial:

```text
Modulo
  -> monta contrato
  -> chama Nucleo
  -> recebe resultado
  -> persiste seu snapshot
```

## 12. Contextos de calculo

| Contexto | Origem dos dados | Obrigatoriedade | Uso do resultado | Formula muda? |
| --- | --- | --- | --- | --- |
| ORCAMENTO | Dados previstos | Premissas previstas suficientes | Estimar custo/prazo/preco-base | Nao |
| PLANEJAMENTO_EXECUTIVO | Estrategia e sequencia planejada | Recursos e restricoes planejadas | Definir estrategia operacional | Nao |
| EXECUCAO | Fatos realizados | Apontamentos, consumos, horas, viagens | Medir custo/produtividade real | Nao |
| SIMULACAO | Hipoteses | Dados hipoteticos suficientes | Comparar alternativas | Nao |

Principio homologado:

> As formulas permanecem comuns. O contexto altera origem, obrigatoriedade, interpretacao e uso do resultado.

## 13. Casos de nao regressao

| Caso | Entrada | Resultado esperado | Formula | Teste existente | Teste faltante | Tolerancia |
| --- | --- | --- | --- | --- | --- | --- |
| Escavadeira por dia | 1 recurso, R$/dia, prazo utilizado | custo = qtd recursos x valor/dia x prazo | `qtd * custo * prazo` | `cost-engine.test.ts` | Equivalencia do contrato neutro | R$ 0,01 |
| Recurso por hora | recurso R$/h, prazo e jornada | custo por horas totais | `qtd * custoHora * horas` | `cost-engine.test.ts` | Equivalencia do contrato neutro | R$ 0,01 |
| Caminhao por km | volume, capacidade, distancia, custo/km | viagens arredondadas e custo total | `ceil(volume/capacidade) * km * custoKm` | `cost-engine.test.ts` | Fixture com adaptador | R$ 0,01 |
| Capacidade por viagem | unidade operacional compativel | viagem calculada ou pendente | `quantidade/capacidade` | `cost-engine.test.ts`, `orcamento.test.ts` | Contrato neutro de unidade | 0,01 viagem teorica |
| Frente m2 com recurso m3 | quantidade operacional personalizada | usa m3 personalizada, nao m2 da frente | `quantidadeOperacional/capacidade` | `cost-engine.test.ts`, `orcamento.test.ts` | Adaptador preservando unidade personalizada | R$ 0,01 |
| Recurso personalizado | quantidade/unidade customizada | nao herda futuras mudancas da frente | origem personalizada | `cost-engine.test.ts`, `operational-resource-domain.test.ts` | Snapshot tecnico neutro | Sem alteracao |
| Recurso herdado | cadastro mestre com atributos | herda capacidade/unidade/base | heranca do snapshot | `resource-inheritance.test.ts` | Adaptador sem cadastro mestre direto | Sem alteracao |
| Custo manual sem recursos | frente sem recurso valido | usa custo manual | fallback manual | `cost-engine.test.ts`, `pricing.test.ts` | Equivalencia do contrato neutro | R$ 0,01 |
| Orcamento misto | frente comercial + operacional | comercial nao entra no motor tecnico | filtro por natureza | `pricing.test.ts` | Garantir que contrato recebe apenas tecnico | R$ 0,01 |
| Item referencial | preco unitario sem quantidade fechada | nao soma no valor global | regra comercial fora do Nucleo | `pricing.test.ts`, `orcamento-proposta.test.ts` | Garantir exclusao do contrato tecnico | Sem alteracao |
| Salvar/reabrir/editar | persistencia completa | nao perde parametros/memoria | snapshot/cache do modulo | `service.sprint04.test.ts` | Reabrir com contrato neutro | Sem alteracao |
| L.Flex - Frente 1 | caso piloto real | baseline futura de execucao | formulas atuais | Ainda nao existe | Criar fixture antes de ativar Execucao | A definir na homologacao |

Nenhum valor homologado podera mudar silenciosamente no Passo 3.

## 14. Riscos aceitos

| Risco aceito | Motivo da aceitacao | Mitigacao | Remocao futura |
| --- | --- | --- | --- |
| Imports ainda em `src/lib/orcamentos` | Evita refatoracao ampla agora. | Contratos neutros e testes de equivalencia. | Etapa de extracao fisica. |
| Tipos legados coexistindo | Reduz risco e preserva chamadas atuais. | Adaptador converte para tipos neutros. | Quando todos os consumidores migrarem. |
| Adaptador especifico de Orcamento | Orcamento e primeiro consumidor real. | Adaptador nao pode conter formula. | Criar adaptadores dos demais contextos depois. |
| Re-exports temporarios | Preservar compatibilidade de imports. | Marcar como temporario em etapa futura. | Apos migracao completa. |
| Persistencia baseada em `OrcamentoItem` | Banco nao deve mudar nesta fase. | Extrair apenas dados tecnicos no adaptador. | Futuro modelo proprio de Execucao/Resultado. |
| Logica comercial ainda proxima do preview | Separacao completa e etapa futura. | Passo 3 exclui campos comerciais do contrato tecnico. | Sprint especifica de camada economica/comercial. |

## 15. Escopo oficial do Passo 3

O Passo 3 devera criar apenas:

- contratos neutros de entrada;
- contratos neutros de saida;
- `ContextoDeCalculo`;
- tipos tecnicos compartilhados;
- adaptador inicial do Orcamento, caso necessario;
- testes de equivalencia.

O Passo 3 nao devera:

- mover todo o motor;
- alterar formulas;
- criar modulo de Execucao;
- criar Planejamento Executivo;
- criar Simulacoes;
- alterar banco;
- criar migrations;
- remover tipos antigos;
- alterar PDF;
- alterar proposta;
- alterar interface;
- alterar comportamento funcional.

## 16. Recomendacao final

### Criterios de avanco

| Pergunta | Resposta |
| --- | --- |
| As ressalvas bloqueantes foram resolvidas documentalmente? | Sim. |
| A fronteira Nucleo x Modulo esta clara? | Sim. |
| A entrada minima esta definida? | Sim. |
| A saida comum esta definida? | Sim. |
| Os tipos proibidos no Nucleo estao identificados? | Sim. |
| A estrategia de extracao foi homologada? | Sim: extracao gradual. |
| Os casos de nao regressao estao definidos? | Sim. |
| O escopo do Passo 3 esta controlado? | Sim. |

Recomendacao: **AVANCAR COM CONDICOES**.

Condicoes para o Passo 3:

1. Implementar somente contratos/adaptador/testes.
2. Nao mover formulas.
3. Nao alterar resultados.
4. Nao permitir dependencia de Prisma no contrato neutro.
5. Garantir equivalencia com os testes atuais antes de qualquer extracao fisica.

## Confirmacao de restricoes

- Nenhum codigo foi criado.
- Nenhum tipo TypeScript produtivo foi criado.
- Nenhum arquivo produtivo foi alterado.
- Nenhum diretorio produtivo foi criado.
- Nenhuma migration foi criada.
- Nenhum comportamento foi alterado.
- Nenhum commit ou push deve ser feito nesta etapa.
