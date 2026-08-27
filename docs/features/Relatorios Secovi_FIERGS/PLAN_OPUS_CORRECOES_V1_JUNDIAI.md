# Plano terminal paralelo — Opus — domínio, API e agregações da V1

**Status:** `READY_FOR_PARALLEL_EXECUTION`
**Data:** 2026-08-27
**Papel:** trilha A, núcleo de dados; nunca commitar
**Rota:** `/rebrain/panorama-secovi-fiergs`
**Card:** [Panorama | Secovi e FIERGS](https://brain381753.monday.com/boards/18398428946/pulses/12517501135) — `12517501135`
**Matriz de aceite:** [`MAPEAMENTO_CORRECOES_JUNDIAI_V1_2026-08-27.md`](./MAPEAMENTO_CORRECOES_JUNDIAI_V1_2026-08-27.md)
**Plano par:** [`PLAN_LUNA_CORRECOES_V1_JUNDIAI.md`](./PLAN_LUNA_CORRECOES_V1_JUNDIAI.md)

## 1. Missão

Implementar, em paralelo com o Luna, o núcleo tipado de dados da V1: multi-cidade, períodos
dinâmicos, política Secovi, taxonomias, cubo granular, agregações, contagens, ponderações, coortes,
maturidade e VGV. Entregar alterações testadas diretamente na árvore compartilhada, sem tocar nos
arquivos do Luna e **sem executar `git add`, `git commit` ou `git push` em nenhuma hipótese**.

O Opus encerra sua participação criando o handoff `OPUS_READY`. O Luna será responsável por revisar,
integrar, corrigir o conjunto e criar o único commit combinado.

## 2. Protocolo de concorrência obrigatório

### Base e proibições

- Começar na `main`, no mesmo `HEAD` atual do Luna, contendo estes dois planos.
- Não executar `git pull`, `checkout`, `reset`, `rebase`, `stash`, `clean` ou trocar de branch após o início.
- Não adicionar, apagar ou modificar o PDF-fonte não versionado em `assets/exportados/`.
- Não reverter mudanças desconhecidas: elas podem ser trabalho simultâneo do Luna.
- Nunca executar `git add`, `git commit` ou `git push`, mesmo que todos os testes passem.
- Não atualizar o documento vivo nem os planos; isso pertence à integração do Luna.

### Propriedade de arquivos do Opus

O Opus pode editar somente:

- `src/features/panorama-secovi-fiergs/types.ts`;
- `src/features/panorama-secovi-fiergs/api.ts`;
- `src/features/panorama-secovi-fiergs/contracts/**`;
- `src/features/panorama-secovi-fiergs/report/model.ts`;
- `src/features/panorama-secovi-fiergs/lib/launches.ts`;
- `src/features/panorama-secovi-fiergs/lib/market-calibration.ts`;
- novos módulos puros em `src/features/panorama-secovi-fiergs/domain/**`;
- `src/features/panorama-secovi-fiergs/__tests__/report-model.test.ts`;
- `src/features/panorama-secovi-fiergs/__tests__/market-calibration.test.ts`;
- `src/features/panorama-secovi-fiergs/__tests__/launches.test.ts`;
- novos testes de domínio com nomes que comecem por `opus-`;
- `docs/features/Relatorios Secovi_FIERGS/HANDOFF_OPUS_CORRECOES_V1_JUNDIAI.md`, criado somente ao concluir.

Não editar páginas, componentes, manifesto, CSS, exportação, `pdf-export.test.ts`, plano Luna,
mapeamento ou documento vivo. Se precisar de mudança nesses arquivos, registrar no handoff para o
Luna integrar.

## 3. Contrato congelado com o Luna

Implementar e preservar estas garantias públicas:

- `PanoramaScope` canônico contém `uf`, `cities: string[]` e `endQuarter`;
- uma cidade é um array de um item; remover dependência runtime de `scope.city` nos arquivos do Opus;
- preservar, sempre que possível, as chaves públicas atuais de `PanoramaReportModel` e acrescentar
  proveniência com cidades solicitadas, concluídas e falhas;
- gerar dinamicamente a janela editorial de 17 trimestres terminando em `endQuarter`;
- política tipada extensível por entidade, implementando agora `secovi-sp`:
  - aceitar todos os verticais;
  - aceitar no horizontal somente o subtipo canônico Condomínio de Casas;
  - não inferir que todo `Horizontal` é condomínio de casas;
- expor categorias já canonizadas e ordenadas;
- representar ausência/indisponibilidade sem fabricar zero;
- expor contagem de IDs distintos, somas reconciliadas e médias ponderadas;
- fornecer aos componentes linhas prontas para coorte, maturidade, matrizes e VGV.

Se um nome exato novo for necessário, documentá-lo no handoff. Não modificar arquivos do Luna para
forçar compatibilidade.

## 4. Leitura e baseline

1. Ler `AGENTS.md`, o mapeamento, este plano, o plano Luna, decisões e gabarito congelado.
2. Inspecionar contratos e respostas reais disponíveis antes de criar aliases.
3. Registrar hash do PDF sem alterá-lo.
4. Rodar testes de domínio atuais e build para distinguir falha preexistente.
5. Não interpretar erros transitórios em arquivos do Luna como regressão do Opus; testar primeiro a
   camada própria e registrar o estado da árvore.

## 5. Trilha paralela do Opus

### OP-1 — política de entidade e taxonomias

1. Criar domínio puro e tipado para política de entidade.
2. Implementar a regra `secovi-sp` em todas as fontes: lançamentos, vendas, estoque, IVV, preços,
   coortes, maturidade, VGV e localizações.
3. Manter extensão explícita para FIERGS sem inventar sua regra.
4. Canonizar e ordenar:
   - `1 Dormitório`, `2 Dormitórios`, `3 Dormitórios`, `4 ou + Dormitórios`;
   - `Compacto`, `Econômico`, `Standard`, `Médio`, `Médio-Alto`, `Alto`, `Luxo`;
   - `Até 2022`, `2023`, `2024`, `Subtotal até 2024`, posteriores, `Total geral`.
5. Testar aliases, acentos, desconhecidos e exclusão horizontal.

### OP-2 — período dinâmico

1. Centralizar parser, comparação e geração de trimestres.
2. Gerar 17 períodos até qualquer `endQuarter` válido, inclusive posterior a 1T/26.
3. Eliminar limites fixos nos arquivos sob propriedade do Opus.
4. Testar transição de ano, trimestre futuro sem dados e ordenação.

### OP-3 — multi-cidade e coleta

1. Evoluir `PanoramaScope` para `cities[]`.
2. Consultar cada cidade autorizada com concorrência limitada e `AbortSignal`.
3. Deduplicar empreendimento dentro de cada cidade e evitar colisão de IDs entre cidades.
4. Falha parcial deve listar a cidade e produzir estado `partial`, nunca consolidado silencioso.
5. Somar numeradores/denominadores municipais antes de calcular percentuais e médias.
6. Expor proveniência de cidades solicitadas, concluídas e falhas.
7. Testar uma cidade, duas cidades, cancelamento, falha parcial e falha total.

### OP-4 — cubo granular e ausência explícita

Construir ou estender a base granular por empreendimento com cidade, ID seguro, segmento aprovado,
subtipo horizontal, padrão, tipologia, lançamento, unidades, ticket, área, R$/m², VGV, maturidade,
coordenadas e estado de cobertura.

Regras:

- contagem de empreendimentos usa IDs distintos;
- lançada/final/vendida reconciliam conforme o contrato real;
- preço e R$/m² usam ponderadores disponíveis, nunca média simples de médias;
- VGV prefere fonte bruta e registra fórmula;
- `null`, não coberto e erro permanecem distinguíveis de zero real;
- se Faixa de Valor não tiver regra autoritativa, não inventar faixas: sinalizar ausência para que o
  Luna remova a coluna na V1.

### OP-5 — agregados consumidos pelos slides 31–51

1. Padrão e tipologia vertical com contagem distinta e totais.
2. Coortes verticais/horizontais com agrupamentos e subtotais pedidos.
3. Matrizes ano × padrão com oferta lançada e final.
4. Maturidade × padrão e × tipologia somente vertical.
5. Preço horizontal somente para Condomínio de Casas, aberto por padrão.
6. VGV com padrões verticais, subtotal vertical, padrões horizontais e total geral.
7. Reconciliar cada dimensão com o mesmo total do universo aprovado.

### OP-6 — testes e revisão própria

1. Testes unitários para política, taxonomias, período e nulos.
2. Testes de uma/duas cidades, ponderações e falha parcial.
3. Testes de igualdade de totais entre padrão, tipologia, coorte, maturidade e VGV.
4. Rodar testes próprios, typecheck e build quando a árvore compartilhada permitir.
5. Se o build falhar somente em arquivo do Luna ainda em mudança, registrar a evidência e não editá-lo.
6. Revisar o diff apenas dos arquivos sob propriedade do Opus.

## 6. Handoff terminal do Opus — sem commit

Criar `HANDOFF_OPUS_CORRECOES_V1_JUNDIAI.md` com:

- `Status: OPUS_READY` somente se a trilha própria estiver concluída;
- commit-base e horário de início/fim;
- lista exata dos arquivos criados/alterados;
- contrato público final e eventuais diferenças nominais;
- tabela `OP-ID → requisito/slide → teste/evidência → status`;
- comandos executados e resultados;
- limitações reais da API e tratamento adotado;
- falhas globais atribuídas a arquivos ainda transitórios do Luna;
- orientações objetivas de integração;
- declaração explícita: “nenhum arquivo foi staged, commitado ou enviado”.

Depois de escrever `OPUS_READY`, parar de editar. Não corrigir arquivos do Luna, não aguardar para
commitar e não fazer commit. O Luna assume a revisão e integração final.

## 7. Critério de pronto do Opus

- [ ] propriedade de arquivos respeitada;
- [ ] política Secovi aplicada em todas as fontes próprias;
- [ ] período dinâmico e multi-cidade testados;
- [ ] ausências distintas de zero;
- [ ] contagens, ponderações e agregados reconciliados;
- [ ] testes próprios aprovados ou falhas externas precisamente registradas;
- [ ] handoff contém `OPUS_READY` e contrato final;
- [ ] nenhum `git add`, commit ou push executado;
- [ ] PDF-fonte preservado e não versionado.

## 8. CTA para iniciar o Opus

> Você é o **Opus, trilha A de domínio e dados**. Trabalhe na `main` compartilhada e execute
> integralmente `docs/features/Relatorios Secovi_FIERGS/PLAN_OPUS_CORRECOES_V1_JUNDIAI.md`, usando o
> mapeamento de Jundiaí como matriz de aceite e respeitando rigorosamente a propriedade de arquivos.
> O Luna estará alterando UI/PDF em paralelo; não edite arquivos reservados a ele e não reverta
> mudanças desconhecidas. Não execute `git add`, commit ou push em nenhuma hipótese, nem pull,
> checkout, reset, stash, clean ou troca de branch após iniciar. Implemente e teste política Secovi,
> multi-cidade, período dinâmico, taxonomias, cubo e agregações. Ao concluir, crie
> `HANDOFF_OPUS_CORRECOES_V1_JUNDIAI.md` com `Status: OPUS_READY`, arquivos, contrato, testes,
> evidências e limitações; declare que nada foi staged/commitado/enviado e então pare de editar. O
> Luna revisará tudo e fará o único commit combinado. Preserve e não versione o PDF-fonte.
