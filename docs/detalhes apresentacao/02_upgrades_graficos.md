# Upgrades de Análise — Gráficos Sugeridos por Etapa

## Contexto Técnico

O app usa React 18 + Vite + Tailwind. Para gráficos, a biblioteca recomendada é **Recharts** (compatível com shadcn/ui, leve, declarativa). Alternativa mais expressiva: **Visx** (D3 para React).

---

## Etapa 1 — Análise Exploratória

### Gráfico: Completude dos Campos (Heatmap ou Barras Horizontais)
- Eixo X: % de preenchimento (0–100%)
- Eixo Y: nome do campo
- Cor: verde (>95%), amarelo (80–95%), vermelho (<80%)
- **Por que:** identifica de forma imediata quais campos têm problema sistemático de nulidade

### Gráfico: Distribuição por Padrão (Rosca/Donut)
- Proporção de empreendimentos por Padrão (Compacto, Standard, Médio, Alto, Alto+, Luxo)
- **Por que:** contextualiza o perfil da base antes das análises

---

## Etapa 2 — Detecção de Outliers

### Gráfico: Box Plot por Padrão — M² Privativo
- Eixo X: Padrão do imóvel
- Eixo Y: M² Privativo
- Pontos fora dos whiskers = outliers destacados em vermelho
- **Por que:** torna visualmente óbvio o que o IQR detecta numericamente

### Gráfico: Box Plot por Padrão — Preço
- Mesma lógica, com valores em R$
- **Nota:** usar escala logarítmica se a variação entre Padrões for muito grande

### Gráfico: Scatter Plot Preço vs. M²
- Cada ponto = uma tipologia
- Cor = Padrão
- Outliers marcados com ícone de alerta
- **Por que:** revela tipologias com preço/m² atípico (pode ser erro de digitação ou dado legítimo premium)

---

## Etapa 3 — Validação de Datas

### Gráfico: Linha do Tempo de Lançamentos e Entregas
- Eixo X: trimestre/ano
- Duas séries: lançamentos (azul) e entregas previstas (verde)
- Barras vermelhas: entregas com inconsistência
- **Por que:** mostra concentração temporal de erros e sazonalidade da base

### Gráfico: Distribuição do Gap Lançamento → Entrega (Histograma)
- Eixo X: meses entre lançamento e entrega
- **Por que:** valores negativos = erro; valores extremamente altos (>84 meses) = suspeitos

---

## Etapa 4 — Validação de Localização

### Gráfico: Mini-Mapa com Pins
- Pins verdes: coordenadas dentro do bounding box
- Pins vermelhos: coordenadas fora do limite
- Biblioteca sugerida: **react-leaflet** (já disponível em projetos similares) ou **deck.gl**
- **Por que:** localização errada é imediatamente visível no mapa — mais intuitivo que tabela

### Gráfico: Tabela de Erros com Destaque
- Lista de empreendimentos com lat/lon inválidos
- Colunas: Nome, Cidade, Lat encontrada, Lon encontrada, Limite esperado

---

## Etapa 5 — Relatório de Alertas

### Gráfico: Resumo de Alertas por Categoria (Barras Empilhadas)
- Eixo X: tipo de validação (Outliers, Datas, Localização, Nulidade)
- Eixo Y: quantidade de alertas
- Cor: por severidade (Alta = vermelho, Média = amarelo, Baixa = azul)
- **Por que:** visão executiva de uma linha sobre a saúde da base

### Tabela de Alertas com Filtros
- Filtrável por: Tipo de Erro, Severidade, Cidade, Padrão
- Exportável como Excel

---

## Priorização de Implementação

| Prioridade | Gráfico | Impacto | Complexidade |
|-----------|---------|---------|--------------|
| 1 | Box Plot outliers (M²/Preço por Padrão) | Alto | Média |
| 2 | Resumo de alertas por categoria | Alto | Baixa |
| 3 | Linha do tempo datas | Médio | Média |
| 4 | Mini-mapa lat/lon | Alto | Alta |
| 5 | Scatter Preço vs. M² | Médio | Média |
| 6 | Heatmap completude de campos | Médio | Baixa |
