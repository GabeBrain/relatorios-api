# Coverage 90 — Deploy e homologação final

**Release:** Coverage 90 WS0–WS8 · **Atualizado:** 2026-07-13

Este roteiro separa o que é necessário publicar do que precisa de confirmação humana.

## Functions a publicar

| Prioridade | Function | Ação | Motivo / verificação após deploy |
|---|---|---|---|
| Obrigatória | `analyze-table-image` | `supabase functions deploy analyze-table-image` | Contrato novo da visão: `locais_visiveis`, `unidades`, `tem_fonte`; cache `vision_cache` v6 força releitura uma vez por imagem. Fazer um estudo de teste e confirmar os três campos no payload/cache. |
| Conferir versão | `analyze-ata-image` | Não foi alterada nesta release; publicar somente se as versões 0.26–0.28 ainda não estiverem em produção. | A ata precisa retornar `localizacao_fonte`, observações do produto/localização e cidade/UF corretas. |
| Conferir versão | `analyze-text-batch` | Não foi alterada nesta release; não precisa redeploy se já está em produção. | Mantém ortografia/cidade/coerência; não participa do checklist DET da Ata nesta versão. |

Antes do deploy, confirme que `OPENAI_API_KEY` e `ALLOWED_ORIGINS` já existem no projeto
Supabase. Depois, execute upload/reconferência: o cache v6 deliberadamente reprocessa as
imagens antigas uma única vez.

## Migration v4 — aplicada

`supabase/migrations/20260713150000_corretor_v4_verdict.sql` foi aplicada em 13/jul/2026.
Ela adiciona `findings_v3.verdict` (`bug`/`fp`), não altera os achados existentes e não requer
Edge Function nova.

## Etapas de teste final

1. **Build e regressão local**
   - `npm test -- --run src/features/corretor/lib/v3/__tests__/coverage-rules.test.ts src/features/corretor/lib/v3/__tests__/wrong-context.test.ts src/features/corretor/lib/audit/__tests__/pptx-review-notes.test.ts src/features/corretor/lib/v3/__tests__/recall-marka.test.ts`
   - `npm run build`
2. **Ata / contexto — Marka Tancredo**
   - Subir o PPTX, confirmar cidade **Guarulhos/SP**, produto e pedidos no card da Ata.
   - Confirmar `WRONG_CONTEXT` no s12 (MS) e nos slides de dados de cidade estranha; conferir visualmente que nenhuma comparação Brasil/Estado virou alerta.
3. **Visão WS6/WS7**
   - Conferir no cache/payload `locais_visiveis`, `unidades` nas fichas e `tem_fonte`.
   - Revisar os `VALUE_PLAUSIBILITY` das fichas s74–76 como “verificar”, nunca como erro categórico.
   - Revisar `SOURCE_MISSING` nos slides SOCIO/ABSORÇÃO/LACUNAS; fonte em imagem deve suprimir o alerta.
4. **Cruzamentos WS2/WS5/WS8**
   - Marka: renda SOCIO×ABSORÇÃO, lacunas geral×quebras, consolidada×oferta, VSO com estoque zero e notas obrigatórias.
   - Itajaí: renda e população/domicílios; registrar qualquer falso positivo.
   - Confirmar janela do ano corrente+1 até +6 e, quando houver taxa explícita, a série de projeção.
5. **Cobertura Ata / estrutura WS3–WS4**
   - Validar manualmente o checklist de pedidos da Ata e o item “Produto proposto”.
   - Validar os misses do checklist estrutural com a analista: mapas e conteúdo só em imagem ainda podem exigir ajuste de dicionário.
6. **Medição de aceite**
   - Com o IR local do Marka, executar `set CORRETOR_CALIBRATION_IR=C:\caminho\Marka.ir.json` e o teste `recall-marka.test.ts`.
   - Registrar recall, falsos positivos e slides não cobertos no doc vivo. Só considerar a meta concluída com **recall ≥90%** nas 57 notas ancoradas e **FP ≤15%** nos estudos Marka e Itajaí.

## Pendências humanas que não devem ser mascaradas pelo motor

- Pedir à analista A&R a fórmula oficial de projeção; a regra atual é heurística BETA.
- Calibrar os falsos positivos do checklist estrutural e de fonte nas três amostras (Marka,
  Itajaí e GO).
- A cobertura da Ata é DET por evidência textual nesta versão; itens sem evidência são pedidos
  de conferência, não prova de ausência sem revisão humana.
