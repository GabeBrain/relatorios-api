## Correção do link e criação da página Dashboard Geobrain

O 404 acontece porque o item de menu aponta para `/dashboard-mercado`, rota que nunca foi registrada. Além disso o rótulo ficou em caixa baixa (`dashboard-geobrain`), fora do padrão do menu.

### Mudanças

1. **`src/components/layout/AppLayout.tsx`** — dentro do grupo Relatórios:
   - Renomear o label de `dashboard-geobrain` para **`Dashboard Geobrain`**.
   - Trocar o `path` de `/dashboard-mercado` para `/dashboard-geobrain`.

2. **Criar `src/pages/DashboardGeobrain.tsx`** — placeholder inicial (título + subtítulo + card "em construção") seguindo o design system (Montserrat, `rounded-xl`, tokens semânticos). Isso resolve o 404 imediatamente; o conteúdo real (KPIs, matriz IVV, cortes) fica para o próximo passo conforme o plano anterior.

3. **`src/App.tsx`** — registrar a rota `/dashboard-geobrain` renderizando `DashboardGeobrain` dentro do `AppLayout`, no mesmo padrão das demais páginas.

### Fora de escopo agora
- Implementar KPIs, matriz IVV e cortes analíticos (segue o plano anterior, num próximo passo).
- Qualquer alteração no nome do grupo "Relatórios" (ele já está correto — a confusão foi só no item interno).

### Validação
- `tsgo` limpo.
- Playwright: abrir `/dashboard-geobrain`, confirmar que a página carrega (sem 404) e que o item aparece com o rótulo "Dashboard Geobrain" dentro de Relatórios.
