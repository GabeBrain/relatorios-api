## Plano de correção

1. **Regenerar a base Quanti 2020 corretamente**
   - Reprocessar o Excel mantendo a regra já definida: linha 1 = nomes das variáveis, linha 2 = perguntas desconsideradas, dados a partir da linha 3.
   - Converter valores inválidos de planilha (`NaN`, `Infinity`, vazios especiais) para `null` antes de serializar.
   - Garantir que o arquivo final seja JSON estritamente válido.

2. **Substituir o arquivo no Lovable Cloud Storage**
   - Reenviar `base-2020.json` para o bucket `quanti-datasets`, sobrescrevendo a versão atual inválida.
   - Manter o mesmo caminho (`base-2020.json`) para não alterar a configuração do dashboard.

3. **Adicionar proteção no carregamento do dashboard**
   - Ajustar `useQuantiDataset.ts` para tratar JSON legado com tokens inválidos (`NaN`, `Infinity`, `-Infinity`) antes do `JSON.parse`.
   - Se ainda houver erro de parse, exibir uma mensagem mais clara indicando que o dataset está corrompido/inválido.

4. **Validar no app**
   - Abrir `/quanti` e confirmar que a base carrega sem erro.
   - Conferir se o total de entrevistas permanece considerando apenas os dados a partir da linha 3.

5. **Atualizar documento vivo da Área Quanti**
   - Registrar a correção no doc do projeto, já que altera a fonte de dados e robustez do carregamento.