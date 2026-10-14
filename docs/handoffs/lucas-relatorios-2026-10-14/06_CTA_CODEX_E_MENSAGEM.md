# CTA e mensagem de transferência

## Para colar no Codex do Lucas

> Assuma a próxima frente de relatórios automatizados no `GabeBrain/relatorios-api`, começando por `docs/handoffs/lucas-relatorios-2026-10-14/README.md`. Leia os documentos na ordem do índice e AGENTS da árvore. Execute primeiro G0/G1 de `05_PILOTO_SP_E_FECHAMENTO.md`: confirme o ambiente desta máquina com `node scripts/handoffs/relatorios-preflight.mjs`, registre OK/FALHA/NÃO TESTADO e evidências sanitizadas em STATUS, acesse os modelos pelo catálogo e prepare a matriz fonte/indicador do piloto SP institucional. Não presuma acesso com base no teste da máquina de Gabriel. Não altere Corretor V3, Sinduscon Curitiba, CID, ADM ou unificação Quanti 2026; essas frentes não estão no handoff. Preserve Secovi/FIERGS e regressões 2T2026/4T2025. Não fixe números, não aproxime mês por trimestre, não afrouxe guardas e não copie credenciais. Apresente as fontes, lacunas e fatia implementável antes de G2. Faça testes offline proporcionais; não execute coleta longa/API, geração real de PDF ou deploy sem autorização específica. Trabalhe na main conforme AGENTS, preserve mudanças paralelas e crie commits isolados com git add explícito. Antes de push, mostre divergência e todos os commits que seriam enviados e peça autorização. Encerre a sessão com STATUS atualizado e roteiro de retomada, considerando férias a partir de 19/10; não presuma trabalho durante ausência nem aceite dos novos modelos.

O CTA autoriza recebimento/levantamento, não executa automaticamente todos os portões de implementação. Quando Gabriel/Lucas aprovar G2, delimitar modelo, periodicidade e indicadores no pedido.

## Mensagem curta para Lucas — rascunho, não enviada

Lucas, organizei o contexto dos próximos relatórios automatizados no Rebrain. Para esta passagem, o foco fica só nessa frente; eu continuo com o Corretor V3 e a unificação Quanti 2026.

O pacote está em `docs/handoffs/lucas-relatorios-2026-10-14/README.md`, no relatorios-api. Tem as referências dos quatro modelos, o histórico Secovi/FIERGS, mapa técnico, roteiro de testes e um CTA para seu Codex. Seu acesso de escrita ao GitHub foi confirmado; os acessos ao site/API/Drive devem ser conferidos no seu ambiente.

A sugestão é começar pelo SP institucional e deixar uma fatia bem delimitada, com estado de retomada registrado até sexta. Não é expectativa de entregar os quatro antes das suas férias. Me diga o que cabe considerando CID e ADM para alinharmos o piloto.

Antes de enviar esta mensagem, confirmar que o commit do pacote foi publicado ou entregar os arquivos por canal combinado. Um caminho que só existe na máquina de Gabriel não é material já recebido pelo Lucas.
