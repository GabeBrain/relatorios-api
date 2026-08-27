# Plano terminal paralelo — Luna — UI, PDF e integração final da V1

**Status:** `READY_FOR_PARALLEL_EXECUTION`
**Data:** 2026-08-27
**Papel:** trilha B, integrador final e único responsável pelo commit combinado
**Rota:** `/rebrain/panorama-secovi-fiergs`
**Card:** [Panorama | Secovi e FIERGS](https://brain381753.monday.com/boards/18398428946/pulses/12517501135) — `12517501135`
**Matriz de aceite:** [`MAPEAMENTO_CORRECOES_JUNDIAI_V1_2026-08-27.md`](./MAPEAMENTO_CORRECOES_JUNDIAI_V1_2026-08-27.md)
**Plano par:** [`PLAN_OPUS_CORRECOES_V1_JUNDIAI.md`](./PLAN_OPUS_CORRECOES_V1_JUNDIAI.md)

## 1. Missão

Executar em paralelo com o Opus a camada de apresentação da V1, sem editar arquivos reservados ao
Opus. Se terminar antes, não commitar, não encerrar a tarefa e não assumir que a árvore transitória
quebrada é falha: aguardar o handoff `OPUS_READY`, revisar as duas trilhas juntas, corrigir a
integração, validar as 62 páginas e somente então criar um único commit sólido e combinado.

O resultado terminal é código integrado, testes e build verdes, PDF real de Jundiaí inspecionado,
matriz de evidências atualizada e resposta de e-mail pronta para Juliana.

## 2. Protocolo de concorrência obrigatório

### Base comum

- Ambos começam na `main`, no mesmo `HEAD` atual que contém estes dois planos.
- O PDF-fonte em `assets/exportados/` é entrada não versionada: não mover, editar, adicionar ou apagar.
- Depois do início, não executar `git pull`, `checkout`, `reset`, `rebase`, `stash`, `clean` ou troca de branch.
- Durante a fase paralela, nenhum agente executa `git add`, `git commit` ou `git push`.
- Mudanças transitórias do outro agente na árvore são esperadas e devem ser preservadas.

### Propriedade de arquivos durante a fase paralela

O Luna pode editar somente:

- `src/features/panorama-secovi-fiergs/pages/PanoramaSecoviFiergsPage.tsx`;
- `src/features/panorama-secovi-fiergs/components/**`;
- `src/features/panorama-secovi-fiergs/report/manifest.ts`;
- `src/features/panorama-secovi-fiergs/print/panorama-print.css`;
- `src/features/panorama-secovi-fiergs/lib/pdf-export.ts`;
- `src/features/panorama-secovi-fiergs/lib/pdf-print-interceptor.ts`, apenas para remoção comprovada;
- `src/features/panorama-secovi-fiergs/export-store.ts`;
- `src/features/panorama-secovi-fiergs/__tests__/pdf-export.test.ts`;
- novos testes de componente/manifesto com nomes que comecem por `luna-`;
- `docs/features/Relatorios Secovi_FIERGS/HANDOFF_LUNA_CORRECOES_V1_JUNDIAI.md`.

O Luna não edita, até o handoff do Opus:

- `types.ts`, `api.ts`, `contracts/**`, `report/model.ts`;
- `lib/launches.ts`, `lib/market-calibration.ts` e qualquer arquivo novo em `domain/**`;
- `report-model.test.ts`, `market-calibration.test.ts`, `launches.test.ts`;
- `HANDOFF_OPUS_CORRECOES_V1_JUNDIAI.md`.

Se precisar de mudança em arquivo do Opus, registrar a necessidade no handoff Luna e continuar o que
for independente. Não editar o arquivo reservado durante a fase paralela.

### Portão de integração

O Opus sinaliza conclusão criando
`docs/features/Relatorios Secovi_FIERGS/HANDOFF_OPUS_CORRECOES_V1_JUNDIAI.md` com
`Status: OPUS_READY`, base, arquivos alterados, contrato final, testes e limitações. Enquanto o
arquivo não existir ou não tiver esse status, o Luna:

1. pode concluir seus arquivos e testes isolados;
2. deve registrar `LUNA_WAITING_FOR_OPUS` em seu próprio handoff;
3. não pode commitar nem encerrar como concluído;
4. deve usar o mecanismo de espera/continuação do agente e reavaliar quando a árvore mudar, sem loop
   de terminal bloqueante prolongado.

Depois de `OPUS_READY`, termina a propriedade exclusiva. O Luna passa a integrador e pode ajustar
qualquer arquivo necessário, preservando a intenção e os testes do Opus. O Opus não volta a editar.

## 3. Contrato congelado entre as trilhas

O Luna deve programar contra estas decisões, implementadas pelo Opus:

- `PanoramaScope` usa `uf`, `cities: string[]` e `endQuarter`; não criar novo uso de `scope.city`;
- uma cidade é representada por array com um item;
- o relatório preserva os blocos públicos atuais e acrescenta proveniência do consolidado, incluindo
  cidades solicitadas, concluídas e falhas;
- período é gerado dinamicamente até `endQuarter`, mantendo janela editorial de 17 trimestres;
- tipologias e padrões chegam canonizados e ordenados;
- universo Secovi já chega filtrado: todos os verticais e somente Condomínio de Casas horizontal;
- ausência não vira zero silencioso; os estados de dados existentes continuam explícitos;
- contagens de empreendimentos e médias ponderadas vêm do modelo, não são reinventadas no JSX;
- coortes, matrizes, maturidade e VGV expõem linhas prontas para os subtotais/totais requeridos.

Se a implementação do Opus divergir nominalmente, o Luna adapta os consumidores apenas na fase de
integração; não cria um segundo domínio concorrente dentro de componentes.

## 4. Leitura obrigatória

1. `AGENTS.md` e protocolo de sessão;
2. `docs/architecture/FRONTEND_GUIDELINES.md`;
3. `docs/architecture/DESIGN_SYSTEM.md`;
4. o mapeamento de Jundiaí e o plano Opus vinculados acima;
5. `MAPEAMENTO_FASE0_PIRACICABA_1T26.md`;
6. `GABARITO_CONGELADO_PANORAMA_PIRACICABA_1T26_v1.md`;
7. `DECISOES_E_PREMISSAS_PANORAMA.md`;
8. PDF corrigido de Jundiaí e suas 28 anotações.

## 5. Trilha paralela do Luna

### LU-0 — baseline visual e rastreio

1. Confirmar base comum e registrar SHA-256 do PDF sem versioná-lo.
2. Rodar baseline de testes/build antes de editar, anotando falhas preexistentes.
3. Criar no handoff Luna a matriz `LU-ID → slides → arquivos → evidência → status`.
4. Capturar baseline das 62 páginas e da paginação.

### LU-1 — escopo multi-cidade e período

1. Adaptar a página para `cities[]`, reutilizando a lista autorizada do `GeoApiScopeEngine`.
2. UF continua obrigatória; trocar UF limpa todas as cidades.
3. Bloquear geração sem cidade válida e mostrar uma ou várias cidades no recorte/proveniência.
4. Substituir a lista fixa de trimestres por opções dinâmicas coerentes com o contrato do Opus.
5. Título, capa e nome do PDF devem ser determinísticos para uma ou várias cidades.
6. Cobrir carregando, vazio, erro total, falha parcial, escopo inválido e sucesso.

### LU-2 — manifesto e ordem institucional

1. Separar `referenceSlide` de `outputOrder`.
2. Mover a lâmina atual 3 para a posição 7, deslocando 4–7 e mantendo 62 posições contínuas.
3. Fazer navegador, sumário, leitura contínua, deck offscreen e PDF consumirem `outputOrder`.
4. Recalibrar o slide 2 contra a arte neutra.

### LU-3 — gráficos 14–26 e 40

1. Exibir explicitamente primeiro e último ticks nos gráficos temporais.
2. Evitar colisão de rótulos com regra determinística e manter tooltip acessível.
3. Reduzir a caixa/faixa de “Residencial Vertical”.
4. Aplicar a correção aos slides 14–19 e 23–26.
5. Converter o slide 40 em gráfico de barras, preservando 17 períodos.

### LU-4 — consumidores das tabelas 31–51

Consumir os agregados do Opus, sem recalculá-los de forma paralela no JSX:

1. 31/32: padrão vertical, empreendimentos e remoção de coluna sem fonte;
2. 33 e 48: coortes, agrupamento até 2022, subtotal até 2024 e total geral;
3. 34–37: tipologias canônicas `1`, `2`, `3`, `4 ou + Dormitórios`;
4. 38–39: somente vertical e sete padrões canônicos;
5. 41/42: matrizes ano × padrão com lançada/final;
6. 43–46: maturidade preenchida, somente vertical;
7. 49: horizontal aprovado aberto por padrão;
8. 51: linhas verticais, subtotal vertical, horizontais, total geral e empreendimentos distintos.

Cada tabela/gráfico deve renderizar ausência como ausência, sem converter `null` em zero. O “novo
padrão das tabelas Rebrain” e PPTX continuam fora da V1.

### LU-5 — narrativas, mapa, exportação e regressão própria

1. Recalcular slides 29, 53 e 54, marcando-os como não homologados pela Juliana.
2. Validar que o mapa reflete o universo Secovi recebido do modelo.
3. Verificar assets e encerramento 57–62.
4. Remover `pdf-print-interceptor.ts` somente se continuar sem imports e o build cobrir a remoção.
5. Rodar testes exclusivos do Luna, typecheck e build; registrar o resultado, ainda sem commit.
6. Se o Opus não estiver pronto, gravar `LUNA_WAITING_FOR_OPUS` e aguardar.

## 6. Integração exclusiva do Luna após `OPUS_READY`

1. Ler integralmente o handoff do Opus e comparar arquivos reais com a lista declarada.
2. Inspecionar `git diff` completo; não descartar mudanças de nenhuma trilha.
3. Revisar domínio, políticas Secovi, multi-cidade, ponderações, nulos e reconciliações do Opus.
4. Ajustar consumidores ao contrato final e corrigir falhas cruzadas onde for necessário.
5. Executar testes de domínio, componentes, manifesto, exportação, suíte completa, typecheck, lint
   aplicável e build.
6. Subir a aplicação e verificar no navegador: uma cidade; duas cidades monitoradas; período posterior
   a 1T/26 quando disponível; vazio; falha parcial; erro total; navegação e exportação das 62 páginas.
7. Gerar o PDF corrigido de Jundiaí e inspecionar as 62 páginas em 1920×1080.
8. Fechar a matriz `requisito/slide → evidência → status` para os 28 comentários e G-01/G-02/G-03.
9. Atualizar `DECISOES_E_PREMISSAS_PANORAMA.md`, este plano, o handoff Luna e
   `docs/projetos/LIVE_rebrain.md`, com o link Monday.
10. Executar `npm run check:live-docs -- <base> <head>` no intervalo correto.
11. Somente com tudo verde, usar `git add <caminhos explícitos>` e criar um único commit combinado.
    Nunca usar `git add .` ou `-A`; nunca incluir o PDF-fonte.
12. Reportar quantos commits ficaram à frente e perguntar antes de qualquer push.

Se houver conflito sem solução segura, não commitar parcialmente: documentar evidência e pedir
decisão. Não usar reset/checkout para “limpar” a árvore.

## 7. Critério terminal de pronto

- [ ] handoff Opus contém `OPUS_READY` e foi revisado;
- [ ] G-01, G-02 e G-03 implementados e verificados;
- [ ] G-04 e G-05 registrados como V2;
- [ ] 28 comentários rastreados e resolvidos;
- [ ] 62 páginas corretas no preview e PDF;
- [ ] totais, subtotais, contagens e médias reconciliados;
- [ ] nenhuma categoria indevida, coluna vazia ou zero silencioso;
- [ ] testes, typecheck, lint aplicável e build aprovados;
- [ ] PDF final gerado e inspecionado;
- [ ] documentos e dois handoffs atualizados;
- [ ] um único commit combinado criado pelo Luna;
- [ ] resposta de e-mail preenchida com evidências reais.

## 8. Resposta final em formato de e-mail para Juliana

Preencher apenas com resultados comprovados:

> **Assunto: Panorama Secovi-SP — retorno das correções da V1**
>
> Boa tarde, Juliana!
>
> Obrigado pelos comentários no Panorama de Jundiaí. Concluímos a revisão da V1 e tratamos os
> apontamentos do PDF.
>
> Principais ajustes realizados:
>
> - corrigimos a ordem das páginas institucionais e o layout da capa municipal;
> - ajustamos os gráficos para exibir o primeiro período, evitar sobreposição de rótulos e melhorar
>   a área útil;
> - padronizamos nomes e ordem de tipologias e padrões;
> - agrupamos os anos e incluímos subtotal até 2024 e total geral;
> - corrigimos oferta lançada/final, maturidade e VGV, com contagens e subtotais;
> - aplicamos ao Secovi-SP os verticais e, no horizontal, somente Condomínio de Casas;
> - incluímos múltiplas cidades e períodos posteriores a 1T/26.
>
> Validamos as 62 páginas no preview e no PDF usando **[cidade(s)]**, **[trimestre]**. O arquivo final
> possui **[tamanho]** e foi conferido página a página. Executamos **[testes e resultado]**.
>
> Ficaram para V2 o novo padrão visual das tabelas, quando recebermos uma referência, e a exportação
> em PowerPoint editável. O resumo textual permanece não homologado nesta rodada.
>
> Segue o novo PDF para conferência: **[nome/link]**.
>
> Obrigado!

## 9. CTA para iniciar o Luna

> Você é o **Luna, trilha B e integrador final**. Trabalhe na `main` compartilhada e execute
> integralmente `docs/features/Relatorios Secovi_FIERGS/PLAN_LUNA_CORRECOES_V1_JUNDIAI.md`, usando o
> mapeamento de Jundiaí como matriz de aceite e respeitando rigorosamente a propriedade de arquivos.
> O Opus estará alterando domínio/API em paralelo. Durante essa fase, não edite arquivos reservados
> ao Opus, não faça `git add`, commit, push, pull, stash, checkout, reset ou clean. Se sua trilha
> terminar primeiro, registre `LUNA_WAITING_FOR_OPUS`, aguarde pelo arquivo
> `HANDOFF_OPUS_CORRECOES_V1_JUNDIAI.md` com `Status: OPUS_READY` e não encerre. Depois disso, revise
> todas as mudanças das duas trilhas, integre e corrija o conjunto, execute a verificação completa,
> gere e inspecione o PDF de 62 páginas, atualize a documentação e crie o único commit combinado com
> caminhos explícitos. Preserve e não versione o PDF-fonte. Ao final, entregue a matriz de evidências
> e a resposta pronta para o e-mail da Juliana; não faça push sem autorização.
