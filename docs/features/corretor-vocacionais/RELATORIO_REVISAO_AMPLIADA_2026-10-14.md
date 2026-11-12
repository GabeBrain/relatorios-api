# Relatório final da revisão ampliada — 14/10/2026

**Resultado: revisão offline executada, correção adicional v0.69.1 validada localmente; produção e aceite integral pendentes.** [Plano executado](./PLAN_REVISAO_AMPLIADA_2026-10-14.md). Base `6073ba3` sincronizada 0/0 após fetch. Não houve IA nova, alteração remota, veredito/status humano editado ou push desta rodada. Alterações FIERGS preservadas.

## 1. Novas oportunidades e execução

| Frente | O que foi executado | Resultado e limite |
|---|---|---|
| Materiais locais | 47 PPTX lidos por ZIP/XML/SVG, incluindo `.local-inputs/` e cópias locais; SHA-1/SHA-256 e comparação com versões de 14 snapshots | Pareamento exato recuperado para Rolândia/CJ/VAP/v2. São arquivos, incluindo cópias, não 47 estudos novos. Nenhum candidato Daniele com Goiânia + 17.566 + 56.808 no mesmo componente textual. Imagens raster não pesquisadas semanticamente; isso não prova ausência do original em todo o acervo |
| Inventário de alertas | 134 registros CJ53/VAP49/v2 32 inventariados, preservando estado original, decisão, ID, agrupamento, confiança e hash disponível | 43 registros com revisão delimitada; 91 ainda não adjudicados. Destes 91, 72 constam como corrigidos no snapshot e 19 pendentes. Nenhum encerramento automático convertido em sucesso confirmado |
| Texto | 31 registros retestados contra IR incluindo SVG/tabelas | 19 registros com erros textuais reais (incluem dois pares duplicados), três sem âncora, dois FP semânticos, seis editoriais/contextuais e uma inconsistência de nome. CJ10→8 cartões, VAP11→11, v2 10→10; IDs e decisões mantidos |
| Imagem | Sete caches originais retestados e três transcrições numéricas com hash congeladas | Três FP visuais ficam Verificar; erros de faixa, ano, Arté e renda continuam acusáveis. Transcrição conferida separada do cache, sem substituir números silenciosamente |
| Fonte/unidade | Excel bruto CJ/SJC, aba Domicilios, A9/D9/G9, e IR dos três slides | Três erros verdadeiros confirmados: CJ23/VAP24/v2 22 escrevem 75.298.796 hab., enquanto o número da fonte é domicílios. Preservar o número e corrigir apenas a unidade |
| Limite de duplicatas | Três testes novos inicialmente falharam: categoria diferente, duas palavras erradas na mesma frase, correções conflitantes | Correção implementada em `text-review.ts`: evidência contida exige também compatibilidade da acusação; alvos citados diferentes ou correções explícitas divergentes não agrupam. Casos comprovados passaram; linguagem arbitrária continua sujeita a revisão, não há compreensão semântica universal |

[Matriz por registro](./calibracao/automacao/review-expanded-findings-2026-10-14.json) e [inventário/resumo local](./calibracao/automacao/review-expanded-materials-2026-10-14.json). Classificações são revisão técnica, não vereditos escritos no site. Dos cinco FP da matriz, quatro eram confirmados na revisão anterior; o quinto é a acusação de concordância em “Identificação do terreno e determinação da Z.I.”, antes registrada como proposta semântica. Contagem não representa precisão global do corretor.

## 2. Antes/depois da correção adicional

Antes, coincidência do slide/tipo/confiança e contenção da evidência bastavam. Isso reunia indevidamente ortografia de OBSERTÓRIO com concordância de “são esperado”; também reunia duas palavras diferentes na mesma frase ou duas correções contraditórias.

Depois, esses três controles exibem dois cartões. Os pares reais CJ23/CJ68 continuam um cartão por defeito; ocorrência em outro slide e decisão humana continuam separadas. A mudança atua na projeção da interface, sem apagar registros ou alterar sua situação. Logs `review-expanded-before.log` (três falhas esperadas) e `review-expanded-after.log` (11 testes focados aprovados). Não há prova de ocorrência desses três casos novos no banco: são contraexemplos construídos para proteger a regra.

## 3. Somas conferidas por coluna

**Renda VAP s28:** somas visíveis SP 15.019.248; município 228.069; 2 km 7.161; 4 km 29.187; 6 km 42.161. Totais declarados 16.256.029 / 247.953 / 7.760 / 31.738 / 45.835. Diferenças: 1.236.781 / 19.884 / 599 / 2.551 / 3.674. O problema não se limita à coluna SP. O cache leu o último SP como 4.947.578; imagem mostra 9.947.578. Preservar divergência real, rejeitar essa magnitude OCR como explicação correta. Determinar total correto/causa exige fonte e contexto; não recomendar substituição do total pela soma. v2 s26 tinha a mesma divergência documentada, sem nova adjudicação de suas outras colunas nesta sessão.

**Curitiba s37:** BASE20/40/60/80/100 somam 1.197 / 2.393 / 3.590 / 4.787 / 5.984, contra 1.399 / 2.798 / 4.197 / 5.596 / 6.996. OTIMISTA somam 1.430 / 2.860 / 4.294 / 5.725 / 7.154, contra 1.670 / 3.339 / 5.009 / 6.679 / 8.348. Dez divergências visuais comprovadas, hipótese de faixa omitida ainda não comprovada; original pareado não recuperado nesta busca. Não chamar o alerta integralmente de falso positivo.

**UsHome, oferta:** 14 empreendimentos visíveis, contando células mescladas uma vez: lançada 2.781 e atual 719; totais globais 13.408 e 2.991. Diferenças do recorte 10.627 e 2.272. Somar novamente células mescladas seria outra fonte de erro. Sem continuação/deck original, total global versus recorte permanece inconclusivo, não erro real adjudicado. Não inferir cidade pela leitura automática; a imagem menciona bairros de Curitiba, mas isso não recupera sozinho identidade completa do estudo.

Transcrições e cálculos reproduzíveis em `review-expanded-numeric.json`/teste correspondente. Hash do PNG protege a identidade do insumo quando disponível; soma correta da transcrição não é prova automática de OCR correto.

## 4. Fila técnica após a revisão

1. **P0 — publicar/retestar frontend:** conferir bundle v0.69/v0.69.1, cancelamento sem IA, grupos reais CJ23/CJ68, três antigos sem âncora e controles verdadeiros. Dependência: publicação Lovable e acesso ao estudo original local. Sem chamada paga necessária para conferir apresentação/cancelamento. Reconferência com releitura paga exige novo lote/orçamento autorizado.
2. **P1 — 19 pendentes não adjudicados:** grupos de verificação: três divergências percentuais de fonte v2 s31/s32; três totais entre slides (CJ86/87, VAP76/77); dois cruzamentos de faixas CJ; dois formatos VAP e uma faixa VAP; três checklists de estrutura, três avisos de somas inseguras e duas fontes ausentes CJ. Matriz contém cada ID. Os avisos de cobertura não são erros substantivos da planilha.
3. **P1 — scope antes de total/faixa:** CJ compara bins com granulações diferentes e notas de exclusão; não obrigar faixas idênticas nem totais iguais sem demonstrar mesmo universo. Verificar nota, agregação e células da fonte; manter Verificar nos casos já contextualizados.
4. **P1 — competência da fonte v2:** três discrepâncias de verticalização (1,7%/4,3%/5,7% versus 15,92%/10,46%/28,85%) precisam de adjudicação sobre versão/data/raio. O mesmo Excel em duas versões não garante que a versão antiga deva usar esse valor. Não corrigir o slide para a fonte sem essa conferência.
5. **P1 — 72 encerrados no histórico:** conferir regra realmente avaliada e evidência da versão. São todos os encerrados do snapshot, não somente os 28/26/13 novos da reanálise. Não os reabrir em lote nem declarar sucesso pelo estado “corrigido”.
6. **P1 — explicação dos erros reais:** Avalição/“short” descritos com a forma correta como alvo; “espera-se maiores” classificado como concordância nominal; “um custos” com justificativa de sujeito/verbo inadequada. Propor redação ancorada no trecho e correção plausível, sem apagar erro nem editar histórico humano. Nome Joel de Paula/Paiva: apontar inconsistência interna, não inventar nome oficial.
7. **P1 — Daniele:** original completo ainda não encontrado por busca textual; testar o exemplo transcrito não equivale a recuperar a análise real. Próximo insumo específico: PPTX da imagem de Goiânia ou identificação inequívoca do estudo.
8. **P2 — materiais novos/referência:** GO132 slides/Excel regional, inventário Drive80, Marka/Parâmetros de validação disponíveis. Antes de novo cruzamento, definir papel/aba/célula/janela e gabarito do regional. Sem contrato a planilha continua zero blocos; não forçar checklist vocacional em panorama.

## 5. Validação e reprodução

- **258 testes aprovados, dois condicionais pulados** (replay/material dependentes de variáveis). Sete controles novos numéricos/unidade e três de agrupamento; controles visuais existentes fortalecidos com expectativa de preservar confiança dos erros reais.
- **Dez passes materiais aprovados**, fonte congelada e Excel bruto dos cinco estudos, comparando IDs/conteúdo/cobertura; expectativas intactas. Relatório `.local-inputs/corretor-regression/2026-10-14T20-25-40.401Z-28328/report.md`.
- Tipos e lint dos arquivos de revisão aprovados; build final registrado no log local. Sem nova interface/prompt/Edge Function/migração, sem tokens visuais alterados. Browser da v0.69 continua evidência histórica; não foi apresentado como novo teste de produção.

```powershell
node node_modules/vitest/vitest.mjs run src/features/corretor/lib
npm run test:corretor:materials
python scripts/diagnostics/corretor-review-inventory.py --se-root C:/Users/GaloD/Desktop/SE
```

Inventário exige snapshots locais `audit-20261013/bank.json`/`final-paid-audit.json` e outputs dos testes; não distribuídos com banco completo no Git. Fixtures pequenas/matriz derivada versionadas; brutos/logs em `.local-inputs/`. Antes de retestar um snapshot novo, conservar o antigo e registrar data/hash. Não afirmar que o banco hoje tem exatamente esses estados, pois não houve nova consulta remota.

Logs: `.local-inputs/review-expanded-suite-final.log`, `review-expanded-materials.log`, `review-expanded-types-final.log`, `review-expanded-build.log`; resultados `review-expanded-numeric-result.json`, `review-expanded-units.json`, `revisao-ampliada-20261014/`. Custo novo zero; orçamento anterior US$ 2 permanece histórico.

**Conclusão:** revisão e proteção adicional concluídas localmente. Estudo integral, validação de produção e explicações numéricas completas continuam abertos; a fila identifica evidência e dependência de cada grupo. Próximo de maior valor: publicar a correção e fechar CJ com revisão por alerta, sem usar redução da contagem como sucesso.

Monday: [Corretor V3](https://brain381753.monday.com/boards/18398428946/pulses/12700802102). Sem escrita no Monday.
