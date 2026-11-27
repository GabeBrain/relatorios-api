# Imprensa Sul — causas das lacunas na geração real de 3T2026

27/11/2026 · Codex/Lucas · Continuação da [investigação das cinco regiões](INVESTIGACAO_LACUNAS_API_2026-11-27.md). **Sul analisado; outras quatro regiões ainda sem diagnóstico real.**

## Arquivo e resultado observado

Arquivo fornecido por Lucas, somente leitura: `C:\Users\lucas\OneDrive\Área de Trabalho\Trabalho\Auditorias\institucionais-imprensa-sul-2026-3T-diagnostico.json`.

- SHA-256: `5cc98aa54f39ffe1ceb12f7f62948eb5b13087c3edef9a1177a4e1f77760a3bc`.
- Schema: `modelo-02-diagnostic-v1`; apresentação: `2026-11-26-visual-correction-v3`.
- Geração: início `2026-11-27T18:39:25.215Z`, fim `2026-11-27T18:58:36.923Z` (15h39–15h58 de Brasília).
- 77 municípios; PR, SC e RS presentes; 385 fontes concluídas, 523 requisições e HTTP final 200 em todas as fontes. Isso não exclui retentativas/429 intermediários, que o arquivo não discrimina.
- 73 posições, 74 páginas, 8 quadros parciais e 0 posições aguardando fonte. “Disponível” não significa todas as células preenchidas.

O JSON bruto de 8 MB permanece fora do Git. Auditoria derivada local em `.local-inputs/relatorios-lucas/modelo-02/api-gaps-2026-11-27/sul-analysis.json`. Pequena fixture versionada contém somente seis observações municipais agregadas de Santa Cruz do Sul, sem empreendimentos, credenciais ou históricos individuais.

## Causa 1 — histórico anterior sem cobertura válida no RS

Os quatro gráficos de lançamentos/vendas, em unidades e dinheiro, ficam sem valor em 3T2024, 4T2024 e 1T2025. O acumulado janeiro–setembro/2025 também fica sem valor. As ressalvas dos próprios slides identificam os seguintes municípios sem fotografia histórica válida para comprovar as competências municipais ausentes:

| Trimestre | Municípios bloqueadores registrados |
|---|---|
| 3T2024 | Estrela, Lajeado, Santa Cruz do Sul, Santa Rosa, Taquari, Teutônia |
| 4T2024 | Estrela, Santa Rosa, Taquari, Tramandaí |
| 1T2025 | Estrela, Santa Rosa, Taquari, Teutônia |

Todos têm início de monitoramento em 06/2025 no registro de referência. **O retorno real não se limita a essa data:** Lajeado tem observação em 08/2024, Santa Cruz do Sul em 11/2024 e Teutônia em 07/2024. Portanto, `since` contextualiza a fragilidade histórica, mas não permite excluir automaticamente tudo que o antecede nem inventar zeros. Há histórico retroativo irregular.

O motor tenta confirmar zero pelo detalhamento quando falta a linha municipal. Aqui a fotografia inválida impede essa confirmação, e a soma regional propaga a ausência. O arquivo comprova esse caminho; não é falha final de transporte, ausência do INCC ou defeito puramente gráfico.

As séries voltam a ter valores a partir de 2T2025. Em 2026 há 22.317 unidades lançadas e 25.929 vendidas no 2T, e 22.196 lançadas/22.736 vendidas no 3T. Estes valores são observações do diagnóstico, não homologação metodológica de toda a origem.

## Causa 2 — VGV vendido inválido em uma linha específica de 2026

Fonte: `RS/Santa Cruz do Sul/Vertical/sales/Padrão`, endpoint `/public-api/temporal-analysis-city/sales`, coleta concluída.

| Competência | Grupo | Vendas líquidas | VGV líquido vendido | Auditoria |
|---|---|---:|---|---|
| Maio/2026 | Compacto | 0 | `null` | `missing.vgv_liquid_sales = 1` |

`null` é o resultado da validação numérica no diagnóstico: **não permite distinguir campo ausente, nulo ou outro valor bruto inválido**, porque esse payload não foi exportado. Entre as fontes municipais, esta é a única com campo numérico necessário marcado como ausente/inválido. As 74 fontes detalhadas que registram campos ausentes são outro universo: tipologias não precisam ter fluxos explícitos para todos os indicadores.

O cálculo lê todas as linhas dentro da janela, inclusive essa linha de maio, embora o cadastro da cidade indique pesquisa trimestral. `required(vgv_liquid_sales)` lança erro antes de terminar a soma. Isso explica exatamente:

- `sales-money-quarters`: 2T2026 sem valor;
- acumulado monetário janeiro–setembro/2026 sem valor;
- `sales-units-quarters`: 2T2026 preservado, pois `liquid_sales` é numérico;
- VGV de lançamentos em 2T2026 preservado (R$ 19.075,762106659477 milhões, corrigidos pelo INCC do fechamento).

As seis observações municipais exportadas para abril–junho, cada uma com `records=1`, foram reintroduzidas no calculador em teste headless. Resultado: 118 vendas líquidas municipais e exceção na tentativa de calcular dinheiro. É uma reprodução da validação sobre agregados exportados, não nova chamada à API nem reconstrução do payload bruto.

**Não inferir VGV zero de vendas líquidas zero.** Vendas e distratos de mesmo número de unidades podem ter preços diferentes. Também não descartar silenciosamente maio só porque o cadastro é trimestral: confirmar o contrato desse registro intermediário e obter o campo monetário correto com o provedor.

## Alertas que não explicam, por si só, barras vazias

- 63 fontes têm meses obrigatórios sem observação, mas isso não equivale a 63 falhas de API. Entre elas há fontes vazias, zeros confirmados pelo detalhamento, fotografias exigidas e diferenças de cadência.
- 19 fontes são vazias completas: cinco de Campo Magro, cinco de Marialva, quatro municipais de Piraquara e cinco de Bom Retiro do Sul. O motor aceita zeros quando o detalhamento completo os confirma. Elas não são os bloqueadores históricos da tabela acima.
- Barra Velha aparece sem julho/agosto de 2024; Navegantes e Penha sem agosto de 2024. A auditoria usa cadência mensal recente, enquanto o registro original é trimestral. Esses meses intermediários não devem ser promovidos automaticamente a lacuna do gráfico: confirmar a cadência no fechamento da janela e o caminho efetivamente usado pelo calculador. O problema geral de auditoria temporal já foi reproduzido na etapa preliminar.
- Preços por UF, atual/anterior/variação, estão preenchidos; nenhuma fonte detalhada indica preço/m² ainda ausente após a derivação. Há divergências preservadas entre estoque municipal e detalhado, por exemplo Curitiba 11.903 × 11.932 e Florianópolis 5.018 × 5.049 em 09/2026. Elas merecem conferência, mas não causam a lacuna de VGV vendido identificada.
- O auditor lista 16 slides com células nulas; essa contagem inclui situações legítimas como preço sem oferta ou variação sem denominador. Não substitui os 8 quadros parciais classificados pelo relatório.

## Encaminhamento

1. **API/provedor:** verificar o registro Santa Cruz do Sul/Compacto/maio2026, campo `vgv_liquid_sales`, incluindo a finalidade da competência intermediária; obter valor válido ou contrato explícito que permita tratá-lo corretamente. Solicitação preparada neste documento; nenhuma mensagem enviada.
2. **Cobertura histórica:** verificar se há fotografias/observações corretas para os sete municípios e períodos da tabela. Se não houver, decidir com o analista entre ausência explícita e uma série de coorte comum com universo claramente identificado. Não somar apenas os municípios completos sob o mesmo rótulo regional.
3. **Auditoria:** separar lacunas efetivas do cálculo de meses intermediários apontados pela cadência recente. Não mudar os cálculos compartilhados do Modelo 03 como efeito colateral desta investigação.
4. **Outras regiões:** analisar os quatro JSONs em 3T2026 quando disponíveis. O diretório informado contém somente a saída Sul nesta sessão; risco do cadastro nas demais regiões continua hipótese, sem atribuir a elas a falha específica de Santa Cruz do Sul.

Nenhuma regra de cálculo, interface ou dado de origem foi alterado. Validação desta etapa: 18 testes do motor incluindo a regressão real, quatro testes do auditor, typecheck e lint dirigido. Sem nova coleta autenticada, push, deploy, homologação ou escrita no Monday.

**Monday:** [DESAFIO — Estudos Entidades e Institucionais](https://brain381753.monday.com/boards/18398428946/pulses/12880538203) — `12880538203`.
