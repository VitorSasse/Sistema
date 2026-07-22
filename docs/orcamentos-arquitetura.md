# Arquitetura do modulo de Orcamentos

## Modelo oficial

O Orcamento nao possui mais uma natureza global de precificacao.

A classificacao Comercial ou Operacional pertence exclusivamente a cada Frente de Servico.

Fluxo oficial:

```text
Orcamento
-> Frentes de Servico
-> Natureza da Frente
-> Comercial ou Operacional
```

## Regras

- Frente Comercial: utiliza itens comerciais e preco direto.
- Frente Operacional: utiliza planejamento, metodo executivo, recursos, engenharia economica e motor operacional.
- Um mesmo orcamento pode combinar frentes comerciais e frentes operacionais.
- O campo global legado `tipo` deve ser tratado apenas como compatibilidade tecnica.
- Novas regras de calculo, tela, proposta e PDF nao devem depender do `tipo` global.
- Novas frentes nascem como Comerciais por padrao e podem ser alteradas para Operacionais.

## Proposta comercial

A proposta comercial nao deve expor a classificacao interna do orcamento.

O PDF deve apresentar cliente, obra, titulo, objeto, frentes, itens, valores, premissas, condicoes e aceite.
