# SP — abertura do PowerPoint editável

05/11/2026 · usuário / Codex. Ambiente Windows, identidade Git Codex Test, main `626f86b`, origin único, árvore inicialmente limpa e 0/0 após fetch. Nenhuma consulta GeoBrain nova.

## Diagnóstico

Usuário relata travamento ao abrir o PPTX real 2T2026. Arquivo de 25.272.024 bytes, ZIP íntegro, XML legível e sem NaN/Infinity. A primeira página contém uma única sequência de texto nas notas com **326.127 caracteres**, reunindo descrição e JSON de auditoria. O arquivo sintético anterior continha 67.588 caracteres nessa sequência. A validação anterior não cobriu esse volume real e não garantia abertura na interface do usuário.

O bloco extenso é a principal suspeita de incompatibilidade do mecanismo de notas. Não foi provocado novamente um crash na instância do usuário, portanto não se afirma causa exclusiva nem limite universal do Office.

## Correção

- Exportador mantém notas curtas e armazena JSON em `customXml/sp-audit.xml`, com namespace próprio, Content Type XML e relacionamento Custom XML da apresentação. Esse mecanismo é suportado pelo [PresentationPart da Microsoft](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.packaging.presentationpart.addcustomxmlpart?view=openxml-2.20.0).
- O comparador lê a parte pelo namespace, pois o PowerPoint a renomeia ao salvar; mantém compatibilidade com o JSON nas notas das exportações anteriores.
- Não há alteração de números, fontes, consultas, ordem dos 85 slides ou grau de editabilidade. Gráficos/mapas/artes continuam em imagem e textos/células dinâmicos continuam nativos.
- Cópia do arquivo real foi reparada sem recriar slides. Comparação byte a byte confirma preservação de todos os XML de slides e todas as imagens; JSON de auditoria idêntico. Original na pasta Auditorias preservado.

## Validação

- Cópia real corrigida aberta via PowerPoint COM em 0,7 s, 85 slides. Slides 1/9/13/64/85 renderizados, 64 inspecionado visualmente. Cópia salva no Office e reaberta com 85 slides. Auditoria permanece idêntica após o salvamento, mesmo com nome interno alterado pelo Office.
- Notas da cópia corrigida têm no máximo 215 caracteres por sequência; JSON fora do mecanismo de texto das notas.
- Novo teste usa o PptxGenJS real com 85 slides e auditoria maior que a recebida: verifica integridade de todos os slides, notas curtas, relacionamento/Content Type e restituição exata de caracteres especiais. Testes de exportação verificam que o JSON não retorna às notas.
- Regressão SP: **293 testes / 29 arquivos**, tipos e lint aprovados. Logs `.local-inputs/sp-pptx-crash-*`, ignorados.
- Build de produção aprovado (32,59s; avisos existentes de tamanho de chunks). Edge local gerou85slides com novo pacote, sem novas chamadas de negócio;111respostas Mapbox200, zero erros de página. Cenários de cancelamento/retry/erro/vazio/períodos e ano2027 aprovados na matriz dirigida. O PPTX novo também abriu85slides no PowerPoint; comparador recupera ambos os schemas de auditoria. Fonte desse ensaio é sintética/replay, distinta do arquivo real reparado.
- Arquivo reparado: `.local-inputs/sp-pptx-crash-proof/sp-institucional-2T2026-editavel-corrigido.pptx` (22.061.591 bytes). Não versionado, pois contém a geração real do usuário.

Reteste na interface habitual do usuário ainda necessário. Publicação do novo exportador e reconciliação dos números com a referência são etapas distintas; esta correção não homologa os indicadores.
