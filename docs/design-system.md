# Design System do BasePro

## Objetivo

Esta camada define a identidade visual comum do BasePro sem alterar regras de negocio. Telas antigas continuam funcionando e recebem os estilos normalizados de forma progressiva.

## Principios

- Orbitron e usada somente em titulos principais (`h1`).
- Montserrat permanece como fonte de leitura para formularios, tabelas, cards e textos.
- Laranja identifica acao e foco. Nao deve ser usado como cor estrutural em grandes areas.
- Cards usam pouco contorno e apenas a sombra oficial adequada ao contexto.
- Componentes novos devem usar os primitives da pasta `src/components/ui`.

## Tokens

### Espacamento

`4`, `8`, `12`, `16`, `24`, `32`, `48` e `64` pixels.

### Raios

- Inputs: `10px`
- Botoes: `12px`
- Tabelas: `16px`
- Cards: `18px`
- Modais: `22px`

### Sombras

- `--shadow-sm`: elementos apoiados na pagina.
- `--shadow-md`: elementos em destaque ou hover.
- `--shadow-lg`: modais, popovers e menus flutuantes.

Nao criar sombras adicionais fora desses tres tokens.

## Componentes iniciais

- `Button`: variantes primary, secondary, ghost, danger e outline.
- `Input`: estados default, error, success, loading e disabled.
- `SectionCard`, `StatCard` e `StatusBadge`.
- `Avatar` com fallback por iniciais.
- `Modal` com fechamento por ESC e clique externo.
- `EmptyState` e `Skeleton`.

## Migracao progressiva

1. Reutilizar um componente existente antes de criar outro.
2. Nao duplicar validacoes de negocio dentro de componentes visuais.
3. Manter classes legadas enquanto a tela nao for migrada por completo.
4. Usar `design-system.css` para tokens e primitives; estilos especificos permanecem junto ao modulo atual.
