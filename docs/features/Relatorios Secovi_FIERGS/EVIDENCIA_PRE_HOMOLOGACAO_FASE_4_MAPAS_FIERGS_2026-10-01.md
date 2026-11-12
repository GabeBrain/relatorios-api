# Evidência pré-homologação — Fase 4: mapas

**Data:** 01/10/2026

**Escopo:** páginas 67–69 do Panorama FIERGS

**Portão:** G4 técnico

## 1. Baseline confirmado

| Período | Cubo | Chaves únicas | Coordenadas válidas | Renderizadas por mapa | Vertical | Horizontal |
|---|---:|---:|---:|---:|---:|---:|
| 2T2026 | 648 | 648 | 648 | 648 | 519 | 129 |
| 4T2025 | 626 | 626 | 626 | 626 | 505 | 121 |

Não há perda de chave, coordenada inválida nem diferença entre os três mapas nos dois recortes autenticados.

## 2. Decisão visual

- nenhum ponto ou outlier foi removido;
- coordenadas de origem permanecem intactas no modelo e na auditoria;
- o enquadramento deixa de acrescentar um tile inteiro em cada borda, pois os marcadores já recebem margem percentual;
- coordenadas exatamente coincidentes recebem deslocamento circular pequeno e determinístico somente na renderização;
- marcadores de padrão passam de 2 para 1,55 cqw;
- marcadores proporcionais ficam entre 1,1 e 3,2 cqw, substituindo a faixa anterior de 1,4 a 4,2 cqw;
- transparência, contorno e ordem de foco reduzem oclusão;
- a área útil do mapa foi ampliada sem retirar o painel de legenda, escala, fonte ou nota cartográfica.

## 3. Guardas

O teste de colisão confirma que:

- a quantidade e a identidade dos pontos são preservadas;
- as coordenadas originais continuam associadas a cada projeto;
- pontos coincidentes recebem posições visuais diferentes e limitadas ao quadro;
- coordenadas inválidas continuam sendo rejeitadas com segurança;
- mosaicos impossíveis continuam falhando de modo seguro.

## 4. Arquivos afetados

- `src/features/panorama-secovi-fiergs/lib/map-tiles.ts`;
- `src/features/panorama-secovi-fiergs/components/MarketSlides.tsx`;
- `src/features/panorama-secovi-fiergs/print/panorama-print.css`;
- `src/features/panorama-secovi-fiergs/__tests__/map-tiles.test.ts`;
- este documento.

## 5. Testes

| Verificação | Resultado |
|---|---|
| testes de mosaico, limites, inválidos e colisão | 6/6 aprovados |
| smoke de renderização editorial | aprovado |
| TypeScript | aprovado |
| invariantes autenticadas de mapas 2T2026 | 648/648 |
| invariantes autenticadas de mapas 4T2025 | 626/626 |

## 6. Portão G4

**APROVADO TECNICAMENTE.** As mesmas chaves continuam renderizadas, sem alteração de universo ou coordenada de origem. A inspeção visual a 100% do novo PDF permanece parte obrigatória do G6, porque depende da geração do artefato após publicação.

**Commit isolado:** registrado no handoff do portão.
