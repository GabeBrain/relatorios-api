import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BrainLoadingState } from '@/components/feedback/BrainLoadingState';
import { projetar, type HorizontalOutput } from './reference/horizontal.js';
import horizontalParameters from './reference/horizontal-parameters.json';
import { compareExcel, readExcel, type ParityRow } from '../parity';
import { downloadCsv } from '../export';
import type { ReadResult, SourceType } from '../source';
import { ForecastChart } from './ForecastChart';
export function SupportPanels({ data, city, type, showLaboratory = true }: {
    data: ReadResult | null;
    city: string;
    type: SourceType;
    showLaboratory?: boolean;
}) {
    const [lab, setLab] = useState({ units: 300, sold: 150, month: 6 });
    const [confirmed, setConfirmed] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [parity, setParity] = useState<ParityRow[]>([]);
    let shape: HorizontalOutput | null = null;
    try {
        shape = projetar(horizontalParameters, 'Loteamento Fechado', lab.units, lab.month, lab.sold);
    }
    catch { /* domain shown */ }
    const read = async (file?: File) => { if (!file || !data)
        return; setBusy(true); setParity([]); try {
        const parsed = await readExcel(file, type);
        const result = compareExcel(data.buildings, parsed, city);
        setParity(result);
        setMessage(`${file.name}: ${result.filter(r => r.status === 'equal').length} iguais; ${result.filter(r => r.status === 'different').length} diferentes; ${result.filter(r => r.status === 'api-only' || r.status === 'excel-only').length} exclusivos de uma fonte.`);
    }
    catch (e) {
        setMessage(e instanceof Error ? e.message : 'Falha na conferência');
    }
    finally {
        setBusy(false);
    } };
    return <div className="space-y-5">{showLaboratory && <details className="ev-panel"><summary className="cursor-pointer font-semibold">Laboratório Finotti fechado · 300 / 150 / 6</summary><p className="ev-note my-4">Referência completa do Finotti, independente da API: equação, cauda após 95% e faixas originais. O caso 300/150/6 esgota no mês 67.</p><div className="grid gap-4 sm:grid-cols-3">{(['units', 'sold', 'month'] as const).map(key => <label key={key}>{{ units: 'Unidades', sold: 'Vendidas', month: 'Mês de mercado' }[key]}<Input type="number" value={lab[key]} onChange={e => setLab({ ...lab, [key]: Number(e.target.value) })}/></label>)}</div>{shape?.resumo ? <><p className="ev-note my-4">k {shape.resumo.k.toFixed(6)} · esgotamento {shape.resumo.mes_esgotamento ? `no mês ${shape.resumo.mes_esgotamento}` : 'além do horizonte'} · {shape.resumo.vendas_12m} unidades nos próximos 12 meses</p><ForecastChart percent rows={[{x:lab.month,predicted:100*lab.sold/lab.units},...shape.tabela.map(r => ({x:r.t,predicted:100*r.acumulado/lab.units,sourceWide:[100*r.ampla_min/lab.units,100*r.ampla_max/lab.units],sourceCentral:[100*r.central_min/lab.units,100*r.central_max/lab.units]}))]}/><p className="ev-note">Faixas da referência, sem garantia de cobertura para a cidade selecionada.</p></> : <p role="alert">{shape?.esgotado ? 'Unidades esgotadas.' : 'Origem fora do domínio da referência.'}</p>}</details>}<details open={!showLaboratory} className="ev-panel"><summary className="cursor-pointer font-semibold">Conferir com Excel do Geobrain</summary><p className="my-4 text-sm leading-6">Exporte em <a href="https://app.geobrain.com.br/analise-temporal-excel" target="_blank" rel="noopener noreferrer" className="underline">Análise Temporal Excel ↗</a>: Projeto vazio; mesmo Estado/Cidade; tipo {type}; Mensal; Colunas; até 24 competências fechadas; incluir esgotados; excluir áreas comuns e filtros adicionais. O arquivo confere valores, não comprova origem observada.</p><label className="flex gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}/>Confirmo esses filtros</label><Input className="mt-4" aria-label="Arquivo Excel do Geobrain" type="file" accept=".xlsx" disabled={!data || !confirmed || busy} onChange={e => void read(e.target.files?.[0])}/>{busy && <BrainLoadingState variant="operation" title="Conferindo arquivo local"/>}<p role="status" className="ev-note my-4">{message}</p><Button variant="outline" disabled={!parity.length} onClick={() => downloadCsv('conferencia-excel.csv', parity)}>Exportar conferência</Button></details></div>;
}
