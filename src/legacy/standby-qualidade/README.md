# Standby — Qualidade de Dados (CID)

Arsenal em standby, fora da navegação do app desde 07/jul/2026.

- `TQCidValidacaoBase.tsx` — **motor de validação de base do CID**, preservado
  intencionalmente para reaproveitamento futuro (validações geográficas via
  `CITY_BBOX`, checagens de consistência de base, UI completa). Ficou bom e é
  reutilizável — ao precisar de validação de base para outro cliente, partir daqui.

Para reativar: importar a página em `src/App.tsx`, registrar uma rota e adicionar
a entrada no menu (`src/components/layout/AppLayout.tsx`) e no
`CommandPalette.tsx`.

As páginas de Qualidade do **Piemonte** (VGV Verticais e Release Price) foram
removidas na mesma data — se necessário, recuperáveis no histórico do repositório
(`src/pages/TQPiemonteVgv.tsx` e `src/pages/TQPiemonteReleasePrice.tsx`).

Documentação de apoio do CID: `docs/features/cid-validacao/`.
