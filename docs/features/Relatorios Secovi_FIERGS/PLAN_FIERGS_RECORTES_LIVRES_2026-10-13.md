# Plano — FIERGS em cidade isolada ou conjunto de cidades

Data: 13/10/2026. Estado: G0–G4 implementados e validados localmente; G5 publicação/ensaio real e G6 comunicação pendentes. Typecheck global tem falha externa no Corretor; feature isolada e build aprovados. Evidências em [registro dos portões](EVIDENCIAS_FIERGS_RECORTES_LIVRES_2026-10-13.md).

Continuação: publicação dos oito commits autorizada por Gabriel; código da ampliação `e634eb8`. Execução do envio e confirmação Git nesta rodada; G5 só fecha após análise do ensaio real de Gabriel (preset, Canoas, conjunto Canoas/Esteio/São Leopoldo, todos 2T2026 com CSV). G6 aguarda essas evidências.

## Objetivo e baseline

Permitir aplicar o modelo FIERGS a uma cidade ou qualquer conjunto de cidades monitoradas e autorizadas, dentro de uma única UF por estudo. Manter o preset das dez cidades do RS como atalho e preservar o material aceito pela Juliana. A expansão é uma entrega nova; o aceite anterior permanece encerrado.

Fonte: [mapeamento técnico e editorial](MAPEAMENTO_FIERGS_RECORTES_LIVRES_2026-10-13.md). A baseline consultada foi `74cc572`; antes de executar, conferir novamente árvore, histórico e remotos. Na preparação, origin/main está zero atrás e três commits à frente, todos preexistentes do Corretor. Não publicar esses commits por consequência desta entrega sem autorização sobre o histórico a enviar.

## Escopo e decisões propostas

- Seleção livre de cidades disponíveis para o token, com UF selecionável. O modelo continua FIERGS; fora do RS, a apresentação deve dizer a UF real e jamais sugerir que aquele recorte recebeu o aceite regional da Juliana. O requisito de cidades livres inclui outras UFs, uma por relatório, sujeito à cobertura da API.
- Identificar o preset regional somente por entidade FIERGS, UF RS e igualdade do conjunto completo de cidades normalizadas, independentemente da ordem. Outro conjunto de dez cidades é personalizado.
- Manter fórmulas e regras aprovadas: oferta lançada da janela, oferta final do fechamento, vendas líquidas, preços e médias existentes; horizontais incluem casas em condomínio e loteamentos abertos/fechados, excluindo chácaras.
- Nenhum número fixo, exceção por período, preenchimento de falha com zero ou relaxamento de guarda crítica.
- Cidade única não precisa de comparação entre municípios, mas precisa de reconciliação municipal. Separar dado numérico de visibilidade editorial.
- Recorte personalizado usa capa e página territorial dinâmicas. A primeira entrega pode usar uma página organizada com lista de cidades e UF; não exige criar mapa territorial novo. Mapas analíticos existentes permanecem quando houver coordenadas úteis.
- Manter slides institucionais gerais aprovados. Contatos/autoria sem evidência de mudança permanecem como baseline e ficam explicitamente pendentes de confirmação caso se pretenda atribuir equipe local.
- Omissões de estruturas sem dados devem aparecer nos avisos da geração e na auditoria, fora do PDF/PPT. Não ocultar zeros observados, valores negativos ou divergências.

## Regras de execução

Preservar arquivos locais e trabalho paralelo; não alterar `src/features/corretor` nem Sinduscon. Trabalhar em main conforme AGENTS do projeto. Ler instruções locais adicionais antes de editar. Antes da interface, consultar `System Design/README.md`, tokens e mapa de sistemas, além das diretrizes frontend do projeto; registrar adoção no mapa sem mudar tokens.

Usar testes focados e dados locais reproduzíveis. Não iniciar ensaios longos com API nem gerar estudos reais por conta própria: Gabriel fará a geração no site. Arquivos brutos/exportações novas ficam em `.local-inputs/`; evidências pequenas, plano, regras e documentação são versionados. Criar commits isolados com `git add` explícito após cada unidade coerente. Atualizar documento vivo Rebrain, diário e planejamento. Antes de integrar divergências ou push, apresentar o histórico concreto e solicitar autorização.

## G0 — Congelar baseline e contratos

1. Conferir status, todos os remotos, fetch e diferenças; identificar arquivos/commits paralelos. Registrar SHA e estado inicial no documento de evidências desta entrega.
2. Rever mapeamento, manifesto e caminhos alternativos, incluindo a ponte antiga de impressão. Confirmar que a exportação usa IDs do manifesto e não substituição por posição absoluta.
3. Localizar fixtures/evidências locais do preset 2T2026 e 4T2025; guardar resultados relevantes e composição editorial antes das mudanças. Se não houver fixture suficiente, declarar limite e preparar cenário sintético, sem alegar reprodução dos números reais.
4. Definir contrato da identidade territorial central: modelo, UF, cidades normalizadas, modo oficial/personalizado, rótulo curto, título, lista completa e identificação de arquivo. Não duplicar comparações do preset em componentes.

Portão: baseline rastreável, abrangência explicitada, arquivos paralelos preservados e contrato testável. Registrar decisões em `EVIDENCIAS_FIERGS_RECORTES_LIVRES_2026-10-13.md`.

## G1 — Identidade territorial e seleção

Arquivos candidatos: `types.ts`, `presets.ts`, `pages/PanoramaSecoviFiergsPage.tsx` e seletor existente.

1. Implementar helper central de identidade com normalização e comparação de conjuntos, sem reconhecer preset apenas pela quantidade de cidades.
2. Separar escolha do modelo do atalho regional. Liberar UF/cidades pelo catálogo autorizado, com ação clara para aplicar novamente as dez cidades.
3. Ao trocar UF, limpar municípios; ao trocar recorte/período, invalidar relatório e recuperação da coleta anterior. Não permitir resultado de escopo antigo aparecer como novo.
4. Preservar GeoApiScopeEngine e bloqueio de chamadas pesadas antes de escopo válido. Não oferecer cidade ausente do catálogo por fallback local.

Validação: conjunto oficial reordenado permanece oficial; subconjunto, Porto Alegre e outro conjunto de dez são personalizados; outra UF tem rótulo correto; troca de escopo reinicia geração e recuperação.

Portão: seleção e identidade concordam; nenhuma coleta iniciada com seleção inválida. Commit isolado de identidade/seleção.

## G2 — Reconciliação de cidade única e universos esparsos

Arquivos candidatos: `report/model.ts`, `domain/reconciliation.ts`, tipos do modelo e testes focados. Alterar `api.ts` somente se houver evidência de contrato de vazio legítimo.

1. Demonstrar com fixture o bloqueio `sales.vertical.city` quando comparação municipal está desativada para uma cidade.
2. Calcular/conservar o agregado municipal numérico para qualquer N, usando o mesmo universo canônico. A opção visual de comparação não pode decidir se a guarda recebe dado.
3. Tratar ausência confirmada de horizontal, ausência de lançamentos e métricas monetárias indisponíveis com estados explícitos. Uma soma vazia só vira zero quando a cobertura e a ausência estiverem demonstradas; preço sem observação não vira zero.
4. Preservar bloqueio por cidade faltante, dimensões incompletas e classificação desconhecida relevante. Auditar itens sem produto identificado; não extrapolar os sete fallbacks nominais para novas cidades.
5. Investigar respostas vazias em fixtures/contrato; se a evidência não distinguir vazio real de falha, manter bloqueio e registrar a pendência.

Validação: cidade única completa exportável; falha de cidade continua bloqueada; conjunto sem horizontais confirmados não gera falsa divergência; zero e venda negativa permanecem visíveis; preço ausente mantém aviso/limite apropriado.

Portão: nenhuma divergência crítica aberta nos casos locais completos. Apresentar reconciliação antes de avançar à apresentação. Commit isolado das guardas/modelo.

## G3 — Capas, slides fixos e metodologia por recorte

Arquivos candidatos: `components/ReportPaginator.tsx`, `report/fiergs-manifest.ts`, `report/manifest.ts`, `components/ReportReferencePanels.tsx` e assets somente se necessário.

1. Slides oficiais 2 e 7: manter capa RM e mapa regional apenas no preset exato. Nos personalizados, apresentar cidade/UF ou título de conjunto, com lista completa no escopo.
2. Slide 5: quantidade municipal real e descrição correta dos três produtos horizontais previstos. Remover exclusão de Porto Alegre fora do preset.
3. Atualizar legendas territoriais das famílias trimestrais, títulos/metadados do manifesto e caminhos alternativos `FiergsCityScope`/`V2CityCover`. Nenhuma menção a RM Porto Alegre, dez cidades ou RS pode sobreviver por condicionamento apenas à entidade.
4. Metodologia recebe o escopo real e explica separadamente regras do modelo e composição selecionada. Sumário/numeração continuam derivados do manifesto final.
5. Cidade única: ocultar comparação municipal trivial, conservar análise de bairros aplicável. Remover seção/divisor órfão apenas quando não houver conteúdo e registrar a omissão.
6. Manter slides institucionais gerais 1, 3, 4, 72–75; conferir texto embutido. Revisar equipe 71 sem inventar autoria local. Mapas analíticos 67–69 devem enquadrar projetos do recorte e informar cobertura de coordenadas nos avisos.

Validação: testes do manifesto e renderização com recortes oficial, isolado e personalizado; nenhuma imagem regional fora do oficial; títulos longos/listas cabem na página. Usar IDs oficiais, pois posição final exportada varia.

Portão: inventário do mapeamento inteiro revisado e omissões auditáveis. Commit isolado editorial.

## G4 — Arquivos, auditoria e regressão local

Arquivos candidatos: `types.ts:scopeFileSlug`, `lib/export-metadata.ts`, `lib/fiergs-audit.ts`, documentação e testes.

1. Preservar nome aprovado do preset exato. Arquivos personalizados identificam modelo, cidade/conjunto, UF e período, com ordenação determinística. Conjuntos distintos precisam de identificação distinta, mesmo quando compartilham primeiras cidades ou quantidade; usar identificador estável do conjunto se necessário.
2. Alinhar PDF, PPT, CSV, títulos e proveniência ao mesmo escopo. CSV deve permitir parear geração, cidades, período e avisos com o estudo correspondente.
3. Executar testes focados da feature e checagem TypeScript. Repetir checagens apenas se alterações/falhas justificarem. Se houver falha externa à entrega, documentar origem e demonstrar isolamento.
4. Regressão local obrigatória do preset 2T2026 e 4T2025 com fixtures disponíveis; comparar indicadores, guardas, produtos e composição aprovados. Verificar caminho Secovi sem alterar sua política.
5. Cobrir cenários: dez oficiais reordenadas; uma cidade; subconjunto; dez diferentes; Porto Alegre se autorizada; outra UF; sem horizontal; sem lançamento; zero/negativo; cidade faltante; coordenadas incompletas; rótulo desconhecido.
6. Atualizar documento vivo com link do card de Entidades quando aplicável, diário/planejamento e evidências. Rodar `npm run check:live-docs -- <base> <head>` para commits preparados.

Portão: validações locais aprovadas ou limites explícitos que impeçam publicação; commits somente da entrega. Não chamar validação de fixture de verificação em produção.

## G5 — Publicação autorizada e ensaio de Gabriel

1. Fazer novo fetch e apresentar contagem/commits locais e remotos. Se commits paralelos ainda estiverem à frente, explicar exatamente o que um push de main enviaria. Não presumir isolamento pelo nome dos arquivos nem reescrever histórico.
2. Solicitar autorização sobre o conjunto de commits a publicar e integração necessária. Após autorização, publicar e verificar sincronização; registrar SHA enviado. Deploy confirmado exige evidência própria.
3. Gabriel gera no site FIERGS 2T2026 de cidade isolada e conjunto, com auditorias correspondentes, e preset oficial para comparação. 4T2025 mantém regressão local; geração real adicional somente quando autorizada.
4. Conferir PDFs/CSVs recebidos: escopo, capas, séries, oferta/vendas/preços, horizontais, avisos, ausência de dados fictícios, nomenclatura e guardas. Registrar pendências reais antes de comunicar disponibilidade.

Portão: cidade e conjunto verificados no ambiente publicado; preset preservado. Se faltar exportação/CSV/identificação do build, indicar que a validação segue pendente.

## G6 — Comunicação e encerramento da ampliação

Preparar e-mail curto para Juliana confirmando o aceite anterior e, somente após G5, informando disponibilidade para cidades isoladas/conjuntos monitorados dentro de uma UF. Distinguir material regional homologado de novos recortes. Não enviar e-mail por ferramenta sem pedido explícito.

Atualizar documento vivo, plano e diário com evidências e próximo passo. Aceite desta nova capacidade não é presumido a partir do aceite do preset anterior.

## Evidências a entregar em cada portão

Registrar estado, SHA/base, arquivos afetados, decisão metodológica/editorial, comandos/resultados de validação, limites e próximo passo. Para reconciliação, registrar origem e agregados calculados por município/segmento; para slides, ID oficial e comportamento por modo; para publicação, commit e ambiente; para ensaio real, arquivos e identidade do recorte/geração.

## CTA de execução

Execute `docs/features/Relatorios Secovi_FIERGS/PLAN_FIERGS_RECORTES_LIVRES_2026-10-13.md` pelos portões G0–G4. Habilite uma cidade ou conjunto de cidades monitoradas em uma única UF, preserve o preset homologado e use capas, legendas, metodologia e arquivos adequados ao recorte real. Corrija a reconciliação de cidade única sem afrouxar guardas nem transformar falhas em zeros; trate universos vazios com evidência. Preserve alterações paralelas e não modifique Corretor ou Sinduscon. Faça testes focados, mantenha as regressões locais 2T2026 e 4T2025, registre evidências e crie commits isolados com git add explícito. Não faça ensaios longos com API nem gere estudos reais por conta própria. Ao concluir, confira a divergência e apresente os commits que seriam enviados, pedindo minha autorização antes do push. Depois da publicação autorizada, eu gero cidade isolada, conjunto e preset no site para G5; só após verificar esses resultados prepare o e-mail à Juliana no G6.
