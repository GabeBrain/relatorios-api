# Evidências — FIERGS recortes livres — 13/10/2026

## G0 — baseline congelada

- Base `74cc572`, main; fetch de origin confirmado. Zero atrás/três à frente, commits preexistentes Corretor `f5eff70`, `bb3326d`, `74cc572`, preservados. Insumos/plano/mapeamento locais desta frente classificados como documentação versionável.
- Modelo aceita lista de municípios; guarda municipal depende indevidamente da comparação visual. A identidade territorial passará a distinguir conjunto oficial exato de personalizado pela UF e cidades normalizadas.
- Baseline: 286 testes aprovados e uma falha preexistente em `report-reference-panels.test.tsx`, expectativa de cabeçalho `Lançada` obsoleta após o ajuste aceito da oferta da janela. Comando `npx.cmd vitest run src/features/panorama-secovi-fiergs`; nenhuma API/PDF acionada.
- Histórico de evidências 2T2026/4T2025 localizado em `.tmp/fiergs-prehomologacao-fase2-*.json`, auditorias/regressões e testes versionados. As evidências históricas não são payload completo reproduzível da base atual; regressão local usa fixtures sintéticas identificadas como tal. Ensaio real será de Gabriel no G5.
- Exportação corrente deriva do manifesto; busca não encontrou importador ativo de `pdf-print-interceptor.ts`. Preservar esse caminho inativo.

## G1 — identidade e seleção (validado localmente)

Contrato central em `scope-identity.ts`: modo/preset, UF, nomes completos, rótulos, chave territorial e slug determinístico. Outros estados autorizados são permitidos, uma UF por estudo. Seleção depende de autorização de todos os municípios, mantendo atalho regional.

Quatro testes de identidade/autorização aprovados. UF/cidade bloqueadas somente durante coleta/carregamento; troca de UF limpa cidades e sessão; alterações de recorte/período invalidam submissão. Tokens SE v0.1 copiados, raio/foco limitados aos controles, sem redesign do deck. Testes de interface e revisão TypeScript integram G4; não há geração/site verificados neste portão.
