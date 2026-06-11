# Restauracao local de backup

Este guia explica como pegar um backup salvo no repositorio `Backup-Sistema` e restaurar em um PostgreSQL local para rodar o sistema no computador.

## O que o backup contem

Cada backup gerado pelo workflow semanal salva:

- `roles.sql`
- `schema.sql`
- `data.sql`
- `manifest.txt`

Esses arquivos ficam em uma pasta no formato:

```text
supabase/<timestamp-do-backup>
```

## Pre-requisitos

- PostgreSQL instalado localmente
- `psql`, `createdb` e `dropdb` disponiveis no `PATH`
- um banco local vazio ou que possa ser recriado
- acesso aos arquivos do backup

## Restauracao com script PowerShell

O projeto possui o script:

```text
scripts/restore-backup-local.ps1
```

### Exemplo de uso

```powershell
$env:PGPASSWORD = "SUA_SENHA_LOCAL"
.\scripts\restore-backup-local.ps1 `
  -BackupDir "C:\caminho\para\supabase\2026-05-15T07-00-00Z" `
  -DatabaseName "gestao_fichas_restore" `
  -Username "postgres" `
  -Host "localhost" `
  -Port 5432 `
  -DropExistingDatabase
```

### O que o script faz

1. valida a existencia de `roles.sql`, `schema.sql` e `data.sql`
2. aplica `roles.sql` no banco `postgres`
3. recria o banco informado, se voce pedir com `-DropExistingDatabase`
4. aplica `schema.sql`
5. aplica `data.sql`

## Restauracao manual com psql

Se preferir fazer sem script:

### 1. Defina a senha local

```powershell
$env:PGPASSWORD = "SUA_SENHA_LOCAL"
```

### 2. Aplique os roles

```powershell
psql -h localhost -p 5432 -U postgres -d postgres -f "C:\backup\roles.sql"
```

### 3. Recrie o banco

```powershell
dropdb --if-exists -h localhost -p 5432 -U postgres gestao_fichas_restore
createdb -h localhost -p 5432 -U postgres gestao_fichas_restore
```

### 4. Aplique schema e dados

```powershell
psql -h localhost -p 5432 -U postgres -d gestao_fichas_restore -f "C:\backup\schema.sql"
psql -h localhost -p 5432 -U postgres -d gestao_fichas_restore -f "C:\backup\data.sql"
```

## Apontar o sistema para o banco restaurado

Depois da restauracao, ajuste o `.env` local para o banco restaurado:

```env
DATABASE_URL="postgresql://postgres:SUA_SENHA_LOCAL@localhost:5432/gestao_fichas_restore"
DIRECT_URL="postgresql://postgres:SUA_SENHA_LOCAL@localhost:5432/gestao_fichas_restore"
```

## Preparar o projeto

Depois de trocar o `.env`:

```powershell
npx prisma generate
npm run dev
```

## Observacoes importantes

- `roles.sql` pode exigir permissao de administrador local do PostgreSQL
- o restore do banco nao cobre arquivos locais fora do banco
- se houver anexos fora do Postgres, eles precisam ser restaurados separadamente
- se o banco local ja tiver conexoes abertas, o `dropdb` pode falhar; nesse caso feche as conexoes antes
