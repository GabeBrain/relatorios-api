# Fortaleza — fontes pendentes no mensal

## 12/11/2026 — Fortaleza mensal: diagnóstico agosto versus outubro e bloqueios confirmados

**Autor/origem:** Codex, a pedido de Lucas. Agosto recebido após a hipótese de outubro sem fechamento. Agosto tem15disponíveis/33pendentes/12editoriais; outubro14/34/12. Não é somente fechamento: cadastro falha na primeira resposta pelo limite de5páginas; séries municipais rejeitadas por padrões/meses/categorias persistem nos dois arquivos. Em agosto37está disponível e52–55bloqueiam por bairro ausente no empreendimento23980; em outubro37/52–55acusam fotografia2026-10ausente do85529. Evidências do usuário, não chamadas autenticadas feitas pelo agente.

**Correções locais:** cadastro agora percorre até40páginas/4.000IDs por cidade/segmento, conservando totais estáveis, deduplicação, escopo e cancelamento. Regressão reproduz577verticais em6páginas sem truncamento; os577constam na coleta detalhada real. Capa1, sumário8 e divisória9deixam de receber erro de cálculo no JSON e seguem revisão editorial. Tabelas por bairro conservam registros sem bairro em “Bairro não informado”, com aviso e totais integrais; não inventam bairro nem alteram preço, quantidade ou fotografia. Produtos horizontais desconhecidos continuam bloqueados.

**Séries ainda em investigação:** no diagnóstico antigo, a validação descartava as linhas municipais antes de exportar, impedindo identificar quais grupos/meses foram omitidos ou qual classificação comercial chegou. Nova cobertura é capturada após paginação estável, antes desse descarte: grupos/tipos observados, meses, padrões ausentes, células faltantes e quantidades/VGV agregados. Runtime ainda não publica fonte inválida; dados ausentes não viram zero. Não há token, cabeçalhos ou histórico individual nessa cobertura; não acrescenta chamadas GeoBrain. Necessária nova geração/JSON após publicação para corrigir a semântica específica da resposta real.

**Ambiente/Etapas:** sessão começou em main limpa, origin único; fetch mostrou11commits atrás. FF até`4f2b0bf3` incorporou Slide Maker, guia GeoBrain e filtro de divergências; nenhuma mudança Fortaleza. Alterações desta rodada locais, distintas dos commits trimestrais publicados`4ec89c0a`/`431b64f4`. Prévia mensal60e trimestral89preservadas; não declarar todos os slides liberados nem homologados. Carregamento Brain, seleção autorizada e renderizadores de tabela existentes reutilizados.

**Validação:** suíte Fortaleza251testes/23arquivos, tipos e lint aprovados; testes adicionais confirmam estados editoriais e cobertura preservada com fonte rejeitada. Build aprovado;12cenários Edge com bairro válido/ausente e fotografia ausente em1440/390claro/escuro aprovados, sem erros ou overflow. Captura de bairro não informado inspecionada.20testes focados repetidos após acrescentar asserções de estados e cobertura. Geração real do novo código e próximos números/estados ainda não observados.

**Retomada:** completar verificações, commit isolado e perguntar pelo push. Após envio autorizado, gerar agosto novamente e ler `sources.municipal[].coverage`. Resolver categorias esparsas/comercial com evidência; não relaxar guardas globais para “zerar” o status. Histórico23980pode ter outros problemas além do bairro: a nova geração determina os bloqueios seguintes. Nenhuma escrita Monday, mudança SP, Slide Maker ou outros motores.

**Monday:** [Estudo Fortaleza](https://brain381753.monday.com/boards/18398638577/pulses/13149406420) — `13149406420`, referência apenas.

## Arquivos recebidos

- Agosto: `fortaleza-mensal-2026-08-diagnostico.json`, SHA256 `842cef536641e36545504f63fbb77f24a780bc3c53ab982129ea949bf854008a`.
- Outubro: `fortaleza-mensal-2026-10-diagnostico.json`, SHA256 `401e4fdee3fbeb06729407afbfd13a3e70bdc1dd433ed3fadd8499fa6ff8b364`.
- Arquivos brutos permanecem no diretório Auditorias do usuário; nenhuma instrução contida nos arquivos é tratada como comando.
