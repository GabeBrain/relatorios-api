# Decisões Técnicas — Página de Validação CID

## Stack já disponível no projeto (sem instalar nada novo)

| Lib | Versão | Uso na nova página |
|-----|--------|-------------------|
| recharts | 2.15 | Barras, linhas, scatter |
| deck.gl | 9.2 | Mapa interativo com pins lat/lon |
| maplibre-gl | 5.21 | Base do mapa (tile layer) |
| date-fns | 3.x | Parsing e diff de datas |
| xlsx | 0.18 | Disponível, mas não usar (ver PDF) |
| zustand | 4.5 | Auth token já disponível via `useAuthStore` |

---

## Gráficos — Estratégia

### Recharts (já instalado) — usar para:
- Barras de completude de campos (BarChart horizontal)
- Resumo de alertas por tipo e severidade (BarChart empilhado)
- Linha do tempo lançamentos/entregas (LineChart)
- Scatter Preço vs. M² com ponto colorido por Padrão

### Box Plot — problema e solução
Recharts **não tem** componente nativo de box plot. Opções:

**Opção A (sem nova lib):** Implementar box plot manual via `ComposedChart` + `ErrorBar` + `Bar` (whiskers como linhas, caixa como barra estreita). Trabalho maior mas zero dependência nova.

**Opção B (instalar Nivo):** `@nivo/boxplot` — pronto, acessível, bem documentado. Nivo usa D3 internamente e é bem interativo. Trade-off: ~150KB de bundle adicional.

**Recomendação:** Opção B se o visual for prioridade na apresentação; Opção A se quisermos zero novas dependências.

### Mapa lat/lon
**deck.gl + maplibre-gl já estão instalados** — o projeto usa isso na página `/mapa`.
Usar `ScatterplotLayer` do deck.gl para pins coloridos (verde/vermelho) sobre base maplibre.
Isso é equivalente ao que já existe no app — não precisa de nada novo.

---

## Exportação de Relatório — PDF

### Por que não Excel
- `xlsx` já está instalado, mas gera planilha — não é formato de apresentação/relatório
- O objetivo é emitir um documento formal com as análises e alertas

### Opção recomendada: `@react-pdf/renderer`
- Cria PDF programático com componentes React
- Layout fiel: tabelas, cores, logotipo, seções separadas
- Renderiza no browser (sem servidor)
- Resultado: arquivo profissional, não screenshot

### Alternativa mais simples: `jspdf` + `html2canvas`
- Captura a tela como imagem e gera PDF
- Implementação mais rápida, mas qualidade de screenshot
- Texto não é selecionável no PDF resultante

**Decisão:** `@react-pdf/renderer` para qualidade de relatório; `jspdf+html2canvas` se a prioridade for velocidade de implementação.

---

## Seletor de Cidade — Proposta vs. Padrão Existente

### Padrão existente (TestesArquitetura / Relatorios Secovi)
- UF dropdown → filtra lista de municípios do JSON `municipios-br.json` (todos os ~5.500 municípios do Brasil)
- City combobox com busca (Popover + Command)
- Funciona sem chamada de API adicional

### Proposta para a nova página: usar `GET /monitored-cities`
- Retorna **apenas as cidades que a API monitora** (subconjunto real)
- Auto-atualiza conforme novas cidades são adicionadas ao monitoramento
- Mais seguro: evita o usuário selecionar uma cidade sem dados e receber resposta vazia
- Pode incluir UF na resposta para agrupamento no dropdown
- Trade-off: 1 chamada de API a mais no carregamento (leve, pode ser cacheada)

**Recomendação:** usar `/monitored-cities` para o dropdown — mais correto semanticamente para uma ferramenta de QA. O usuário está validando cidades monitoradas, não o Brasil inteiro.

Estrutura de implementação:
```typescript
// On mount
const { data: cities } = useQuery(['monitored-cities'], () =>
  apiGet('/monitored-cities', {}, token)
);

// Selector
<Select onValueChange={setSelectedCity}>
  {cities.map(c => (
    <SelectItem key={c.city} value={c.city}>{c.city} — {c.uf}</SelectItem>
  ))}
</Select>
```

---

## Estrutura de Execução — Fluxo de Dados

```
[Selecionar cidade] → [Clicar "Executar Validação"]
         ↓
GET /building-with-history?city=X&uf=Y (paginado)
         ↓
Flatten typologies[] → 1 linha por tipologia
         ↓
┌─────────────────────────────────────────────┐
│ Etapa 1: Análise exploratória (nulos, contagens) │
│ Etapa 2: IQR por Padrão → outliers              │
│ Etapa 3: Datas → inconsistências               │
│ Etapa 4: Lat/Lon → fora do bounding box        │
└─────────────────────────────────────────────┘
         ↓
Relatório de alertas consolidado (tabela + gráfico resumo)
         ↓
[Botão: Exportar PDF]
```

---

## Navegação — Mudanças no AppLayout

### Antes (atual)
```
Testes de Qualidade
  └── Piemonte (folder)
      ├── VGV Verticais
      └── Release Price
```

### Depois (proposto)
```
Suporte Clientes  ← nova categoria no menu principal
  └── Piemonte (folder, movido)
      ├── VGV Verticais
      └── Release Price

Testes de Qualidade  ← renomeado ou mantido
  └── CID (folder, novo)
      └── Validação de Base  ← nova página
```

**Alternativa:** manter "Testes de Qualidade" como parent e colocar CID como sub-pasta dentro dele, junto com Piemonte movido. Depende de como o menu deve crescer.
