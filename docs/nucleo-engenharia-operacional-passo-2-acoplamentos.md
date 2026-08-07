# Passo 2 - Mapeamento tecnico dos acoplamentos do Nucleo

## 1. Resumo executivo

O Nucleo de Engenharia Operacional ja existe parcialmente no codigo, principalmente em `src/lib/orcamentos/cost-engine.ts` e `src/lib/orcamentos/operational-resource-domain.ts`.

Esses arquivos concentram regras tecnicas reutilizaveis: prazo, produtividade, quantidade operacional, bases economicas, transporte, viagens, compatibilidade de unidades, custo de recursos, custo por frente e memoria de calculo.

O acoplamento principal nao esta nas formulas em si, mas nas bordas:

- nomes e tipos ainda vivem sob `orcamentos`;
- o frontend monta diretamente o input tecnico do motor;
- o service monta snapshots comerciais usando resultados tecnicos;
- o validator normaliza alguns dados tecnicos antes da validacao;
- `OrcamentoItem` representa ao mesmo tempo recurso operacional, item comercial, material, servico e referencia comercial;
- a camada economica mistura custo operacional, formacao de preco e regras comerciais em alguns pontos.

Recomendacao final: **AVANCAR COM RESSALVAS**.

Antes do Passo 3, e necessario definir contratos neutros de entrada/saida e adaptadores por contexto. Nao e recomendado mover arquivos ainda.

## 2. Inventario tecnico

| Componente | Arquivo | Funcao/tipo | Responsabilidade atual | Chamadores | Dependencias | Testes existentes |
| --- | --- | --- | --- | --- | --- | --- |
| Motor de custos | `src/lib/orcamentos/cost-engine.ts` | `calcularMotorCustos` | Consolida frentes, recursos, custos, prazos, grupos de unidade e memoria. | `orcamentos-manager.tsx`, `pricing.ts`, testes. | Tipos `CostEngine*`, conceitos de frente/recurso. | `cost-engine.test.ts` |
| Custo da frente | `src/lib/orcamentos/cost-engine.ts` | `resolveFrontCost` | Calcula custo de uma frente por recursos ou custo manual. | Motor, `economic-engine.test.ts`. | `CostEngineFrenteInput`, `CostEngineRecursoInput`. | `cost-engine.test.ts`, `economic-engine.test.ts` |
| Planejamento da frente | `src/lib/orcamentos/cost-engine.ts` | `calcularPlanejamentoFrente` | Resolve prazo teorico, prazo adotado, prazo utilizado e produtividade resultante. | Motor, testes. | Campos de frente do orcamento. | `cost-engine.test.ts` |
| Calculo do recurso | `src/lib/orcamentos/cost-engine.ts` | `calcularRecurso` | Calcula recurso por dia, hora, km, viagem, carga, m3, m2, mes, fixo e valor total. | `resolveFrontCost`. | Planejamento da frente, unidade economica, quantidade operacional. | `cost-engine.test.ts` |
| Dominio operacional do recurso | `src/lib/orcamentos/operational-resource-domain.ts` | `normalizeOperationalResource` | Normaliza quantidade operacional, unidade, descricao e snapshots tecnicos. | Validator, frontend, cost-engine indiretamente. | Tipos `Operational*`. | `operational-resource-domain.test.ts` |
| Quantidade operacional | `src/lib/orcamentos/operational-resource-domain.ts` | `resolveOperationalQuantity` | Resolve quantidade herdada ou personalizada e unidade operacional. | Validator, normalizacao, UI. | Frente opcional, recurso bruto. | `operational-resource-domain.test.ts` |
| Compatibilidade de transporte | `src/lib/orcamentos/operational-resource-domain.ts` | `validateTransportCapacityCompatibility` | Compara unidade operacional e unidade de capacidade. | Validator, cost-engine. | Normalizacao de unidades. | `operational-resource-domain.test.ts`, `orcamento.test.ts` |
| Heranca do cadastro mestre | `src/lib/orcamentos/resource-inheritance.ts` | `resolveResourceInheritance` e constantes | Herda atributos tecnicos do recurso mestre e controla campos personalizados. | Frontend de orcamentos, validator. | Cadastro mestre/equipamento e snapshot. | `resource-inheritance.test.ts` |
| Engenharia economica | `src/lib/orcamentos/economic-engine.ts` | `calcularConsolidacaoEconomica` | Consolida custos, venda, markup, margem, impostos, ajuste comercial e totais. | Frontend, `pricing.ts`. | Resultado do motor, servicos/itens comerciais, formacao de preco. | `economic-engine.test.ts` |
| Snapshot de precificacao | `src/server/services/orcamentos/pricing.ts` | `buildPricingSnapshot` | Monta motor, consolidacao economica e totais para orcamento/proposta. | Service de orcamentos. | `OrcamentoInput`, cost-engine, economic-engine. | `pricing.test.ts` |
| Snapshot de proposta | `src/server/services/orcamentos/service.ts` | `buildPropostaSnapshot` | Gera fotografia comercial de frentes, itens, totais, premissas e opcionais. | Persistencia de propostas. | Proposta, cenario, pricing, PDF. | `service.sprint04.test.ts` |
| Persistencia do orcamento | `src/server/services/orcamentos/service.ts` | `criarEstruturaOrcamento` | Persiste cenarios, frentes, itens, premissas, formacao e propostas. | APIs de orcamento. | Prisma, empresa, cliente, obra, status, proposta. | `service.sprint04.test.ts` |
| Entrada do motor na UI | `src/features/orcamentos/orcamentos-manager.tsx` | `buildCostEngineInputFromForm` | Converte estado React para `CostEngineInput`. | Preview economico, debug e painel. | Estado local `OrcamentoForm`, frentes e itens. | Coberto indiretamente por testes de normalizacao. |
| Preview economico na UI | `src/features/orcamentos/orcamentos-manager.tsx` | `buildEconomicPreview` | Recalcula custos, formacao, totais e indicadores para tela. | Componente principal. | Estado React, cost-engine, economic-engine. | Sem teste direto dedicado. |
| Normalizacao de itens na UI | `src/features/orcamentos/orcamentos-manager.tsx` | `validateItemsBeforeSubmit` | Remove linhas vazias e valida itens reais antes do envio. | Submit do formulario. | Estado do formulario, regra de descricao. | `orcamento-items-normalization.test.ts` |
| Validator do payload | `src/lib/validators/orcamento.ts` | `orcamentoSchema`, normalizadores auxiliares | Valida payload, normaliza recurso reidratado, unidade operacional e compatibilidade. | APIs de orcamento. | Zod, Prisma enums, dominio operacional. | `orcamento.test.ts` |
| PDF de proposta | `src/server/pdf/orcamento-proposta.ts` e renderer | `selecionarItensComerciais`, renderizacao | Remove recursos internos, monta documento comercial e respeita snapshot. | Rotas PDF preview/oficial. | Snapshot comercial, proposta, layout. | `orcamento-proposta.test.ts` |
| Armazenamento PDF oficial | `src/server/pdf/orcamento-proposta-official-storage.ts` | Storage do PDF oficial | Preserva PDF emitido e referencia imutavel. | Rota oficial de proposta. | Filesystem/storage, empresa/proposta. | `orcamento-proposta-official-storage.test.ts` |
| Modelos Prisma | `prisma/schema.prisma` | `Orcamento*` | Persistem contexto de orcamento, frentes, itens, propostas e snapshots. | Service Prisma. | Banco PostgreSQL, tenant. | Coberto por testes de service. |

## 3. Classificacao Nucleo x Modulo x Misto

| Regra/funcao | Classificacao | Justificativa | Destino recomendado |
| --- | --- | --- | --- |
| `calcularPlanejamentoFrente` | Pertence ao Nucleo | Prazo/produtividade sao engenharia operacional e servem para previsto, realizado e simulado. | Contrato neutro de planejamento. |
| `calcularRecurso` | Pertence ao Nucleo | Calcula custo tecnico do recurso por base economica. | Motor de recurso operacional. |
| Transporte por km/capacidade/viagens | Pertence ao Nucleo | E regra tecnica de logistica, nao comercial. | Subdominio `transport`. |
| `validateTransportCapacityCompatibility` | Pertence ao Nucleo | Compatibilidade de unidades e tecnica. | Dominio de unidades/compatibilidade. |
| `resolveOperationalQuantity` | Pertence ao Nucleo | Quantidade operacional herdada ou personalizada e conceito transversal. | Contrato de quantidade operacional. |
| Memoria de calculo do recurso | Pertence ao Nucleo | Explica regra tecnica aplicada. | Saida comum do Nucleo. |
| Custo manual sem recurso | Camada mista | Pode ser fallback tecnico no orcamento; em execucao pode ter outro significado. | Entrada opcional por contexto, sem misturar com recurso. |
| `calcularConsolidacaoEconomica` | Camada economica compartilhavel | Mistura custo, venda, markup, margem, impostos e ajuste comercial. | Separar custo economico de formacao comercial. |
| Margem, impostos e ajuste comercial | Modulo/Comercial | Fazem sentido em orcamento/proposta, nao no nucleo tecnico puro. | Camada comercial do orcamento. |
| `buildPricingSnapshot` | Responsabilidade mista | Chama motor tecnico e camada economica, mas usa `OrcamentoInput`. | Adaptador de orcamento para Nucleo + formacao comercial. |
| `buildPropostaSnapshot` | Modulo de Orcamentos | Snapshot comercial/proposta externa. | Permanecer no modulo. |
| Proposta, revisao, status, PDF | Modulo de Orcamentos | Documentos e fluxo comercial. | Fora do Nucleo. |
| `orcamentoSchema` | Responsabilidade mista | Valida contrato de API e tambem normaliza recurso tecnico. | Separar validacao de payload e normalizacao do Nucleo. |
| `buildCostEngineInputFromForm` | Adaptador do modulo | Traduz estado React para input tecnico. | Futuro adaptador `orcamento -> nucleo`. |
| `validateItemsBeforeSubmit` | Responsabilidade mista | Parte e UX/formulario; parte valida recurso tecnico reidratado. | Reduzir a validacao tecnica no frontend. |
| `resource-inheritance` | Pertence ao Nucleo com adaptador | Heranca tecnica e snapshot sao reutilizaveis, mas origem hoje e cadastro mestre do orcamento. | Biblioteca de recurso/snapshot. |

## 4. Mapa de dependencias

| Componente tecnico | Depende de | Motivo | Tipo | Estrategia futura |
| --- | --- | --- | --- | --- |
| `cost-engine.ts` | `operational-resource-domain.ts` | Validar unidade/capacidade e normalizacao. | Essencial ao dominio | Manter como dependencia interna do Nucleo. |
| `cost-engine.ts` | Nomes `CostEngineFrenteInput` e `CostEngineRecursoInput` | Contratos atuais nasceram no orcamento. | Acoplamento acidental | Renomear futuramente para contratos neutros por re-export. |
| `pricing.ts` | `OrcamentoInput` | Usa payload completo para extrair frentes, itens e formacao. | Adaptador do modulo | Criar adaptador explicito `orcamentoToEngineeringInput`. |
| `pricing.ts` | `calcularMotorCustos` | Precisa do custo tecnico. | Essencial ao dominio | Continuar consumindo Nucleo. |
| `pricing.ts` | `calcularConsolidacaoEconomica` | Forma preco e total. | Camada economica/comercial | Separar resultado tecnico de formacao comercial. |
| `service.ts` | Prisma `Orcamento*` | Persistencia transacional e snapshots. | Persistencia | Permanecer no modulo. |
| `service.ts` | `buildPricingSnapshot` | Calcula totais antes de persistir. | Misto | Usar saida do adaptador do orcamento. |
| `orcamentos-manager.tsx` | `cost-engine.ts` | Preview reativo da tela. | Adaptador/apresentacao | Idealmente consumir hook/adapter de aplicacao, nao montar regra. |
| `orcamentos-manager.tsx` | Estado React `OrcamentoForm` | Fonte de dados editavel. | Apresentacao | Converter para contrato neutro em funcao isolada/testada. |
| `orcamento.ts` validator | `operational-resource-domain.ts` | Normaliza unidade operacional antes da validacao. | Misto | Fazer normalizacao antes do schema ou no adaptador tecnico. |
| PDF de proposta | Snapshot comercial | Precisa preservar documento emitido. | Apresentacao/modulo | Nao deve depender do Nucleo diretamente. |
| `OrcamentoItem` | Servico, material, equipamento, recurso, proposta | Modelo unico para diferentes naturezas. | Persistencia acoplada | Criar contrato tecnico separado sem alterar banco agora. |

## 5. Analise dos tipos atuais

### Tipos reutilizaveis com baixo risco

- `OperationalUnit`
- `OperationalResourceEconomicUnit`
- `OperationalResourceQuantityOrigin`
- `OperationalResourceCalculationType`
- `NormalizedOperationalResource`
- `OperationalQuantityResolution`
- `CostEnginePlanejamentoFrente`
- `CostEngineMemoriaRecurso`
- `CostEngineResultado`

Apesar dos nomes citarem `CostEngine`, esses tipos descrevem conceitos tecnicos neutros.

### Tipos com nomenclatura de orcamento

- `CostEngineFrenteInput`
- `CostEngineRecursoInput`
- `CostEngineFrenteResultado`
- `CostEngineResolucaoFrente`
- `OrcamentoInput`
- `OrcamentoItem`
- `OrcamentoFrente`

Esses tipos ainda carregam termos e campos do modulo de Orcamentos. Devem ser substituidos por contratos neutros antes da extracao fisica.

### Tipos que misturam input tecnico, apresentacao e persistencia

- `OrcamentoItem`: possui recurso operacional, item comercial, precificacao, PDF, fornecedor, equipamento, quantidade operacional, memoria e totais.
- `OrcamentoFrente`: possui planejamento tecnico, natureza comercial/operacional, custo manual e vinculo com cenario.
- `OrcamentoForm`: fonte de UI, preview e payload.
- `OrcamentoInput`: contrato de API, persistencia e calculo.

### Adaptadores necessarios

- `Orcamento -> Nucleo`: converte cenarios, frentes operacionais e recursos em contrato tecnico.
- `Execucao -> Nucleo`: convertera apontamentos, horas, viagens, consumos e custos reais.
- `Simulacao -> Nucleo`: convertera hipoteses sem persistencia obrigatoria.
- `Planejamento Executivo -> Nucleo`: convertera sequencia, estrategia, frentes planejadas e recursos previstos.

## 6. Entrada atual do motor

Fluxo atual no frontend:

```text
Estado React OrcamentoForm
  -> frentes operacionais
  -> itens do tipo RECURSO vinculados as frentes
  -> buildCostEngineInputFromForm
  -> calcularMotorCustos
```

Fluxo atual no backend:

```text
OrcamentoInput
  -> getEscopoOperacional
  -> buildCostEngineInput
  -> calcularMotorCustos
  -> calcularConsolidacaoEconomica
  -> buildPricingSnapshot / buildPropostaSnapshot
```

Dados realmente necessarios ao calculo:

- identificador da frente;
- nome da frente;
- unidade de producao;
- quantidade prevista;
- produtividade planejada;
- prazo teorico/adotado/utilizado;
- modo de custo;
- custo manual, quando nao houver recursos validos;
- recursos com frenteRef;
- quantidade de recursos;
- quantidade operacional e origem;
- unidade da quantidade operacional;
- base economica;
- valor de custo;
- horas, dias, km, viagens, cargas ou meses;
- capacidade por viagem e unidade;
- distancia por viagem;
- dias trabalhados no mes;
- descricao do recurso para memoria.

Dados comerciais enviados sem necessidade ao motor tecnico:

- preco de venda;
- markup;
- forma de apresentacao comercial;
- exibir no PDF;
- condicoes comerciais;
- proposta;
- revisao;
- cliente;
- obra.

Dados derivados antes do motor:

- refs locais de frente/item;
- filtro por natureza operacional;
- alguns valores herdados do cadastro mestre;
- normalizacao de unidade operacional no validator;
- descricao reidratada do recurso.

Dados que o motor recalcula:

- prazo teorico;
- prazo utilizado;
- produtividade resultante;
- viagens teoricas;
- viagens operacionais;
- custo por viagem;
- custo total do recurso;
- custo direto da frente;
- memoria de calculo;
- grupos de unidade.

### Entrada tecnica minima proposta

```ts
EngineeringCoreInput = {
  contexto: "ORCAMENTO" | "PLANEJAMENTO_EXECUTIVO" | "EXECUCAO" | "SIMULACAO";
  frentes: EngineeringFrontInput[];
  recursos: EngineeringResourceInput[];
}
```

Campos minimos da frente:

- `ref`;
- `nome`;
- `quantidade`;
- `unidade`;
- `produtividadePlanejada`;
- `prazoAdotado`;
- `prazoTeorico`;
- `modoCusto`;
- `custoManual`.

Campos minimos do recurso:

- `ref`;
- `frenteRef`;
- `descricao`;
- `quantidadeRecursos`;
- `quantidadeOperacional`;
- `origemQuantidadeOperacional`;
- `unidadeQuantidadeOperacional`;
- `baseEconomica`;
- `valorCusto`;
- parametros complementares: horas, km, viagens, cargas, meses, capacidade, distancia, dias trabalhados.

## 7. Saidas atuais do motor

Saidas atuais observadas:

- custo por recurso;
- custo por frente;
- custo direto total;
- custo manual aplicado ou substituido por recursos;
- prazo teorico;
- prazo adotado;
- prazo utilizado;
- produtividade resultante;
- viagens teoricas;
- viagens operacionais;
- viagens por dia;
- viagens por caminhao por dia;
- volume diario da frota;
- volume diario por caminhao;
- quilometros totais;
- custo por viagem;
- quantidade operacional resolvida;
- unidade operacional resolvida;
- memoria de calculo;
- grupos por unidade;
- avisos;
- inconsistencias de recurso pendente;
- quantidade total quando unidades sao homogeneas.

### Separacao das saidas

| Categoria | Exemplos |
| --- | --- |
| Resultados tecnicos do Nucleo | prazo, produtividade, quantidade operacional, viagens, km, capacidade, memoria, avisos. |
| Resultados economicos | custo do recurso, custo da frente, custo direto total, custo unitario operacional. |
| Resultados comerciais | preco sugerido, margem, impostos, ajuste comercial, valor de proposta. |
| Dados de apresentacao | textos formatados, labels de unidade, disposicao no PDF/tela. |

### Saida comum proposta

```ts
EngineeringCoreResult = {
  frentes: EngineeringFrontResult[];
  recursos: EngineeringResourceResult[];
  totais: {
    custoDireto: number;
    quantidadeTotal?: number;
    unidadesHomogeneas: boolean;
  };
  memoria: EngineeringMemoryEntry[];
  avisos: EngineeringWarning[];
}
```

## 8. Fronteira entre custo e preco

Fronteira recomendada:

```text
NUCLEO
  -> custo, produtividade, prazo, consumo, viagens, memoria

CAMADA ECONOMICA/COMERCIAL
  -> custo indireto, margem, impostos, markup, preco sugerido, ajuste, proposta

RESULTADO FUTURO
  -> receita real, custo real, lucro, margem real
```

Onde termina o custo operacional:

- no custo calculado dos recursos;
- no custo direto da frente;
- no custo direto consolidado;
- no custo unitario tecnico quando aplicavel.

Onde comeca o preco:

- custo indireto;
- margem;
- impostos;
- markup;
- preco aplicado;
- ajuste comercial;
- valor da proposta.

Funcoes que misturam fronteiras hoje:

- `calcularConsolidacaoEconomica`: recebe custo tecnico e calcula venda/comercial.
- `buildOperationalSnapshot`: chama motor tecnico e consolidacao comercial no mesmo fluxo.
- `buildEconomicPreview`: no frontend, calcula custo, margem, impostos, subtotal e total de tela.
- `buildPricingSnapshot`: decide escopo operacional e comercial ao mesmo tempo.

## 9. Persistencia e snapshots

### Campos tecnicos persistidos em `OrcamentoFrente`

| Campo | Classificacao |
| --- | --- |
| `unidadeProducao` | INPUT |
| `quantidadePrevista` | INPUT |
| `produtividadeDia` | INPUT |
| `prazoEstimadoDias` | DERIVADO/COMPATIBILIDADE |
| `prazoTeoricoDias` | DERIVADO |
| `prazoAdotadoDias` | OVERRIDE |
| `origemPrazo` | APRESENTACAO/CONTROLE |
| `modoCusto` | INPUT |
| `custoManual` | INPUT/FALLBACK |

### Campos tecnicos persistidos em `OrcamentoItem`

| Campo | Classificacao |
| --- | --- |
| `quantidade` | INPUT comercial ou quantidade de recurso legada |
| `quantidadeOperacional` | INPUT/OVERRIDE |
| `origemQuantidadeOperacional` | HERANCA/OVERRIDE |
| `unidadeQuantidadeOperacional` | INPUT/OVERRIDE |
| `tipoCalculoRecurso` | INPUT |
| `unidadeEconomicaCusto` | INPUT |
| `valorCusto` | INPUT |
| `horasDia`, `horasTotais` | INPUT tecnico |
| `viagensDia`, `viagensTotais` | INPUT tecnico |
| `distanciaViagemKm`, `quilometrosTotais` | INPUT tecnico |
| `capacidadePorViagem`, `unidadeCapacidade` | HERANCA/OVERRIDE |
| `caracteristicasRecursoSnapshot` | SNAPSHOT |
| `camposTecnicosPersonalizados` | OVERRIDE |
| `viagensTeoricas`, `viagensOperacionais` | DERIVADO/CACHE |
| `custoPorViagem` | DERIVADO/CACHE |
| `custoTotalCalculado`, `memoriaCalculo` | DERIVADO/CACHE |

### Riscos

- Snapshot antigo de proposta nao deve ser usado como input tecnico para recalculo.
- Reprocessamento nao pode alterar revisao historica emitida.
- Execucao nao deve precisar duplicar `OrcamentoItem`; deve ter seu proprio contexto persistido e adaptar para o contrato do Nucleo.
- O Nucleo deve permanecer stateless: recebe contrato, calcula e devolve resultado.

## 10. Acoplamentos no frontend

Regras tecnicas ainda existentes em `orcamentos-manager.tsx`:

1. `recalcularFrentePlanejamento` recalcula prazo/produtividade no estado local.
2. `buildCostEngineInputFromForm` monta contrato tecnico diretamente no componente.
3. `buildOperationalConsolidation` chama motor e economic-engine.
4. `buildEconomicPreview` consolida custo, margem, impostos, totais e legado.
5. Heranca de recurso mestre e campos personalizados aparecem diretamente no fluxo de UI.
6. `validateItemsBeforeSubmit` conhece regras de item real, recurso reidratado e unidade operacional.
7. Painel executivo consome resultados derivados diretamente do preview local.

Responsabilidade de interface que deve permanecer:

- captura de dados;
- exibicao;
- expandir/recolher;
- mensagens;
- controle de rascunho;
- seletores;
- feedback visual.

Regra de engenharia que deve migrar para adaptadores/Nucleo:

- normalizacao tecnica;
- quantidade operacional;
- prazo/produtividade;
- custo de recurso;
- memoria tecnica;
- compatibilidade de unidades.

## 11. Acoplamentos no validator

O validator hoje faz mais que validar contrato:

- normaliza descricao de recurso reidratado;
- resolve unidade operacional automatica;
- chama `normalizeOperationalResource`;
- valida compatibilidade de transporte;
- trata legado com origem personalizada sem unidade;
- contem codigo morto apos retornos antecipados em alguns helpers, indicando historico de refatoracao incompleta.

Deve permanecer no validator:

- tipos obrigatorios;
- limites de string/numero;
- enums;
- ids;
- consistencia minima do payload;
- mensagens de erro de contrato.

Deve sair futuramente:

- resolucao de engenharia;
- definicao de unidade tecnica;
- interpretacao de capacidade/viagens;
- normalizacao operacional profunda.

## 12. Acoplamentos no service

O service deve permanecer responsavel por:

- autorizacao/tenant;
- transacao;
- persistencia;
- vinculos com cliente, obra, responsavel e empresa;
- criacao/edicao/duplicacao;
- proposta;
- revisao;
- snapshot do modulo;
- imutabilidade de proposta emitida.

Acoplamentos tecnicos atuais:

- `buildPricingSnapshot` e `buildPropostaSnapshot` chamam fluxo tecnico/economico.
- `criarEstruturaOrcamento` persiste derivados tecnicos e snapshots.
- service precisa saber quais itens pertencem ao cenario/frente.
- proposta usa snapshots com frentes/itens filtrados.

Futuro recomendado:

- service chama adaptador de orcamento;
- adaptador gera input tecnico do Nucleo;
- Nucleo calcula;
- service persiste resultado no contexto do orcamento.

## 13. Mapa de testes

| Arquivo | Classificacao | Cobertura relevante |
| --- | --- | --- |
| `src/lib/orcamentos/cost-engine.test.ts` | Teste do Nucleo | Custo manual, recursos, prazo, diaria, hora, m3/m2, transporte, quantidade operacional, demanda logistica, unidade personalizada. |
| `src/lib/orcamentos/operational-resource-domain.test.ts` | Teste do Nucleo | Quantidade herdada/personalizada, descricao, compatibilidade de capacidade. |
| `src/lib/orcamentos/resource-inheritance.test.ts` | Teste do Nucleo/adaptador | Heranca tecnica do cadastro mestre e snapshot. |
| `src/lib/orcamentos/economic-engine.test.ts` | Teste de camada economica | Consolidacao custo/venda, markup, ajuste comercial, legado. |
| `src/server/services/orcamentos/pricing.test.ts` | Teste de integracao modulo/economia | Snapshot de pricing, orcamento misto, referencial, ajuste comercial. |
| `src/server/services/orcamentos/service.sprint04.test.ts` | Teste de modulo/regressao | Cenarios, propostas, snapshots, persistencia, status, revisoes. |
| `src/lib/validators/orcamento.test.ts` | Teste de contrato/misto | Schema, recurso, unidade operacional, compatibilidade. |
| `src/features/orcamentos/orcamento-items-normalization.test.ts` | Teste de frontend/misto | Linhas vazias, descricao, recurso reidratado, unidade operacional. |
| `src/server/pdf/orcamento-proposta.test.ts` | Teste de modulo/PDF | Conteudo comercial, snapshot, valor global, item referencial. |

Lacunas antes do Passo 3:

- testes de adaptador neutro ainda nao existem;
- testes de contexto EXECUCAO/SIMULACAO/PLANEJAMENTO ainda nao existem;
- `buildEconomicPreview` nao possui teste unitario direto;
- contrato minimo do Nucleo ainda nao esta testado porque nao existe como tipo neutro.

## 14. Casos reais de nao regressao

| Caso | Entradas | Resultado homologado esperado | Cobertura atual | Lacuna |
| --- | --- | --- | --- | --- |
| Escavadeira por dia | 1 recurso, R$/dia, prazo utilizado | quantidade x custo x prazo | `cost-engine.test.ts` | Manter caso no contrato neutro. |
| Caminhao por km | volume, capacidade, distancia, custo/km | viagens arredondadas, custo total sem multiplicar por frota | `cost-engine.test.ts` | Reexecutar apos adaptador. |
| Frente m2 com caminhao m3 | quantidade operacional personalizada em m3 | compatibilidade pela quantidade operacional, nao pela frente | `cost-engine.test.ts`, `orcamento.test.ts` | Caso deve virar regressao obrigatoria. |
| Recurso personalizado | quantidade/unidade operacional personalizada | recurso nao acompanha alteracao da frente | `cost-engine.test.ts`, `operational-resource-domain.test.ts` | Preservar snapshot. |
| Recurso herdado | cadastro mestre com capacidade/unidade | heranca automatica sem alterar cadastro | `resource-inheritance.test.ts` | Adaptador para bibliotecas tecnicas. |
| Aterro compactado com varios recursos | frente com recursos heterogeneos | soma exclusiva dos recursos validos | Parcial em `cost-engine.test.ts` | Formalizar fixture real. |
| Orcamento misto | frente comercial + operacional | nao envia comercial ao motor; soma correta no total | `pricing.test.ts` | Revalidar PDF. |
| Item comercial referencial | preco unitario sem quantidade contratada | nao soma no valor global | `pricing.test.ts`, `orcamento-proposta.test.ts` | Garantir snapshot. |
| Custo manual sem recursos | frente sem recursos validos | usa custo manual | `cost-engine.test.ts`, `pricing.test.ts` | Contrato neutro deve aceitar fallback. |
| Salvar/reabrir/editar/salvar | persistencia completa | nao perde memoria/parametros | `service.sprint04.test.ts` | Reexecutar apos extracao. |
| L.Flex - Frente 1 | caso piloto futuro | baseline para Execucao | Ainda documental | Criar fixture antes do Passo 4/5. |

## 15. Ordem segura de extracao

| Etapa | Pre-requisitos | Risco | Testes necessarios | Impacto esperado | Rollback |
| --- | --- | --- | --- | --- | --- |
| 1. Contratos neutros | Relatorio aprovado | Medio | Novos testes de tipos/adaptador | Reduz dependencia sem mover motor | Remover contratos e manter atuais. |
| 2. Tipos de unidade | Contrato minimo | Medio | Unidade/compatibilidade | Evita duplicacao de normalizacao | Re-export dos tipos antigos. |
| 3. Dominio de recurso | Testes atuais verdes | Alto | `operational-resource-domain`, validator | Reuso por execucao/simulacao | Re-export em `src/lib/orcamentos`. |
| 4. Planejamento de frente | Contrato de frente | Medio | prazo/produtividade | Reuso do planejamento executivo | Reverter adaptador. |
| 5. Calculo de recurso | Dominio estabilizado | Alto | todos os recursos por base economica | Centraliza custo tecnico | Manter wrapper antigo. |
| 6. Transporte e viagens | Casos reais fixos | Alto | caminhao/km/capacidade | Reduz maior risco tecnico | Re-export + feature flag se necessario. |
| 7. Motor consolidado | Recursos extraidos | Alto | `calcularMotorCustos` completo | Nucleo tecnico central | Wrapper antigo. |
| 8. Memoria de calculo | Motor consolidado | Medio | snapshots e PDF nao expor interno | Saida rastreavel comum | Retornar ao formato atual. |
| 9. Adaptador de Orcamento | Contrato comum | Alto | service, pricing, frontend | Separa modulo do Nucleo | Usar `buildCostEngineInput` antigo. |
| 10. Adaptadores futuros | Pilotos definidos | Medio | fixtures de Execucao/Simulacao | Habilita novos modulos | Nao ativar consumidores. |

## 16. Estrutura fisica futura recomendada

Alternativa A: extracao fisica imediata.

```text
src/lib/engineering-core/
  contracts/
  domain/
  units/
  resources/
  planning/
  transport/
  costing/
  memory/
  adapters/
```

Vantagem: separacao clara.

Risco: alto risco de regressao por muitos imports, testes e nomes mudando ao mesmo tempo.

Alternativa B: extracao gradual com re-exports.

```text
src/lib/engineering-core/
  contracts/
  units/
  resources/
  planning/
  transport/
  costing/
  memory/
  adapters/orcamentos/

src/lib/orcamentos/
  cost-engine.ts              // re-export temporario
  operational-resource-domain.ts // re-export temporario
```

Vantagem: menor risco, preserva imports atuais durante transicao.

Recomendacao: **Alternativa B**. Primeiro criar contratos neutros e adaptadores, depois mover implementacoes com re-exports e testes de regressao.

## 17. Riscos classificados

| Risco | Severidade | Motivo | Mitigacao |
| --- | --- | --- | --- |
| Alterar formula durante extracao | CRITICO | Quebra orcamentos homologados. | Extrair por wrapper/re-export e rodar fixtures reais. |
| Snapshot emitido ser recalculado | CRITICO | Viola imutabilidade comercial. | Nunca usar snapshot oficial como input tecnico. |
| `OrcamentoItem` continuar como contrato do Nucleo | ALTO | Impede Execucao/Simulacao sem duplicar banco. | Criar `EngineeringResourceInput`. |
| Validator resolver engenharia | ALTO | Regras tecnicas duplicadas na validacao. | Separar normalizacao tecnica do schema. |
| Frontend ser fonte de verdade tecnica | ALTO | Pode divergir do backend. | Centralizar adaptador compartilhado. |
| `economic-engine` misturar custo e preco | MEDIO | Dificulta Resultado/Execucao. | Separar saida tecnica de formacao comercial. |
| Nomes fisicos sob `orcamentos` | MEDIO | Confunde propriedade arquitetural. | Re-export gradual. |
| Falta de fixture L.Flex | MEDIO | Piloto futuro sem baseline objetiva. | Criar caso documentado antes da implementacao. |
| Mover tudo de uma vez | ALTO | Alto risco de regressao ampla. | Sequencia incremental. |
| Documentacao ficar desatualizada | BAIXO | O nucleo evoluira em passos. | Atualizar a cada passo homologado. |

## 18. Pre-condicoes para o Passo 3

Antes de criar o contrato comum de entrada e saida, precisam estar fechados:

- fronteira tecnica/comercial;
- input minimo do Nucleo;
- output comum do Nucleo;
- tipos neutros de frente, recurso, unidade, memoria e aviso;
- decisao de como representar contexto: ORCAMENTO, PLANEJAMENTO_EXECUTIVO, EXECUCAO e SIMULACAO;
- regra para snapshots: modulo persiste, Nucleo nao depende do banco;
- adaptador inicial `Orcamento -> Nucleo`;
- lista de fixtures obrigatorias de nao regressao;
- estrategia de re-export para preservar imports;
- decisao de que o PDF/proposta permanecem fora do Nucleo.

## 19. Recomendacao final

**AVANCAR COM RESSALVAS.**

O Nucleo ja esta suficientemente concentrado para permitir evolucao, mas ainda nao e seguro mover arquivos ou renomear contratos sem antes criar uma camada neutra de entrada e saida.

Proximo passo recomendado:

1. Definir contratos neutros em documento tecnico.
2. Aprovar input/output comum.
3. Criar adaptador documental `Orcamento -> Nucleo`.
4. So depois iniciar mudancas de codigo em etapa propria.

## Confirmacao de restricoes

- Nenhum arquivo produtivo foi alterado.
- Nenhum import foi modificado.
- Nenhuma funcao foi refatorada.
- Nenhuma migration foi criada.
- Nenhum comportamento foi alterado.
- Nenhum commit ou push deve ser feito nesta etapa.
