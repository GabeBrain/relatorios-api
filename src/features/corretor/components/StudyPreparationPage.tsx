import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileSpreadsheet, Presentation, X } from 'lucide-react';
import { pptxToIr } from '../lib/audit/pptx-to-ir';
import type { Ir } from '../lib/audit/ir';
import { estimateFullAnalysis, type FullEstimate } from '../lib/v3/pipeline';
import { extractFonteFromExcel } from '../lib/v3/fonte-extractor-browser';
import { suggestCity } from '../lib/v3/city-suggestion';
import { imageProfile } from '../lib/v3/pre-analysis';
import { loadLocalMaterial, saveLocalMaterial } from '../lib/v3/local-materials';
import type { Fonte } from '../lib/v3/fonte';
import { formatBRL } from '../lib/v3/config';

export interface PreparedStudy {
  file: File; bytes: Uint8Array; ir: Ir; estimate: FullEstimate;
  sheets: File[]; fonte: Fonte | null; city: string; uf: string; outras: string[]; budgetUsd: number;
}
interface Props { back: string; onStart: (prepared: PreparedStudy) => Promise<void> }
const UFS = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ');
const encoder = new TextEncoder(), decoder = new TextDecoder();
export default function StudyPreparationPage({ back, onStart }: Props) {
  const [file, setFile] = useState<File | null>(null), [sheets, setSheets] = useState<File[]>([]);
  const [prepared, setPrepared] = useState<{ ir: Ir; bytes: Uint8Array; estimate: FullEstimate } | null>(null);
  const [budgetUsd, setBudgetUsd] = useState(0);
  const [choice, setChoice] = useState(false), [city, setCity] = useState(''), [uf, setUf] = useState(''), [outras, setOutras] = useState('');
  const [loading, setLoading] = useState('Restaurando preparação…'), [starting, setStarting] = useState(false), [error, setError] = useState(''), [storage, setStorage] = useState('');
  const pptxInput = useRef<HTMLInputElement>(null), excelInput = useRef<HTMLInputElement>(null);
  const generation = useRef(0), lock = useRef(false), hydrated = useRef(false);
  const mounted = useRef(true);
  async function prepare(next: File, restore = false) {
    const current = ++generation.current;
    setFile(next); setPrepared(null); setError(''); setLoading('Preparando apresentação…');
    if (!restore) { setCity(''); setUf(''); if (file && sheets.length) setChoice(false); }
    try {
      if (!/\.pptx$/i.test(next.name)) throw new Error('Selecione uma apresentação PowerPoint (.pptx).');
      const bytes = new Uint8Array(await next.arrayBuffer());
      const ir = await pptxToIr(bytes, next.name);
      const estimate = await estimateFullAnalysis(ir, bytes, 'gpt-4o-mini');
      if (!mounted.current || current !== generation.current) return;
      setPrepared({ ir, bytes, estimate }); setBudgetUsd(Math.ceil((estimate.costUsd * 2 + 1) * 100) / 100);
      if (!restore) { const suggestion = suggestCity(next.name, ir); setCity(suggestion?.cidade ?? ''); setUf(suggestion?.uf ?? ''); }
      try { await saveLocalMaterial({ key: 'preparation:pptx', name: next.name, bytes }); }
      catch { setStorage('O arquivo está disponível nesta aba. O navegador não conseguiu guardá-lo para retomar depois.'); }
    } catch (e) { if (mounted.current && current === generation.current) setError(e instanceof Error ? e.message : 'Não foi possível preparar a apresentação.'); }
    finally { if (mounted.current && current === generation.current) setLoading(''); }
  }
  useEffect(() => {
    let active = true;
    mounted.current = true;
    (async () => {
      try {
        const draft = await loadLocalMaterial('preparation:fields');
        if (!active || !draft) return;
        const fields = JSON.parse(decoder.decode(draft.bytes));
        const deck = await loadLocalMaterial('preparation:pptx');
        const savedSheets = await Promise.all((fields.sheets as string[] ?? []).map(key => loadLocalMaterial(key)));
        if (!active) return;
        setCity(fields.city ?? ''); setUf(fields.uf ?? ''); setOutras(fields.outras ?? ''); setChoice(Boolean(fields.choice));
        const recovered = savedSheets.filter((s): s is NonNullable<typeof s> => Boolean(s));
        setSheets(recovered.map(s => new File([s.bytes.slice().buffer], s.name, { lastModified: Number(s.key.split(':').at(-1)) })));
        if (recovered.length !== (fields.sheets ?? []).length) { setChoice(false); setStorage('Algumas planilhas não puderam ser recuperadas. Selecione-as novamente.'); }
        if (deck) await prepare(new File([deck.bytes.slice().buffer], deck.name), true);
      } catch { if (active) setStorage('A preparação será mantida nesta aba. A recuperação local está indisponível.'); }
      finally { if (active) { hydrated.current = true; setLoading(''); } }
    })();
    return () => { active = false; mounted.current = false; };
    // Restaura uma vez por entrada; campos editados não disparam nova leitura do arquivo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!hydrated.current) return;
    const timer = window.setTimeout(() => {
      void saveLocalMaterial({ key: 'preparation:fields', name: 'preparação', bytes: encoder.encode(JSON.stringify({ city, uf, outras, choice, sheets: sheets.map(f => `preparation:sheet:${f.name}:${f.size}:${f.lastModified}`) })) })
        .catch(() => setStorage('Não foi possível guardar a preparação para recarregar. Mantenha esta aba aberta.'));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [city, uf, outras, choice, sheets, prepared]);
  async function addSheets(files: File[]) {
    const valid = files.filter(f => /\.(xlsx|xlsm)$/i.test(f.name));
    if (!valid.length) return;
    const next = [...sheets.filter(old => !valid.some(f => f.name === old.name)), ...valid];
    setSheets(next); setChoice(true);
    try { for (const f of valid) await saveLocalMaterial({ key: `preparation:sheet:${f.name}:${f.size}:${f.lastModified}`, name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) }); }
    catch { setStorage('Planilhas selecionadas nesta aba. Não foi possível guardar todas para recuperação.'); }
  }
  async function start() {
    if (!file || !prepared || lock.current || !choice || !city.trim() || !UFS.includes(uf)) return;
    lock.current = true; setStarting(true); setError('');
    try {
      const fonte = sheets.length ? await extractFonteFromExcel(sheets, prepared.ir.sha1) : null;
      await onStart({ file, ...prepared, sheets, fonte, city: city.trim(), uf, outras: outras.split(',').map(c => c.trim()).filter(Boolean), budgetUsd });
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível iniciar. Seus materiais continuam selecionados.'); }
    finally { lock.current = false; setStarting(false); }
  }
  const profile = prepared ? imageProfile(prepared.ir, prepared.estimate.candidates) : null;
  const ready = Boolean(prepared && choice && city.trim().length >= 2 && UFS.includes(uf) && !loading && !starting && budgetUsd > 0 && budgetUsd <= 100);
  return <main className="corretor-projects cp-preparation">
    <Link className="cp-back" to={back}>← Voltar aos estudos</Link>
    <header className="cp-heading"><div><p className="cp-eyebrow">Geobrain · Corretor</p><h1>Preparar estudo</h1><p className="cp-muted">Apresentação, cálculos e informações. Você decide quando iniciar a avaliação.</p></div></header>
    <section className="cp-panel"><h2><Presentation aria-hidden="true" /> Apresentação</h2><input ref={pptxInput} type="file" accept=".pptx" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void prepare(f); }} />
      <Button variant="outline" disabled={starting || Boolean(loading)} onClick={() => pptxInput.current?.click()}>{file ? 'Trocar apresentação' : 'Escolher PowerPoint'}</Button>
      {file && <p>{file.name}</p>}{loading && <p role="status">{loading}</p>}
    </section>
    <section className="cp-panel"><h2><FileSpreadsheet aria-hidden="true" /> Incluir planilhas de cálculo?</h2><p className="cp-muted">Com os arquivos Excel, o corretor compara os números apresentados com os cálculos de origem. As planilhas são opcionais.</p>
      <input ref={excelInput} type="file" accept=".xlsx,.xlsm" multiple hidden onChange={e => { const files = Array.from(e.target.files ?? []); e.target.value = ''; void addSheets(files); }} />
      <div className="cp-actions"><Button variant="outline" disabled={starting} onClick={() => excelInput.current?.click()}>Adicionar planilhas Excel</Button>{!sheets.length && <Button variant={choice ? 'default' : 'outline'} disabled={starting} onClick={() => setChoice(true)}>Continuar sem planilhas</Button>}</div>
      {sheets.length > 0 && !choice && <Button variant="outline" disabled={starting} onClick={() => setChoice(true)}>Usar estas planilhas nesta apresentação</Button>}
      {sheets.length > 0 && <ul className="cs-files">{sheets.map(f => <li key={f.name}><span>{f.name}</span><Button variant="ghost" disabled={starting} aria-label={`Remover ${f.name}`} onClick={() => { setSheets(s => s.filter(x => x !== f)); if (sheets.length === 1) setChoice(false); }}><X size={16} /></Button></li>)}</ul>}
      {!choice && file && <p>Adicione as planilhas ou escolha continuar sem elas.</p>}
    </section>
    {prepared && <section className="cp-panel"><h2>Conferir antes de iniciar</h2><div className="cs-fields"><div><Label htmlFor="prepare-city">Cidade do estudo</Label><Input id="prepare-city" value={city} disabled={starting} onChange={e => setCity(e.target.value)} /></div><div><Label htmlFor="prepare-uf">Estado</Label><Select value={uf} disabled={starting} onValueChange={setUf}><SelectTrigger id="prepare-uf"><SelectValue placeholder="UF" /></SelectTrigger><SelectContent>{UFS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select></div></div>
      <Label htmlFor="prepare-others">Outras cidades que fazem parte do estudo (opcional)</Label><Input id="prepare-others" value={outras} disabled={starting} onChange={e => setOutras(e.target.value)} placeholder="Separe por vírgulas" />
      <p className="cp-muted">{prepared.ir.n_slides} slides · {profile?.tabelasNativas} tabelas nativas · {(profile?.tabelasImagem ?? 0) + (profile?.fichas ?? 0)} tabelas em imagem. Estes conteúdos ainda não foram avaliados.</p>
      <p>Estimativa da avaliação: <strong>{formatBRL(prepared.estimate.costUsd)}</strong> · inclui ata, texto e imagens ainda sem leitura salva.</p>
      <Label htmlFor="prepare-budget">Limite autorizado em dólares (US$)</Label><Input id="prepare-budget" type="number" min="0.01" max="100" step="0.01" value={budgetUsd} disabled={starting} onChange={e => setBudgetUsd(Number(e.target.value))} />
      <p className="cp-muted">Limite de {formatBRL(budgetUsd)}, incluindo margem para releituras. O servidor interrompe antes de exceder esse valor. A confirmação autoriza somente este lote; retomar exige conferir o limite novamente.</p>
      <Button disabled={!ready} onClick={() => void start()}>{starting ? 'Iniciando avaliação…' : 'Iniciar avaliação'}</Button>
      {(!city.trim() || !uf) && <p>Confirme a cidade e o estado para iniciar.</p>}
    </section>}
    {error && <p role="alert">{error}</p>}{storage && <p role="status" className="cp-muted">{storage}</p>}
  </main>;
}
