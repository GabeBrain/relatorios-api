# Decisões e pontos abertos — SP

## Primeira fatia G2 — autorizada em 15/10/2026

- Identidade `sp-institucional`, rota lazy e código próprio pequeno; reuso de datas/parse numérico do motor e seleção geográfica compartilhada, sem modificar consumidores/políticas Secovi/FIERGS. Página de dados com primitives/tokens existentes, sem nova exceção de frontend.
- Regra do dev da API, transmitida por Lucas: aceitar somente `typologies_history[].period <= period` da raiz. Amostra manual You Now Campo Belo: raiz agosto/2026 e duas linhas de setembro; isso comprova a ocorrência nesse registro, não a igualdade de fechamento dos 5.183 registros. Não usar `last_period` como substituto sem contrato.
- Fase atual exclusivamente com fixtures sintéticas. Sem autenticação pessoal comprovada/escopo válido, nenhuma prévia; erros de catálogo sem fallback IBGE. Nenhuma coleta de mercado ou exportação adicionada. Campos/cobertura/fechamento conflitantes impedem números definitivos.
- Operação informada por Lucas: dia 20 do mês seguinte, mais 2–3 dias para analista; setembro esperado em 22–25/10. Previsão não observada na API e não usada para liberar trimestre por calendário. Férias desde 19/10 sem trabalho ou retorno presumidos.
- Destaques do estudo são uma etapa editorial futura, sujeita a edição/aprovação humana; “recorde” exige série histórica comprovada. Não implementada geração narrativa nesta fatia.

## Histórico do mapeamento G1

- **Decisão de Lucas, 15/10:** destino é SP capital/3T2026; 2T2026 serve como referência. Aprovado mapear quatro indicadores antes de implementar. G2, coleta longa, geração real e push não autorizados.
- **Fato observado:** conector Drive acessa a pasta e o PPTX com conta Suporte Geobrain (`clientebrain@gmail.com`); não comprova acesso da conta pessoal de Lucas. Original local ignorado pelo Git, identificado por hash no catálogo.
- **Informado por Lucas:** token autenticado em `https://geobrain-relatorios.lovable.app/`. Login/catálogo/cobertura SP não observados pelo agente; token não lido nem copiado.
- **Fato no código:** lançamentos vêm do histórico por empreendimento; vendas/oferta usam séries municipais e reconciliação específica por entidade. Hoje os IDs são apenas Secovi/FIERGS; novo contrato SP permanece pendente.
- **Proposta a comprovar:** vendas do SP devem representar fluxo trimestral e oferta, fechamento. Meses acumulados não podem ser somados como fluxos; estoque antigo não pode ser excluído pela janela dos lançamentos. Zero exige cobertura comprovada.
- **Pendências críticas:** semântica de `liquid_sales` em SP; fechamento observado em setembro versus dado carregado de mês anterior; campo de estoque atual versus histórico; dados ausentes convertidos em zero em caminhos existentes; contrato de contagem por empreendimento/possíveis fases. Não corrigidos nesta rodada.
- **Limite:** comparação com dashboard exige verificar o mesmo filtro/fotografia/método. A origem operacional da pesquisa anterior à API ainda não foi comprovada. PPTX/cache não é fonte contínua nem aprovação metodológica.
