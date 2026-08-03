# Sprint 2A - Storage do PDF oficial de propostas

## Decisao

O PDF oficial da proposta pode ser persistido para evitar renderizacao repetida na rota de leitura oficial.

O armazenamento fica atras da interface `OfficialProposalPdfStorage`, com backend local inicial para desenvolvimento e VPS com disco persistente.

## Referencia salva

O banco deve receber apenas referencia portatil no formato:

```text
/uploads/orcamentos/propostas/{empresaId}/{orcamentoId}/{propostaId}/{arquivo}.pdf
```

Nao salvar caminhos absolutos de Windows, Linux, Vercel ou VPS.

## Backend local

Por padrao, fora da Vercel, o backend local usa:

```text
public/uploads/orcamentos/propostas
```

Tambem pode ser configurado por:

```text
BASEPRO_OFFICIAL_PROPOSAL_PDF_STORAGE_DIR
```

O backend local:

- normaliza segmentos de caminho;
- impede path traversal;
- cria diretorios sob demanda;
- grava com arquivo temporario e rename;
- separa arquivos por empresa, orcamento e proposta.

## VPS

Em VPS, o backend local e adequado quando o diretorio configurado estiver em disco persistente.

Recomendacao:

```text
BASEPRO_OFFICIAL_PROPOSAL_PDF_STORAGE_DIR=/var/basepro/uploads/orcamentos/propostas
```

O servidor web deve publicar essa referencia ou a aplicacao deve continuar servindo pela rota oficial.

## Vercel

Na Vercel, filesystem local de funcao nao deve ser tratado como persistente.

Sem `BASEPRO_OFFICIAL_PROPOSAL_PDF_STORAGE_DIR`, o storage local fica indisponivel e a emissao preserva a regra atual:

- a proposta pode ser emitida;
- o banco recebe a URL da rota oficial da API;
- a rota oficial renderiza por fallback quando nao houver arquivo persistido.

Isso evita o estado inconsistente:

```text
proposta emitida + referencia de arquivo persistido invalida
```

## Futuro object storage

Para persistencia duravel em Vercel, implementar um backend da mesma interface usando:

- Vercel Blob;
- Supabase Storage;
- S3 compativel.

Essa integracao nao foi adicionada nesta sprint para nao criar dependencia obrigatoria de fornecedor.
