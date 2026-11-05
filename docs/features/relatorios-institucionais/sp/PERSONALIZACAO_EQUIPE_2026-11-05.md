# SP — equipe técnica e consultoria personalizáveis

05/11/2026 · usuário / Codex · base publicada `219ed1c`.

## Uso

Em Montagem do relatório, abrir **Personalizar equipe técnica e consultoria**, antes de Baixar PPTX editável. Selecionar o slide 82 ou 83 e a pessoa. Editar nome/cargo, enviar foto PNG/JPG/WebP de até 2 MB e usar Ver slide. A prévia acompanha as alterações; o PowerPoint seguinte captura essa configuração.

Há cinco posições na equipe técnica e quinze na consultoria, seguindo o original. Pode-se substituir a pessoa de cada posição, ocultá-la, retirar sua foto (silhueta) ou restaurar a pessoa da referência. As posições restantes não são reorganizadas ao ocultar uma pessoa. Nomes/cargos têm limites de 48/90 caracteres e quebra/ajuste de fonte para os espaços existentes. A tela da consultoria mantém os elementos ilustrativos da arte original.

As alterações pertencem à **prévia aberta**, não a um cadastro global. Nova geração, recarregamento ou saída da página restaura a referência. Fotos ficam em memória; não são enviadas para servidor nem gravadas no localStorage/checklist JSON. O PPTX baixado inclui os retratos selecionados, por solicitação do usuário.

## PowerPoint

Slides 82/83 agora usam textos SVG nativos e retratos identificados como elementos separados. O exportador captura cada retrato no seu próprio recorte, retira-o da imagem de fundo e adiciona uma imagem PowerPoint por pessoa, seguida das caixas de texto. Nomes/cargos podem ser editados e as fotos substituídas no PowerPoint; moldura, logo e demais artes continuam em imagem.

A exportação usa uma fotografia da configuração no clique de download. Alterações feitas enquanto ela processa entram na próxima exportação. Não são feitas novas consultas GeoBrain. Equipes começam na edição de referência 2T2026 e continuam classificadas como referência editorial; personalizar nomes não equivale a aprovar dados ou metodologia de mercado.

## Robustez

Uploads rejeitam formato/tamanho inválido e imagem que não decodifica. A leitura exibe BrainLoadingState field. Trocar pessoa/slide, restaurar ou desmontar invalida respostas tardias. Alterar um nome durante a leitura da foto preserva ambos os resultados. O editor fechado não monta o formulário, reduzindo custo de renderização.

Na primeira inspeção Office foi identificado deslocamento causado por propriedades lógicas de posicionamento copiadas pelo renderizador dos recortes. A captura final normaliza tanto inset físico quanto lógico. O diagnóstico verifica a presença de 5/15 imagens nativas e a cobertura dos pixels de cada retrato, impedindo aceitar imagens vazias/deslocadas apenas porque o PPTX contém objetos de imagem.

## Evidências

- 301 testes SP/34 arquivos aprovados; casos novos de edição, ocultação, restauração, isolamento dos padrões, uploads atrasados, validação de arquivo e exportação de imagens separadas.
- Tipagem/build e lint dirigido. Motores e regras numéricas preservados.
- Edge com fonte sintética: upload, erro, nomes/cargos, ocultar/exibir, oito capturas (82/83, desktop/celular, claro/escuro), PPTX85slides e nenhuma consulta de negócio adicional.
- PowerPoint: 20 retratos nativos reconhecidos, dois nomes alterados e uma foto substituída; salvamento/reabertura preservaram as três mudanças e as 85 páginas. Renders finais inspecionados com as fotos visíveis.
- Reprodução: `node scripts/diagnostics/sp-people-editable.mjs`. Artefatos locais ignorados em `.local-inputs/relatorios-lucas/sp/people-editable/`.

Sem ensaio autenticado real novo ou aceite da equipe responsável. Publicação e conferência prática do site permanecem etapas distintas. O commit do menu `219ed1c` foi publicado primeiro, como solicitado; esta personalização é uma entrega posterior.

**Monday:** [Relatório SP Institucional](https://brain381753.monday.com/boards/18398428946/pulses/13452140276) — `13452140276`; referência, sem escrita nesta entrega.
