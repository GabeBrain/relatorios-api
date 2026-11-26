# Sinduscon Curitiba — gráfico histórico de 13 meses

26/11/2026 · Codex/Lucas · base `d1de4d73`.

Lucas confirmou que a página 10 deve mostrar o mesmo mês do ano anterior até a competência atual, inclusive: setembro/2025–setembro/2026, outubro/2025–outubro/2026 etc. São 13 pontos, com abreviações em português.

## Causa e correção

O XLSX real de setembro fornecido pelo usuário contém duas datas de junho/2026 no histórico. As fórmulas originais somam 30/31 dias; B52 referencia B50, pulando B51. A linha B54, com os dados de setembro, resulta em agosto após recálculo. A correção anterior atualizava os caches das datas, mas conservava essas fórmulas: o Excel desfazia a normalização ao abrir.

O calendário mensal agora é gravado como datas numéricas no primeiro dia de cada mês, removendo apenas as fórmulas substituídas explicitamente. As fórmulas dos totais continuam preservadas. O gráfico seleciona as competências entre fechamento menos 12 meses e fechamento, excluindo totais anuais e meses futuros.

As categorias são textos OOXML (`strLit`) em eixo categórico mensal: `jan`, `fev`, `mar`, `abr`, `mai`, `jun`, `jul`, `ago`, `set`, `out`, `nov`, `dez`. Assim o idioma não depende do Excel/Windows. Referências e caches dos valores continuam ligados às células de área; o título da série é preservado. Sem mudar estilos, desenhos, áreas de impressão ou dados das outras tabelas.

## Conferência e retomada

Regressão dos modelos reais Liberados e Concluídos cobre os 13 rótulos de setembro, valor final, ausência das fórmulas de calendário, dia 1 e preservação de estilos/desenhos/impressão. Janeiro, outubro e dezembro cobrem janela móvel e virada de ano. Teste adicional exclui meses futuros e totais anuais.

47 testes Curitiba, tipos, lint e build de produção aprovados. Inspeção e regressões são sobre o XLSX/OOXML gerado, sem automação do Excel nesta entrega. Não houve impressão ou recálculo observado no Excel nativo; essa conferência continua com a analista. Após publicação autorizada, gerar novamente o Excel pelo sistema e exportar as oito abas para PDF; reenviar o PDF antigo não atualiza o gráfico. Nenhum arquivo original fornecido foi modificado.
