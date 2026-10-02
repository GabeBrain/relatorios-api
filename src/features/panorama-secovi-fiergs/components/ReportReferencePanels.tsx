import { CircleHelp, BookOpen, Sigma } from 'lucide-react';
import type { ReactNode } from 'react';
import type { EntityId } from '../types';

const methodology = {
  'fiergs-rs': [
    ['Território', 'Preset FIERGS: municípios do entorno metropolitano definidos no preset; Porto Alegre não integra o recorte.'],
    ['Período', 'O intervalo selecionado delimita os fluxos de lançamentos e vendas. Estoque e oferta final são fotografias no fechamento.'],
    ['Elegibilidade', 'O universo segue a política de entidade e os filtros do cubo granular. Empreendimentos recusados permanecem identificados na auditoria.'],
    ['Chave e deduplicação', 'Empreendimentos são consolidados pela chave estável que combina identificador e município; contagens usam IDs distintos.'],
    ['Dimensões', 'Padrão, tipologia e segmento são preservados conforme a abertura disponível na fonte. Resíduos não são redistribuídos.'],
    ['Vendas e IVV', 'Vendas líquidas mantêm o sinal observado. O IVV consolidado FIERGS usa vendas líquidas ÷ (estoque final + vendas líquidas), no mesmo fechamento.'],
    ['Disponibilidade', 'A razão oferta final ÷ oferta lançada só é comparada dentro da mesma dimensão e universo histórico. Lançamentos da janela não substituem esse denominador.'],
    ['Preços', 'Agregações ponderadas usam os pesos de estoque final definidos no modelo; campos sem observação permanecem ausentes.'],
    ['Maturidade', 'As faixas são Planta (até 6 meses), Construção (7–36 meses) e Pronto (37+ meses). Faixas não representam média contínua em meses.'],
    ['Geografia', 'Mapas usam as coordenadas disponíveis no cubo; ausência de coordenada não altera contagens nem indicadores.'],
    ['Arredondamento', 'Cálculos e reconciliações usam valores numéricos antes da formatação; arredondamento é apenas apresentação.'],
  ],
  'secovi-sp': [
    ['Território', 'Municípios monitorados escolhidos no recorte; comparativos municipais só aparecem quando a coleta fecha para todas as cidades.'],
    ['Período', 'O intervalo selecionado delimita séries de fluxo. Estoque e preços são fotografias temporais e não fluxos somáveis.'],
    ['Elegibilidade e deduplicação', 'A política SECOVI-SP controla segmentos e produtos horizontais aceitos. Empreendimentos são deduplicados pela chave estável do cubo.'],
    ['Dimensões', 'Segmento, padrão e tipologia são agregados a partir das linhas observadas, sem converter ausência em zero.'],
    ['Vendas e IVV', 'Vendas são líquidas por período. O IVV municipal é ponderado pelo estoque final na mesma cidade, segmento e dimensão.'],
    ['Disponibilidade', 'Oferta final é uma fotografia no fechamento. A disponibilidade respeita a base lançada compatível com a dimensão e a janela definida pelo indicador.'],
    ['Preços', 'Médias municipais são ponderadas pelo estoque final correspondente; um grupo sem base de ponderação não é estimado.'],
    ['Coortes, maturidade e mapas', 'Coortes usam ano de lançamento; maturidade usa faixas observadas no cubo; mapas usam coordenadas disponíveis.'],
    ['Arredondamento', 'Valores são calculados antes da formatação; arredondamento é apenas apresentação.'],
  ],
} satisfies Record<EntityId, [string, string][]>;

const glossary: [string, string][] = [
  ['Empreendimento', 'Projeto imobiliário identificado uma única vez no universo e período.'],
  ['Lançamento', 'Fluxo de empreendimentos/unidades cuja data de lançamento cai no trimestre observado.'],
  ['Oferta lançada da janela', 'Unidades lançadas dentro do intervalo selecionado; não é necessariamente a base da oferta histórica.'],
  ['Oferta lançada histórica', 'Universo acumulado de unidades lançadas usado quando a comparação exige a mesma dimensão da oferta final.'],
  ['Oferta final', 'Unidades em estoque na fotografia do fechamento.'],
  ['Venda líquida', 'Vendas reportadas após cancelamentos/devoluções conforme a fonte; pode ser zero ou negativa.'],
  ['Disponibilidade', 'Oferta final dividida pela oferta lançada compatível; sem denominador observável, não se calcula.'],
  ['IVV', 'Índice de velocidade de vendas; fórmula e ponderação dependem da entidade e dimensão.'],
  ['VGV', 'Valor Geral de Vendas associado às unidades lançadas, em oferta ou vendidas. Campos ausentes não são imputados.'],
  ['Ticket médio', 'Valor médio por unidade segundo a ponderação explicitada para o indicador.'],
  ['R$/m²', 'Preço por metro quadrado privativo, agregado com a ponderação definida pelo modelo.'],
  ['Tipologia', 'Agrupamento de unidades por configuração de dormitórios, conforme classificação canônica.'],
  ['Padrão', 'Classificação de padrão construtivo/econômico reconhecida pela fonte ou política da entidade.'],
  ['Maturidade por faixa', 'Classificação do estoque em Planta, Construção ou Pronto; não equivale a tempo médio em meses.'],
];

const formulas: { metric: string; input: string; operation: string; denominator: string; universe: string; unit: string; source: string; omission: string; location: string }[] = [
  { metric: 'Empreendimentos lançados', input: 'ID do empreendimento e data de lançamento', operation: 'Contagem distinta por trimestre', denominator: 'Não se aplica', universe: 'Fluxo dentro do intervalo selecionado', unit: 'empreendimentos', source: 'building-with-history / cubo', omission: 'Sem ID ou data válida, não classificar no período', location: 'Lançamentos' },
  { metric: 'Unidades lançadas', input: 'Quantidade lançada e data', operation: 'Soma das unidades observadas', denominator: 'Não se aplica', universe: 'Fluxo dentro do intervalo selecionado', unit: 'unidades', source: 'building-with-history / cubo', omission: 'Nulo permanece ausente; zero observado permanece zero', location: 'Lançamentos e oferta' },
  { metric: 'Vendas líquidas', input: 'Vendas por período ou fotografia granular de fechamento FIERGS', operation: 'Soma mantendo o sinal', denominator: 'Não se aplica', universe: 'Período/dimensão apresentados', unit: 'unidades', source: 'API temporal e cubo GeoBrain', omission: 'Nulo não vira zero; sinal negativo não é removido', location: 'Vendas e IVV' },
  { metric: 'Oferta final', input: 'Estoque na data final', operation: 'Soma na fotografia de fechamento', denominator: 'Não se aplica', universe: 'Empreendimentos elegíveis na data final', unit: 'unidades', source: 'Cubo GeoBrain', omission: 'Sem observação, não se infere estoque', location: 'Mercado atual' },
  { metric: 'Disponibilidade', input: 'Oferta final e lançamento histórico compatível', operation: 'Oferta final ÷ oferta lançada × 100', denominator: 'Oferta lançada da mesma dimensão/universo', universe: 'Fotografia final contra base histórica compatível', unit: '%', source: 'Cubo GeoBrain', omission: 'Sem denominador válido, valor e coluna sem resultado não são apresentados', location: 'Oferta por dimensão' },
  { metric: 'IVV FIERGS', input: 'Vendas líquidas, estoque final', operation: 'Vendas líquidas ÷ (estoque final + vendas líquidas) × 100', denominator: 'Estoque final + vendas líquidas', universe: 'Mesmo fechamento e dimensão', unit: '%', source: 'Cubo GeoBrain reconciliado', omission: 'Denominador nulo ou zero não produz percentual', location: 'IVV' },
  { metric: 'IVV Secovi-SP', input: 'IVV municipal e estoque final', operation: 'Média ponderada pelo estoque final', denominator: 'Soma dos pesos de estoque final observados', universe: 'Mesma cidade, segmento e dimensão', unit: '%', source: 'APIs temporais GeoBrain', omission: 'Sem pesos positivos observáveis, não se calcula', location: 'IVV' },
  { metric: 'Ticket / R$/m²', input: 'Preço municipal e estoque final', operation: 'Média ponderada pelo estoque final', denominator: 'Soma dos pesos válidos', universe: 'Mesma cidade, segmento, dimensão e fotografia', unit: 'R$ / R$/m²', source: 'APIs temporais ou cubo', omission: 'Preço ou peso ausente não é imputado', location: 'Preços' },
  { metric: 'VGV vendido do cubo', input: 'VGV lançado e VGV final do mesmo projeto', operation: 'VGV lançado − VGV final', denominator: 'Não se aplica', universe: 'Mesma fotografia do cubo', unit: 'R$ milhões', source: 'Cubo GeoBrain', omission: 'Só calcula quando os dois campos são observáveis', location: 'VGV' },
  { metric: 'Média de unidades lançadas por empreendimento', input: 'Unidades lançadas e IDs distintos', operation: 'Unidades lançadas ÷ empreendimentos', denominator: 'Empreendimentos distintos do mesmo grupo', universe: 'Mesmo grupo e intervalo de lançamentos', unit: 'unidades/empreendimento', source: 'Cubo GeoBrain', omission: 'Sem empreendimentos no grupo, média ausente', location: 'Resumo horizontal' },
];

function ReferenceCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return <section className="rounded-xl border bg-card p-4 sm:p-5"><div className="mb-4 flex items-center gap-2"><span className="text-primary">{icon}</span><h2 className="text-base font-semibold">{title}</h2></div>{children}</section>;
}

export function MethodologyReference({ entity }: { entity: EntityId }) {
  return <ReferenceCard icon={<CircleHelp className="h-4 w-4"/>} title={`Regras aplicadas · ${entity === 'fiergs-rs' ? 'FIERGS' : 'Secovi-SP'}`}>
    <dl className="grid gap-4 sm:grid-cols-2">{methodology[entity].map(([term, definition]) => <div key={term}><dt className="text-sm font-semibold">{term}</dt><dd className="mt-1 text-sm leading-6 text-muted-foreground">{definition}</dd></div>)}</dl>
  </ReferenceCard>;
}

export function GlossaryReference() {
  return <ReferenceCard icon={<BookOpen className="h-4 w-4"/>} title="Glossário"><dl className="grid gap-4 sm:grid-cols-2">{glossary.map(([term, definition]) => <div key={term}><dt className="text-sm font-semibold">{term}</dt><dd className="mt-1 text-sm leading-6 text-muted-foreground">{definition}</dd></div>)}</dl></ReferenceCard>;
}

export function FormulaReference({ entity }: { entity: EntityId }) {
  const rows = entity === 'fiergs-rs' ? formulas : formulas.filter((row) => row.metric !== 'IVV FIERGS');
  return <ReferenceCard icon={<Sigma className="h-4 w-4"/>} title="Fórmulas e contratos">
    <div className="overflow-x-auto"><table className="w-full min-w-[1080px] border-collapse text-left text-xs"><thead><tr className="border-b">{['Indicador','Entradas / operação','Denominador','Universo temporal','Unidade','Fonte','Omissão','Onde aparece'].map((heading) => <th key={heading} className="px-2 py-2 font-semibold">{heading}</th>)}</tr></thead><tbody>{rows.map((row) => <tr className="border-b align-top" key={row.metric}><th scope="row" className="px-2 py-2 font-medium">{row.metric}</th><td className="px-2 py-2">{row.input}<br/><span className="text-muted-foreground">{row.operation}</span></td><td className="px-2 py-2">{row.denominator}</td><td className="px-2 py-2">{row.universe}</td><td className="px-2 py-2">{row.unit}</td><td className="px-2 py-2">{row.source}</td><td className="px-2 py-2">{row.omission}</td><td className="px-2 py-2">{row.location}</td></tr>)}</tbody></table></div>
    <p className="mt-3 text-xs text-muted-foreground">As fórmulas são específicas da entidade e do universo descrito. A tabela de avisos identifica limitações do recorte gerado.</p>
  </ReferenceCard>;
}
