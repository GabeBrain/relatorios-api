# Evidência das Fases 7 e 8 — homologação FIERGS 2T2026

## Resultado executivo

O recorte autenticado das dez cidades foi recomposto pela aplicação em `1T2023–2T2026`. O fluxo integrado encontrou e corrigiu uma última diferença de universo horizontal: a janela temporal eliminava a coorte editorial `Até 2022`, enquanto os slides por produto usavam a fotografia completa. Após o alinhamento, a guarda aprovou os 11 invariantes críticos e foram gerados CSV, PowerPoint e PDF com 75 páginas.

## Correção encontrada pelo portão integrado

Antes da correção, a própria auditoria da UI bloqueou a exportação:

| Indicador horizontal | Produto / universo completo | Coorte cortada em 1T2023 | Delta |
|---|---:|---:|---:|
| Empreendimentos | 129 | 39 | -90 |
| Oferta lançada | 30.476 | 8.402 | -22.074 |
| Oferta final | 3.365 | 2.482 | -883 |

A série temporal continua iniciando em `1T2023`, mas as lâminas horizontais de fotografia e coorte usam o cubo ativo completo. Isso preserva a linha `Até 2022` e faz produto × coorte fechar no mesmo universo, sem alteração manual de valores.

## Matriz final de reconciliação

| Invariante | Total canônico | Total dimensional | Delta | Status |
|---|---:|---:|---:|---|
| vendas por padrão | 1.091 | 1.091 | 0 | match |
| vendas por tipologia | 1.091 | 1.091 | 0 | match |
| vendas por cidade | 1.091 | 1.091 | 0 | match |
| vendas por área | 1.091 | 1.091 | 0 | match |
| estoque por padrão | 5.251 | 5.251 | 0 | match |
| estoque por tipologia | 5.251 | 5.251 | 0 | match |
| estoque por área | 5.251 | 5.251 | 0 | match |
| horizontal por coorte — empreendimentos | 129 | 129 | 0 | match |
| horizontal por coorte — lançadas | 30.476 | 30.476 | 0 | match |
| horizontal por coorte — finais | 3.365 | 3.365 | 0 | match |
| chácaras presentes após o filtro | 0 | 0 | 0 | match |

## Testes e build

- suíte FIERGS: `236/236` testes aprovados;
- suíte integral do repositório: `462` aprovados, `1` ignorado e um timeout isolado do Sinduscon; o teste do Sinduscon passou ao ser repetido sozinho (`3/3`), sem alteração no módulo;
- `npx tsc --noEmit -p tsconfig.app.json`: aprovado;
- `npm run build`: aprovado;
- navegador autenticado no build estático: geração de 75 páginas, guarda homologável e downloads concluídos.

## Artefatos gerados

Diretório local: `.tmp/fiergs-homologacao-2T2026/`

| Arquivo | Tamanho | SHA-256 |
|---|---:|---|
| `panorama-fiergs-2T2026-homologacao.pptx` | 12.818.600 bytes | `4D36EFFBA053FE90B473CAFC255830E7DFE2CB54743D754DD0B2E7FC202FFECD` |
| `panorama-fiergs-2T2026-homologacao.pdf` | 12.424.145 bytes | `3B11C7356F175606D4DB1DAD18E3C54CB5ED9D4631BB5CE7CE4210E4852C949D` |
| `fiergs-2T2026-reconciliacao.csv` | 99.277 bytes | `5A5ED4169F0708DD54EBD7465FFD79DF627E18A2A49FA3BD3030B9606B479644` |

O PPTX contém 75 XMLs de slide e o PDF contém 75 páginas.

## Inspeção visual

Foram capturadas e conferidas as lâminas `9, 11, 14–16, 22, 25–31, 33, 35–43, 57–58 e 63–69`. Para evitar falso positivo de tooltip/toast do navegador, os slides 43 e 67–69 também foram inspecionados diretamente nas imagens raster incorporadas ao PPTX final.

Resultado:

- slides 25 e 30 fecham os percentuais em `100,0%`;
- slide 29 usa nomenclatura completa de dormitórios e preserva o distrato `−1`;
- slide 31 fecha em `1.091`, sem legenda sobreposta;
- slide 41 comunica a indisponibilidade anual e não fabrica indicador;
- slide 43 não contém tooltip e apresenta rótulos esparsos, sem colisão;
- slides 57 e 58 usam o estoque canônico `5.251`;
- slides 63–65 usam o universo horizontal sem chácaras e produto × coorte fecha;
- slides 67–69 enquadram os pontos válidos, exibem zoom 9 e legendas correspondentes.

## Estado do portão

As Fases 7 e 8 estão **concluídas tecnicamente** e o pacote está pronto para envio à Juliana. O aceite da Juliana e qualquer promoção posterior continuam sendo um portão humano separado; este trabalho não registra homologação externa antes da resposta dela.
