# Decisões e pontos abertos — SP

- **Decisão de Lucas, 15/10:** destino é SP capital/3T2026; 2T2026 serve como referência. Aprovado mapear quatro indicadores antes de implementar. G2, coleta longa, geração real e push não autorizados.
- **Fato observado:** conector Drive acessa a pasta e o PPTX com conta Suporte Geobrain (`clientebrain@gmail.com`); não comprova acesso da conta pessoal de Lucas. Original local ignorado pelo Git, identificado por hash no catálogo.
- **Informado por Lucas:** token autenticado em `https://geobrain-relatorios.lovable.app/`. Login/catálogo/cobertura SP não observados pelo agente; token não lido nem copiado.
- **Fato no código:** lançamentos vêm do histórico por empreendimento; vendas/oferta usam séries municipais e reconciliação específica por entidade. Hoje os IDs são apenas Secovi/FIERGS; novo contrato SP permanece pendente.
- **Proposta a comprovar:** vendas do SP devem representar fluxo trimestral e oferta, fechamento. Meses acumulados não podem ser somados como fluxos; estoque antigo não pode ser excluído pela janela dos lançamentos. Zero exige cobertura comprovada.
- **Pendências críticas:** semântica de `liquid_sales` em SP; fechamento observado em setembro versus dado carregado de mês anterior; campo de estoque atual versus histórico; dados ausentes convertidos em zero em caminhos existentes; contrato de contagem por empreendimento/possíveis fases. Não corrigidos nesta rodada.
- **Limite:** comparação com dashboard exige verificar o mesmo filtro/fotografia/método. A origem operacional da pesquisa anterior à API ainda não foi comprovada. PPTX/cache não é fonte contínua nem aprovação metodológica.
