# Backup e rollback do codigo

Este documento explica como voltar o sistema para uma versao anterior do codigo usando Git.

## Objetivo

Permitir que uma atualizacao com problema seja revertida rapidamente para uma versao estavel.

Este processo cobre apenas o codigo do sistema.

Nao altera o banco Supabase PostgreSQL.

## Conceitos usados

- `main`: versao estavel em producao.
- `develop`: versao de desenvolvimento e validacao.
- `feature/nome`: branch para uma funcionalidade ou correcao especifica.
- `tag`: ponto fixo no historico representando uma versao estavel.

Exemplos de tags:

- `v1.0.0`
- `v1.1.0`
- `v1.2.0`

## Criar backup da versao atual

Antes de publicar uma versao estavel, crie uma tag:

```bash
npm run version:create -- v1.1.0 "Versao validada para producao"
git push origin v1.1.0
```

Tambem e possivel criar a tag usando a versao registrada em `VERSION.md`:

```bash
npm run backup:code
git push origin v1.0.0
```

## Procedimento de rollback

1. Identificar a ultima versao estavel:

```bash
git tag --list --sort=-v:refname
```

2. Voltar para a tag desejada:

```bash
npm run rollback:code -- v1.0.0
```

3. Reinstalar dependencias, se necessario:

```bash
npm install
```

4. Rodar o build:

```bash
npm run build
```

5. Fazer novo deploy da versao selecionada.

6. Validar o funcionamento no ambiente publicado.

## Rollback com nova branch de correcao

Se precisar corrigir algo a partir de uma tag antiga:

```bash
git switch --detach v1.0.0
git switch -c hotfix/rollback-v1.0.0
npm install
npm run build
```

Depois de validar:

```bash
git switch develop
git merge hotfix/rollback-v1.0.0
git switch main
git merge develop
```

## Cuidados importantes

- Nao faca rollback de banco pelo Git. Banco Supabase precisa de estrategia propria.
- Sempre rode `npm run build` antes de publicar.
- Sempre confirme a tag que esta usando.
- Sempre registre a alteracao no `CHANGELOG.md`.
- Nao crie tag com alteracoes nao commitadas.
