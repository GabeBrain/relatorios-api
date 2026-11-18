Vamos desenvolver uma nova ferramenta do Rebrain: o **Slide Maker**.

O colaborador da Brain envia arquivos (pptx, xlsx, pdf, docx, png), responde a algumas perguntas num chat, aprova a narrativa e recebe só o .pptx final no padrão Brain. Depois, pode pedir ajustes pelo chat, e cada ajuste gera uma nova versão. O agente usa a API do Claude com Opus 5.5 (`claude-opus-5-5`) em effort `medium`.

**Antes de qualquer coisa**
1. Rode o Protocolo de sessão do CLAUDE.md. A cópia local estava desatualizada (último fetch em 15/10/2026) e o menu lateral da produção já mudou. Faça `git fetch --all` e `git pull --ff-only` se a árvore estiver limpa; se não estiver, me avise antes.
2. Leia, nesta ordem:
   - docs/features/slide-maker/INSTRUCOES_DESENVOLVIMENTO.md (a especificação; ela manda em caso de dúvida)
   - todos os arquivos de docs/features/slide-maker/base-conhecimento/, exceto 06-arquitetura-claude-code.md e comando-qualificar.md, que estão substituídos
   - docs/features/slide-maker/referencia/build_domicilios_v3.js
   - CLAUDE.md, docs/architecture/FRONTEND_GUIDELINES.md, DESIGN_SYSTEM.md e SECURITY_NOTES.md
   - o padrão do serviço gcp/sinduscon-workbook-processor/
3. Confirme na documentação atual do `@anthropic-ai/claude-agent-sdk` as assinaturas de `query()` (model, effort, maxBudgetUsd, sandbox, settingSources, AbortController), `tool()`/`createSdkMcpServer()` e das mensagens de resultado. Não escreva código com base em suposição.

**Pontos que não estão em discussão**
- Nome no menu: "Slide Maker", item próprio no mesmo nível de "Assistente de Projetos". Rota `/slide-maker`.
- Não há relação com a API GeoBrain nem com o login GeoBrain do rodapé. A identificação é o e-mail informado pelo colaborador e o acesso é pelo token de cada trabalho (seções 8 e 9).
- Custos ficam fora da v1. Implemente apenas a trava `maxBudgetUsd` por fase (seção 11).
- Arquivos de clientes ficam em buckets privados, sem nenhuma policy para anon.
- Cada fase do agente é uma requisição aberta, disparada pelo Cloud Tasks. Nada roda em background depois de responder (seção 8).
- Comandos do agente rodam isolados, sem rede e sem acesso às chaves (seção 12), com um teste que prove isso.

**Como trabalhar**
- Siga a ordem da seção 14. Commits na `main` com `git add <caminhos>` explícitos. Nunca faça `git push`: me pergunte ao fim de cada fase.
- Não altere outras features. Se precisar mexer em algo compartilhado (AppLayout, CommandPalette, primitives), diga o quê e por quê.
- Se não conseguir verificar algo (sem chave de API, sem deploy, sem LibreOffice local), diga exatamente o que ficou sem verificação e proponha o equivalente headless. Nunca escreva "funcionando" sobre o que não observou.

**Primeira entrega (pare aqui e espere minha aprovação)**
1. Resumo do que o pull trouxe e de onde está hoje o menu lateral (arquivo e estrutura).
2. Plano detalhado da Fase 1 e da Fase 2: arquivos a criar, migration e testes.
3. As decisões da seção 15 que bloqueiam essas fases, cada uma com a sua recomendação.
4. Qualquer divergência entre as instruções e o código atualizado.
