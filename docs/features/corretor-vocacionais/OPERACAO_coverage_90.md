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

## Migrations do Corretor v5 — aplicar/verificar

Aplicar na ordem abaixo antes de homologar o fluxo v5. Não há Edge Function nova ou alterada
pelos WS-1–WS-5; a lista de Functions a publicar acima continua sendo a do Coverage 90.

| Ordem | Migration | Finalidade | Verificação rápida |
|---|---|---|---|
| 1 | `20260713160000_corretor_v5_ata_gate.sql` | `ata_confirmada` + `uf` no portão da Ata | Abrir estudo, confirmar/editar cidade e UF e conferir persistência. |
| 2 | `20260713170000_corretor_v5_relatorio.sql` | snapshot `studies_v3.relatorio` | Entregar estudo e abrir `/corretor/:id/relatorio`. |
| 3 | `20260713180000_corretor_v5_calibration.sql` | `findings_v3.verdict_revisado` + índice de FP | Abrir `/corretor/calibracao`, reconhecer item/grupo e recarregar. |

SQL de diagnóstico após aplicação:

```sql
select
  to_regclass('public.studies_v3') is not null as studies_v3,
  exists (select 1 from information_schema.columns where table_schema='public' and table_name='studies_v3' and column_name='ata_confirmada') as ata_gate,
  exists (select 1 from information_schema.columns where table_schema='public' and table_name='studies_v3' and column_name='relatorio') as relatorio,
  exists (select 1 from information_schema.columns where table_schema='public' and table_name='findings_v3' and column_name='verdict_revisado') as calibracao;
```

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
7. **Fluxo v5 de ponta a ponta**
   - Confirmar/editar Ata antes dos passes pagos e validar cidade/UF persistidas.
   - Abrir a triagem rápida; testar `Enter`, `C`, `F`, `I`, `G`, `Esc` e confirmar que inputs focados não capturam atalhos.
   - Salvar uma correção no PowerPoint e soltar o `.pptx` no workspace; conferir diff, scroll e **R$ 0** quando todas as imagens estiverem no cache.
   - Entregar o estudo e conferir o relatório read-only/impressão.
   - Abrir a calibradora, reconhecer item e grupo, recarregar a página, abrir o link do estudo e exportar CSV.

## Pendências humanas que não devem ser mascaradas pelo motor

- Pedir à analista A&R a fórmula oficial de projeção; a regra atual é heurística BETA.
- Calibrar os falsos positivos do checklist estrutural e de fonte nas três amostras (Marka,
  Itajaí e GO).
- A cobertura da Ata é DET por evidência textual nesta versão; itens sem evidência são pedidos
  de conferência, não prova de ausência sem revisão humana.
