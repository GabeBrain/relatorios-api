# Objetivos Técnicos de Validação — Geobrain (Base de Dados e API)

## Contexto da Apresentação

**Evento:** Reunião técnica interna — Gabriel / Brain  
**Data:** 2026-05-06  
**Audiência primária:** Edgar (nova contratação — analista de qualidade de dados)  
**Audiência secundária:** Time técnico Brain / Geobrain  

## Missão Central

Apresentar os **objetivos técnicos das validações necessárias** na base de dados e API do Geobrain, usando o notebook "Validação Dados CID" como caso-base concreto — e estruturar isso como ponto de partida para as primeiras atividades do Edgar.

## O Que Edgar Deverá Fazer

1. **Criar cenários de uso das APIs Geobrain** (autenticação → consulta → extração)
2. **Encontrar inconsistências e erros** nos dados retornados
3. **Classificar os erros** por tipo, severidade e impacto
4. **Documentar os resultados** em relatórios de alertas estruturados

## Narrativa da Apresentação (Fluxo de Slides)

### Bloco 1 — Por que validar? (contexto)
- Dados imobiliários têm alta variabilidade: preços, áreas, datas de entrega, localização
- Erros não detectados chegam ao cliente → perda de confiança
- Controle de qualidade é atividade contínua, não pontual

### Bloco 2 — A API como fonte de verdade
- O Geobrain expõe dados via API REST (JWT auth)
- Qualquer análise começa em `/building-with-history`
- Os dados chegam aninhados (building → typologies[]) e precisam de transformação

### Bloco 3 — O caderno CID como modelo
- Demonstração prática: o que cada etapa do caderno valida
- Cada etapa = um cenário de uso da API
- Resultado = um relatório de alertas estruturado

### Bloco 4 — As etapas técnicas de validação
1. Análise exploratória inicial
2. Detecção de outliers por Padrão
3. Validação de consistência de datas
4. Validação de localização geográfica (lat/lon)
5. Relatório de alertas consolidado

### Bloco 5 — O que o Edgar constrói daqui pra frente
- Ampliar o caderno para outras cidades
- Criar novos cenários (campos não cobertos ainda)
- Classificar erros (sistemático vs. pontual, grave vs. leve)
- Evoluir o relatório de alertas para um dashboard

## Produto Final Esperado
- Página web interativa no app interno (React/Vite)
- Categoria: Testes de Qualidade > [nome curto a definir]
- Cada etapa executável via botão → chama a API → mostra resultado + alertas
