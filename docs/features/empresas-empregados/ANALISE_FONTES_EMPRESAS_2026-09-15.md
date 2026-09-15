# Empresas — análise de fontes e arquitetura proposta

**Data:** 2026-09-15  
**Escopo:** viabilizar a futura aba **Empresas** em `/rebrain/empresas-empregados`, sem ativá-la nesta etapa.

## Resumo executivo

Não é adequado baixar os arquivos nacionais do CNPJ da Receita Federal durante uma interação do usuário. A rota recomendada é consultar uma cópia estruturada do CNPJ no BigQuery, agregar somente o município solicitado e guardar o resultado em cache compartilhado. Isso segue o padrão já adotado pela aba **Empregados** com RAIS.

O download oficial continua sendo uma alternativa de contingência, mas deve rodar como job mensal fora da interface, com armazenamento persistente e agregação antes da exposição ao produto.

## Situação atual

- A aba **Empresas** é um placeholder deliberadamente inerte: não chama rede, banco, Receita ou Supabase.
- A aba **Empregados** já usa consulta agregada de RAIS por município, teto de bytes e cache de snapshots compartilhados.
- O pipeline experimental do CNPJ informado no `DEVELOPMENT.md` precisa dos arquivos nacionais de Estabelecimentos, Empresas, Simples e Municípios. O cache compactado fica em torno de 5 GB e é reutilizável entre municípios, mas o primeiro processamento ainda depende de download e leitura de recortes nacionais.

## Limitações do download direto da Receita

1. **Granularidade errada para a interface.** O dado é publicado em arquivos nacionais particionados, não como endpoint municipal. Para responder a uma seleção de cidade, o sistema precisaria baixar e varrer dados de todo o país.
2. **Tempo, custo e confiabilidade.** O fluxo depende de rede, WebDAV, ZIPs grandes, parsing em lotes e espaço local. Não é adequado para Edge Function, navegador ou requisição síncrona de produto.
3. **Infraestrutura variável.** O acesso programático da Receita mudou no passado e exige tratamento de descoberta, autenticação do compartilhamento e falhas transitórias.
4. **Semântica.** O CNPJ representa estabelecimentos e entidades cadastrais; não traz número de empregados. A RAIS continua sendo a fonte de emprego formal.

A Receita mantém o CNPJ como dado aberto e documenta o cadastro e seus metadados, incluindo situação cadastral, matriz/filial, CNAE e porte. [Dados abertos de cadastros da Receita](https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/dados-abertos/cadastros) · [metadados do CNPJ](https://www.gov.br/receitafederal/dados/cnpj-metadados.pdf/%40%40download/file)

## Solução recomendada: BigQuery sob demanda + cache

Usar o espelho mensal de CNPJ da Base dos Dados no BigQuery como camada de consulta, preservando a Receita Federal como origem primária. O conjunto informa que opera por fotografias do cadastro e possui cobertura de 2021-11 a 2026-08; cada consulta deve selecionar **uma única competência**. [Quadros Societários CNPJ — Base dos Dados](https://basedosdados.org/dataset/e43f0d5b-43cf-4bfb-8d90-c38a4e0d7c4f?table=81272674-f522-4e43-a70b-05bf46f0a163)

### Fluxo

```text
Usuário escolhe município e competência
        ↓
Edge Function autenticada
        ↓
cache compartilhado por município + competência + metodologia
        ↓ hit
retorna matriz agregada
        ↓ miss
proxy BigQuery com HMAC, limite de bytes e timeout
        ↓
filtra estabelecimentos ativos no município e na fotografia
        ↓
join apenas do subconjunto necessário com Empresas / Simples / CNAE
        ↓
agrega, persiste snapshot e retorna resultado
```

### Regras de implementação

- Reutilizar o proxy e os controles já existentes para RAIS: autenticação, assinatura HMAC, rate limit, timeout, `maximumBytesBilled`, log de execução e cache compartilhado.
- Chave do snapshot: `municipio_ibge + competencia_cnpj + query_version + methodology_version`.
- Retornar somente agregados ao cliente; não expor nem persistir lista nacional de CNPJs sem necessidade de produto.
- Registrar no resultado: fonte, competência da fotografia, data de geração, bytes processados, status de cache e versão metodológica.
- Executar primeiro uma *dry run* e rejeitar consultas que ultrapassem o teto aprovado.

## Métricas e linguagem de produto

O nome principal deve ser **Estabelecimentos ativos**, não apenas “Empresas”, pois uma pessoa jurídica pode possuir matriz e filiais em municípios distintos.

| Métrica | Fonte / regra |
| --- | --- |
| Estabelecimentos ativos | CNPJ, situação cadastral ativa, município e competência selecionados. |
| Matriz e filial | Identificador cadastral do estabelecimento. |
| Setor | CNAE principal agrupado em seção/grande grupo, com dicionário versionado. |
| Porte | Preferir o porte cadastral oficial do CNPJ e apresentar “não informado” separadamente. |
| Simples / MEI | Situação cadastral correspondente à competência, quando disponível. |
| Empregados | RAIS; não inferir a partir do CNPJ. |

Não usar capital social como classificação principal de porte: ele é um proxy fraco e muda o significado da métrica em relação ao porte cadastral. A matriz deve deixar claro se conta estabelecimentos, matrizes ou pessoas jurídicas distintas.

## Alternativas avaliadas

### 1. Job mensal com arquivos oficiais da Receita

Indicado apenas se a exigência for usar exclusivamente a extração oficial mais recente ou se o espelho BigQuery não cobrir os campos/competência necessários.

- Executar em Cloud Run Job, máquina de processamento ou pipeline dedicado; nunca no navegador ou Edge Function.
- Baixar uma vez por competência para bucket/cache persistente.
- Ler ZIPs em streaming/chunks, filtrar e agregar no processamento; guardar somente o recorte e os agregados necessários.
- Produzir um snapshot versionado e auditável antes de liberar à interface.

**Trade-off:** maior fidelidade ao arquivo oficial, mas maior custo operacional, latência de atualização e necessidade de monitorar o canal de distribuição da Receita.

### 2. Painel Mapa de Empresas

Pode servir para validação manual ou indicadores limitados. O painel declara usar CNPJ e estar atualizado até julho de 2026, mas não deve ser tratado como backend de produto sem uma API/exportação com contrato estável. [Painéis do Mapa de Empresas](https://www.gov.br/empresas-e-negocios/pt-br/mapa-de-empresas/painel-mapa-de-empresas)

### 3. API Consulta CNPJ do Conecta gov.br

Não resolve agregação municipal: a operação é por CNPJ individual e a integração requer adesão, credenciais e cadastro de IPs. Pode ser útil para enriquecimento pontual, não para gerar a matriz de um município. [Catálogo Conecta — Consulta CNPJ](https://www.gov.br/conecta/catalogo/apis/consulta-cnpj)

## Piloto recomendado antes de ativar Empresas

1. Confirmar no BigQuery a estrutura e a competência mais recente das tabelas de CNPJ necessárias.
2. Executar *dry run* de duas cidades já validadas no pipeline: Blumenau/SC e Rio Verde/GO.
3. Comparar os agregados com os XLSX de referência, distinguindo diferenças de competência, definição de porte e estabelecimentos versus matrizes.
4. Medir bytes, custo, tempo e taxa de cache; definir teto de custo por consulta.
5. Definir a metodologia final com o responsável de negócio antes de criar Edge Function, migrations ou habilitar a aba.

## Critério de decisão

Adotar BigQuery como fornecedor de produto se o piloto reproduzir os totais acordados para a mesma competência, com custo e latência aceitáveis. Caso contrário, implementar o job mensal oficial da Receita como pipeline de batch. Não ativar consultas ao vivo de Empresas antes dessa decisão.
