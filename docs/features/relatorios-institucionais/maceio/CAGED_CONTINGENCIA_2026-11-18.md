# Maceió — CAGED real verificado e contingência de acesso

18/11/2026 · Lucas / Codex · implementação `e67ac127` · base `3178df90`.

## Fonte real e proveniência

Lucas pediu corrigir todos os slides pendentes de fonte. O JSON real recebido tinha33disponíveis/27fontes/22editoriais; seis bloqueios eramCAGED9–14. A sessão não tinha token Geobrain nem acesso ao navegador pessoal: a skill de computador e a superfícieCUA retornaram `native pipe is unavailable`. Nenhuma sessão/token foi extraída.

BigQuery conectado permitiu verificar `project-d1ce8c6e-941c-4b31-8fd.rebrain_caged.caged_mte_snapshots`:23.751agregados,117competências2017-01a2026-09,203célulasUF×setor/mês. Isso atualiza a evidência anterior de carga pendente. **Não comprova acesso à rota do proxy/Edge pelo aplicativo.** Não houve escritaBigQuery, mudança de infraestrutura ou deploy.

- `query_version`: `mte-caged-v1`.
- `snapshot_version`: `8866c0278dfb8cc661f0a7b19055d796f783101a995f87f0c528f7cab6c506dc`.
- `loaded_at`: `2026-11-17T20:21:02.987129Z`; publicação até2026-09; conferência em18/11/2026.
- JobsUS: cobertura `job_efuT-PDA5EDdnaEKBBEnA7HKzeqc`; extração/cópia em cache `job_Q5MF61tET2-nqDsvo1Ty7K3TsD9F`; saldos independentes `job_OocXP9koi9bi9UyBeFW-jOtWyQtF`. A extração inicial foi repetida do cache após corrigir somente a conversão de timestamp no script.
- As117grades foram verificadas: sete setores×29UFs(incluindoNIeBR), sem duplicatas/ausências; setores somam total porUF eUFs somamBrasil por setor. Negativos eNIpreservados.
- Asset somente de agregados: `src/features/relatorios-institucionais/maceio/assets/caged-verified-snapshot.json`, aproximadamente111KB, importado sob demanda. SHA-256UTF-8/LF: `ef5a7d4de87462afc37b2bd216d54a452bc387dce4e8fab86e3e2b952a337bee`. Sem microdados/nomes/documentos/tokens/chaves.

SELECTindependente na mesma versão, sem usar o conversor do frontend:

| Competência | Brasil total | Brasil construção | AL total | AL construção |
|---|---:|---:|---:|---:|
| 2026-05 | 81.475 | 12.583 | 61 | −72 |
| 2026-06 | 136.423 | 12.991 | 2.789 | 352 |

Cada relatório retorna12períodos×203células=2.436agregados: dez anos(com ano corrente parcial), mês de fechamento e mesmo mês do ano anterior. Trimestral usa junho, sem somar novamente o trimestre. Os oito saldos acima foram reproduzidos pelo conversor. Isso confirma correspondência com a tabela, sem declarar homologação metodológica ou auditoria dos microdadosMTE.

## Comportamento

Consulta online continua prioritária. EmHTTP404/5xx, rede, timeout45s ou configuração cliente ausente, tenta a cópia verificada, após validação do token/escopo municipal da geração. HTTP401/403/429, resposta200fora do contrato ou corrupção do snapshot não são contornados. Sem cobertura integral do mês, ano corrente parcial e comparativo, mantém indisponibilidade; outubro/2026não é preenchido com setembro. Ausência não vira zero.

A cópia conserva versão/datas/revisão. A interface identifica contingência na conclusão e nos slides9–14; JSONregistra `sources.caged.delivery`, `verifiedAt` e falha sanitizada. Aviso de transporte fica **fora da arte**. EtapaCAGED em atenção e retry disponíveis. Quando online funciona, prevalece. O asset não se atualiza sozinho: nova versão exige extração/conferência/publicação. Ponte/job remotos continuam caminho normal de atualização, sem implantação nesta sessão.

## Validação e limites

186testesMaceió/17arquivos,4Edge e3ponteHMAC aprovados; rodada final32testes após separar aviso/arte. TypeScript/lint/build final aprovados. Padrões reutilizados: BrainLoadingState com etapa/tempo/cancelamento, mensagens `role=status`, origem da fonte, consulta/retry e worker existentes; sem primitive/token novo.

Edgeheadless:12cenários(mensal/trimestral×desktop/claro e mobile/escuro×sucesso/vazio/502), resposta lenta/logoBrain, navegação9–14, download/reaberturaJSON e origem explícita. Nos502,CAGEDusa fonte **real verificada**, enquanto API imobiliária é sintética. Mais4cenários de captura integral da arte9; sem aviso de transporte noSVG, sem exceção de página. Evidências ignoradas: `.local-inputs/relatorios-lucas/maceio/caged-contingency-2026-11-18/page/`; roteiros `.local-inputs/maceio-caged-contingency-qa.mjs` e `maceio-caged-real-render-qa.mjs`. Nas fixtures imobiliárias completas,60disponíveis+22editoriais mensais; isso não descreve a API real de imóveis.

Os21outros bloqueios do últimoJSON não foram declarados resolvidos:11por Marechal283×192,4por fluxos/rankings/IVV e6por classificação horizontal. Lucas confirmou que aguarda o analista para os10`Fechado` e consultará a fonte dos lançamentos por tipologia. Auditoria v2/correção de rankings dos commits locais anteriores continuam necessárias para a próxima conferência imobiliária; sem token/payload real não foi possível reexecutá-la. Recuperação local dos seisCAGED não significa reparo da ponte online ou homologação dos27slides.

Sem push/deploy/Monday nesta entrega; envio depende de autorização conformeAGENTS.
