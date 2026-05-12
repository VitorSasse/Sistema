# Backup semanal

Este projeto agora tem um workflow de GitHub Actions para gerar backup logico semanal do banco Supabase.

## O que o workflow gera

- `roles.sql`
- `schema.sql`
- `data.sql`
- `manifest.txt`

Os arquivos sobem como artifact do GitHub Actions com retencao de 30 dias.

## Quando roda

- automaticamente toda segunda-feira as `07:00 UTC`
- manualmente pelo botao `Run workflow` em `Actions`

## Segredo necessario no GitHub

Cadastre no repositorio:

- `Settings`
- `Secrets and variables`
- `Actions`
- `New repository secret`

Nome do secret:

```text
SUPABASE_BACKUP_DB_URL
```

Valor sugerido para este projeto:

```text
postgresql://postgres.cqmgrqtyfuytdciywujn:SUA_SENHA@aws-1-us-east-1.pooler.supabase.com:5432/postgres
```

Observacoes:

- para o backup, use a string do **Agrupador de sessoes** do Supabase
- nao use a `DATABASE_URL` da Vercel com `pgbouncer=true`
- substitua `SUA_SENHA` pela senha atual do banco

## Como testar agora

1. Abra `Actions` no GitHub.
2. Selecione `Weekly Supabase Backup`.
3. Clique em `Run workflow`.
4. Aguarde finalizar.
5. Abra a execucao e baixe o artifact gerado.

## O que este backup nao cobre

Este workflow faz backup do **banco de dados**.

Ele nao cobre automaticamente:

- arquivos locais
- anexos fora do banco
- objetos no Supabase Storage

Se os anexos do sistema ainda nao estiverem centralizados em Storage externo, vale tratarmos isso como proximo passo.
