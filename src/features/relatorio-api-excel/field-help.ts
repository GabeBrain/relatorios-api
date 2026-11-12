import type { BuildingAverageMode, PriceMode, VglPriceMode, VgvScale } from './report';

export const FIELD_HELP = {
  municipality: 'Selecione um ou mais municípios dos dados carregados. Os escolhidos são combinados: basta o empreendimento pertencer a um deles. Limpar deixa a seleção vazia; Selecionar todos inclui todos os municípios disponíveis.',
  buildingTypes: 'Selecione os tipos de empreendimento que entrarão no relatório: Vertical, Comercial, Horizontal ou Hotel. A escolha também atualiza os padrões disponíveis, sem fazer nova consulta à API.',
  statuses: 'Filtra o status cadastral do empreendimento nos dados carregados, como Ativo ou Esgotado. É diferente do status da tipologia. Você pode escolher vários status.',
  standards: 'Filtra o padrão cadastral do empreendimento. A lista mostra apenas padrões dos tipos selecionados; ao trocar os tipos, escolhas incompatíveis são removidas. Não confundir com a tipologia Padrão usada nas opções de preço médio.',
  view: 'Mensal apresenta cada mês separadamente. Trimestral soma vendas e distratos do trimestre e usa o último fechamento para estoque e preços. O recorte de meses escolhido é respeitado nas duas visões.',
  layout: 'Valores em colunas: uma linha por empreendimento/tipologia, com os períodos distribuídos em colunas. Tabular: uma linha por empreendimento/tipologia/período. Os campos marcados em Selecionar colunas são mantidos nos dois formatos.',
  from: 'Escolha o mês e o ano inicial. O dia exibido é sempre 01. Filtra os períodos do histórico das tipologias, não a data de lançamento. Inclui todo o mês escolhido. Em branco, usa o primeiro mês disponível ao gerar.',
  to: 'Escolha o mês e o ano final. O dia exibido é sempre 01, mas o filtro inclui todos os dias desse mês, inclusive fechamentos no último dia. Filtra os períodos do histórico das tipologias. Em branco, usa o último mês disponível ao gerar.',
};

export function averageHelp(mode: BuildingAverageMode): string {
  const formula = mode.startsWith('simple') ? 'Média simples: soma dos preços válidos dividida pelo número de tipologias participantes.'
    : mode.startsWith('quantity') ? 'Ponderado pela oferta lançada: soma de preço × quantidade de unidades lançadas, dividida pela soma dessas quantidades.'
    : 'Ponderada pelo estoque: soma de preço × unidades em estoque, dividida pela soma dos estoques.';
  const scope = mode.endsWith('-standard') ? ' Somente tipologias Padrão entram na média; Garden e Cobertura continuam nas linhas, mas não compõem esse cálculo.'
    : ' Inclui todas as tipologias válidas, inclusive Garden e Cobertura.';
  return `${formula}${scope} Usa a última posição de cada tipologia no mês/trimestre. Pesos ausentes ou não positivos são excluídos; sem base válida, fica vazio.`;
}

export function monetaryHelp(mode: PriceMode): string {
  return mode === 'current'
    ? 'Valor atual: usa o último preço disponível da tipologia até o mês final para calcular os VGV de todos os períodos. VGV Estoque = estoque × preço. Vendas e distratos do período usam esse mesmo preço. VGL tem configuração de preço independente em Cálculo VGL.'
    : 'Valor do período: VGV Estoque usa estoque e preço do último fechamento de cada mês/trimestre. VGV Vendas Brutas e VGV Distratos somam unidades × preço de cada fechamento. VGV líquido é a diferença entre os dois. VGL tem configuração de preço independente em Cálculo VGL.';
}

export function vglHelp(mode: VglPriceMode): string {
  const price = mode === 'launch' ? 'Pelo preço de lançamento: usa o price da própria tipologia cuja data de period coincide exatamente com release_date, igual à coluna Preço de Lançamento. Sem correspondência ou preço, fica vazio, sem fallback.'
    : 'Pelo preço atual: usa o último preço da própria tipologia disponível até o mês final, aplicado à série histórica.';
  return `${price} VGL = quantidade lançada da tipologia × preço escolhido. Quantidade lançada é qty no registro cuja data de period é exatamente igual a release_date do empreendimento, mantida fixa no histórico. Sem esse registro/quantidade, o valor fica vazio, inclusive no preço atual. Por empreendimento, soma os VGLs das tipologias, sem usar total_units como substituição nem multiplicar pela média do empreendimento. Não soma VGLs mensais no trimestre. Independente do Cálculo monetário dos VGVs. Mantém a escala de visualização VGV/VGL; não representa o fluxo de novos lançamentos do período.`;
}

export function scaleHelp(scale: VgvScale): string {
  const calculation = scale === 'standard' ? 'Padrão: mantém o valor calculado, sem divisão.'
    : scale === 'thousand' ? 'Milhar: divide o VGV calculado por 1.000.' : 'Milhão: divide o VGV calculado por 1.000.000.';
  return `${calculation} A mesma divisão também é aplicada ao VGL, na prévia, nos gráficos e no Excel, sem alterar preços, áreas ou quantidades. Após mudar qualquer configuração, clique em Gerar relatório para atualizar o resultado.`;
}
