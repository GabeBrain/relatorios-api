import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BrainLoadingState } from '@/components/feedback/BrainLoadingState';
import { calculateHorizontalShape, evaluateHorizontalCurve } from '../horizontal';
import { compareExcel, readExcel, type ParityRow } from '../parity';
import { downloadCsv } from '../export';
import type { ReadResult, SourceType } from '../source';
import { ForecastChart } from './ForecastChart';
export function SupportPanels({ data, city, type }: {
    data: ReadResult | null;
    city: string;
    type: SourceType;
}) {
    const [lab, setLab] = useState({ units: 300, sold: 150, month: 6 });
    const [confirmed, setConfirmed] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [parity, setParity] = useState<ParityRow[]>([]);
    let shape: ReturnType<typeof calculateHorizontalShape> | null = null;
    try {
        shape = calculateHorizontalShape({ pattern: 'fechado', launchedUnits: lab.units, netSoldUnits: lab.sold, marketMonth: lab.month });
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
    return <div className="space-y-5"><details className="ev-panel"><summary className="cursor-pointer font-semibold">Laboratório Finotti fechado · 300 / 150 / 6</summary><p className="ev-note my-4">Cálculo independente da API. Cauda após 95% ainda não reproduzida.</p><div className="grid gap-4 sm:grid-cols-3">{(['units', 'sold', 'month'] as const).map(key => <label key={key}>{{ units: 'Unidades', sold: 'Vendidas', month: 'Mês de mercado' }[key]}<Input type="number" value={lab[key]} onChange={e => setLab({ ...lab, [key]: Number(e.target.value) })}/></label>)}</div>{shape ? <><p className="ev-note my-4">k {shape.k.toFixed(5)} · 95% no mês {shape.firstMonthAt95}</p><ForecastChart percent rows={Array.from({ length: 37 }, (_, i) => ({ x: lab.month + i, predicted: lab.month + i >= shape!.firstMonthAt95 ? null : 100 * evaluateHorizontalCurve({ pattern: 'fechado', launchedUnits: lab.units, netSoldUnits: lab.sold, marketMonth: lab.month }, lab.month + i).fraction }))}/></> : <p role="alert">Origem fora do domínio original.</p>}</details><details className="ev-panel"><summary className="cursor-pointer font-semibold">Conferir com Excel do Geobrain</summary><p className="my-4 text-sm leading-6">Exporte em <a href="https://app.geobrain.com.br/analise-temporal-excel" target="_blank" rel="noopener noreferrer" className="underline">Análise Temporal Excel ↗</a>: Projeto vazio; mesmo Estado/Cidade; tipo {type}; Mensal; Colunas; até 24 competências fechadas; incluir esgotados; excluir áreas comuns e filtros adicionais. O arquivo confere valores, não comprova origem observada.</p><label className="flex gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}/>Confirmo esses filtros</label><Input className="mt-4" aria-label="Arquivo Excel do Geobrain" type="file" accept=".xlsx" disabled={!data || !confirmed || busy} onChange={e => void read(e.target.files?.[0])}/>{busy && <BrainLoadingState variant="operation" title="Conferindo arquivo local"/>}<p role="status" className="ev-note my-4">{message}</p><Button variant="outline" disabled={!parity.length} onClick={() => downloadCsv('conferencia-excel.csv', parity)}>Exportar conferência</Button></details></div>;
}
