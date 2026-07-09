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

## Isolamento automatico aplicado nas APIs

Na segunda etapa foi criada uma camada central de isolamento em:

```text
src/lib/tenant-store.ts
src/lib/prisma.ts
src/lib/auth.ts
```

Fluxo aplicado:

1. A rota/API chama `auth()`.
2. O `auth()` grava no contexto da requisicao:
   - `usuarioId`
   - `empresaId`
   - `roleEmpresa`
   - `isMaster`
3. O Prisma Client intercepta consultas e gravacoes dos modelos operacionais.
4. Para usuario comum, o Prisma injeta automaticamente:

```ts
where: {
  empresaId: usuarioLogado.empresaId
}
```

5. Em criacoes e atualizacoes, o Prisma preenche automaticamente:

```ts
data: {
  empresaId: usuarioLogado.empresaId
}
```

6. Em criacoes aninhadas, como ordem de compra com itens e parcelas, o `empresaId` tambem e propagado para os registros filhos.

Essa estrategia evita depender apenas do frontend e reduz o risco de uma rota operacional ficar sem filtro de empresa.

## Comportamento do usuario MASTER

Usuario `MASTER` nao recebe filtro automatico por empresa.

Isso preserva a futura visao global do Painel Master e evita quebrar telas administrativas.

Enquanto ainda nao existir seletor de empresa para MASTER, as telas operacionais continuam funcionando com visao global para esse perfil.

## PDFs e relatorios

Os PDFs principais passaram a considerar a empresa logada:

- ordem de compra;
- proposta de orcamento;
- relatorio de medicao, usando logo da empresa;
- relatorio de lancamentos/romaneios, usando logo da empresa.

Os PDFs de ordem de compra e proposta recebem tambem:

- nome fantasia;
- razao/nome;
- CNPJ;
- endereco;
- cidade/UF/CEP;
- telefone;
- e-mail.

## Autenticacao

A sessao do NextAuth agora carrega:

- `empresaId`
- `roleEmpresa`
- `isMaster`
- roles legadas existentes

Usuarios comuns so fazem login se a empresa estiver ativa e nao excluida.

Usuario `MASTER` representa acesso administrativo global do SaaS.

## O que ainda falta nas proximas etapas

As etapas 1 e 2 criaram a fundacao e o isolamento central em backend.

Proximas etapas recomendadas:

1. Criar Painel Master.
2. Criar Configuracoes da Empresa.
3. Criar seletor de empresa para MASTER visualizar uma empresa especifica nas telas operacionais.
4. Ajustar validacoes de relacionamento com mensagens mais especificas quando um vinculo nao pertencer a empresa logada.
5. Revisar indices unicos globais para unicidade por empresa quando necessario.

## Observacao importante sobre codigos unicos

Alguns cadastros ainda possuem campos globais `@unique`, como codigo, placa/tag e numero de ordem.

Para SaaS completo, alguns desses campos devem virar unicidade composta por empresa, por exemplo:

```text
@@unique([empresaId, codigo])
```

Essa mudanca foi deixada para uma etapa propria para evitar quebrar cadastros e imports existentes.
