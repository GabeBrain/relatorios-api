# Estrutura da Nova Página Web

## Localização no App

**Categoria:** Testes de Qualidade  
**Sub-categoria (nova):** Suporte Clientes  
**Nome da página:** [a definir — ver seção abaixo]  
**Rota:** `/testes-qualidade/suporte-clientes/[nome-curto]`  
**Arquivo:** `src/pages/TQSuporteClientes[NomeCurto].tsx`

## Opções de Nome Curto para a Página

| Opção | Rota | Observação |
|-------|------|------------|
| Validação de Base | `/validacao-base` | Genérico, escalável para outras cidades |
| Análise CID | `/analise-cid` | Específico para o sistema CID |
| QA Dados | `/qa-dados` | Técnico, direto |
| Diagnóstico de Base | `/diagnostico-base` | Mais descritivo |

**Recomendação:** "Validação de Base" — neutro o suficiente para cobrir qualquer cidade, mas descritivo do que faz.

## Navegação (AppLayout.tsx — NAV_GROUPS)

Estrutura proposta:

```
Testes de Qualidade
├── Piemonte (existente)
│   ├── VGV Verticais
│   └── Release Price
└── Suporte Clientes (novo)
    └── Validação de Base  ← nova página
```

## Estrutura da Página (Seções / Cards)

### Cabeçalho
- Título: "Validação de Base de Dados"
- Subtítulo: endpoint principal (`/building-with-history`)
- Badge de status (ativo/em desenvolvimento)
- Seletor de cidade (dropdown) + botão "Executar Validação"

### Seção 1 — Extração e Visão Geral
- Colapsável
- Mostra: total de empreendimentos, total de tipologias, % campos preenchidos
- Gráfico: rosca por Padrão + barras de completude de campos

### Seção 2 — Outliers por Padrão
- Colapsável
- Seletor de campo (M² Privativo / Preço / ambos)
- Gráfico: box plot por Padrão
- Tabela: tipologias outliers com empreendimento, valor, limite IQR

### Seção 3 — Consistência de Datas
- Colapsável
- Gráfico: linha do tempo de lançamentos/entregas
- Tabela: registros com data inconsistente (entrega < lançamento)
- Callout de alerta se % > threshold configurável

### Seção 4 — Validação Geográfica
- Colapsável
- Mini-mapa com pins (verde/vermelho)
- Tabela: empreendimentos fora do bounding box

### Seção 5 — Relatório de Alertas
- Sempre visível (não colapsável)
- Gráfico: barras de alertas por tipo e severidade
- Tabela completa filtrável
- Botão: "Exportar Excel"

## Padrão Visual (herdado das páginas Piemonte)

- `max-w-3xl mx-auto px-6 py-8 space-y-5`
- Componentes shadcn/ui: Card, Collapsible, Badge, Button, Table, Select
- Ícones Lucide: AlertTriangle, CheckCircle, MapPin, Calendar, BarChart2
- Cores de status: destructive (erro), yellow (aviso), green (ok)
