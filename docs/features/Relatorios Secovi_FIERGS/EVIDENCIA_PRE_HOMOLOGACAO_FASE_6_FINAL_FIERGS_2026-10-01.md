# Evidência pré-homologação — Fase 6: varredura final

**Data:** 01/10/2026

**Escopo:** FIERGS 2T2026 e regressão FIERGS 4T2025

**Portão:** G6 técnico

## 1. Resultado consolidado

As Fases 0–6 foram implementadas sem números fixos, exceções de período ou alteração da fonte. O contrato numérico, editorial e de exportação está coberto por testes e por 32 invariantes críticas de publicação.

## 2. Matriz final

| Indicador | 2T2026 | 4T2025 | Estado |
|---|---:|---:|---|
| vendas verticais | 1.091 | 1.524 | reconciliado |
| lançadas verticais | 54.761 | 53.295 | reconciliado |
| oferta final vertical | 5.251 | 5.855 | reconciliado |
| horizontal projetos | 129 | 121 | reconciliado |
| horizontal lançadas | 30.476 | 28.413 | reconciliado |
| horizontal finais | 3.365 | 2.840 | reconciliado |
| mapas | 648 = 519 + 129 | 626 = 505 + 121 | reconciliado |
| invariantes críticas | 32/32 | 32/32 | homologável |

## 3. Correções cobertas

- residual tipológico de 63 unidades derivado por empreendimento e exibido em `Não classificado`;
- preservação de `null`, zero observado e distrato negativo com semânticas distintas;
- bloqueio de PDF/PPT quando linhas visíveis não fecham no total canônico;
- bloqueio de sobrecobertura residual negativa sem bloquear distratos legítimos;
- ranking com as dez cidades e Eldorado do Sul em zero;
- mapas sem perda de chave, com enquadramento mais útil, marcadores limitados e separação visual de coordenadas coincidentes;
- nome e metadados institucionais para FIERGS, Secovi-SP e recorte livre;
- mensagem honesta sobre a necessidade de manter a aba visível;
- preview, PDF e PPT continuam compartilhando o mesmo manifesto de 75 páginas no preset FIERGS.

## 4. Validações finais

| Verificação | Resultado |
|---|---|
| suíte FIERGS | 32 arquivos, 262/262 testes aprovados |
| `npx tsc --noEmit -p tsconfig.app.json` | aprovado |
| `npm run build` | aprovado |
| reconciliação autenticada 2T2026 | 32/32 invariantes, homologável |
| reconciliação autenticada 4T2025 | 32/32 invariantes, homologável |
| contrato PDF/PPT 16:9 | aprovado |
| contrato editorial FIERGS | 75 páginas aprovado |
| nomes e metadados | FIERGS, Secovi-SP e recorte livre aprovados |

Artefatos autenticados usados na regressão:

| Arquivo | SHA-256 |
|---|---|
| `.tmp/fiergs-prehomologacao-fase2-2T2026.json` | `855162EE625C9BD16DCA9002F5704D50017C724B2A10287C56D6B2C4465F9092` |
| `.tmp/fiergs-prehomologacao-fase2-4T2025.json` | `176F5E5E5746E98396D5A72A1B5E415CC8CEF614BFE3A2BA3C5A55B94B61FE03` |

Avisos não bloqueantes preexistentes: dimensões zero do Recharts no ambiente de testes, Browserslist desatualizado, importação mista de `xlsx` e chunks superiores a 500 kB.

## 5. Validação pós-publicação obrigatória

O novo PDF e PPT só podem ser produzidos pelo fluxo publicado com acesso às fontes e ao fundo cartográfico. Após o deploy, deve-se:

1. gerar FIERGS 1T2023–2T2026 em PDF e PPT;
2. confirmar 75 páginas, nome `panorama-fiergs-rs-2T2026` e propriedades internas;
3. verificar a página 31 com dez cidades e Eldorado do Sul em zero;
4. verificar as páginas 36 e 59 em `54.761 / 5.251`;
5. inspecionar as páginas 67–69 a 100%, confirmando legibilidade e 648 chaves;
6. baixar a auditoria CSV e confirmar 32 invariantes em `match`;
7. executar smoke de 4T2025 antes do envio à Juliana.

## 6. Portão G6

**APROVADO PARA REPUBLICAÇÃO E GERAÇÃO DOS ARTEFATOS.** Não há divergência crítica conhecida no código. O status “pronto para homologação final da Juliana” depende somente da inspeção dos novos PDF/PPT após o deploy, especialmente dos mapas, e não deve ser declarado antes dela.

**Commit isolado:** registrado no handoff do portão.
