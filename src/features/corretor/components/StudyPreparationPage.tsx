import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, FileSpreadsheet, FileText, Presentation, RotateCcw, Upload, X } from 'lucide-react';
import { pptxToIr } from '../lib/audit/pptx-to-ir';
import type { Ir } from '../lib/audit/ir';
import { estimateFullAnalysis, type FullEstimate } from '../lib/v3/pipeline';
import { extractFonteFromExcel } from '../lib/v3/fonte-extractor-browser';
import { suggestCity } from '../lib/v3/city-suggestion';
import { imageProfile } from '../lib/v3/pre-analysis';
import { clearPreparationDraft, loadLocalMaterial, saveLocalMaterial } from '../lib/v3/local-materials';
import { loadPptx } from '../lib/v3/pptx-store';
import { loadLocalStudySheets } from '../lib/v3/local-materials';
import { analysisPending, listStudies, type StudyV3 } from '../lib/v3/db';
import type { Fonte } from '../lib/v3/fonte';
import { formatBRL } from '../lib/v3/config';
import { irToFindings } from '../lib/audit/ir-rules';
import { registerAccountPreparation, type AccountPreparation } from '../lib/account-preparation';
import type { RecommendationStudy } from './StudyRecommendation';
const Recommendation = lazy(()=>import('./StudyRecommendation'));

export interface PreparedStudy {
  file: File; bytes: Uint8Array; ir: Ir; estimate: FullEstimate;
  sheets: File[]; fonte: Fonte | null; city: string; uf: string; outras: string[]; budgetUsd: number;
  accountPreparation?: AccountPreparation | null;
}
interface Props { resume?: { study: StudyV3; fonte: Fonte | null }; back: string; onStart: (prepared: PreparedStudy) => Promise<void>; onRecommendation?: (prepared: PreparedStudy) => Promise<RecommendationStudy> }
const UFS = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ');
const encoder = new TextEncoder(), decoder = new TextDecoder();
export default function StudyPreparationPage({ back, onStart, onRecommendation, resume }: Props) {
  const [params] = useSearchParams();
  const requestedIntent = params.get('intent');
  const [recommendationBusy,setRecommendationBusy]=useState(false);
  const [intent,setIntent]=useState<'review'|'recommendation'>(requestedIntent==='recommendation'?'recommendation':'review');
  const [file, setFile] = useState<File | null>(null), [sheets, setSheets] = useState<File[]>([]);
  const [prepared, setPrepared] = useState<{ ir: Ir; bytes: Uint8Array; estimate: FullEstimate } | null>(null);
  const [budgetUsd, setBudgetUsd] = useState(0);
  const [choice, setChoice] = useState(false), [city, setCity] = useState(''), [uf, setUf] = useState(''), [outras, setOutras] = useState('');
  const [loading, setLoading] = useState('Restaurando preparação…'), [starting, setStarting] = useState(false), [error, setError] = useState(''), [storage, setStorage] = useState('');
  const [previousStudy, setPreviousStudy] = useState<string | null>(null), [restored, setRestored] = useState(false);
  const [savingSheets, setSavingSheets] = useState(false);
  const [accountPreparation, setAccountPreparation] = useState<AccountPreparation | null>(null);
  const pptxInput = useRef<HTMLInputElement>(null), excelInput = useRef<HTMLInputElement>(null);
  const generation = useRef(0), lock = useRef(false), hydrated = useRef(false);
  const mounted = useRef(true);
  async function prepare(next: File, restore = false) {
    const current = ++generation.current;
    setFile(next); setPrepared(null); setAccountPreparation(null); setError(''); setLoading('Preparando apresentação…');
    if (!restore) { setCity(''); setUf(''); if (file && sheets.length) setChoice(false); }
    try {
      if (!/\.pptx$/i.test(next.name)) throw new Error('Selecione uma apresentação PowerPoint (.pptx).');
      const bytes = new Uint8Array(await next.arrayBuffer());
      const ir = await pptxToIr(bytes, next.name);
      if (resume && ir.sha1 !== resume.study.lastSha1) throw new Error('Selecione o mesmo PowerPoint desta versão. Uma apresentação corrigida deve ser enviada como nova versão.');
      if (restore && !resume) {
        // Recupera também os rascunhos deixados pela versão anterior, sem nova IA.
        const existing = await listStudies(true);
        if (!mounted.current || current !== generation.current) return;
        const completed = existing.find(s => s.generation === 'v3' && s.lastSha1 === ir.sha1 && !analysisPending(s));
        if (completed) {
          await clearPreparationDraft(ir.sha1);
          setPreviousStudy(completed.id); setFile(null); setSheets([]); setChoice(false); setCity(''); setUf(''); setOutras('');
          return;
        }
        setRestored(true);
      }
      const estimate = await estimateFullAnalysis(ir, bytes, 'gpt-4o-mini');
      if (!mounted.current || current !== generation.current) return;
      const account = resume ? null : await registerAccountPreparation({ name: next.name, sha1: ir.sha1, nSlides: ir.n_slides, bytes, findings: irToFindings(ir).filter(f => !f.ok) });
      if (!mounted.current || current !== generation.current) return;
      setAccountPreparation(account);
      if (account) window.dispatchEvent(new Event('corretor-library-refresh'));
      setPrepared({ ir, bytes, estimate }); setBudgetUsd(Math.ceil((estimate.costUsd * 2 + 1) * 100) / 100);
      if (!restore) { const suggestion = suggestCity(next.name, ir); setCity(suggestion?.cidade ?? ''); setUf(suggestion?.uf ?? ''); }
      try { if (!resume) await saveLocalMaterial({ key: 'preparation:pptx', name: next.name, bytes }); }
      catch { setStorage('O arquivo está disponível nesta aba. O navegador não conseguiu guardá-lo para retomar depois.'); }
    } catch (e) { if (mounted.current && current === generation.current) setError(e instanceof Error ? e.message : 'Não foi possível preparar a apresentação.'); }
    finally { if (mounted.current && current === generation.current) setLoading(''); }
  }
  useEffect(() => {
    let active = true;
    mounted.current = true;
    (async () => {
      try {
        if (resume) {
          const [deck, saved] = await Promise.all([loadPptx(resume.study.lastSha1), loadLocalStudySheets(resume.study.lastSha1 ?? '')]);
          if (!active) return;
          setCity(resume.study.cidade ?? ''); setUf(resume.study.uf ?? '');
          setSheets(saved.map(s => new File([s.bytes.slice().buffer], s.name)));
          setChoice(Boolean(saved.length || resume.fonte));
          if (deck) await prepare(new File([deck.bytes.slice().buffer], deck.name), true);
          return;
        }
        const draft = await loadLocalMaterial('preparation:fields');
        if (!active || !draft) return;
        const fields = JSON.parse(decoder.decode(draft.bytes));
        if (!requestedIntent) setIntent(fields.intent==='recommendation'?'recommendation':'review');
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
    if (resume || !hydrated.current || starting || recommendationBusy || lock.current) return;
    // Campos pequenos são gravados sem debounce: sair logo após remover a última
    // planilha não pode restaurar a seleção anterior. O início suspende a gravação.
    void saveLocalMaterial({ key: 'preparation:fields', name: 'preparação', bytes: encoder.encode(JSON.stringify({ intent, city, uf, outras, choice, sheets: sheets.map(f => `preparation:sheet:${f.name}:${f.size}:${f.lastModified}`) })) })
      .catch(() => setStorage('Não foi possível guardar a preparação para recarregar. Mantenha esta aba aberta.'));
  }, [city, uf, outras, choice, sheets, prepared, file, starting,intent,recommendationBusy,resume]);
  async function addSheets(files: File[]) {
    if (savingSheets) return;
    const valid = files.filter(f => /\.(xlsx|xlsm)$/i.test(f.name));
    if (!valid.length) return;
    const next = [...sheets.filter(old => !valid.some(f => f.name === old.name)), ...valid];
    setSheets(next); setChoice(true); setSavingSheets(true);
    try { for (const f of valid) await saveLocalMaterial({ key: resume ? `study:${resume.study.lastSha1}:sheet:${f.name}:${f.size}:${f.lastModified}` : `preparation:sheet:${f.name}:${f.size}:${f.lastModified}`, name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) }); }
    catch { setStorage('Planilhas selecionadas nesta aba. Não foi possível guardar todas para recuperação.'); }
    finally { setSavingSheets(false); }
  }
  async function start() {
    if (!file || !prepared || savingSheets || lock.current || !choice || !city.trim() || !UFS.includes(uf)) return;
    lock.current = true; setStarting(true); setError('');
    try {
      const fonte = sheets.length ? await extractFonteFromExcel(sheets, prepared.ir.sha1) : resume?.fonte ?? null;
      await onStart({ file, ...prepared, sheets, fonte, city: city.trim(), uf, outras: outras.split(',').map(c => c.trim()).filter(Boolean), budgetUsd, accountPreparation });
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível iniciar. Seus materiais continuam selecionados.'); }
    finally { lock.current = false; setStarting(false); }
  }
  async function reset() {
    if (lock.current || loading || starting || recommendationBusy || savingSheets || !window.confirm('Limpar esta preparação e selecionar outro estudo? Os estudos já registrados serão preservados.')) return;
    lock.current = true;
    try {
      await clearPreparationDraft(); generation.current++;
      setFile(null); setPrepared(null); setAccountPreparation(null); setSheets([]); setChoice(false); setCity(''); setUf(''); setOutras(''); setBudgetUsd(0);
      setError(''); setStorage(''); setRestored(false); setPreviousStudy(null);
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível limpar a preparação.'); }
    finally { lock.current = false; }
  }
  const profile = prepared ? imageProfile(prepared.ir, prepared.estimate.candidates) : null;
  const ready = Boolean(prepared && choice && city.trim().length >= 2 && UFS.includes(uf) && !loading && !starting && !recommendationBusy && !savingSheets && budgetUsd > 0 && budgetUsd <= 100);
  return <main className="corretor-projects cp-preparation">
    <Link className="cp-back" to={back}>← Voltar aos estudos</Link>
    <header className="cp-heading"><div><p className="cp-eyebrow">Geobrain · Corretor</p><h1>{resume ? 'Continuar avaliação' : intent === 'recommendation' ? 'Sugestão de análise' : 'Revisar estudo'}</h1><p className="cp-muted">Apresentação, cálculos e informações. Você decide quando iniciar a avaliação.</p></div></header>

    {previousStudy && <p className="cp-muted">O estudo anterior já foi analisado. <Link className="cp-inline" to={`/corretor/estudos/${previousStudy}/resumo`}>Abrir resultado</Link></p>}
    {!resume && (file || sheets.length > 0) && <div className="cp-draft-bar"><span className="cp-muted">{restored ? 'Preparação recuperada deste navegador' : 'Materiais desta preparação'}</span><Button variant="ghost" disabled={starting || recommendationBusy || Boolean(loading)} onClick={() => void reset()}><RotateCcw size={16} aria-hidden="true"/>Limpar e começar outro</Button></div>}
    <section className="cp-panel cp-upload-panel"><h2>Apresentação do estudo</h2><input ref={pptxInput} type="file" accept=".pptx" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) {setPreviousStudy(null);setRestored(false);void prepare(f);} }} />
      <Button className="cp-file-picker" data-ready={Boolean(prepared&&!loading)} variant="outline" disabled={starting || recommendationBusy || Boolean(loading)} onClick={() => pptxInput.current?.click()} aria-label={file ? 'Trocar apresentação' : 'Escolher PowerPoint'}>
        <span className="cp-file-symbol" aria-hidden="true"><Presentation size={32}/><span>PPTX</span></span>
        <span className="cp-file-copy"><strong>{file ? file.name : 'Escolher PowerPoint'}</strong><span>{prepared&&!loading ? `Apresentação preparada · ${prepared.ir.n_slides} slides · trocar arquivo` : file ? loading ? 'Preparando apresentação…' : 'Não foi possível preparar · selecione outro arquivo' : 'Apresentação original do estudo · .pptx'}</span></span>{prepared&&!loading?<Check size={20} aria-hidden="true"/>:<Upload size={20} aria-hidden="true"/>}
      </Button>
      <p className="cp-format-note cp-muted"><FileText size={18} aria-hidden="true"/>Tem um PDF? Você poderá incluí-lo como prévia dos slides na revisão. A análise usa o PowerPoint original.</p>
      {loading && <p role="status">{loading}</p>}
      {accountPreparation && <p className="cp-muted">Guardado em Meus estudos · análise ainda não iniciada.</p>}
    </section>
    <section className="cp-panel cp-upload-panel cp-upload-sheets"><h2>Planilhas de cálculo <span className="cp-muted">opcional</span></h2><p className="cp-muted">Inclua os arquivos Excel para comparar os números do estudo com os cálculos de origem.</p>
      <input ref={excelInput} type="file" accept=".xlsx,.xlsm" multiple hidden onChange={e => { const files = Array.from(e.target.files ?? []); e.target.value = ''; void addSheets(files); }} />
      <Button className="cp-file-picker" data-ready={sheets.length>0&&!savingSheets} variant="outline" disabled={starting || recommendationBusy || Boolean(loading)} onClick={() => excelInput.current?.click()} aria-label="Adicionar planilhas Excel"><span className="cp-file-symbol" aria-hidden="true"><FileSpreadsheet size={30}/><span>EXCEL</span></span><span className="cp-file-copy"><strong>{sheets.length ? `${sheets.length} planilhas adicionadas` : 'Adicionar planilhas Excel'}</strong><span>{sheets.length ? 'Adicionar ou substituir arquivos do conjunto' : 'Selecione todos os arquivos de cálculo · .xlsx ou .xlsm'}</span></span>{sheets.length>0&&!savingSheets?<Check size={20} aria-hidden="true"/>:<Upload size={20} aria-hidden="true"/>}</Button>
      {!sheets.length && !resume?.fonte && <div className="cp-actions"><Button variant="outline" aria-pressed={choice} disabled={starting || recommendationBusy || Boolean(loading)} onClick={() => setChoice(true)}>{choice && <Check size={16} aria-hidden="true"/>}Continuar sem planilhas</Button>{choice && <span className="cp-muted">A comparação com os cálculos de origem não será feita.</span>}</div>}
      {sheets.length > 0 && !choice && <Button variant="outline" disabled={starting || recommendationBusy} onClick={() => setChoice(true)}>Usar estas planilhas nesta apresentação</Button>}
      {sheets.length > 0 && <ul className="cs-files">{sheets.map(f => <li key={f.name}><FileSpreadsheet size={18} aria-hidden="true"/><span>{f.name}</span><Button variant="ghost" disabled={starting || recommendationBusy} aria-label={`Remover ${f.name}`} onClick={() => { setSheets(s => s.filter(x => x !== f)); if (sheets.length === 1) setChoice(false); }}><X size={16} /></Button></li>)}</ul>}
      {resume?.fonte && !sheets.length && <p className="cp-muted">Fonte numérica anterior preservada. Você pode substituir as planilhas antes de continuar.</p>}
      {!choice && file && <p>Adicione as planilhas ou escolha continuar sem elas.</p>}
    </section>
    {prepared && intent==='recommendation' && onRecommendation && file && !savingSheets && <Suspense fallback={<p role="status">Preparando recomendação…</p>}><Recommendation key={prepared.ir.sha1} onBusyChange={setRecommendationBusy} preparedIr={prepared.ir} ensureStudy={()=>onRecommendation({file,...prepared,sheets,fonte:null,city,uf,outras:[],budgetUsd:0,accountPreparation})}/></Suspense>}
    {prepared && intent==='review' && <section className="cp-panel"><h2>Conferir antes de iniciar</h2><div className="cs-fields"><div><Label htmlFor="prepare-city">Cidade do estudo</Label><Input id="prepare-city" value={city} disabled={starting || recommendationBusy} onChange={e => setCity(e.target.value)} /></div><div><Label htmlFor="prepare-uf">Estado</Label><Select value={uf} disabled={starting || recommendationBusy} onValueChange={setUf}><SelectTrigger id="prepare-uf"><SelectValue placeholder="UF" /></SelectTrigger><SelectContent>{UFS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select></div></div>
      <Label htmlFor="prepare-others">Outras cidades que fazem parte do estudo (opcional)</Label><Input id="prepare-others" value={outras} disabled={starting || recommendationBusy} onChange={e => setOutras(e.target.value)} placeholder="Separe por vírgulas" />
      <p className="cp-muted">{prepared.ir.n_slides} slides · {profile?.tabelasNativas} tabelas nativas · {(profile?.tabelasImagem ?? 0) + (profile?.fichas ?? 0)} tabelas em imagem. Estes conteúdos ainda não foram avaliados.</p>
      <p>Estimativa da avaliação: <strong>{formatBRL(prepared.estimate.costUsd)}</strong> · inclui ata, texto e imagens ainda sem leitura salva.</p>
      <Label htmlFor="prepare-budget">Limite autorizado em dólares (US$)</Label><Input id="prepare-budget" type="number" min="0.01" max="100" step="0.01" value={budgetUsd} disabled={starting || recommendationBusy} onChange={e => setBudgetUsd(Number(e.target.value))} />
      <p className="cp-muted">Limite de {formatBRL(budgetUsd)}, incluindo margem para releituras. O servidor interrompe antes de exceder esse valor. A confirmação autoriza somente este lote; retomar exige conferir o limite novamente.</p>
      <Button disabled={!ready} onClick={() => void start()}>{starting ? 'Iniciando avaliação…' : 'Iniciar avaliação'}</Button>
      {(!city.trim() || !uf) && <p>Confirme a cidade e o estado para iniciar.</p>}
    </section>}
    {error && <p role="alert">{error}</p>}{storage && <p role="status" className="cp-muted">{storage}</p>}
  </main>;
}
