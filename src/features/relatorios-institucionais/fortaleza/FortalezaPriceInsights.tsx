import type { PriceCollection,PriceSlideData } from './monthly-prices';
import { Table,TableBody,TableCell,TableHead,TableHeader,TableRow } from '@/components/ui/table';
export function FortalezaPriceInsights({page,data,prices}:{page:number;data:PriceSlideData|null;prices:PriceCollection|null}) {
  if (!data) return null;
  return <details className="rounded-lg border p-3 text-sm"><summary className="cursor-pointer font-medium">Origem e cálculo deste slide</summary><div className="mt-3 space-y-3 text-muted-foreground">
    {page>=45?<p>IVV residencial vertical do recorte = vendas líquidas do mês ÷ (estoque do mês anterior + lançamentos do mês) × 100. A linha de referência é a média aritmética dos 25 IVVs mensais. O estoque inicial vem de uma fotografia adicional; não é reconstituído pelo balanço. Fórmula e recorte candidatos, sujeitos à homologação da equipe.</p>:<>
      <p>Preços nominais por m² das tipologias com estoque histórico positivo. Média ponderada por unidades ofertadas: soma de preço/m² × estoque ÷ soma do estoque. Na região metropolitana, agregamos os pesos de todas as quatro cidades; não calculamos a média simples das médias municipais. Esta ponderação é uma proposta de implementação e ainda exige homologação.</p>
      <p>Fonte: histórico detalhado v2, por empreendimento e tipologia. Usa price_private_area; somente quando ausente, preço ÷ área privativa histórica. Não usa preço ou estoque atual para substituir fotografias antigas. Para lotes, confirmar com a equipe a semântica da área disponibilizada pela fonte. Sem correção pelo INCC neste bloco.</p>
      {page===40&&<p>Exclusões do original: tipologias sem estoque, Coberturas, Lajes, Duplex e Gardens. A categoria deve estar identificada para aplicar essas exclusões.</p>}
      {page===38&&<p>As linhas distinguem Condomínio de Casas e Loteamento Fechado; não representam Econômico e demais padrões. Histórico de 13 meses; comparações com o mês anterior e com o mesmo mês do ano anterior.</p>}
    </>}
    {data.issue&&<p role="status">{data.issue}</p>}
    {page<45&&<Table><TableHeader><TableRow><TableHead>Fonte</TableHead><TableHead>Cobertura</TableHead><TableHead>Requisições</TableHead></TableRow></TableHeader><TableBody>{prices?.sources.filter(source=>data.status==='blocked'||data.sourceKeys.includes(`${source.city}/${source.segment}/histórico-preços`)).map(source=><TableRow key={`${source.city}/${source.segment}`}><TableCell>{source.city} · {source.segment}</TableCell><TableCell>{source.records.length} empreendimentos · {source.complete?'concluída':'incompleta'}</TableCell><TableCell>{source.requests}</TableCell></TableRow>)}</TableBody></Table>}
    {data.cities?.map(city=><p key={city.city}>{city.city}: {city.units.toLocaleString('pt-BR')} unidades elegíveis · R$ {city.value.toLocaleString('pt-BR',{maximumFractionDigits:2})}/m².</p>)}
  </div></details>;
}
