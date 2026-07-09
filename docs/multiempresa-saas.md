# Fundacao Multiempresa / SaaS

## Objetivo desta etapa

Preparar o BasePro OS para operar como SaaS multiempresa usando banco unico e isolamento por `empresaId`.

Esta entrega cria a fundacao tecnica sem alterar as regras de negocio atuais dos modulos de fichas, medicoes, compras, frota, manutencao e orcamentos.

## Arquitetura adotada

- Banco unico PostgreSQL/Supabase.
- Separacao logica por coluna `empresaId`.
- Empresa padrao para preservar os dados atuais.
- Usuario vinculado a uma empresa.
- Papel SaaS separado das permissoes legadas do sistema.

## Empresa padrao

Todos os dados existentes foram vinculados inicialmente a:

```text
JMIX TERRAPLANAGEM
ID: 00000000-0000-0000-0000-000000000001
```

Esse default permite que o sistema continue funcionando enquanto as rotas sao atualizadas gradualmente para preencher `empresaId` com a empresa do usuario logado.

## Novo modelo Empresa

Foi criado o model `Empresa` com dados de identidade, contato, status, plano e configuracoes visuais:

- nome
- nomeFantasia
- razaoSocial
- cnpj
- email
- telefone
- endereco
- cidade
- estado
- cep
- logoUrl
- corPrimaria
- status
- plano
- deletedAt

## Usuario multiempresa

O model `Usuario` agora possui:

- `empresaId`
- `roleEmpresa`

Roles SaaS disponiveis:

- `MASTER`
- `ADMIN_EMPRESA`
- `GERENTE`
- `OPERADOR`
- `FINANCEIRO`
- `VISUALIZADOR`

Usuarios que ja possuiam a role legada `ADMIN` foram promovidos para `MASTER` na migracao inicial.

## Tabelas preparadas com empresaId

Foram adicionados `empresaId`, relacao com `Empresa` e indice nas principais tabelas operacionais:

- clientes
- obras
- fornecedores
- centros de custo
- catalogo de compras
- plano de contas
- equipamentos
- ordens de compra, itens e parcelas
- orcamentos, frentes, itens, premissas e formacao de preco
- materiais
- servicos
- colaboradores
- precos por cliente/obra
- fichas e romaneios
- lancamentos e romaneios
- leituras de horimetro/KM
- planos e agendas de manutencao
- programacao
- manutencoes executadas
- alertas
- anexos
- medicoes e itens
- historico de alteracoes
- logs de auditoria

## Helpers criados

Arquivo:

```text
src/lib/empresa-context.ts
```

Funcoes principais:

- `getCurrentUser()`
- `getCurrentEmpresaId()`
- `requireEmpresaAccess()`
- `requireRole()`
- `validateApiEmpresaAccess()`
- `scopedEmpresaWhere()`
- `empresaData()`

Esses helpers devem ser usados nas proximas etapas para atualizar cada rota/API sem duplicar logica de tenant.

## Autenticacao

A sessao do NextAuth agora carrega:

- `empresaId`
- `roleEmpresa`
- `isMaster`
- roles legadas existentes

Usuarios comuns so fazem login se a empresa estiver ativa e nao excluida.

Usuario `MASTER` representa acesso administrativo global do SaaS.

## O que ainda falta nas proximas etapas

Esta etapa nao conclui todo o isolamento multiempresa. Ela cria a fundacao.

Proximas etapas recomendadas:

1. Atualizar rotas API para usar `scopedEmpresaWhere()`.
2. Preencher `empresaId` via `empresaData(user)` em todos os creates.
3. Ajustar validacoes de relacionamento para garantir que cliente, obra, equipamento e demais vinculos pertencam a mesma empresa.
4. Criar Painel Master.
5. Criar Configuracoes da Empresa.
6. Atualizar PDFs para usarem identidade da empresa logada.
7. Atualizar dashboards para filtrar por empresa.
8. Revisar indices unicos globais para unicidade por empresa quando necessario.

## Observacao importante sobre codigos unicos

Alguns cadastros ainda possuem campos globais `@unique`, como codigo, placa/tag e numero de ordem.

Para SaaS completo, alguns desses campos devem virar unicidade composta por empresa, por exemplo:

```text
@@unique([empresaId, codigo])
```

Essa mudanca foi deixada para uma etapa propria para evitar quebrar cadastros e imports existentes.
