# Sistema de Gestao de Fichas e Medicao

Base inicial do MVP para uma empresa de terraplenagem.

## Stack proposta

- Next.js 15 com App Router e TypeScript
- PostgreSQL
- Prisma ORM
- NextAuth/Auth.js para autenticacao por credenciais
- Zod para validacao
- React Hook Form para formularios
- TanStack Table para tabelas operacionais
- Tailwind CSS para UI
- React PDF para emissao inicial de relatorios

## Estrutura inicial

- `docs/01-modelagem-funcional.md`: ETAPA 1
- `docs/02-arquitetura-tecnica.md`: ETAPA 2
- `prisma/schema.prisma`: schema inicial do banco
- `src/app`: base do frontend
- `src/server`: camadas de dominio, servicos e repositorios
- `src/components`: componentes reutilizaveis

## Direcao da primeira versao

1. Estruturar autenticacao e layout base.
2. Implementar cadastros mestres.
3. Implementar lancamento diario com validacoes.
4. Implementar historico e auditoria.
5. Implementar medicao quinzenal e PDF.

## Backup

- Workflow semanal de backup Supabase: `.github/workflows/weekly-supabase-backup.yml`
- Guia rapido: `docs/backups.md`
# Sistema
