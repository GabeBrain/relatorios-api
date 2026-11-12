# Evidência pré-homologação — Fase 5: identidade e exportação

**Data:** 01/10/2026

**Portão:** G5

## 1. Resultado

PDF, PPT e o caminho legado de impressão passam a consumir o mesmo contrato de metadados. O nome do arquivo continua baseado no preset e no período, enquanto título, assunto e palavras-chave preservam entidade, território, motor e build quando disponível.

## 2. Contratos

| Recorte | Nome | Título interno |
|---|---|---|
| FIERGS 2T2026 | `panorama-fiergs-rs-2T2026.pdf|pptx` | `Panorama FIERGS/RS — 2T2026` |
| Secovi-SP 4T2025 | `panorama-secovi-sp-4T2025.pdf|pptx` | `Panorama Secovi-SP — 4T2025` |
| recorte livre Curitiba | `panorama-curitiba-1T2026.pdf|pptx` | `Panorama imobiliário de Curitiba/PR — 1T2026` |

O assunto contém o território, período e motor. `VITE_BUILD_ID` é incluído somente quando existe; nenhum identificador falso é fabricado. As cidades também são preservadas como palavras-chave.

## 3. Comunicação da limitação da aba

As duas mensagens de progresso agora instruem o usuário a manter a aba visível até o download. A interface informa que a navegação interna é possível, mas que trocar de aba pode pausar a captura. O worker servidor continua fora do escopo desta rodada.

## 4. Arquivos afetados

- `src/features/panorama-secovi-fiergs/lib/export-metadata.ts`;
- `src/features/panorama-secovi-fiergs/lib/pdf-export.ts`;
- `src/features/panorama-secovi-fiergs/lib/pdf-print-interceptor.ts`;
- `src/features/panorama-secovi-fiergs/components/PanoramaExportHost.tsx`;
- `src/features/panorama-secovi-fiergs/components/ReportPaginator.tsx`;
- `src/features/panorama-secovi-fiergs/__tests__/export-metadata.test.ts`;
- este documento.

## 5. Testes

| Verificação | Resultado |
|---|---|
| FIERGS, Secovi-SP e recorte livre | aprovados |
| nome PDF/PPT por preset e período | aprovado |
| build opcional sem valor fabricado | aprovado |
| testes focais de exportação | 24/24 aprovados |
| TypeScript | aprovado |

## 6. Portão G5

**APROVADO.** Nome, título, assunto, palavras-chave, entidade e período são coerentes, e a interface não promete execução irrestrita em segundo plano.

**Commit isolado:** registrado no handoff do portão.
