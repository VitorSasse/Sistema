# Fluxo Git do sistema

Este projeto usa um fluxo simples com `main`, `develop` e branches `feature`.

## Branches principais

### main

Branch estavel e usada para producao.

Regras:

- Deve conter apenas codigo validado.
- Deve receber merge somente depois de passar por `develop`.
- Antes de cada publicacao em producao, deve existir uma tag de versao.

### develop

Branch de desenvolvimento e testes.

Regras:

- Recebe merges de branches `feature`.
- Deve ser usada para validar alteracoes antes de entrar na `main`.
- Pode conter funcionalidades prontas para teste, mas ainda nao publicadas.

### feature/nome-da-funcionalidade

Branch para novas funcionalidades, ajustes e correcoes.

Exemplos:

- `feature/dashboard-custos`
- `feature/correcao-pdf-medicao`
- `feature/git-backup-versionamento`

## Fluxo recomendado

1. Atualizar a `develop`:

```bash
git switch develop
git pull origin develop
```

2. Criar a branch de trabalho:

```bash
git switch -c feature/nome-da-funcionalidade
```

3. Fazer as alteracoes e validar:

```bash
npm run build
```

4. Commitar:

```bash
git add .
git commit -m "Descricao objetiva da alteracao"
```

5. Enviar a feature:

```bash
git push origin feature/nome-da-funcionalidade
```

6. Merge em `develop`:

```bash
git switch develop
git merge feature/nome-da-funcionalidade
git push origin develop
```

7. Validar a `develop`:

```bash
npm run build
```

8. Preparar versao estavel:

```bash
git switch main
git pull origin main
git merge develop
```

9. Atualizar arquivos de versao:

```bash
npm run changelog:update -- v1.1.0 "Resumo da versao publicada"
```

Edite tambem o `VERSION.md` para a nova versao.

10. Commitar a versao:

```bash
git add CHANGELOG.md VERSION.md
git commit -m "Prepara versao v1.1.0"
```

11. Criar tag:

```bash
npm run version:create -- v1.1.0 "Versao estavel v1.1.0"
git push origin main
git push origin v1.1.0
```

## Padrao de versao

Usar SemVer:

- `v1.0.0`: primeira versao estavel.
- `v1.1.0`: nova funcionalidade.
- `v1.1.1`: correcao pequena.
- `v2.0.0`: mudanca grande ou incompatibilidade.

## Padrao de commits

Use mensagens curtas e objetivas:

```bash
git commit -m "Corrige calculo da dashboard mensal"
git commit -m "Adiciona relatorio de ordem de compra"
git commit -m "Ajusta layout do PDF da medicao"
```

## Scripts disponiveis

### Verificar e criar tag da versao atual

```bash
npm run backup:code
```

### Criar tag de versao

```bash
npm run version:create -- v1.1.0 "Descricao da versao"
```

### Voltar para uma tag

```bash
npm run rollback:code -- v1.0.0
```

### Atualizar changelog

```bash
npm run changelog:update -- v1.1.0 "Alteracao registrada"
```

## Regra principal

Nao trabalhar diretamente na `main`.

Toda alteracao deve nascer em `feature`, passar por `develop` e so depois entrar na `main`.
