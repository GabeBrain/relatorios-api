# DEVELOPMENT.md — CNPJ Blumenau/Rio Verde → Matriz Setor x Porte

Notas de desenvolvimento para quem (humano ou Claude Code) continuar este projeto.
Não é o README de uso (veja [README.md](README.md)) — é o registro do que foi
aprendido rodando o pipeline de verdade contra a fonte de dados real, para não
redescobrir os mesmos problemas do zero na próxima sessão.

## Estado atual

O script roda ponta a ponta e já foi validado para dois municípios no mesmo mês
de referência (2026-07): Blumenau/SC (84.382 estabelecimentos ativos) e Rio
Verde/GO (36.400). A seleção de município já é parametrizável via CLI (ver
"Selecionar cidade e estado" abaixo) — não está mais hardcoded para Blumenau.

Arquivos do projeto:

```
cnpj_blumenau/
├── cnpj_blumenau.py       # pipeline principal (download, filtro, agregação)
├── exportar_xlsx.py       # gera o .xlsx formatado (matriz + aba Metodologia)
├── requirements.txt       # requests, pandas, openpyxl
├── README.md              # instruções de uso (usuário final)
├── DEVELOPMENT.md          # este arquivo
├── downloads/              # cache dos zips nacionais da Receita (~5 GB, reusável entre municípios)
└── saida/
    ├── {slug}_estabelecimentos.csv   # base auditável por município
    └── {slug}_setor_porte.xlsx       # matriz final por município
```

`{slug}` é derivado do nome do município (`slugify()`), ex.: `blumenau`,
`rio_verde`.

## Aprendizados desta rodada (2026-08)

### 1. A Receita descontinuou a listagem HTTP simples

O `BASE_URL` original do script (`https://arquivos.receitafederal.gov.br/dados/cnpj/dados_abertos_cnpj/`)
não existe mais como diretório público navegável — hoje retorna 404 ou
redireciona para um portal de login (SERPRO+). A RFB migrou o dataset para um
**compartilhamento público Nextcloud**:

- Página do share: `https://arquivos.receitafederal.gov.br/index.php/s/YggdBLfdninEJX9`
- Acesso programático: WebDAV em `https://arquivos.receitafederal.gov.br/public.php/webdav/`,
  autenticado com **Basic Auth usando o token do link como usuário e senha vazia**.
- Listagem de meses/arquivos: `PROPFIND` com header `Depth: 1` na raiz (ou em
  `/{AAAA-MM}/` para listar um mês específico) — não dá pra fazer `GET` simples
  e parsear HTML como antes.
- Download de um arquivo: `GET https://.../public.php/webdav/{AAAA-MM}/{nome}.zip`
  com o mesmo Basic Auth.

Isso já está implementado em `descobrir_mes_mais_recente()` e `baixar()` em
`cnpj_blumenau.py`. **Se a RFB migrar de novo**, o sintoma será
`PROPFIND`/`GET` retornando 401/404/redirect — nesse caso repita o processo de
descoberta: abrir a página do share encontrada em `gov.br/receitafederal/dados`,
extrair o token do link `index.php/s/{TOKEN}`, testar
`PROPFIND` no `public.php/webdav/` com esse token.

Estrutura de arquivos dentro de cada mês (confirmada em 2026-07): `Cnaes.zip`,
`Empresas0-9.zip`, `Estabelecimentos0-9.zip`, `Motivos.zip`, `Municipios.zip`,
`Naturezas.zip`, `Paises.zip`, `Qualificacoes.zip`, `Simples.zip`,
`Socios0-9.zip`. O script só baixa o que usa (Estabelecimentos, Empresas,
Simples, Municipios).

### 2. Código de município da Receita ≠ IBGE — e é fácil errar para o vizinho

O código de município usado nos arquivos da RFB é um código **interno próprio**
(tabela `Municipios.zip`), diferente do código IBGE de 7 dígitos. A primeira
tentativa para Blumenau usava `8117`, que na verdade é **Gaspar** (município
vizinho) — o código correto é `8047`. O script sempre valida o código informado
contra o nome esperado (`validar_municipio()`) e aborta se não bater, o que foi
o que pegou esse erro antes de gerar dado errado silenciosamente. **Nunca
remova essa validação.**

Para Rio Verde/GO, o código é `9571` — confirmado batendo o campo `uf` dos
próprios registros de `Estabelecimentos` (bairros reais de Rio Verde/GO
apareceram com `municipio=9571` e `uf=GO`), porque a tabela `Municipios.zip`
**não tem coluna de UF**, só código + nome. Isso importa quando o nome do
município não é único no Brasil (ex.: existem vários "Rio Verde de ..." /
"... do Rio Verde"; só o nome exato "RIO VERDE" sem prefixo/sufixo é único).

### 3. Ambiente Windows: `requests`/`certifi` rejeita o certificado da Receita

Neste ambiente, `curl` conecta normalmente no host da Receita, mas
`requests` do Python falhava consistentemente com
`SSLCertVerificationError: unable to get local issuer certificate`. Causa
provável: uma ferramenta local (aqui, indícios de Avast via
`SSLKEYLOGFILE=...aswMonFltProxy...` no ambiente) faz TLS interception e
injeta uma CA raiz própria que o Windows confia, mas o bundle do `certifi`
(usado por padrão pelo `requests`) não conhece.

Fix aplicado — **sem desabilitar verificação de certificado**:

```bash
pip install pip-system-certs
```

Esse pacote se aplica sozinho via hook de import (`.pth`) assim que instalado
no ambiente; não precisa de nenhuma mudança no código do `cnpj_blumenau.py`.
Ele faz o `ssl`/`requests` usarem o mesmo repositório de confiança do sistema
operacional (o mesmo que o `curl` já usava). Se um ambiente novo apresentar o
mesmo erro de SSL, esse é o primeiro fix a tentar antes de qualquer
`verify=False`.

### 4. Bugs corrigidos no script original

- **`ler_csv_do_zip` fechava o arquivo antes de iterar em modo chunked.**
  `pd.read_csv(..., chunksize=N)` retorna um `TextFileReader` **preguiçoso**
  (não lê nada até a primeira iteração). Como a função original abria o zip e
  o membro interno dentro de `with` aninhados e devolvia esse reader
  diretamente, os `with` já tinham fechado os arquivos antes do caller
  conseguir puxar o primeiro chunk → `ValueError: I/O operation on closed
  file`. Corrigido delegando o caso `chunk is not None` para um gerador
  (`_ler_csv_do_zip_em_chunks`) que mantém os `with` abertos durante todo o
  laço do caller. Reproduzido isoladamente (fora do pandas) para confirmar a
  causa antes de mexer no código real.
- **`capital_social` ausente (NaN) caía em "Grande" em vez de "Sem
  enquadramento formal".** `classificar_porte()` fazia
  `row.get("capital_social", 0.0) or 0.0`, mas `NaN or 0.0` avalia para `NaN`
  (float NaN é truthy em Python), e todas as comparações `NaN <= X` são
  `False`, então o fluxo caía no último `return "Grande"`. Corrigido com
  `float(cap) if pd.notna(cap) else 0.0`.

## Selecionar cidade e estado

O pipeline aceita o município via CLI, sem precisar editar o código-fonte:

```bash
python cnpj_blumenau.py \
  --municipio-cod 9571 \
  --municipio-nome "RIO VERDE" \
  --uf GO \
  --mes 2026-07
```

- `--municipio-cod`: código da Receita (não é o IBGE — ver seção acima).
- `--municipio-nome`: nome esperado, usado para validação cruzada contra a
  tabela `Municipios` (aborta se não bater — proteção contra o erro do item 2).
- `--uf`: só cosmético, usado no rótulo do relatório (aba Metodologia e prints)
  e no cálculo do rótulo `Cidade/UF`; não filtra dados (a tabela `Municipios`
  não tem UF).
- `--prefix`: opcional, define o prefixo dos arquivos de saída; se omitido, é
  derivado automaticamente do nome do município (`slugify`).
- Sem nenhum desses argumentos, o default continua sendo Blumenau/SC (código
  8047) — comportamento original preservado.

Os arquivos de `downloads/` (Estabelecimentos, Empresas, Simples, Municipios)
são **nacionais**, não por município — rodar para uma segunda cidade no mesmo
mês reaproveita 100% do cache e não baixa nada de novo (foi assim que Rio
Verde rodou em segundos depois de Blumenau já ter baixado ~5 GB).

### Limitação atual: ainda é preciso saber o código da Receita

Hoje, para selecionar uma cidade nova pela primeira vez, é preciso descobrir o
código manualmente:

```python
import zipfile, io
with zipfile.ZipFile("downloads/Municipios.zip") as z:
    with z.open(z.namelist()[0]) as f:
        data = io.TextIOWrapper(f, encoding="latin-1")
        for line in data:
            if "NOME DA CIDADE" in line.upper():
                print(line.strip())
```

E se o nome não for único no Brasil, confirmar a UF cruzando com uma amostra
de `Estabelecimentos` (como foi feito para Rio Verde, item 2 acima).

**Melhoria proposta (não implementada ainda):** um modo
`--cidade "Rio Verde" --uf GO` que resolve o código sozinho, sem exigir que o
usuário já saiba o código interno da Receita. Como `Municipios.zip` não tem
UF, a resolução precisa de uma tabela auxiliar `(código, nome, UF)`. Caminho
mais simples: build-uma-vez, a partir de uma varredura leve (só as colunas
`municipio` + `uf`, sem o resto) dos 10 `Estabelecimentos{0-9}.zip` já em
cache, gerando um `municipios_uf.csv` local (código → nome → UF, distinct) que
fica cacheado ao lado dos downloads e é reaproveitado em runs futuros. Depois
disso, `--cidade`/`--uf` viram um simples lookup nesse CSV, com fallback claro
de erro se (nome, UF) não bater com nada ou bater com mais de um código.

## Metodologia (resumo — detalhe completo na aba "Metodologia" de cada .xlsx)

- **Recorte:** estabelecimentos com `situacao_cadastral = "02"` (ATIVA).
- **Setor:** grande grupo derivado da seção CNAE (2 primeiros dígitos do CNAE
  principal → seção IBGE A-U → agrupamento do print ADAPTA, ver
  `GRANDES_GRUPOS` em `cnpj_blumenau.py`).
- **Porte:** regra derivada (capital social + enquadramento Simples/MEI), não
  é número de empregados nem faturamento. Ver `classificar_porte()`. Fronteira
  Pequena/Média é a menos confiável — capital social é proxy fraco. Para porte
  por número de empregados, a fonte correta é RAIS/CEMPRE, fora do escopo
  deste pipeline (dados de CNPJ não trazem headcount).

## Próximos passos sugeridos

1. Implementar o resolver `--cidade`/`--uf` descrito acima (evita o passo
   manual de grep no zip a cada cidade nova).
2. Cachear o mês descoberto (`descobrir_mes_mais_recente()`) por execução —
   hoje cada chamada faz um `PROPFIND` novo; irrelevante em custo mas vale
   documentar se o pipeline crescer para rodar N cidades em lote.
3. Se for comum rodar várias cidades de uma vez, considerar um modo
   `--municipios cidades.csv` que itera a lista e gera um `.xlsx` por
   município (ou uma aba por município no mesmo arquivo) reaproveitando o
   mesmo cache de `downloads/`.
