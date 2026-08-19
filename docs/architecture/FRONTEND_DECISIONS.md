# Decisões de Frontend — Rebrain

Registro leve de exceções e decisões duradouras às [Guidelines de Frontend](./FRONTEND_GUIDELINES.md).
Não use para changelog de feature; mudanças funcionais continuam nos documentos vivos dos projetos.

## Modelo

```md
### AAAA-MM-DD — <decisão curta>
- **Contexto:** <qual problema recorrente ou trade-off existe>
- **Decisão:** <o padrão adotado>
- **Consequência:** <o que passa a ser esperado e o custo aceito>
- **Escopo:** `<módulos/rotas>`
```

### 2026-08-19 — Trabalho longo de feature roda no shell, não na rota
- **Contexto:** a exportação do Panorama rasteriza 62 lâminas do DOM por ~90 s. Presa ao componente
  da rota, ela morre assim que o usuário navega para outra página — e obriga a esperar parado.
- **Decisão:** trabalho longo que depende do DOM fica num *host* montado pelo `AppLayout`, fora do
  `<Routes>`, comandado por um store leve. Um portão (`PanoramaExportGate`) assina só o store e
  importa o host com `lazy()` quando há job ativo, preservando o lazy-loading da rota. O progresso
  aparece num card fixo com ação de cancelar, visível em qualquer página.
- **Consequência:** o padrão vale para exportações e processamentos longos de outras features. Custo
  aceito: enquanto o job roda, o DOM pesado fica montado no shell; o host deve desmontá-lo ao
  terminar ou cancelar, e o estado não sobrevive a recarregar a página.
- **Escopo:** `src/features/panorama-secovi-fiergs/{export-store.ts,components/PanoramaExport*}`, `src/App.tsx`

<!-- novas decisões acima desta linha -->
