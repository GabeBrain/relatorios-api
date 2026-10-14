# Relatórios institucionais — área de trabalho permanente

14/10/2026 · contexto inicial em [handoff Lucas](../../handoffs/lucas-relatorios-2026-10-14/README.md).

## Onde trabalhar

Abrir **a raiz do checkout `relatorios-api`** no Codex/editor; comandos Git/npm partem da raiz, não da pasta de documentos. A documentação dos próximos modelos fica aqui. Criar `sp/`, `fortaleza/`, `maceio/` e `recife/` conforme cada modelo começar, sem antecipar pastas vazias como avanço.

Em cada modelo: `PLAN.md` (fatia/portões), `MATRIZ_INDICADORES.csv` (contrato/gabarito/deltas), `DECISOES.md` (fatos/hipóteses/decisões), `EVIDENCIAS.md` (comandos/versões/resultado/aceite). O catálogo inicial é [modelos.json](../../handoffs/lucas-relatorios-2026-10-14/fontes/modelos.json); acrescentar versões/fonte/hashes, sem criar cópias contraditórias do mesmo catálogo. Fichas só aparecem como prontas depois de executadas.

O handoff guarda **entrada, acessos e estado da transferência**, não toda a história futura. Seu STATUS aponta para planos/evidências aqui. `docs/projetos/LIVE_rebrain.md` é o índice vivo de entregas da plataforma. Não mover ou duplicar os históricos Secovi/FIERGS em `docs/features/Relatorios Secovi_FIERGS/`; usar links.

## Código e materiais

Proposta para composição específica dos novos modelos: `src/features/relatorios-institucionais/<modelo>/`, criando só quando G2 for aprovado. Não existe implementação nova nessa pasta nesta preparação. Extrair componentes comuns apenas se houver uso comprovado, respeitando o contrato do motor atual.

O motor que já funciona fica em `src/features/panorama-secovi-fiergs/`. Fontes, cubo, política e guardas devem ser reutilizados/estendidos de forma explícita, sem copiar o motor ou renomear a entidade FIERGS para representar SP. Uma extensão transversal exige testes dos consumidores existentes e configuração própria por modelo. Novas rotas são lazy e conectadas ao shell existente.

PPTX/PDF/XLSX brutos, CSVs de geração, caches, capturas e ensaios ficam em `.local-inputs/relatorios-lucas/<modelo>/` do checkout. São locais e ignorados; para compartilhar usar fonte Drive ou canal combinado. Versionar somente as matrizes/decisões/fixtures e evidências pequenas necessárias para reproduzir. Credenciais permanecem pessoais, fora do pacote/Git/chat.

## Papel do Lucas — orquestrador

Lucas escolhe com Gabriel a fatia, confirma acesso/capacidade, aprova decisões de escopo/editoriais, acompanha a evidência de dados/testes, decide quando pedir uma geração real e autoriza publicação conforme protocolo. Codex investiga código/fontes, propõe contrato, implementa a fatia aprovada e entrega evidência/limites. Não delegar ao agente aceitar divergências, decidir sozinho métodos sem fonte ou declarar homologação.

Abertura de sessão: resumo humano → estado/acessos → escolha de fatia → plano/matriz → implementação autorizada → testes → PDF/CSV pareados autorizados → avaliação/aceite. Na pausa: estado/commit/comando para retomar. Corretor V3/Quanti 2026 seguem com Gabriel; férias Lucas começam 19/10, sem data de retorno presumida.
