# Sprint 1 - Instrumentacao e diagnostico de performance

## Objetivo

Coletar metricas reais de performance sem alterar regras de negocio, queries, indices, componentes ou fluxos funcionais.

## Ativacao

Use as variaveis abaixo em desenvolvimento ou homologacao:

```env
PERFORMANCE_MONITORING_ENABLED=true
PERFORMANCE_QUERY_LOG_ENABLED=true
PERFORMANCE_LOG_PAYLOAD_SIZE=true
PERFORMANCE_SAMPLE_RATE=1
PERFORMANCE_SLOW_REQUEST_MS=800
PERFORMANCE_CRITICAL_REQUEST_MS=2000
PERFORMANCE_SLOW_QUERY_MS=300
PERFORMANCE_MAX_SLOW_QUERIES_PER_REQUEST=10
NEXT_PUBLIC_PERFORMANCE_MONITORING_ENABLED=true
```

Em producao, manter desligado por padrao. Se for necessario ligar, usar amostragem menor, por exemplo `PERFORMANCE_SAMPLE_RATE=0.1`.

## Formato dos logs

Os logs usam `schemaVersion: 1` e tipos:

- `performance.request`
- `performance.error`
- `performance.frontend`

Exemplo:

```json
{
  "schemaVersion": 1,
  "type": "performance.request",
  "requestId": "req_abc123",
  "route": "/api/medicoes",
  "method": "POST",
  "empresaId": "empresa_01",
  "tenantContextStatus": "available",
  "durationMs": 1370,
  "instrumentationMs": 2.4,
  "estimatedOperationMs": 1367.6,
  "queryCount": 14,
  "databaseAccumulatedMs": 980,
  "databaseWallClockMs": null,
  "payloadBytes": null,
  "classification": "slow"
}
```

## Dados sensiveis

Nao sao registrados:

- payloads completos;
- senhas, tokens, cookies ou chaves;
- texto de documentos;
- parametros completos de queries;
- conteudo de PDFs ou anexos.

O `empresaId` vem exclusivamente do contexto autenticado no backend. Quando o tenant ainda nao estiver definido, o log usa `empresaId: null` e `tenantContextStatus: missing`.

## Rotas instrumentadas nesta sprint

- `GET /api/dashboard/custos`
- `GET /api/dashboard/executivo`
- `GET /api/opcoes/operacionais`
- `GET /api/lancamentos`
- `POST /api/lancamentos`
- `GET /api/medicoes`
- `POST /api/medicoes`
- `GET /api/orcamentos`
- `POST /api/orcamentos`
- `GET /api/orcamentos/[id]`
- `PATCH /api/orcamentos/[id]`
- `DELETE /api/orcamentos/[id]`
- `GET /api/orcamentos/[id]/pdf`
- `GET /api/orcamentos/[id]/propostas/[propostaId]/pdf/preview`
- `GET /api/ordens-compra`
- `POST /api/ordens-compra`
- `GET /api/medicoes/[id]/pdf`
- `GET /api/ordens-compra/[id]/pdf`

## Rotas ainda nao instrumentadas

- Rotas auxiliares de anexos e arquivos binarios.
- Rotas especificas de status de medicoes.
- Dashboard mensal de faturamento e km/horimetro.

Justificativa: a sprint priorizou os gargalos apontados na auditoria sem espalhar alteracoes excessivas. Essas rotas entram na segunda rodada caso os logs confirmem gargalos nelas.

## Roteiro de coleta

Executar cada cenario pelo menos 4 vezes e descartar a primeira execucao quando houver aquecimento:

1. Abrir dashboard de custos mensal.
2. Abrir dashboard executivo mensal.
3. Abrir formulario de lancamento.
4. Listar lancamentos do dia.
5. Criar lancamento.
6. Editar lancamento.
7. Abrir formulario de medicao.
8. Listar medicoes.
9. Criar medicao pequena.
10. Criar medicao grande.
11. Abrir orcamento pequeno.
12. Editar orcamento grande.
13. Gerar previa de PDF de proposta.
14. Gerar PDF de medicao.
15. Criar ordem de compra pequena.
16. Criar ordem de compra com muitos itens.
17. Gerar PDF de ordem de compra.

## Benchmark de overhead

Comparar:

1. Monitoramento desligado.
2. Monitoramento ligado com `PERFORMANCE_QUERY_LOG_ENABLED=false`.
3. Monitoramento ligado com query log ativo.

Coletar media de:

- rota simples;
- rota com muitas queries;
- resposta grande;
- geracao de PDF.

Registrar `instrumentationMs` e comparar com `durationMs`.

## Criterios para gargalo comprovado

- Requisicao acima de 800 ms de forma recorrente.
- Salvamento acima de 1 segundo.
- Query isolada acima de 300 ms.
- Mais de 15 queries em requisicao simples.
- Payload acima de 500 KB.
- Processamento Node.js acima de 300 ms.
- Refetch completo apos alteracao pequena.
- Query semelhante repetida na mesma requisicao.
