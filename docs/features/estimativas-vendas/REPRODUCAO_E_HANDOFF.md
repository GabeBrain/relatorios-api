# Reprodução horizontal e próximo ensaio — 21/10/2026

## Evidência local

Fonte: slide 7 do PPTX Finotti recebido em 21/10, SHA256 no [manifesto](MANIFESTO.md). Os coeficientes publicados têm três casas decimais; os números abaixo são a reprodução desses valores, não confirmação do código original.

- Fechado, 300 unidades lançadas, 150 vendas líquidas acumuladas no mês 6: `A_n=0,5`, `k=0,6320353460`.
- Curva bruta: mês 12 `0,6584307113` (65,84%, aproximadamente 66%); mês 18 `0,7504208555` (75,04%, aproximadamente 75%). Diferença do mês 6 ao 18: `75,1263` unidades, compatível com as 75 unidades arredondadas do slide.
- Primeiro mês inteiro em que a **curva bruta** chega a 95%: mês 61. A contagem `61+6=67` reproduz o mês de esgotamento mostrado. Não determina se a primeira parcela linear ocorre no mês 61 ou 62, nem qual valor serve de âncora (95% exatos ou fração da curva no cruzamento). Por isso o motor não gera vendas mensais da cauda.
- O trecho até o mês 18 está dentro dos 36 meses futuros usados no ajuste. O cruzamento no mês 61 está 55 meses após a origem; é extrapolação da curva publicada, explicitamente sinalizada pelo motor.

Código: `src/features/estimativas-vendas/parameters.ts` mantém versão/fonte dos coeficientes; `horizontal.ts` valida domínio e calcula curva/limiar; `retrospective.ts` compara previsões com médias dos últimos 3 e até 12 meses. A série observada inteira entra no ensaio, mas só o prefixo até o corte entra no cálculo; o futuro é usado apenas para erro. O comparador de 3 meses é o descrito no PPT, não uma reconciliação completa da operação IVV histórica. `horizontal.test.ts` cobre o exemplo e a independência do futuro.

O motor aceita apenas loteamentos `aberto`/`fechado`, unidades inteiras positivas, mês de origem 1–48, e fração observada estritamente entre 0 e 95%. Rejeita `k<=0`; expõe avaliações após 36 meses como fora do horizonte calibrado. Não arredonda unidades projetadas nem fabrica banda de incerteza. O ensaio rejeita vendas líquidas mensais negativas e acumulado superior à oferta: são restrições provisórias explícitas, não afirmações sobre o contrato Geobrain.

## Ensaio real revisável com Edgar

1. Receber exportação Geobrain real, dicionário de campos e arquivo de retorno aceito. Preservar bruto em `.local-inputs/estimativas-vendas/` e registrar hash/competências, sem versionar dados individuais.
2. Selecionar poucos empreendimentos horizontais com ID estável, categoria confirmada, unidades lançadas, competências mensais consecutivas e vendas líquidas **observadas**. Identificar revisões de oferta, distratos e lacunas; não converter estimativas anteriores em observações.
3. Fixar antes da avaliação o mês de corte por empreendimento, de preferência 3, 6 e 12 quando elegíveis. Ocultar meses posteriores na entrada da curva e das médias. Guardar tamanho da amostra e motivos de exclusão.
4. Comparar acumulado/estoque e erro absoluto em pontos percentuais nos meses 1, 3, 6 e 12 após o corte e nos fechamentos trimestrais efetivos. Reportar também unidades e piores casos. O motor omite a curva quando alcança 95% ou sai dos 36 meses calibrados; esses casos entram na contagem de cobertura, não em uma média calculada só com sobreviventes sem aviso.
5. Revisar com Edgar discrepâncias, regra atual de IVV e contrato de retorno antes de gerar qualquer arquivo importável. Nenhuma escrita automática no Geobrain ou Monday.

## Perguntas para Edgar/Finotti

- Confirmar o MD/código original, precisão dos coeficientes, origem do mês 1, limites do domínio e política para `n=0`, vendas zero, esgotados, `k<=0`, vendas líquidas negativas e oferta revisada.
- Confirmar a discretização do cruzamento de 95%, âncora e distribuição das últimas unidades, arredondamento e significado de esgotamento no mês 67.
- Fornecer algoritmo e calibração das bandas central/ampla; não há dados suficientes para reproduzi-las.
- Fornecer exportação e retorno reais Geobrain com IDs, competência, flags observado/estimado, semântica de `estimation` e `IVV BET`, e regra de alternância/coleta. Conferir se tipologia ou empreendimento é a unidade de cálculo.
- Confirmar se as planilhas antigas IVV são a linha de base operacional e como entram INCC, distratos e reconciliação ao chegar coleta real. Modelo vertical e casas permanecem fora do motor horizontal.

## Limite do handoff

Este pacote permite revisar matemática e preparar um ensaio, mas ainda não permite comparar uma base real nem retornar um lote ao Geobrain. Edgar conduz a frente; este registro documenta somente o apoio técnico de Gabriel nesta sessão.
