# Plano de implementação — FIERGS RM Porto Alegre

## Objetivo

Reproduzir o estudo oficial `Panorama_FIERGS_RM de Porto Alegre_4T25` como produto do Panorama de Mercado, preservando a arquitetura Secovi-SP e separando política de universo, manifesto editorial e identidade visual por entidade.

## Portões de execução

1. **Aquisição:** 11 cidades monitoradas, API interna v2 como fonte principal e pública com retries como contingência.
2. **Domínio:** universo horizontal FIERGS restrito aos quatro produtos oficiais dos slides 63–66.
3. **Modelo:** cálculos derivados somente de campos comprovados no contrato; regra ausente permanece marcada como aberta.
4. **Apresentação:** manifesto FIERGS próprio, sem reaproveitar textos institucionais do Secovi-SP.
5. **Validação:** números contra o deck 4T25, depois comparação visual, PDF e PPT.

## Execução das etapas 4–12

| Etapa | Entrega | Critério de conclusão | Estado em 22/09 |
|---|---|---|---|
| 4 | Seletor de entidade | Secovi livre; FIERGS aplica RS + 11 cidades e preserva escolha do período | Implementado |
| 5 | Registro dos 75 slides | numeração contínua, título, família e classe estático/híbrido/dinâmico | Implementado |
| 6 | Fundos e institucionais oficiais | ativos extraídos do deck, licenciados no bundle e usados pelo renderizador | 7 fundos estáticos extraídos e registrados; ligação ao renderizador pendente |
| 7 | Lançamentos, vendas e oferta | slides 9–37 reproduzidos e reconciliados | Motor compartilhado cobre métricas-base; manifesto/layout FIERGS pendente |
| 8 | MCMV, bairro/cidade e dormitórios | regra MCMV aprovada; bairro disponível no contrato; séries 1–4 dormitórios | Dormitórios cobertos; MCMV e bairro bloqueados por contrato/metodologia |
| 9 | Horizontal completo | slides 63–66 com os quatro produtos | Política e agregações-base prontas; páginas FIERGS pendentes |
| 10 | Três mapas | padrão, estoque e R$/m² com legenda e marcadores | Coordenadas existem; atributos/visuais específicos pendentes |
| 11 | Paridade 4T25 | tabela de esperado × obtido com tolerância por indicador | Deck e evidências locais disponíveis; rodada autenticada final pendente |
| 12 | Paridade visual e exportação | 75 slides revisados; PDF/PPT sem divergência estrutural | Suíte atual de exportação Secovi aprovada; FIERGS pendente |

## Evidências do deck oficial

- 75 slides, proporção 16:9.
- 5 masters; 52 slides usam layout `BLANK`.
- Slides 1, 3, 4 e 72–75 são imagens institucionais de página inteira.
- Um elemento visual é reutilizado em 52 slides, evidenciando um fundo/base comum.
- Slides 63–66 compõem o horizontal; slides 67–69 são os três mapas.
- O deck usa gráficos/tabelas nativos até o slide 61, mas horizontal e mapas aparecem como imagens achatadas. Esses blocos precisam ser reconstruídos a partir do dado, não copiados como resultados fixos.

## Limites que não devem ser atravessados por inferência

- O deck não define uma fórmula auditável de MCMV. Não considerar `Econômico` como sinônimo automático de MCMV.
- O contrato granular inspecionado não comprovou bairro como dimensão confiável para todos os empreendimentos.
- O motor atual possui um mapa vertical simples; isso não equivale aos mapas por padrão, estoque e R$/m² do estudo.
- O manifesto Secovi tem 58 referências editoriais e não deve ser apresentado como se fosse o deck FIERGS de 75 slides.

## Próxima fatia executável

1. Ligar os sete fundos oficiais já registrados ao renderizador FIERGS.
2. Criar renderizador FIERGS próprio, inicialmente para slides 1–37.
3. Produzir uma matriz de paridade numérica 4T25 para lançamentos, vendas e oferta.
4. Obter decisão de negócio para MCMV e confirmar a dimensão bairro no endpoint.
5. Estender o modelo geográfico com padrão, estoque e preço por m² e implementar os slides 67–69.
