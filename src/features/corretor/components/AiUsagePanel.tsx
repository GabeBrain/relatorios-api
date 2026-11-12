import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { loadAiUsage, type AiUsage } from '../lib/recommendations';
import { formatBRL, FX_BRL_PER_USD } from '../lib/v3/config';
import '../styles/projects.css';

const labels:Record<string,string>={texto:'Texto',visao_tabela:'Tabelas em imagem',visao_mapa:'Mapas',visao_ata:'Estrutura',recomendacao:'Recomendação'};
const usd=(n:number)=>`US$ ${Number(n).toFixed(4).replace('.',',')}`;
export default function AiUsagePanel(){
 const [data,setData]=useState<AiUsage|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 const refresh=useCallback(async()=>{setLoading(true);setError('');try{setData(await loadAiUsage());}catch(e){setError(e instanceof Error?e.message:'Não foi possível consultar o uso de IA.');}finally{setLoading(false);}},[]);
 useEffect(()=>{void refresh();},[refresh]);
 const total=data?.groups.reduce((sum,row)=>sum+Number(row.cost_usd),0)??0;
 return <section className="corretor-projects cr-metrics" aria-label="Uso e custo de IA">
  <div className="cp-heading"><div><h2>Uso e custo de IA</h2><p className="cp-muted">Últimos 30 dias · valores calculados pelo uso registrado. Não substituem a fatura do provedor. Câmbio de referência R$ {FX_BRL_PER_USD.toFixed(2).replace('.',',')}/US$.</p></div><Button variant="outline" disabled={loading} onClick={()=>void refresh()}>Atualizar uso</Button></div>
  {loading?<p role="status">Consultando uso de IA…</p>:error?<p role="alert">{error}</p>:data&&<>
   <div className="cp-metrics"><div><strong>{usd(total)}</strong><span>Uso confirmado · todos os motores · {formatBRL(total)}</span></div><div><strong>{data.groups.reduce((sum,r)=>sum+Number(r.calls),0)}</strong><span>Chamadas registradas</span></div><div><strong>{usd(data.recommendations.reserved_usd)}</strong><span>Reserva consultiva ainda sem retorno</span></div></div>
   <p>Recomendador: {data.recommendations.total} execuções · {data.recommendations.completed} geradas · {data.recommendations.partial} parciais · {data.recommendations.unknown} a conferir.</p>
   <p className="cp-muted">Previsões dos lotes: {usd(data.recommendations.estimated_usd)} · uso consultivo confirmado: {usd(data.recommendations.spent_usd)}. Execuções interrompidas ainda podem ter custo; uma diferença da previsão não mede qualidade.</p>
   {!data.groups.length?<p>Nenhuma chamada registrada neste período.</p>:<div className="cr-usage-groups">{data.groups.map(row=><article key={`${row.tipo}:${row.model}`}><h3>{labels[row.tipo]??'Outro processamento'} · {row.model}</h3><p>{row.calls} chamadas · {usd(row.cost_usd)} · média {usd(Number(row.cost_usd)/Number(row.calls))}/chamada</p><p className="cp-muted">{Number(row.input_tokens).toLocaleString('pt-BR')} tokens de entrada · {Number(row.cached_tokens).toLocaleString('pt-BR')} em cache · {Number(row.output_tokens).toLocaleString('pt-BR')} de saída{row.latency_ms!==null?` · tempo médio ${(Number(row.latency_ms)/1000).toFixed(1).replace('.',',')}s`:''}</p></article>)}</div>}
   <p className="cp-muted">Registros antigos podem não informar o modelo, o tempo ou o cache. Tentativas com retorno desconhecido mantêm reserva e não entram como uso confirmado.</p>
  </>}
 </section>;
}
