# Plano — GeoApiScopeEngine

Criar uma camada compartilhada única para descoberta de escopo geográfico (UF/cidade) via `GET /public-api/monitored-cities`, reutilizável por Secovi, CID legado, Dashboard GeoBrain e futuras telas.

## 1. Novo módulo compartilhado

**`src/features/shared/geo-api-scope-engine/`**

- `index.ts` — reexports
- `fetch-monitored-cities.ts` — `fetchMonitoredCities(token, signal?): Promise<Record<UF, string[]>>`
  - Pagina `links.next` a partir de `https://geobrain.com.br/public-api/monitored-cities`.
  - Normaliza `state`→UF maiúsculo, ordena cidades pt-BR.
  - Lança `GeoApiScopeError` com códigos: `no_token`, `unauthorized` (401/403), `network`, `bad_response`.
- `use-geo-api-scope.ts` — hook `useGeoApiScope()`
  - Lê token do `useAuthStore`.
  - Cache em módulo (`Map<token, Promise<citiesByUf>>`) para reuso durante a sessão; invalida quando token muda.
  - Estado: `citiesByUf`, `availableUfs`, `availableCities`, `uf`, `city`, `isLoading`, `error`, `strictReady` (true só quando `/monitored-cities` retornou com sucesso e `uf`+`city` estão dentro do mapa).
  - Ações: `setUf(uf)` (limpa `city` e aborta requests em andamento nos consumidores via `scopeVersion`), `setCity(city)`, `reload()`.
  - Expõe `scopeVersion: number` incrementado a cada troca de UF/cidade — consumidores usam para invalidar/abortar carregamentos anteriores.
- `GeoApiScopeSelector.tsx` — componente controlado
  - Props: `value: { uf, city }`, `onChange`, `disabled?`, `layout?: 'inline' | 'stacked'`, `ufLabel?`, `cityLabel?`.
  - Internamente consome `useGeoApiScope`.
  - UF: `<Select>` populado apenas com `availableUfs` (nunca IBGE).
  - Cidade: combobox (Popover + Command) desabilitado até UF selecionada; opções vêm de `availableCities`.
  - Estados visuais: loading (skeleton nos selects), erro (mensagem inline com botão "Tentar novamente" chamando `reload()`), token ausente (aviso "Faça login…").
- `types.ts` — `GeoScope`, `GeoApiScopeError`, `MonitoredCity`.

**Regras do motor (modo estrito, único suportado):**
- Se `/monitored-cities` falhar → estado `error`, `strictReady=false`, botões de carregar/consultar do consumidor ficam desabilitados.
- Sem fallback silencioso para `municipios-br.json`. `MUNICIPIOS_BR` fica disponível apenas como recurso técnico não exposto por padrão (não importado pelo motor).
- Trocar UF limpa `city`. Trocar UF/cidade incrementa `scopeVersion`.

## 2. Migração — Dashboard GeoBrain

- `src/features/dashboard-geobrain/Header.tsx`
  - Remover `UF_LIST` do IBGE, `datalist`, `query`, botão "Carregar" manual.
  - Substituir bloco UF+Cidade por `<GeoApiScopeSelector value={{uf, city}} onChange={...} />`.
  - Mantém chips Building Type e Granularity intactos.
- `src/pages/DashboardGeobrain.tsx`
  - `uf`/`city` continuam como estado local, alimentados pelo selector.
  - `useEffect` que chama `load(city)` passa a exigir `scopeReady` (uf presente + city ∈ `availableCities`); antes disso não dispara nada.
  - Ao trocar UF, `city` é limpo pelo motor → `useEffect` não dispara load.
- `src/features/dashboard-geobrain/use-dashboard-data.ts`
  - Assinatura passa a `load({ uf, city })` — remove uso de `ufFromCity`.
  - Aborta request anterior via `AbortController` (já feito) e ignora resultados de escopo obsoleto (checa `scopeVersion`/key).
- `src/features/dashboard-geobrain/geo-utils.ts`
  - Manter arquivo, mas `ufFromCity` deixa de ser usado no dashboard. Fica disponível apenas para código legado que ainda depende dele (não removo para não quebrar consumidores atuais).

## 3. Migração — Secovi (`src/pages/TestesArquitetura.tsx`)

- Substituir o `useEffect` local de `fetchMonitored` + estado `monitoredCities` + `availableUFs` + `availableCities` pelo hook `useGeoApiScope`.
- UF/cidade passam a vir do motor; remover a lógica que interseca IBGE ∩ Geobrain (o motor já entrega apenas cidades da API).
- `handlePreview` e `handleFetch` só habilitam quando `strictReady=true`.
- Mantém toda a lógica pesada de preview/detail intacta.

## 4. Migração — CID legado (`src/legacy/standby-qualidade/TQCidValidacaoBase.tsx`)

- Substituir o `useEffect` de `fetchAll` + `citiesByUf` + `availableUfs`/`availableCities` pelo hook.
- Botão "Rodar" continua exigindo `selectedUf`+`selectedCityName`.

## 5. Documentação (AGENTS.md e CLAUDE.md)

Adicionar em ambos, próximo ao topo (após "Documentos vivos por projeto"), uma nova seção:

```
## Padrão obrigatório: GeoApiScopeEngine

Para qualquer tela que use filtros geográficos e chamadas à API GeoBrain, usar o
padrão `GeoApiScopeEngine` (`src/features/shared/geo-api-scope-engine/`). Fluxo
obrigatório:
1. Carregar `/public-api/monitored-cities` (paginando `links.next`).
2. Limitar UF/município às cidades disponíveis para o token.
3. Exigir UF antes de município; ao trocar UF, limpar município.
4. Bloquear chamadas pesadas de histórico até escopo válido.
5. Sem fallback silencioso para `municipios-br.json` (IBGE).
Referência funcional original: Relatórios Secovi (`src/pages/TestesArquitetura.tsx`).
Dashboard GeoBrain usa o mesmo padrão.
```

Atualizar também `docs/projetos/LIVE_dashboard-geobrain.md` (entrada em *Desenvolvimentos* + ajuste em *Etapas*/*Pendências*).

## 6. Critérios de aceite

- Módulo `GeoApiScopeEngine` existe e exporta `fetchMonitoredCities`, `useGeoApiScope`, `GeoApiScopeSelector`.
- Dashboard GeoBrain: header sem `datalist`/IBGE; UF só mostra UFs monitoradas; cidade travada até UF; `load` não dispara sem cidade monitorada.
- Secovi e CID legado consomem o mesmo hook e não duplicam lógica de `/monitored-cities`.
- Erros de token/rede aparecem claramente e não caem para IBGE.
- `AbortController` e `scopeVersion` invalidam resultados de escopos anteriores.
- Cache por sessão (token) evita refetch entre navegações.
- Regra documentada em AGENTS.md e CLAUDE.md com o nome exato `GeoApiScopeEngine`.

## Detalhes técnicos

- Cache: `const cache = new Map<string, Promise<Record<string,string[]>>>()` chaveado pelo token; limpo em `reload()`.
- `GeoApiScopeError extends Error` com `code` para o selector renderizar mensagens específicas.
- Selector usa shadcn `Select` (UF) + `Popover`+`Command` (cidade), consistente com o padrão do Secovi.
- Nenhuma mudança em `api.ts` do dashboard além da assinatura de `load`.
