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

## Painel Master

A terceira etapa criou uma area administrativa exclusiva para usuarios `MASTER`:

```text
/master
```

Essa tela permite:

- listar empresas cadastradas;
- visualizar contadores por empresa;
- cadastrar novas empresas;
- editar dados cadastrais da empresa;
- listar usuarios vinculados a uma empresa;
- criar usuarios vinculados a uma empresa;
- alterar `roleEmpresa`;
- ativar ou inativar usuarios.

Usuarios comuns sao bloqueados no backend e redirecionados caso tentem acessar a rota.

## Listagem de empresas

O Painel Master exibe, para cada empresa:

- nome fantasia;
- razao social;
- CNPJ;
- status;
- plano;
- quantidade de usuarios;
- quantidade de clientes;
- quantidade de obras;
- quantidade de lancamentos;
- quantidade de medicoes;
- data de criacao.

Os contadores sao calculados diretamente pelas relacoes do Prisma, sem alterar as regras de negocio dos modulos operacionais.

## Cadastro e edicao de empresa

Campos disponiveis:

- nome fantasia;
- razao social;
- CNPJ;
- e-mail;
- telefone;
- endereco;
- cidade;
- estado;
- CEP;
- logoUrl;
- corPrimaria;
- status;
- plano.

O campo `nome` tecnico da empresa e mantido sincronizado com o nome fantasia para preservar compatibilidade com telas e relatorios existentes.

## Usuarios por empresa

No Painel Master, ao selecionar uma empresa, e possivel criar e editar usuarios vinculados a ela.

Roles SaaS permitidas para usuarios de empresa:

- `ADMIN_EMPRESA`;
- `GERENTE`;
- `OPERADOR`;
- `FINANCEIRO`;
- `VISUALIZADOR`.

Ao criar ou editar um usuario, o sistema tambem sincroniza uma role legada para preservar as permissoes atuais do BasePro:

```text
ADMIN_EMPRESA -> ADMIN
GERENTE       -> GESTOR
OPERADOR      -> OPERACIONAL
FINANCEIRO    -> FINANCEIRO
VISUALIZADOR  -> CONSULTA
```

Usuarios `MASTER` devem ser mantidos fora do cadastro operacional de usuarios por empresa.

## Seletor de empresa para MASTER

O cabecalho do sistema passa a exibir um seletor de escopo apenas para usuarios `MASTER`.

Opcoes:

- `Visao global`: o MASTER visualiza os dados operacionais sem filtro automatico de empresa.
- Empresa especifica: o MASTER passa a visualizar telas operacionais, dashboards e APIs escopadas para a empresa selecionada.

O seletor grava a empresa escolhida em cookie HTTP-only:

```text
basepro_master_empresa_id
```

A camada central de tenant usa esse cookie para aplicar o `empresaId` automaticamente nas queries operacionais.

As rotas do Painel Master usam bypass controlado de tenant para permitir administrar qualquer empresa, mesmo quando o MASTER estiver visualizando uma empresa especifica nas telas operacionais.

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

As etapas 1, 2 e 3 criaram a fundacao, isolamento central em backend e Painel Master.

Proximas etapas recomendadas:

1. Criar Configuracoes da Empresa para usuarios `ADMIN_EMPRESA`.
2. Ajustar validacoes de relacionamento com mensagens mais especificas quando um vinculo nao pertencer a empresa logada.
3. Revisar indices unicos globais para unicidade por empresa quando necessario.
4. Criar painel financeiro/comercial do SaaS, se necessario.

## Observacao importante sobre codigos unicos

Alguns cadastros ainda possuem campos globais `@unique`, como codigo, placa/tag e numero de ordem.

Para SaaS completo, alguns desses campos devem virar unicidade composta por empresa, por exemplo:

```text
@@unique([empresaId, codigo])
```

Essa mudanca foi deixada para uma etapa propria para evitar quebrar cadastros e imports existentes.

## Checklist manual de testes de isolamento

### Preparacao

1. Criar ou selecionar duas empresas no Painel Master: Empresa A e Empresa B.
2. Criar um usuario comum para cada empresa.
3. Criar pelo menos um cliente, uma obra, um lancamento e uma medicao em cada empresa.

### Testes com usuario da Empresa A

1. Fazer login com usuario da Empresa A.
2. Confirmar que clientes da Empresa B nao aparecem em `/clientes`.
3. Confirmar que obras da Empresa B nao aparecem em `/obras`.
4. Confirmar que lancamentos da Empresa B nao aparecem em `/lancamentos` e nos dashboards.
5. Confirmar que medicoes da Empresa B nao aparecem em `/medicoes`.
6. Tentar acessar/editar/excluir um registro conhecido da Empresa B por URL direta.
7. Resultado esperado: acesso bloqueado, registro nao encontrado ou acao recusada pelo backend.

### Testes com usuario da Empresa B

1. Repetir os mesmos testes da Empresa A invertendo os dados.
2. Resultado esperado: Empresa B nao ve nem altera dados da Empresa A.

### Testes com MASTER

1. Fazer login como `MASTER`.
2. Acessar `/master` e confirmar listagem global de empresas.
3. Usar `Visao global` no seletor do cabecalho.
4. Confirmar que dashboards e consultas operacionais aparecem em visao global.
5. Selecionar Empresa A no seletor.
6. Confirmar que telas operacionais passam a exibir apenas dados da Empresa A.
7. Selecionar Empresa B no seletor.
8. Confirmar que telas operacionais passam a exibir apenas dados da Empresa B.
9. Voltar para `Visao global`.
10. Confirmar que o Painel Master continua listando e editando todas as empresas.

### PDFs e relatorios

1. Gerar PDF de medicao, ordem de compra ou proposta com usuario comum.
2. Confirmar que os dados e identidade visual pertencem a empresa logada.
3. Com MASTER, selecionar uma empresa no cabecalho.
4. Gerar o mesmo tipo de PDF.
5. Confirmar que o PDF usa dados e identidade da empresa selecionada.
