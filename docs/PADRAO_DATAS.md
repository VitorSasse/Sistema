# Padrao de datas de calendario

## Objetivo

Evitar o erro em que uma data selecionada em campos `type="date"` aparece ou salva como o dia anterior por causa de conversao UTC.

## Regra principal

Datas de calendario no formato `aaaa-mm-dd` devem ser tratadas como data local, sem conversao implicita por `new Date("aaaa-mm-dd")`.

Use sempre o helper central:

```ts
import {
  formatDateDisplay,
  formatDateInputValue,
  parseDateOnlyEnd,
  parseDateOnlyStart,
  parseOptionalDateOnlyStart
} from "@/lib/utils/date";
```

## Como usar

- Para salvar data de calendario recebida do formulario: `parseDateOnlyStart(value)`.
- Para filtro de inicio de periodo: `parseDateOnlyStart(value)`.
- Para filtro de fim de periodo: `parseDateOnlyEnd(value)`.
- Para preencher input `type="date"`: `formatDateInputValue(value)`.
- Para exibir data ao usuario: `formatDateDisplay(value)`.

## O que evitar

Nao use:

```ts
new Date("2026-06-01")
date.toISOString().slice(0, 10)
```

Esses formatos podem deslocar o dia conforme timezone e horario.

## Excecoes

Timestamps reais de auditoria, como `createdAt`, `updatedAt`, `deletedAt` e `new Date()` para registrar o momento atual, continuam usando `Date` normalmente.

Calculos internos que ja recebem um objeto `Date` tambem podem copiar a data com `new Date(dataExistente)`.
