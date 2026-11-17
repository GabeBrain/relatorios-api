# Padrão de diagnóstico JSON dos relatórios

Definido com Lucas em17/11/2026 a partir do caso Maceió: o primeiro JSON identificava slides pendentes, mas não distinguia transporte completo de bloqueio de validação nem mostrava categorias recebidas. O diagnóstico detalhado passa a ser padrão para mensal/trimestral Maceió e referência obrigatória ao criar ou evoluir diagnósticos de outros relatórios. Não implica migrar automaticamente todos os motores neste lote.

## Contrato mínimo

- **Identidade:** schema/versão, geração e horário da fonte, seleção, período/cidades, referência e versão de snapshot quando disponível.
- **Coleta:** separar requisições/fontes completas, falhas e vazios completos. HTTP e categoria de falha sanitizada, endpoint sem credenciais. Paginação completa não comprova observação ou cobertura de todos os meses.
- **Cobertura:** meses solicitados, observados e ausentes; grupos recebidos; campos necessários ausentes e contagens. Zero observado é0; ausência de observação énull, sem preenchimento automático.
- **Validação:** situação/causa por slide e resultado dos cálculos, reconciliações e deltas quando disponíveis; categorias efetivas e contagens que permitam revisar um de-para sem inventar rótulos.
- **Critérios:** série monetária, mês-base, ponderação e universo adotado explicitamente. Critério em confirmação não é fonte não coletada nem autorização para alterar método.
- **Resumo reconciliado:** a soma de estados fecha no total de slides. Não transformar bloqueio de conteúdo em sucesso só porque o transporte terminou.
- **Limites:** fonte real ou sintética, não homologado/homologado com evidência, recortes/metodologias ainda pendentes.

## Minimização de dados

Usar campos permitidos explicitamente; nunca serializar a store ou o estado inteiro da geração. Excluir token, cabeçalhos privados, senha, chave de sessão, corpos de erros externos, nomes/endereços/IDs de empreendimentos e históricos individuais. Categorias, contagens e somas municipais por competência geralmente bastam para diagnóstico. Não usar anonimização por simples troca de IDs quando o histórico bruto não é necessário.

## Comportamento do produto

Preparar a partir da geração já carregada, sem nova consulta de API. Processamento pesado fora da thread principal, BrainLoadingState com tempo real, cancelar/retry e descarte de resultado antigo ao trocar geração/escopo. Download somente do arquivo pronto. Não persistir o diagnóstico no backend por padrão. Na interface, manter resumo legível e ação de baixar; detalhes técnicos ficam no JSON, evitando poluir o fluxo do relatório.

## Evolução e validação

Campos novos compatíveis podem ser aditivos; versionar a auditoria quando a interpretação mudar. Exigir testes de privacidade/ausência versus zero/cobertura/contagem de slides e prova de download quando o fluxo mudar. Um ensaio com respostas sintéticas valida contrato/código; não confirma cobertura, permissão ou classificação da API real. Registrar esse limite na entrega.

Implementação inicial: `src/features/relatorios-institucionais/maceio/diagnostic.ts` e `source-audit.ts`. Os demais motores conservam suas políticas próprias; adaptar o contrato informativo sem compartilhar classificações de negócio por suposição.
