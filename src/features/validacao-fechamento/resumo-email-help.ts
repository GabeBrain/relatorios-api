import type { MetricKey } from './aggregate';

// Ajuda exclusiva desta aba: não reutilizar nas abas que mantêm outras agregações.
export const EMAIL_METRIC_HELP: Record<MetricKey, string> = {
  pct_fechamento: 'Percentual de building_id distintos com histórico no último mês disponível do intervalo, sobre os building_id distintos presentes no intervalo. Não mede a presença de todos os meses do trimestre/ano.',
  empreendimentos_lancados: 'Contagem de building_id distintos presentes no intervalo e cuja data de lançamento pertence ao mês, trimestre ou ano exibido. Nos acumulados, considera janeiro até o mês de referência.',
  unidades_lancadas: 'Soma de qty somente nos registros cujo mês de histórico coincide com o mês de lançamento do empreendimento. Nas visões trimestral/anual, soma esses meses sem repetir a quantidade nos históricos posteriores. A mesma regra mensal é usada nos acumulados.',
  unidades_vendidas: 'Soma de sold_in_period dos registros disponíveis no mês, trimestre ou ano exibido. Nos acumulados, soma os registros de janeiro até o mês de referência.',
  oferta_final: 'Soma de typology_stock da última posição disponível de cada tipologia dentro do intervalo. Cada tipologia usa seu próprio último registro, que pode não ser do mesmo mês das demais. Nos acumulados, o intervalo vai de janeiro até o mês de referência.',
  oferta_ativa: 'Tudo que foi lançado e está ativo. Soma a quantidade histórica de lançamento (qty no mês de lançamento), uma vez por empreendimento/tipologia, para lançamentos até a referência e empreendimentos com status cadastral atual Ativo. Não utiliza o status histórico de cada mês.',
  preco_medio: 'Usa a última posição por empreendimento/tipologia dentro do intervalo, inclusive nos acumulados. Depois, considera apenas type_of_typology = Padrão, typology_stock diferente de zero e preço informado. Calcula Σ(qty × price) ÷ Σ(qty). Não retorna a um mês anterior quando a última posição está esgotada ou sem preço.',
  preco_m2: 'Mantém todos os registros históricos elegíveis do intervalo, sem restringir à última posição por tipologia. Calcula Σ(qty × price) ÷ Σ(qty × private_area), com type_of_typology = Padrão, typology_stock diferente de zero, preço informado e private_area > 0. Nos acumulados, usa os registros de janeiro até o mês de referência.',
};

const ZERO_BASE_HELP = ' Se a base anterior for zero e o atual positivo, exibe 100%; nos demais casos com base zero, ou com valor ausente, não exibe variação.';
export const EMAIL_COLUMN_HELP = {
  annual: '(valor atual ÷ valor do mesmo período do ano anterior) − 1. As colunas de períodos e esta variação seguem a Visualização: mês, trimestre ou ano, usando todos os registros disponíveis no respectivo intervalo, sem o corte mensal dos acumulados.' + ZERO_BASE_HELP,
  previousAccum: 'Recalcula cada indicador de janeiro até o mesmo mês do ano anterior, respeitando cidade e filtros de dimensão. O corte permanece mensal em qualquer Visualização. Não é a soma das células exibidas: estoques usam a última posição; Preço médio usa a última posição por tipologia; Preço/m² mantém os registros do intervalo.',
  currentAccum: 'Recalcula cada indicador de janeiro até o último mês selecionado, respeitando cidade e filtros de dimensão. O corte permanece mensal em qualquer Visualização. Não é a soma das células exibidas: estoques usam a última posição; Preço médio usa a última posição por tipologia; Preço/m² mantém os registros do intervalo.',
  accumVariation: '(acumulado do ano atual ÷ acumulado do ano anterior) − 1. Compara janeiro até o mesmo mês dos dois anos, independentemente da Visualização.' + ZERO_BASE_HELP,
};
