# Bancada multiempreendimento — execução local

Gabriel/sessão, 22/10/2026. Implementação local do CTA de expansão. Sem push, deploy, alteração de banco, retorno Geobrain ou chamadas de IA. Código, contratos, testes e esta evidência são versionáveis; snapshots, parâmetros ajustados à amostra, Excel e capturas ficam na pasta ignorada `.local-inputs/estimativas-vendas/expanded/`.

## Entrega funcional

A rota `/rebrain/estimativas-vendas` é uma bancada com consulta Horizontal/Vertical, seleção múltipla pesquisável, filtro opcional de suporte ao modelo, grade de 12 gráficos por página, carteira em unidades, sobreposição de até cinco curvas e tabela. Paginação limita apresentação; todos os membros selecionados continuam na soma e na exportação. Cálculo em lotes permite cancelamento e recálculo. O recorte/corte/modelo atualiza os resultados e invalida retrospectivas antigas.

Calendário ou idade confirmada, escala percentual comum de 0–100% ou unidades por gráfico, corte marcado, história reportada e posterior opcional aparecem explicitamente. Sobreposição por idade exclui casos sem idade conhecida. O detalhe acessível usa Dialog existente, amplo no desktop e tela inteira no celular, com metodologia recolhível, parâmetros e tabela. Fechar restaura foco. Cores e estados se adaptam ao tema; redução de movimento desativa transições, inclusive no modal. Referências visuais foram traduzidas em hierarquia e espaço, sem alterar os tokens Geobrain.

Excel continua opcional e local, agora respeitando Horizontal/Vertical selecionado. A página informa os parâmetros de exportação e oferece o link do Geobrain. CSV exporta todos os campos inclusive motivos de exclusão, mesmo em seleções mistas; JSON inclui membros, modelos, parâmetros, proveniência e retrospectiva vigente.

## Motores e separação

- `source.ts`: transporte paginado com tipo comprovado e cancelamento. Contrato não inventa filtro comercial.
- `expanded/contract.ts`: estado no corte, qualidade e idade. Não usa flag cadastral para afirmar observação mensal nem primeira linha histórica para inventar lançamento.
- `expanded/models.ts`: referência constante, último mês, média3, média12, Finotti original, Finotti extrapolado, absorção recalibrada, fluxos por exposição e coorte por taxa mediana de projetos. Cada um tem versão e domínio próprios. Médias exigem a janela completa e confirmação explícita de periodicidade. Fluxos exigem brutas/distratos conciliados. Limites físicos aplicados são sinalizados.
- `expanded/evaluation.ts`: retrospectiva de estoque com denominador no corte; métricas completas/pareadas; split por ID com semente1701; ajuste por segmento com peso por projeto; bootstrap pareado por projeto; calibração50%/80%, avaliação intervalar e faixas de carteira somente com resíduos conjuntos de membros fixos.
- `expanded/ForecastChart.tsx`, `SupportPanels.tsx` e `workbench.css`: gráficos, estrutura de faixas, laboratório e paridade, separados dos motores.

Treino roda no diagnóstico local. Artefatos de absorção/coorte podem ser carregados na bancada: exigem escopo exato, versão, data limite e IDs de treino. IDs usados no ajuste não são aceitos como previsões independentes de teste; artefatos sintéticos são recusados na importação de parâmetros reais. A seleção não recalibra parâmetros automaticamente. Comercial/mistos podem ser explorados no cenário informado, sem atribuir a eles um coeficiente horizontal. Não há previsão de dados comerciais da API até confirmar classificação e acesso.

## Evidência real e conclusões

Foram lidos três recortes autenticados: Curitiba Horizontal371/4 páginas; Curitiba Vertical1.606/17 páginas; Blumenau Vertical280/3 páginas. Snapshots têm SHA-256 e permitem replay sem rede. A API continuou sem marcador mensal de observação comprovada, e a duração dos fluxos não foi confirmada. Por isso o dossiê compara posições de estoque reportadas; modelos mensais permanecem ausentes nesse experimento, sem converter ausência em zero.

Teste reservado: origem09/2025, horizontes1/3/6/12, split60% treino/20% calibração/20% teste por empreendimento (arredondado). Treino usa pares com alvo até09/2025; pares de absorção ainda exigem idade confiável e absorção positiva. Coorte usa variação de estoque entre posições comparáveis com oferta estável, incluindo resultado negativo. Os coeficientes Finotti originais ficam congelados.

Em Curitiba Horizontal,75 projetos de teste tinham posição no corte, mas só6 ainda tinham estoque; em Curitiba Vertical,322 tinham posição, só3 com estoque. O pequeno erro agregado da referência constante deriva principalmente de esgotados. No subgrupo com estoque, o erro absoluto médio foi1,26unidades (23 alvos/6 projetos) no horizontal e3,25unidades (12 alvos/3 projetos) no vertical. Não promover modelo com base nesse universo predominantemente esgotado.

Blumenau Vertical oferece contraste:51 projetos com posição no corte,39 com estoque; referência constante teve erro médio13,68unidades em154 alvos e17,69unidades no subgrupo ainda com estoque (118 alvos). Não comparar médias dessas cidades como se tivessem composição equivalente.

Artefatos locais: absorção fechada de Curitiba usa3projetos; absorção vertical de Curitiba45; coortes foram geradas por segmento reconhecido. Isso demonstra execução do ajuste, não validação universal nem suficiência para promover um coeficiente. Na retrospectiva reservada, os candidatos que dependem de idade frequentemente ficaram sem suporte por divergência entre lançamento e tempo de venda. A proveniência e as revisões do cadastro ainda impedem afirmar reconstrução exata da informação disponível na data histórica.

**Faixas reais não promovidas.** No vertical de Blumenau, calibração independente em56projetos e teste em51 produziu cobertura da faixa nominal80% de76,5% em3meses,60,8% em6 e78,4% em12. Em Curitiba, esgotados dominaram e produziram faixas degeneradas de largura zero com cobertura próxima99%, também inadequadas para alegar calibração50%/80% em empreendimentos em venda. A página mantém “faixa ainda não estimada”; não há sombra decorativa. A estrutura de desenho e o motor intervalar estão implementados para artefatos que atendam os critérios. Cenário manual informa k, unidades, vendas e idade; não recebe probabilidade.

## Testes e inspeção

37 testes focados aprovados, incluindo reprodução original, tipos/fontes, transporte, contratos, vazamento, modelos, treino/teste independente, métricas conhecidas, calibração/baixa amostra, mudança de distribuição, resíduos correlacionados e carteira de1/5/20/100membros. TypeScript da aplicação verificado explicitamente com `npx.cmd tsc -p tsconfig.app.json --noEmit`, além do comando padrão; lint e build aprovados. Avisos existentes de chunk grande/XLSX não impedem o build.

Navegador local em390/768/1440/1920px, claro/escuro e redução de movimento: oito percursos sem erro de página, sem overflow horizontal e com foco restaurado após Escape. Cobertos seleção, paginação, carteira, retrospectiva, exportação e sobreposição limitada a cinco; seleções pequenas1/5/20 também exercitadas em1440px. CSV de100membros contém2.500linhas mensais/100IDs, confirmando exportação além da página visível. Os tempos de2,6–4,0s registrados são do percurso automatizado seleção/detalhe/carteira/exportação, não latência isolada do motor nem garantia de desempenho em outros dispositivos.

Ensaio autenticado com a API real no navegador local: Ybá Village87338 abriu detalhe com63unidades/14vendidas/mês4. Referência constante foi usada para verificar integração, sem alegação de qualidade. Corte09/2025 desse empreendimento não tinha origem avaliável: retrospectiva exibiu0/5 e ausência de métrica. Conferência do Excel real de Curitiba na página:28.308valores iguais,0diferentes,181exclusivos de uma fonte. Isso reproduz14.154pares de estoque +14.154de vendas e confirma divergência de cobertura; não é paridade de observação.

[Agregados verificáveis](EVIDENCIAS_EXPANSAO_2026-10-22.json). Capturas e relatórios extensos estão ignorados; nenhum token foi registrado nos agregados.

## Reprodução e próximos gates

1. Instalar dependências já declaradas e iniciar `npm.cmd run dev -- --host 127.0.0.1`; abrir a rota local.
2. Rodar `npm.cmd test -- src/features/estimativas-vendas src/components/layout/AppLayout.test.tsx`, tipos completos, lint dirigido e build.
3. `node scripts/diagnostics/estimativas-expanded-browser.mjs`: rede simulada e bloqueio externo, oito viewports/temas. Não representa teste de API real.
4. `node scripts/diagnostics/estimativas-expanded-audit.mjs PR Curitiba Horizontal` (ou Vertical; SC Blumenau Vertical): usa `.secrets/geobrain.env` já ignorado, apenas leitura. `--replay` reusa snapshot local sem autenticar nem consultar. Não rodar diagnósticos simultâneos no mesmo diretório, pois compartilham o bundle local do motor.
5. Carregar o arquivo local `*-artifacts.json` no mesmo escopo e selecionar modelo compatível; IDs de treino continuam excluídos de teste independente.

Gates que permanecem condicionais: contrato comercial/misto, linhagem por competência, periodicidade dos fluxos, idade e revisões cadastrais, população ativa representativa e tolerâncias de negócio. Só depois avaliar distribuições de contagem, compartilhamento hierárquico, logísticas/Gompertz, generalização por cidade e promoção de faixas. Essas extensões condicionais do plano não foram simuladas como entregas. Esta bancada é funcional e revisável localmente; modelo ampliado homologado e retorno operacional são etapas posteriores. Próximo passo: revisão local de Gabriel e esclarecimento do contrato de fonte, mantendo push/deploy sem autorização nesta etapa.
