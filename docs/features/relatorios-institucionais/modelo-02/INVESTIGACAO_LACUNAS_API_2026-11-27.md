# Imprensa — investigação das lacunas nas cinco regiões

27/11/2026 · Codex/Lucas · Base `10f9ba1b` · **Investigação preliminar; aguardando novas gerações reais.**

**Atualização na mesma data:** Lucas forneceu o diagnóstico real doSul. [Análise confirmada da geração3T2026](ANALISE_SUL_REAL_2026-11-27.md): coleta completa, lacunas históricas em sete municípios doRS e campo `vgv_liquid_sales` inválido emSanta Cruz do Sul/Compacto/maio2026. As quatro outras regiões continuam aguardando arquivos reais. O texto abaixo preserva a etapa preliminar e seus limites.

## Evidência e limite da sessão

Main limpa na abertura, origin único, fetch concluído e comparação 0/0. Os binários e diagnósticos reais da máquina anterior (`C:\Users\Usuario\Desktop\Auditorias`) não estão disponíveis neste checkout. `.local-inputs/relatorios-lucas/modelo-02/` também não existia. Não há arquivo pessoal `geobrain.env` nem variáveis `GEOBRAIN_*` no ambiente consultado. Nenhum login ou coleta autenticada foi executado; não se declarou o serviço indisponível por isso.

Lucas pediu a rota para produzir outra geração. Informada `/rebrain/relatorios-institucionais/institucionais-imprensa`, sem menu. Solicitados diagnósticos JSON de Sul, Sudeste, Nordeste, Norte e Centro-Oeste em **3T2026**, mesma competência do caso anterior. O próprio PPTX editável também contém o JSON em `customXml/modelo02-audit.xml`; não é necessário exportar novamente caso esse arquivo já esteja disponível.

As conclusões abaixo usam código do checkout, registro de cadências baixado em 24/11 e testes sintéticos do motor real. Não são contagens de falhas atuais da API. A geração Sul anterior é conhecida pelo [registro da revisão real, §4.4](PLANO_CORRECAO_VISUAL_REGIONAL_2026-11-26.md), sem reabertura do seu binário nesta máquina.

## Achados reproduzidos

1. **Acesso/coleta completa não garante valores completos.** Cinco fontes por município podem terminar com HTTP 200 e ainda faltar competência, VGV ou fotografia histórica. Testes distinguem esses três casos em cada uma das cinco regiões.
2. **Uma cidade sem valor deixa o total regional sem valor.** `calculate.ts` propaga `null` em `sum()`, preservando a cobertura em vez de somar silenciosamente só as cidades completas. Assim, uma lacuna municipal de lançamentos em junho/2026 retira 2T2026 regional; 3T2026 continua presente. É um efeito do contrato atual, não prova de falha em todos os municípios.
3. **O início de monitoramento não limita os meses exigidos.** `coverage.ts` devolve `since`, mas `scheduledObservations()` e `expectedObservations()` não o usam para distinguir competências anteriores ao início. O motor tenta comprová-las no histórico detalhado; se não houver fotografia, mantém o resultado ausente. O caso trimestral de Estrela foi reproduzido sem exigir abril/maio intermediários.
4. **O cadastro é compatível com as ressalvas antigas do Sul.** Estrela, Lajeado e Santa Cruz do Sul têm `since: 2025-06`, posterior às três primeiras competências da janela de nove trimestres de 3T2026 (3T2024, 4T2024, 1T2025). Isso é uma hipótese forte para aquela geração, ainda dependente do JSON real e da eventual existência de histórico retroativo. Não se conclui ausência de mercado antes do monitoramento.
5. **VGV e unidades podem ter coberturas diferentes.** Um único `vgv_release` ausente deixa o VGV regional sem valor, preservando unidades válidas do mesmo trimestre. Testes reproduzem esse caso nas cinco regiões. `auditSource()` já registra a competência/grupo/campo em `observations[].missing`.
6. **Não falta INCC na tabela local da janela investigada.** Todos os 27 meses de julho/2024 a setembro/2026 têm índice positivo; a série local termina em outubro/2026. Isso elimina apenas a hipótese de índice inexistente nessa janela e nesse checkout, sem validar os valores da API ou a versão publicada.
7. **O diagnóstico pode exagerar lacunas de cadência antiga.** Se uma cidade trimestral passou a ter 12 meses consecutivos, o diagnóstico usa a cadência mensal recente para toda a janela. O cálculo, em contraste, avalia a cadência no fechamento de cada período. Reproduzido: 2T2025 trimestral válido, mas abril/maio aparecem em `missingRequiredMonths` ao auditar até setembro/2026. É um problema de interpretação do diagnóstico, não prova de perda no gráfico.
8. **Preço ausente tem outra cadeia.** Fotografia de setembro inexistente pode manter oferta municipal de 80 unidades e deixar preço nulo, mesmo com coleta concluída. Campos de preço/área e coordenadas exigem verificações próprias; não usar cadastro atual para completar a fotografia.

## Risco de cobertura anterior ao monitoramento, por região

Janela de consulta: julho/2024–setembro/2026. Universo: **registro de referência**, não catálogo autorizado do token. O mês inicial de cada município exige conferência: `since` não garante nem proíbe histórico retroativo.

| Região | Municípios no registro | Mensais / trimestrais | Início posterior a julho/2024 |
|---|---:|---:|---:|
| Sul | 77 | 4 / 73 | 12 |
| Sudeste | 152 | 14 / 138 | 6 |
| Nordeste | 79 | 21 / 58 | 7 |
| Norte | 18 | 2 / 16 | 7 |
| Centro-Oeste | 31 | 2 / 29 | 2 |

Os 34 casos para cruzar com o catálogo da geração:

- **Sul:** Gaspar/SC e Itapoá/SC (09/2024); Marialva/PR (09/2025); Sarandi/PR (03/2025); Bom Retiro do Sul, Estrela, Lajeado, Santa Cruz do Sul, Santa Rosa, Taquari, Teutônia e Tramandaí/RS (06/2025).
- **Sudeste:** Embu das Artes e Pindamonhangaba/SP (09/2025); Jacareí/SP (09/2024); Bertioga/SP (03/2026); Cravinhos/SP (03/2025); Guarapari/ES (05/2026).
- **Nordeste:** Caxias/MA, Ilhéus/BA, Nísia Floresta/RN, Picos/PI e Porto Seguro/BA (09/2025); Mossoró/RN e Tibau/RN (03/2025).
- **Norte:** Araguaína/TO, Castanhal/PA, Ji-Paraná/RO e Parauapebas/PA (09/2025); Marabá, Marituba e Salinópolis/PA (12/2024).
- **Centro-Oeste:** Rondonópolis/MT (09/2025) e Dourados/MS (03/2025).

## Ferramenta de conferência sem nova coleta

`scripts/diagnostics/imprensa-api-gaps.mjs` lê JSON ou a auditoria incorporada ao PPTX. Emite somente campos de diagnóstico selecionados, separando coleta incompleta, competências anteriores a `since`, meses posteriores sem observação, campos numéricos ausentes e células nulas. Chaves de fonte são candidatas por slide; não são atribuídas como causa comprovada de cada célula. Não altera relatórios, cálculos ou arquivos de entrada, não faz requisições e não transporta payload bruto ou credenciais.

```powershell
node scripts/diagnostics/imprensa-api-gaps.mjs --registry
node scripts/diagnostics/imprensa-api-gaps.mjs "caminho/diagnostico-sul.json" "caminho/diagnostico-nordeste.json"
node scripts/diagnostics/imprensa-api-gaps.mjs "caminho/institucionais-imprensa-sul-2026-3T-editavel.pptx"
```

Reprodução automatizada: `node --test scripts/diagnostics/imprensa-api-gaps.test.mjs` (4 testes) e `npx vitest run src/features/relatorios-institucionais/modelo-02/__tests__/api-gap-investigation.test.ts --maxWorkers=2 --testTimeout=20000` (17 testes). Typecheck do projeto, lint do teste e sintaxe dos scripts aprovados. Os primeiros ensaios foram impedidos por `spawn EPERM` no sandbox; execução fora dele aprovada e concluída. Nenhum teste sintético comprova o conteúdo real da API.

## Próxima decisão depende dos arquivos reais

Cruzar cada lacuna do gráfico com município, janela, endpoint, status de coleta, observações e campo necessário. Separar especialmente lacuna monetária em 2T2026 de ausência anterior ao início da pesquisa: uma única explicação não resolve necessariamente os dois problemas.

Após a conferência, as opções metodológicas incluem manter ausências com cobertura explícita ou definir uma coorte comum para comparações. São decisões distintas; não excluir cidades, variar universo silenciosamente, inventar zero ou mudar o motor compartilhado do Modelo 03 nesta investigação. A eventual correção da auditoria de cadência deve representar o calendário histórico de cada janela, preservando observações mensais reais.

**Etapa:** causas de código e riscos regionais reproduzidos; confirmação das causas por região e qualquer correção de produto permanecem abertas. Sem push, deploy, alteração de interface, regra de cálculo ou escrita no Monday.

**Monday:** [DESAFIO — Estudos Entidades e Institucionais](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203` (referência, sem escrita).
