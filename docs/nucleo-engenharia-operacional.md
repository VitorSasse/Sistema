# Nucleo de Engenharia Operacional

## Objetivo

Formalizar a arquitetura permanente do Nucleo de Engenharia Operacional da BasePro.

Esta etapa e apenas documental. Ela nao move arquivos, nao altera imports, nao cria migrations, nao cria telas e nao altera comportamento existente.

## Principio central

> A BasePro pensa como um engenheiro experiente.

Isso significa que o sistema deve partir dos fatos, organizar o raciocinio tecnico, calcular consequencias, comparar alternativas, identificar desvios, apoiar decisoes e preservar aprendizado operacional.

O fluxo mental esperado da plataforma e:

```text
problema -> analise -> solucao -> resultado -> aprendizado
```

Um engenheiro experiente concentra sua atencao na compreensao do problema, na analise tecnica e na busca da melhor solucao.

A BasePro deve reproduzir esse mesmo raciocinio. Ela nao procura culpados; ela procura causas. Ela nao registra apenas informacoes; ela transforma informacoes em conhecimento.

## Principio arquitetural

> O conhecimento de engenharia existe uma unica vez no Nucleo de Engenharia Operacional e e reutilizado por todos os modulos da plataforma.

Nenhum modulo deve duplicar regras de custos, recursos, produtividade, prazo, transporte, capacidade, memoria de calculo, compatibilidade operacional ou formacao economica.

Principio de nao duplicacao:

> Nenhuma regra de engenharia devera existir em mais de um lugar.

Sempre que uma regra puder ser reutilizada por mais de um modulo, ela devera pertencer ao Nucleo de Engenharia Operacional.

## Missao do Nucleo de Engenharia Operacional

O Nucleo de Engenharia Operacional representa o raciocinio tecnico de um engenheiro especialista.

Sua missao nao e apenas executar calculos.

Sua missao e interpretar problemas de engenharia, organizar informacoes tecnicas, aplicar conhecimento especializado, produzir analises consistentes e apoiar decisoes em qualquer etapa do ciclo de vida de uma obra ou servico.

O calculo e consequencia desse processo, e nao seu objetivo principal.

## Definicao oficial

O Nucleo de Engenharia Operacional e a camada central responsavel por interpretar dados tecnicos e economicos de execucao.

Ele recebe entradas estruturadas sobre servicos, frentes, metodos executivos, recursos, quantidades, unidades, produtividades, prazos, capacidades, distancias, viagens, bases economicas e custos.

Como saida, devolve resultados calculaveis, rastreaveis e explicaveis, incluindo custos, prazos, produtividades, memorias de calculo e indicadores operacionais.

O Nucleo nao depende conceitualmente de proposta comercial, PDF, status de orcamento, faturamento, recebimento ou interface especifica.

## O Nucleo responde perguntas

O Nucleo nao executa tarefas especificas de um modulo. Ele responde perguntas de engenharia.

| Contexto | Pergunta respondida |
| --- | --- |
| ORCAMENTO | Quanto devera custar executar este servico? |
| PLANEJAMENTO EXECUTIVO | Qual e a melhor estrategia para executar este servico? |
| EXECUCAO | Quanto realmente custou executar este servico? |
| SIMULACAO | O que acontecera se alterarmos esta configuracao? |

Todos esses contextos utilizam o mesmo conhecimento de engenharia.

## Contextos oficiais de calculo

### ORCAMENTO

Usa dados previstos para responder quanto devera custar.

Entradas tipicas:

- quantidade prevista;
- prazo previsto ou adotado;
- produtividade prevista;
- recursos previstos;
- custo previsto;
- premissas de operacao.

Saidas tipicas:

- custo orcado;
- prazo estimado;
- produtividade resultante;
- memoria de calculo;
- preco-base para analise economica.

### PLANEJAMENTO EXECUTIVO

Usa dados previstos e decisoes tecnicas para responder qual estrategia devera ser adotada na execucao.

Entradas tipicas:

- frentes aprovadas ou planejadas;
- sequencia executiva;
- recursos previstos;
- premissas de produtividade;
- restricoes de prazo;
- alternativas tecnicas.

Saidas tipicas:

- estrategia operacional;
- recursos planejados;
- prazo planejado;
- gargalos esperados;
- memoria tecnica do planejamento.

### EXECUCAO

Usa fatos realizados para responder quanto realmente custou.

Entradas tipicas:

- dias efetivamente utilizados;
- horas trabalhadas;
- viagens realizadas;
- volume produzido;
- materiais consumidos;
- custos unitarios reais.

Saidas tipicas:

- custo realizado;
- produtividade real;
- consumo real;
- custo unitario real;
- memoria de calculo realizada.

### SIMULACAO

Usa dados hipoteticos para responder o que aconteceria em outra configuracao.

Entradas tipicas:

- quantidade alternativa de equipamentos;
- recurso diferente;
- distancia alternativa;
- produtividade alternativa;
- custo unitario diferente.

Saidas tipicas:

- custo simulado;
- prazo simulado;
- producao simulada;
- comparacao de alternativas.

## O motor nao pertence ao Orcamento

O Motor Operacional atual nasceu dentro do fluxo de Orcamentos, mas conceitualmente pertence ao Nucleo de Engenharia Operacional.

O modulo de Orcamentos e consumidor do Nucleo. No futuro tambem podem consumir o mesmo Nucleo:

- Execucao e Resultado;
- Simulacoes;
- Planejamento Executivo;
- Apontamentos;
- Medicoes;
- outros modulos tecnicos.

## Bibliotecas tecnicas do Nucleo

As bibliotecas tecnicas pertencem conceitualmente ao Nucleo, mesmo quando hoje ainda estejam implementadas ou consumidas por modulos especificos.

Bibliotecas esperadas:

- Biblioteca de Recursos;
- Biblioteca de Servicos;
- Biblioteca de Composicoes;
- Biblioteca de Metodos Executivos;
- Biblioteca de Produtividades;
- Biblioteca de Premissas Tecnicas;
- Biblioteca de Regras Operacionais.

Os modulos consomem essas bibliotecas, mas nao devem ser proprietarios das regras.

## Principio dos modulos

> Os modulos nao executam calculos de engenharia. Os modulos apenas contextualizam o problema e solicitam analises ao Nucleo de Engenharia Operacional.

Exemplos:

- O modulo de Orcamentos informa: estes sao os recursos previstos.
- O modulo de Execucao informa: estes foram os recursos utilizados.
- O modulo de Simulacoes informa: considere este cenario hipotetico.

O Nucleo interpreta essas informacoes e produz os resultados.

## Principio dos fatos

> O usuario informa fatos. A BasePro produz conhecimento.

O usuario nao deve informar diretamente custos finais, margens, produtividades finais ou conclusoes.

O usuario informa fatos observaveis:

- horas;
- dias;
- viagens;
- volumes;
- recursos;
- materiais;
- equipes;
- equipamentos.

O Nucleo transforma esses fatos em conhecimento tecnico e economico.

## Separacao entre Nucleo e modulos consumidores

### Responsabilidades do Nucleo

- regras tecnicas;
- calculos operacionais;
- normalizacao de unidades;
- resolucao de produtividade e prazo;
- interpretacao de recursos;
- calculo de transporte e viagens;
- calculo de custos operacionais;
- memoria de calculo;
- compatibilidade operacional;
- resultados de engenharia.

### Responsabilidades dos modulos consumidores

- contexto de uso;
- fluxo de trabalho;
- interface;
- status;
- permissoes;
- documentos;
- vinculos comerciais;
- vinculos operacionais;
- persistencia especifica do modulo.

Exemplos:

- Orcamento informa ao Nucleo: estes sao os recursos previstos.
- Execucao informa ao Nucleo: estes foram os recursos utilizados.
- Simulacao informa ao Nucleo: teste esta combinacao hipotetica.

## Fluxo conceitual da plataforma

```text
Conhecimento
  -> Nucleo de Engenharia Operacional
  -> Aplicacao
  -> Aprendizado
  -> Conhecimento
```

Os modulos representam aplicacoes do conhecimento. O Nucleo representa o conhecimento estruturado. A execucao gera novos fatos. Os fatos produzem aprendizado. O aprendizado fortalece novamente o Nucleo.

Fluxo permanente de longo prazo:

```text
Conhecimento
  -> Planejamento
  -> Execucao
  -> Resultado
  -> Aprendizado
  -> Conhecimento
```

Esse ciclo representa o processo natural de evolucao de uma empresa de engenharia e serve como referencia para toda expansao futura da BasePro.

## Independencia das origens

- Uma Execucao pode nascer de um orcamento aprovado.
- Uma Execucao pode nascer diretamente, sem orcamento.
- Um Planejamento Executivo pode nascer de um orcamento aprovado.
- Um Planejamento Executivo pode ser criado diretamente.
- Uma Simulacao pode ou nao estar vinculada a orcamento, planejamento ou execucao.

Principio:

> O orcamento pode originar uma obra, mas nao e requisito para que a obra exista no BasePro.

## Mapa do estado atual

| Componente atual | Arquivo/funcao | Responsabilidade atual | Responsabilidade futura no Nucleo | Dependencias do Orcamento | Observacoes |
| --- | --- | --- | --- | --- | --- |
| Motor de custos | `src/lib/orcamentos/cost-engine.ts` / `calcularMotorCustos` | Consolida frentes, recursos, custos diretos, prazos, unidades, memoria e grupos de unidade. | Motor de Custos Operacionais do Nucleo. | Tipos e nomes ainda referenciam orcamentos e frentes do orcamento. | Principal candidato a extracao futura sem alterar formulas. |
| Planejamento da frente | `src/lib/orcamentos/cost-engine.ts` / `calcularPlanejamentoFrente` | Resolve quantidade, produtividade planejada, prazo teorico, prazo adotado e produtividade resultante. | Resolucao comum de prazo e produtividade. | Entrada usa `CostEngineFrenteInput`, hoje alimentada pela frente do orcamento. | Deve ser reutilizavel para previsto, realizado e simulado. |
| Calculo de recurso | `src/lib/orcamentos/cost-engine.ts` / `calcularRecurso` | Calcula custo por base economica, transporte, viagens, km, hora, dia, mes, carga e memoria. | Interpretador comum de recursos operacionais. | Recebe recursos montados a partir de `OrcamentoItem`. | Nao deve depender de PDF, proposta ou status comercial. |
| Dominio do recurso operacional | `src/lib/orcamentos/operational-resource-domain.ts` | Normaliza recurso, unidade, quantidade operacional, descricao e compatibilidade de capacidade. | Contrato tecnico de recurso do Nucleo. | Nome do pacote ainda esta sob `orcamentos`. | Ja esta parcialmente separado da tela. |
| Heranca de recurso | `src/lib/orcamentos/resource-inheritance.ts` | Herda atributos tecnicos do cadastro mestre para o recurso usado na frente. | Resolvedor de snapshot tecnico do recurso no Nucleo. | Aplicado na tela de orcamentos ao adicionar recurso. | Deve continuar preservando snapshot por contexto. |
| Engenharia economica | `src/lib/orcamentos/economic-engine.ts` / `calcularConsolidacaoEconomica` | Consolida venda, markup, custo indireto, margem, impostos, ajuste comercial e total. | Pode permanecer como camada economica consumidora do Nucleo, separada do motor tecnico. | Ainda mistura custos vindos do motor com regras comerciais de proposta. | Fronteira futura deve separar custo operacional de formacao comercial. |
| Tela de orcamentos | `src/features/orcamentos/orcamentos-manager.tsx` | Monta estado local, chama motores, exibe frentes, recursos, custos, proposta e validacoes de UI. | Consumidor do Nucleo. | Forte acoplamento com inputs, estado, previews e persistencia do orcamento. | Nao deve ser fonte de regra tecnica permanente. |
| Servico de orcamentos | `src/server/services/orcamentos/service.ts` | Valida referencias, persiste orcamento, cenarios, frentes, itens, premissas, propostas e snapshots. | Consumidor/persistidor do contexto ORCAMENTO. | Contem criacao de snapshots comerciais e estruturas especificas do orcamento. | Nao deve receber calculos duplicados que pertencam ao Nucleo. |
| Precificacao/snapshot | `src/server/services/orcamentos/pricing.ts` e rotinas `buildPricingSnapshot`/`buildPropostaSnapshot` | Produz fotografia comercial para proposta e revisoes. | Fora do Nucleo; consumidor de resultados do Nucleo. | Depende de proposta, cenario, itens comerciais e modo de exibicao do PDF. | Deve usar saidas calculadas, nao redefinir regra tecnica. |
| PDF da proposta | `src/server/pdf/orcamento-proposta.ts` e `src/server/pdf/orcamento-proposta-renderer.tsx` | Seleciona itens comerciais, monta frentes, valores e documento da proposta. | Fora do Nucleo. | Depende de snapshot comercial, proposta e layout PDF. | Documento externo nao deve expor memoria interna do Nucleo. |
| Validacao do orcamento | `src/lib/validators/orcamento.ts` | Valida payload de orcamento, itens, frentes, propostas e regras de fluxo. | Parcialmente fora do Nucleo; validacoes tecnicas podem migrar. | Contem regras de negocio do modulo e contratos de API. | Separar futuramente validacao tecnica de validacao de fluxo. |
| Cadastros mestres | `Servico`, `Equipamento`, `Material` em `prisma/schema.prisma` | Guardam recursos, servicos e dados tecnicos/comerciais. | Bibliotecas tecnicas consumidas pelo Nucleo. | Hoje tambem atendem telas de cadastro e operacao. | Propriedades tecnicas permanentes devem ser consumidas como snapshot. |

## Acoplamentos identificados

- Os arquivos do motor estao fisicamente em `src/lib/orcamentos`, embora o conhecimento seja reutilizavel.
- A tela de orcamentos monta o input do motor a partir do estado local, misturando UI, hidratacao e contrato tecnico.
- `OrcamentoItem` representa tanto item comercial quanto recurso operacional, exigindo filtros e normalizacao antes do calculo.
- A engenharia economica usa resultado tecnico e regras comerciais no mesmo fluxo de preview.
- O servico de orcamentos monta snapshots de proposta a partir do estado do orcamento e da consolidacao economica.
- O PDF depende de snapshots comerciais e deve permanecer fora do Nucleo.
- Validacoes tecnicas de unidade/capacidade ainda convivem com validacoes especificas de payload do orcamento.

## Fronteiras propostas

### Dentro do Nucleo

- dominio do recurso operacional;
- motor de custos operacionais;
- motor de transporte e viagens;
- resolucao de produtividade;
- calculo de prazo;
- memoria de calculo;
- compatibilidade de unidades;
- contratos comuns de entrada e saida;
- normalizacao tecnica de recursos e quantidades.

### Fora do Nucleo

- proposta comercial;
- PDF;
- aceite;
- status comercial;
- cliente;
- faturamento;
- recebimento;
- layout de tela;
- permissoes;
- fluxo de aprovacao;
- nomenclatura comercial exibida ao cliente.

## Terminologia oficial

| Termo | Definicao |
| --- | --- |
| Nucleo de Engenharia Operacional | Camada central de conhecimento tecnico e economico. |
| Motor de Custos Operacionais | Parte do Nucleo responsavel pelo calculo economico dos recursos. |
| Contexto de Calculo | Origem e significado da analise: ORCAMENTO, PLANEJAMENTO EXECUTIVO, EXECUCAO ou SIMULACAO. |
| Dado Previsto | Informacao usada em orcamento ou planejamento. |
| Dado Realizado | Fato registrado na execucao. |
| Dado Simulado | Hipotese usada para comparacao. |
| Memoria de Calculo | Explicacao rastreavel dos resultados produzidos pelo Nucleo. |
| Baseline | Referencia congelada usada para comparacao futura. |

## Filosofia de evolucao

Toda nova funcionalidade devera responder as seguintes perguntas antes de ser implementada:

1. Esta regra pertence ao Nucleo ou apenas ao modulo?
2. Ela podera ser reutilizada por outro contexto?
3. Estamos registrando fatos ou armazenando resultados?
4. Estamos produzindo conhecimento ou apenas armazenando dados?
5. Esta implementacao aproxima a BasePro do raciocinio de um engenheiro experiente?

Caso a resposta seja negativa, a arquitetura devera ser revista antes da implementacao.

## Visao arquitetural

A BasePro nao e composta por modulos independentes.

Ela e composta por um Nucleo de Engenharia Operacional compartilhado, utilizado por diferentes contextos de trabalho.

Os modulos representam diferentes momentos do ciclo de vida de uma obra ou servico.

O conhecimento tecnico permanece unico, consistente e reutilizavel.

## Proximos passos recomendados

1. Mapear tecnicamente o que ainda esta acoplado ao modulo de Orcamentos.
2. Definir o contrato comum de entrada e saida do Nucleo.
3. Adaptar o motor para reconhecer os contextos ORCAMENTO, EXECUCAO e SIMULACAO, sem alterar formulas.
4. Criar o esqueleto do modulo Execucao e Resultado.
5. Implementar o caso-piloto L.Flex - Frente 1.

Esses passos nao devem ser executados nesta etapa.

## Regra de preservacao

Enquanto o Nucleo nao for extraido fisicamente, qualquer evolucao deve respeitar:

- nao duplicar formulas em modulos consumidores;
- nao usar PDF ou proposta como fonte de regra tecnica;
- preservar snapshots historicos;
- manter compatibilidade com orcamentos existentes;
- priorizar simplicidade operacional quando houver conflito entre arquitetura e fluxo rapido.

Principio final:

> Tudo no BasePro deve pensar como um engenheiro experiente. O Nucleo de Engenharia Operacional e o local onde esse raciocinio tecnico e estruturado e reutilizado pela plataforma.

A BasePro nao e um conjunto de modulos. Ela e um sistema de engenharia que organiza conhecimento, auxilia decisoes, aprende com a execucao e evolui continuamente a partir da experiencia acumulada.

O Nucleo de Engenharia Operacional e o coracao tecnico responsavel por tornar esse ciclo possivel.
