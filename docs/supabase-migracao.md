**Migracao Para Supabase**

Este projeto foi preparado para usar PostgreSQL no Supabase com Prisma.

**Variaveis de ambiente**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `DATABASE_URL`
- `DIRECT_URL`

Exemplo:

```env
NEXT_PUBLIC_SUPABASE_URL="https://seu-project-ref.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
DATABASE_URL="postgresql://postgres:PASSWORD@db.seu-project-ref.supabase.co:5432/postgres?sslmode=require"
DIRECT_URL="postgresql://postgres:PASSWORD@db.seu-project-ref.supabase.co:5432/postgres?sslmode=require"
```

**Prisma**
- `DATABASE_URL` e usada pela aplicacao
- `DIRECT_URL` e usada para operacoes administrativas e migrations

**Fluxo recomendado**
1. Criar o projeto no Supabase
2. Configurar as variaveis acima no `.env`
3. Rodar `npx prisma generate`
4. Aplicar o schema
5. Restaurar os dados
6. Validar o sistema com `npm run build`

**Anexos**
Os anexos podem continuar locais em uma primeira fase. A migracao para Supabase Storage pode ser feita depois, sem bloquear a migracao do banco.
