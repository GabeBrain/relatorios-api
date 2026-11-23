# Varredura completa — Maceió mensal e trimestral

23/11/2026 · Lucas / Codex · código `00c42855`, base `4d7c4e6b`.

Escopo exclusivo da rota `/rebrain/relatorios-institucionais/maceio`: 82 posições mensais e 87 trimestrais. Nenhuma alteração nos motores Fortaleza, Secovi/FIERGS ou nos dados de referência compartilhados. Abertura em main limpa, origin único, fetch atualizado e comparação 0/0.

## Erros corrigidos

- IVV por área apresentava contagens como percentuais e cabeçalho de calendário. Agora diferencia área, contagem e taxa; linhas de evolução interrompem-se nas lacunas nulas.
- Imagens dos modelos conservavam linhas e valores antigos sob tabelas recalculadas. A superfície analítica é limpa antes de desenhar dados ou indisponibilidade, preservando título/rodapé; identificação de oferta lançada/final redesenhada. Título IVV ausente foi incluído nas duas edições.
- Títulos da interface/diagnóstico acompanhavam maio/2T mesmo em outras referências. Agora usam a seleção; `referenceTitle` conserva o título original. Rótulos de quatro dormitórios passam a explicitar quatro ou mais.
- Categoria de quatro ou mais dormitórios, Super Luxo e padrão/família históricos tinham tratamento inconsistente. Agrupamento de quartos é compartilhado; Super Luxo permanece distinto, sem faixa de preço inventada. Padrão histórico prevalece quando disponível, preservada a regra comercial D35.
- Registros sem contribuição (estoque/capacidade zero) invalidavam indicadores por preço/área/classificação irrelevantes. A validação agora acompanha a contribuição de cada indicador. Ausência de oferta conhecida em uma categoria tem mensagem explícita e preços nulos; preço inválido com oferta continua indisponível.
- Identificação/data/histórico inválidos e duplicação de empreendimento ou fotografia ainda podiam bloquear o slide inteiro. Aplicada D37 aos blocos restantes: excluir o empreendimento, informar cobertura e manter a mesma coorte nos indicadores de janela. Origem municipal/UF/segmento incorretos continuam erro global. Duplicatas são excluídas por inteiro, sem selecionar uma cópia arbitrária.
- CSV de inconsistências identifica IDs, competências e duplicações, além da família histórica efetiva. Mantidos lista permitida de campos, proteção contra fórmulas e diagnóstico agregado sem identificadores individuais.
- Corrigidas duplicação de fontes municipais no quadro de padrões, somas acima do limite inteiro seguro, diferenças de caixa no nome de Marechal e posição de rótulos de rankings negativos.
- CAGED rejeita competências completas fora do intervalo efetivamente publicado; conservadas a competência real e as restrições da contingência autorizada.

## Verificação

- `npm.cmd test -- --run src/features/relatorios-institucionais/maceio --maxWorkers=2`: **298 testes em 31 arquivos aprovados**. Inclui 34 regressões desta varredura, renderização estática das 169 posições, 15 períodos e histórico curto de INCC.
- ESLint de todos os TS/TSX alterados: aprovado. Build de produção: aprovado; avisos existentes de tamanho dos bundles e importação mista de xlsx.
- Edge headless com componentes e worker reais: mensal outubro/2026 e trimestral 3T2026, desktop 1440 claro e celular 390 escuro. **338 visitas a slides, quatro cenários**, sem exceções, overflow ou texto fora do slide; geometria finita e dimensões positivas.
- CSV e JSON baixados pela interface e reabertos nos quatro cenários. Diagnóstico sem IDs privados; competência CAGED de setembro explícita no relatório de outubro. Capturas dos 169 slides desktop e nove folhas de contato inspecionadas; capturas finais das tabelas e estágios conferidas após remover valores antigos.
- Artefatos locais ignorados em `.local-inputs/relatorios-lucas/maceio/sweep-2026-11-23/`, resumo `results.json`; executor `.local-inputs/maceio-sweep-qa.mjs` e página `.local-inputs/maceio-partial-qa.html`. Não são fontes de produto nem dados homologados.

## Limites e próxima evidência

Dados imobiliários do ensaio são sintéticos; CAGED usa o snapshot real já verificado. Não havia token pessoal GeoBrain para regenerar os dados autenticados do usuário. A alternativa headless acima verifica cálculos, contratos, componentes e downloads, mas não confirma números reais, disponibilidade do provedor ou deploy Lovable. Após publicação autorizada, gerar novamente o período e conferir JSON/CSV pareados. Nenhuma escrita no Monday, nova carga remota ou homologação do analista nesta varredura.
