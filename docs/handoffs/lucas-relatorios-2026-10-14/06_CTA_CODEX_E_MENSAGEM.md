# CTA e mensagem de transferência

## Para colar no Codex do Lucas

> Ative o handoff de relatórios automatizados para mim, Lucas, neste checkout do `relatorios-api`. Leia AGENTS e `docs/handoffs/lucas-relatorios-2026-10-14/README.md`, seguindo seu índice, e `docs/features/relatorios-institucionais/README.md`. Comece com “Olá, Lucas!” e um resumo humano de até 400 palavras: missão, quatro modelos, primeiro piloto sugerido, funcionamento geral do motor, meu papel como orquestrador, acessos a confirmar e limites antes das férias de 19/10. Indique os três documentos essenciais para eu ler; deixe o mergulho técnico detalhado para você. Depois faça apenas as verificações read-only de ambiente/Git e o preflight offline previstos no pacote; registre o resultado desta máquina, sem presumir acesso pelo teste de Gabriel. Encerre esta primeira rodada propondo a menor fatia do piloto e pedindo minha confirmação antes de G1 aprofundado/G2. Preserve Secovi/FIERGS, guardas e regressões 2T2026/4T2025. Corretor V3 e Quanti 2026 seguem com Gabriel; não altere essas frentes, CID, ADM ou Sinduscon Curitiba. Guarde planos/decisões/evidências futuras em `docs/features/relatorios-institucionais/<modelo>/` e brutos em `.local-inputs/relatorios-lucas/<modelo>/`. Não fixe números nem compartilhe credenciais. Não implemente, faça coleta longa/API de dados, gere estudo real, publique ou escreva no Monday nesta ativação. Informe impedimentos e próximos passos sem declarar o handoff recebido/validado por inferência.

O CTA autoriza acolhimento/contextualização e diagnóstico offline, não implantação automática do piloto. Na rodada seguinte, Lucas pode aprovar G1 (matriz/fonte), depois G2 delimitando periodicidade/indicadores. Permissão GitHub não é autorização de push; apresentar todo o histórico a enviar e pedir confirmação.

## Contrato da primeira resposta — leitura humana

1. Saudação dirigida a Lucas e conclusão em linguagem simples, antes do inventário técnico. Se AGENTS exigir checks de abertura, fazê-los sem transformar a mensagem em log de terminal.
2. Explicar: vamos automatizar SP/Fortaleza/Maceió/Recife; aproveitar motor existente sem copiar regras locais; SP é sugestão de piloto, não quatro entregas até sexta.
3. Arquitetura por cima: seleção autorizada → coleta por cidade com recuperação → cubo/contratos → reconciliação → páginas/capas → PDF/PPT e auditoria. Lucas deve compreender esse fluxo; o agente lê implementações/testes.
4. Responsabilidade humana: confirmar recorte/periodicidade/fatia, avaliar divergências/propostas, aprovar ensaio/publicação, cobrar evidência e registrar pausa. Homologação exige aprovador e saída real.
5. Leitura essencial para Lucas: README, `03_FONTES_E_MODELOS.md` e `05_PILOTO_SP_E_FECHAMENTO.md`. Agente aprofunda `02_BASELINE_E_MOTOR.md`, `04_VALIDACAO_E_ENTREGA.md`, fontes/código e testes.
6. Separar acesso comprovado de pendente. Fazer checklist offline sem segredo; Drive/site/API pessoais podem precisar de interação do Lucas e não são aprovados pelo preflight.
7. Encerrar com uma proposta e pergunta curta: “Podemos começar por [fatia]?” Não iniciar implementação como efeito colateral de ler o CTA.

## Mensagem curta para Lucas — rascunho, não enviada

Lucas, organizei o contexto dos próximos relatórios automatizados no Rebrain. Para esta passagem, o foco fica só nessa frente; eu continuo com o Corretor V3 e a unificação Quanti 2026.

Abra a raiz do relatorios-api no seu Codex e use o texto de ativação abaixo. O pacote começa em `docs/handoffs/lucas-relatorios-2026-10-14/README.md`. Ele deve te receber com um resumo humano e explicar o funcionamento geral antes de mergulhar no código. Os planos/evidências de cada novo relatório ficam em `docs/features/relatorios-institucionais/<modelo>/`; as referências antigas permanecem no lugar, sem duplicação.

A sugestão é começar pelo SP institucional. Você fica como orquestrador: confirma a fatia, acompanha a evidência, valida o resultado e autoriza os próximos passos; o Codex aprofunda a parte técnica. Seu acesso de escrita ao GitHub foi confirmado; site/API/Drive serão conferidos no seu ambiente. A meta até sexta é uma fatia bem delimitada e registrada, não os quatro relatórios antes das férias. Me diga o que cabe considerando CID e ADM.

Antes de enviar esta mensagem, confirmar que o commit do pacote foi publicado ou entregar os arquivos por canal combinado. Um caminho que só existe na máquina de Gabriel não é material já recebido pelo Lucas.
