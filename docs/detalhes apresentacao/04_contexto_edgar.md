# Contexto — Onboarding do Edgar (Analista de Qualidade de Dados)

## Quem é Edgar

Nova contratação do time Brain/Geobrain. Foco: controle de qualidade de dados da área CID.  
**Perfil técnico:** sabe SQL, Python básico, sem experiência documentada com ferramentas de AI.  
Esta página web é o **exemplo-base** e o ponto de entrada das suas primeiras atividades.

---

## O Que a Página Ensina — Camada 1 (Interface)

A página é completamente autoexplicativa: cada seção explica o que está sendo validado, por quê, e o que os resultados significam. O Edgar não precisa abrir código para usar.

- Seleciona cidade no dropdown
- Clica "Executar Validação"
- Lê os resultados por seção (outliers, datas, localização)
- Lê o relatório de alertas consolidado no final

---

## O Que a Página Ensina — Camada 2 (Crescimento Técnico)

O objetivo de médio prazo é estimular o Edgar a **criar novas páginas como esta**, evoluindo tecnicamente através do próprio projeto. O caminho:

### Passo 1 — Entender as APIs (antes de qualquer código)
Duas páginas do app já existem para isso:

**"Documentação"** (`/documentacao`)
- Especificação OpenAPI completa da API Geobrain
- Todos os endpoints, parâmetros, esquemas de resposta
- Ponto de referência antes de escrever qualquer chamada

**"Testes de Requisição"** (`/testes-requisicao`)
- Interface interativa para testar endpoints ao vivo
- Edgar pode montar chamadas, ver respostas, explorar campos
- Equivalente a um Postman/Insomnia, mas integrado ao app

### Passo 2 — Autenticação com a conta própria
**IMPORTANTE para a apresentação:** o Edgar terá acesso com a própria conta.  
A autenticação acontece no app e fica visível no sidebar: badge verde "AUTENTICADO", email, tempo restante, botões "Reemitir" e "Remover".  
→ Referenciar **screenshot auth_state.png** nos slides aqui.  
→ Não é necessário token manual nem Postman: o app autentica e usa o token em todas as chamadas.

### Passo 3 — Criar novos cenários de validação
Com a API entendida, o Edgar passa a criar novas páginas:
1. Identifica um campo ou conjunto de campos não coberto ainda
2. Escreve o cenário de validação (hipótese + regra + severidade)
3. Implementa a página no projeto (fork → branch → PR no GitHub)
4. Testa ao vivo pela interface do app com os dados reais

### Passo 4 — Documentar os erros encontrados
Para cada erro identificado, classificar segundo o framework abaixo.

---

## Framework de Classificação de Erros

Para cada novo cenário que o Edgar criar, documentar:

```
Cenário: [nome descritivo]
API usada: [endpoint]
Parâmetros: [filtros usados — cidade, UF, tipo, etc.]
Hipótese: [o que se espera encontrar]
Regra de validação: [critério técnico — ex: delivery_date >= release_date]
Resultado esperado (dado correto): [descrição]
Resultado de alerta (dado incorreto): [descrição]
Tipo: Lógico / Estatístico / Nulidade / Referência
Severidade: Alta / Média / Baixa
Sistemático (todo o dataset) vs. Pontual (casos isolados): [observação]
Ação recomendada: [o que fazer quando encontrar]
```

**Tipos de inconsistência:**
- **Lógico:** viola uma regra de negócio (data de entrega antes do lançamento, lat/lon de outra cidade)
- **Estatístico:** fora da distribuição esperada para o segmento (outlier por Padrão)
- **Nulidade:** campo obrigatório ausente
- **Referência:** campo presente no índice mas ausente no detalhe (ex: `release_price` ausente no histórico)

**Severidade:**
- **Alta:** afeta relatórios entregues a clientes — correção urgente
- **Média:** outlier estatístico, requer verificação manual — pode ser dado legítimo
- **Baixa:** campo opcional, formatação inconsistente — não impacta análises

---

## Meta de Cobertura (Médio Prazo)

- [ ] Todos os campos numéricos principais (M², Preço, VGV, Estoque, Vendas)
- [ ] Todos os campos de data (Lançamento, Entrega)
- [ ] Localização geográfica para todas as cidades monitoradas
- [ ] Consistência entre `/building` e `/building-with-history` para o mesmo ID
- [ ] Consistência entre períodos no histórico de tipologias (`typologies_history`)
- [ ] Presença de `release_price` no histórico para empreendimentos com lançamento recente
- [ ] Validação cruzada: stock(t) = stock(t-1) - sold(t) + distrato(t) [equação de estoque]
