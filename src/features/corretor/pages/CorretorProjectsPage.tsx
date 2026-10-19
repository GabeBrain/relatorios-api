import { Fragment, lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Presentation, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { analysisPending, listStudies, type StudyV3 } from '../lib/v3/db';
import { savePptx, loadPptx } from '../lib/v3/pptx-store';
import { loadProfiles, loadVersions, loadOriginals, profileFor, saveProfile, uploadOriginal, downloadOriginal, type ProjectProfile, type VersionRecord, type OriginalAsset } from '../lib/projects';
import '../styles/projects.css';
import StudyLayout from '../components/StudyLayout';
import StudyMaterials from '../components/StudyMaterials';
import { useGeobrainAccess } from '../lib/geobrain-access-context';
import { useGeobrainSession } from '@/features/shared/geobrain-session/context';
import { listRecommendationSummaries, type RecommendationSummary } from '../lib/recommendations';
import { personalStudyIds } from '../lib/materials';
import { portfolioHref, studyHref, studySection } from '../lib/study-navigation';
const RecommendationPage = lazy(() => import('../components/StudyRecommendation'));
const ReviewPage = lazy(() => import('./CorretorV3Page'));

function stateOf(study: StudyV3) { return analysisPending(study) ? 'Análise pendente' : study.status === 'pronto' ? 'Entrega registrada' : 'Em revisão'; }
function FriendlyName({ study, profile }: { study: StudyV3; profile?: ProjectProfile }) { return <>{profile?.display_name ?? profileFor(study).display_name}</>; }

export default function CorretorProjectsPage() {
  const ensureAccess = useGeobrainAccess();
  const session = useGeobrainSession();
  const [suggestions, setSuggestions] = useState<RecommendationSummary[]>([]);
  const [suggestionError, setSuggestionError] = useState('');
  const { studyId, section } = useParams();
  const [params, setParams] = useSearchParams();
  const [studies, setStudies] = useState<StudyV3[]>([]), [profiles, setProfiles] = useState<ProjectProfile[]>([]);
  const [personal,setPersonal]=useState<{mine:string[];shared:string[]}|null>(null),[personalError,setPersonalError]=useState('');
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [availability, setAvailability] = useState('');
  const query = params.get('q') ?? '', filter = ['active', 'all', 'archive'].includes(params.get('filter') ?? '') ? params.get('filter')! : 'all';
  const grouping = ['city','month'].includes(params.get('group') ?? '') ? params.get('group')! : 'recent';
  const groupKey = params.get('groupKey') ?? '', received = params.get('received') ?? '';
  const scope=['mine','shared'].includes(params.get('scope')??'')?params.get('scope')!:'all';
  function parameter(key: string, value: string) { setParams(p => { p.set(key, value); if (key !== 'page') p.delete('page'); return p; }, { replace: key === 'q' }); }
  const setQuery = (value: string) => parameter('q', value), setFilter = (value: string) => parameter('filter', value);
  const [editing, setEditing] = useState<ProjectProfile | null>(null), [saving, setSaving] = useState(false);
  const [versions, setVersions] = useState<VersionRecord[]>([]), [assets, setAssets] = useState<OriginalAsset[]>([]);
  const [versionsLoading,setVersionsLoading]=useState(false);
  const [materialError, setMaterialError] = useState('');
  const versionId = params.get('version') ?? versions[0]?.id ?? '';
  const setVersionId = (value: string) => parameter('version', value);
  const [progress, setProgress] = useState<number | null>(null), [localAvailable, setLocalAvailable] = useState(false);
  const tab = studySection(section);
  const context = studyId ? params.get('carteira') ?? '' : params.toString();
  const [identityRevision, setIdentityRevision] = useState(0);
  const uploadRef = useRef<HTMLInputElement>(null), busyRef = useRef(false);
  const dialogInvoker = useRef<HTMLElement | null>(null);
  function editProfile(value: ProjectProfile) { dialogInvoker.current = document.activeElement as HTMLElement | null; setEditing(value); }
  const study = studies.find(s => s.id === studyId), profile = profiles.find(p => p.study_id === studyId);
  const profileId = profile?.id;
  const version = versions.find(v => v.id === versionId), asset = assets.find(a => a.version_id === versionId);
  useEffect(() => { const refresh = () => setIdentityRevision(n => n + 1); window.addEventListener('corretor-library-refresh',refresh); return () => window.removeEventListener('corretor-library-refresh',refresh); }, []);
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(() => { setProfiles([]); setPersonal(null); setIdentityRevision(n => n + 1); });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => { let active = true; (async () => {
    setError(''); setLoading(true);
    const [current, registered,identity] = await Promise.allSettled([listStudies(true), loadProfiles(),personalStudyIds()]);
    if (!active) return;
    if (current.status === 'fulfilled') setStudies(current.value);
    else setError('Não foi possível carregar os estudos. Tente novamente.');
    if (registered.status === 'fulfilled') { setProfiles(registered.value); setAvailability(''); }
    else setAvailability(registered.reason instanceof Error ? registered.reason.message : 'Cadastro indisponível.');
    if(identity.status==='fulfilled'){setPersonal(identity.value);setPersonalError('');}else {setPersonal(null);setPersonalError('Não foi possível atualizar seus estudos. Tente novamente.');}
    setLoading(false);
  })(); return () => { active = false; }; }, [identityRevision, studyId]);
  useEffect(() => { let active = true; setVersions([]); setAssets([]); setMaterialError(''); setLocalAvailable(false);
    if (!studyId) return;
    setVersionsLoading(true);
    loadVersions(studyId).then(v => { if (active) setVersions(v); }).catch(() => { if (active) setMaterialError('As versões não puderam ser carregadas.'); }).finally(()=>{if(active)setVersionsLoading(false);});
    if (profileId) loadOriginals(profileId).then(a => { if (active) setAssets(a); }).catch(e => { if (active) setMaterialError(e.message); });
    return () => { active = false; };
  }, [studyId, profileId]);
  useEffect(() => { let active = true; setLocalAvailable(false); if (version) loadPptx(version.sha1).then(v => { if (active) setLocalAvailable(Boolean(v)); }); return () => { active = false; }; }, [version]);
  const scoped = useMemo(() => studies.filter(s => filter === 'archive' ? s.generation !== 'v3' : s.generation === 'v3' && (filter !== 'active' || s.status !== 'pronto'))
    .filter(s=>scope==='all'||Boolean(personal?.[scope==='mine'?'mine':'shared'].includes(s.id)))
    .filter(s => { const p = profiles.find(x => x.study_id === s.id); return [s.nome, p?.display_name, p?.client_name, s.cidade, p?.analyst].join(' ').toLocaleLowerCase().includes(query.toLocaleLowerCase()); }), [studies, profiles, filter, query,scope,personal]);
  function groupOf(s: StudyV3) { return grouping === 'city' ? [s.cidade?.trim() || 'Cidade não informada',s.uf].filter(Boolean).join(' · ') : grouping === 'month' ? Number.isNaN(Date.parse(s.createdAt)) ? 'Data não informada' : new Date(s.createdAt).toLocaleDateString('pt-BR',{month:'long',year:'numeric'}) : ''; }
  const groups = [...new Set(scoped.map(groupOf))].filter(Boolean);
  const visible = scoped.filter(s => (!groupKey || groupOf(s) === groupKey) && (!received || new Date(s.createdAt).toLocaleDateString('sv-SE') === received)).sort((a,b) => grouping === 'city' ? groupOf(a).localeCompare(groupOf(b),'pt-BR') || Date.parse(b.createdAt)-Date.parse(a.createdAt) : Date.parse(b.createdAt)-Date.parse(a.createdAt));
  function organize(value: string) { setParams(p=>{p.set('group',value);p.delete('groupKey');p.delete('page');return p;}); }
  const pageCount = Math.max(1, Math.ceil(visible.length / 20));
  const page = Math.min(pageCount, Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1));
  const pageItems = visible.slice((page - 1) * 20, page * 20);
  const visibleIds = pageItems.map(s => s.id).join(',');
  useEffect(() => {
    let active = true;
    setSuggestions([]); setSuggestionError('');
    listRecommendationSummaries(visibleIds ? visibleIds.split(',') : []).then(rows => { if (active) setSuggestions(rows); }).catch(e => { if (active) setSuggestionError(e.message); });
    return () => { active = false; };
  }, [visibleIds]);
  function destination(s: StudyV3) { return s.analise ? 'revisao' as const : suggestions.some(r => r.study_id === s.id && r.version_n === s.lastVersion) ? 'recomendacao' as const : 'revisao' as const; }
  const hasScopedStudies = studies.some(s => s.generation === 'v3' && (scope === 'all' || personal?.[scope === 'mine' ? 'mine' : 'shared'].includes(s.id)));
  function clearFilters() { setParams(p => { p.delete('q'); p.set('filter', 'all'); p.delete('page'); p.delete('groupKey'); p.delete('received'); return p; }); }

  async function save() {
    if (!await ensureAccess('guardar o cadastro deste estudo')) return;
    if (!editing || busyRef.current) return; busyRef.current = true; setSaving(true);
    try { const p = await saveProfile(editing); setProfiles(rows => [...rows.filter(r => r.id !== p.id && (!p.study_id || r.study_id !== p.study_id)), p]); setEditing(null); setAvailability(''); setIdentityRevision(n => n + 1); toast.success('Cadastro guardado e associado à sua conta.'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Falha ao salvar.'); }
    finally { busyRef.current = false; setSaving(false); }
  }
  async function sendOriginal(file?: File) {
    if (!file || !profile || !version || busyRef.current) return;
    if (!/\.pptx$/i.test(file.name)) { toast.error('Selecione uma apresentação PPTX.'); return; }
    busyRef.current = true; setProgress(0);
    try { await uploadOriginal(profile.id, version, file, setProgress); setAssets(await loadOriginals(profile.id)); toast.success('Original guardado e vinculado à versão.'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Falha no envio.'); }
    finally { busyRef.current = false; setProgress(null); }
  }
  async function recover() {
    if (!asset || busyRef.current) return; busyRef.current = true; setProgress(0);
    try { const deck = await downloadOriginal(asset); if (!await savePptx(asset.sha1, deck.name, deck.bytes)) throw new Error('O navegador não conseguiu guardar o arquivo recuperado. Confira o espaço disponível.'); setLocalAvailable(true); toast.success('Original recuperado e integridade conferida.'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Falha na recuperação.'); }
    finally { busyRef.current = false; setProgress(null); }
  }
  const input = (key: keyof ProjectProfile, label: string, type = 'text') => <div><Label htmlFor={key}>{label}</Label><Input id={key} type={type} value={String(editing?.[key] ?? '')} onChange={e => setEditing(p => p ? { ...p, [key]: e.target.value || (key === 'due_date' ? null : '') } : p)} /></div>;
  return <div className="corretor-projects">
    {!studyId && <><section className="cp-home-preparation" aria-label="Preparar estudo"><Suspense fallback={<p role="status">Abrindo preparação…</p>}><ReviewPage /></Suspense></section><h2 className="cp-library-title" id="estudos-salvos">Estudos salvos <span className="cp-count">{loading ? '' : visible.length}</span></h2></>}

    {loading ? <p role="status">Carregando estudos…</p> : error ? <p role="alert">{error} <Button onClick={() => location.reload()}>Tentar novamente</Button></p> : studyId && !study ? <p>Estudo não encontrado. <Link to={portfolioHref(context)}>Voltar aos estudos</Link></p> : study ? <StudyLayout id={study.id} name={profile?.display_name || profileFor(study).display_name} location={[profile?.city || study.cidade, profile?.uf || study.uf].filter(Boolean).join(' · ')} section={tab} context={context} version={params.get('version') ?? undefined} actions={<Button variant="outline" onClick={() => editProfile(profile ?? profileFor(study))}>Dados do estudo</Button>}>
      {(tab === 'revisao' || tab === 'resumo') && <section className="cp-review-legacy" aria-label="Revisão do estudo"><Suspense fallback={<p role="status">Abrindo revisão…</p>}>{params.has('version') && versionsLoading ? <p role="status">Carregando versão…</p> : params.has('version') && !version ? <p>Versão não encontrada. Escolha um registro em Arquivos e histórico.</p> : version && version.n !== study.lastVersion ? <p>Este registro não possui uma cópia histórica dos apontamentos. Selecione a versão atual para revisar.</p> : <ReviewPage key={study.id} />}</Suspense></section>}
      {tab === 'recomendacao' && <>{versionsLoading?<p role="status">Carregando versões…</p>:materialError?<p role="alert">{materialError}</p>:!version?<p>Versão não encontrada. Abra o histórico para escolher uma versão registrada.</p>:<><Label htmlFor="recommendation-version">Versão do estudo</Label><Select value={versionId} onValueChange={setVersionId}><SelectTrigger id="recommendation-version"><SelectValue/></SelectTrigger><SelectContent>{versions.map(v=><SelectItem key={v.id} value={v.id}>Versão {v.n} · {v.n_slides} slides</SelectItem>)}</SelectContent></Select><Suspense fallback={<p role="status">Abrindo recomendações…</p>}><RecommendationPage key={version.id} study={study} version={version} context={context}/></Suspense></>}</>}
      {(tab === 'materiais' || tab === 'historico') && <><StudyMaterials study={study} version={version} onSourcesChanged={()=>setStudies(rows=>rows.map(s=>s.id===study.id?{...s,temFonte:true}:s))}/><section className="cp-panel"><h2>Originais por versão</h2><p>Vínculos anteriores do armazenamento. Escolha a versão antes de vincular ou recuperar o PPTX.</p>{materialError && <p role="alert">{materialError}</p>}
          <Label htmlFor="version">Versão do arquivo</Label><Select value={versionId} onValueChange={setVersionId} disabled={progress !== null}><SelectTrigger id="version"><SelectValue placeholder="Selecione a versão" /></SelectTrigger><SelectContent>{versions.map(v => <SelectItem key={v.id} value={v.id}>Versão {v.n} · {v.n_slides} slides · {new Date(v.created_at).toLocaleDateString('pt-BR')}</SelectItem>)}</SelectContent></Select>
          <p>{asset ? 'Original guardado no projeto.' : 'Original remoto não confirmado para esta versão.'}</p><p>{localAvailable ? 'Original disponível neste navegador.' : 'Original indisponível neste navegador.'}</p>
          {version && <p className="cp-muted">{version.arquivo || 'Nome não registrado'}</p>}
          <input ref={uploadRef} type="file" accept=".pptx" hidden onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; void sendOriginal(file); }} />
          <div className="cp-actions"><Button disabled={!profile || !version || progress !== null || Boolean(asset)} onClick={() => uploadRef.current?.click()}>Guardar original desta versão</Button>{asset && <Button disabled={progress !== null} onClick={() => void recover()}>Recuperar neste navegador</Button>}</div>
          {!profile && <p className="cp-muted">O original remoto ainda depende de um vínculo de projeto autenticado. A revisão continua disponível com os materiais já existentes.</p>}
          {progress !== null && <div role="status"><p>Transferindo e confirmando arquivo… {progress}%</p><Progress value={progress} /></div>}
        </section></>}
      {(tab === 'historico' || tab === 'materiais') && <section className="cp-panel"><h2>Versões registradas</h2><p>Este histórico contém os registros disponíveis. Reanálises antigas podem ter usado os mesmos bytes; não são necessariamente correções do analista.</p>{materialError && <p role="alert">{materialError}</p>}{versions.map(v => <div className="cp-version" key={v.id}><strong>Registro {v.n} · {v.n_slides} slides</strong><p>{v.arquivo || 'Arquivo sem nome'} · {new Date(v.created_at).toLocaleDateString('pt-BR')}</p><p className="cp-muted">{assets.some(a => a.version_id === v.id) ? 'Original remoto vinculado' : 'Original remoto não confirmado'}</p></div>)}<p className="cp-muted">Comparação de execuções e linha do tempo de decisões estão previstas para a próxima fatia.</p></section>}
    </StudyLayout> : <>
      <div className="cp-actions cp-library-tabs" role="group" aria-label="Biblioteca de estudos"><Button variant="ghost" aria-pressed={scope==='all'} onClick={()=>parameter('scope','all')}>Todos os estudos</Button>{personal?<><Button variant="ghost" aria-pressed={scope==='mine'} onClick={()=>parameter('scope','mine')}>Meus estudos</Button><Button variant="ghost" aria-pressed={scope==='shared'} onClick={()=>parameter('scope','shared')}>Compartilhados comigo</Button></>:<Button variant="ghost" onClick={()=>void ensureAccess('encontrar seus estudos associados à conta').then(ok=>{if(ok)parameter('scope','mine');})}>Meus estudos</Button>}</div>{personalError&&<p role="alert" className="cp-muted">{personalError} <Button variant="ghost" onClick={()=>setIdentityRevision(n=>n+1)}>Tentar novamente</Button></p>}
      {session.action && <section className="cp-login-pending" role="status" aria-live="polite">
        <div><strong>Falta entrar na sua conta Geobrain</strong><p>Preencha seu e-mail e senha no menu à esquerda e clique em Entrar. Depois do login, continuamos de onde você parou.</p></div>
        <Button variant="outline" onClick={() => { const input = document.getElementById('auth-email'); input?.scrollIntoView({block:'center',behavior:'smooth'}); input?.focus(); }}>Ir ao login no menu</Button>
      </section>}
      {suggestionError && <p className="cp-muted" role="status">{suggestionError}</p>}
      <div className="cp-organization" role="group" aria-label="Organizar estudos">{([['recent','Recentes'],['city','Por cidade'],['month','Por mês']] as const).map(([key,label])=><Button key={key} variant="ghost" aria-pressed={grouping===key} onClick={()=>organize(key)}>{label}</Button>)}<div className="cp-date-picker"><Label htmlFor="study-received">Recebidos em</Label><Input id="study-received" type="date" value={received} onChange={e=>parameter('received',e.target.value)}/>{received&&<Button variant="ghost" onClick={()=>parameter('received','')}>Todas as datas</Button>}</div></div>
      {grouping!=='recent' && <div className="cp-group-tags" role="group" aria-label={grouping==='city'?'Cidades dos estudos':'Meses dos estudos'}><Button variant="outline" aria-pressed={!groupKey} onClick={()=>parameter('groupKey','')}>Todos <span>{scoped.length}</span></Button>{groups.map(key=><Button key={key} variant="outline" aria-pressed={groupKey===key} onClick={()=>parameter('groupKey',key)}>{key}<span>{scoped.filter(s=>groupOf(s)===key).length}</span></Button>)}</div>}
      <div className="cp-toolbar"><div className="cp-search"><Label className="sr-only" htmlFor="project-search">Buscar estudos</Label><Search aria-hidden="true" size={20}/><Input id="project-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar estudo, cidade ou cliente" /></div><Select value={filter} onValueChange={setFilter}><SelectTrigger aria-label="Situação da carteira"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Em andamento</SelectItem><SelectItem value="all">Todos os atuais</SelectItem><SelectItem value="archive">Arquivo · análises anteriores</SelectItem></SelectContent></Select></div>
      <div className="cp-list"><div className="cp-list-heading" aria-hidden="true"><span>Estudo</span><span>Situação</span><span>Pendências</span><span>Recebido</span></div>{visible.length ? pageItems.map((s,index) => { const p = profiles.find(x => x.study_id === s.id); return <Fragment key={s.id}>{grouping!=='recent' && (index===0 || groupOf(pageItems[index-1])!==groupOf(s)) && <h3 className="cp-group-heading">{groupOf(s)} <span>{visible.filter(item=>groupOf(item)===groupOf(s)).length} estudos</span></h3>}<article className="cp-row"><div className="cp-study-identity"><Presentation size={24} aria-hidden="true"/><div><h2><Link aria-label={`Abrir estudo ${p?.display_name || profileFor(s).display_name}`} to={studyHref(s.id, destination(s), context)}><FriendlyName study={s} profile={p} /></Link></h2><p>{[s.cidade, s.uf, p?.client_name].filter(Boolean).join(' · ')}</p></div></div><div className="cp-state">{destination(s)==='recomendacao' ? 'Sugestão de análise' : stateOf(s)}</div><div className="cp-pending">{destination(s)==='recomendacao' ? '—' : analysisPending(s) ? 'Avaliação não concluída' : `${s.pendentes ?? 0} pendentes`}</div><time dateTime={s.createdAt}>{new Date(s.createdAt).toLocaleDateString('pt-BR')}</time></article></Fragment>; }) : <section className="cp-panel cp-empty"><Presentation size={28} aria-hidden="true"/><h2>{hasScopedStudies || filter==='archive' ? 'Nenhum estudo corresponde aos filtros' : scope==='mine' ? 'Nenhum estudo associado à sua conta' : scope==='shared' ? 'Nenhum estudo compartilhado com você' : 'Sua lista de estudos começa aqui'}</h2>{hasScopedStudies || filter==='archive' ? <Button variant="outline" onClick={clearFilters}>Limpar filtros e mostrar estudos</Button> : scope==='mine' ? <><p className="cp-muted">Envios feitos com login e estudos cujo cadastro você salvou aparecem aqui. Estudos enviados sem conta continuam em Todos os estudos.</p><Button variant="outline" onClick={()=>parameter('scope','all')}>Ver todos os estudos</Button></> : <p className="cp-muted">{scope==='shared' ? 'Os estudos compartilhados diretamente com esta conta aparecerão aqui.' : 'Use Novo estudo para incluir uma apresentação.'}</p>}</section>}</div>
      <div className="cp-actions"><span>{visible.length} estudos · página {page} de {pageCount}</span><Button variant="outline" disabled={page === 1} onClick={() => parameter('page', String(page - 1))}>Anterior</Button><Button variant="outline" disabled={page === pageCount} onClick={() => parameter('page', String(page + 1))}>Próxima</Button></div>
      {profiles.filter(p => !p.study_id).map(p => <section className="cp-panel" key={p.id}><h2>{p.display_name}</h2>{p.client_name && <p>{p.client_name}</p>}<Button variant="outline" onClick={() => editProfile(p)}>Editar cadastro</Button><p className="cp-muted">Cadastro sem estudo vinculado.</p></section>)}
      <p className="cp-muted"><Link to="/corretor/verificacoes">O que o corretor verifica</Link> · <Link to="/corretor/calibracao">Métricas de IA e calibração</Link> · <Link to="/corretor/analise">Análises anteriores</Link></p>
    </>}
    <Dialog open={Boolean(editing)} onOpenChange={open => { if (!open && !saving) setEditing(null); }}><DialogContent className="cp-dialog" onCloseAutoFocus={e => { e.preventDefault(); dialogInvoker.current?.focus(); }}><DialogHeader><DialogTitle>Cadastro do projeto</DialogTitle></DialogHeader><form onSubmit={e => { e.preventDefault(); void save(); }}><p>Os campos complementares podem ser preenchidos depois. O cadastro só fica guardado após a confirmação.</p>
      {!editing?.study_id && <div><Label htmlFor="linked-study">Estudo vinculado</Label><Select value={editing?.study_id ?? 'none'} onValueChange={v => setEditing(p => p ? { ...p, study_id: v === 'none' ? null : v } : p)}><SelectTrigger id="linked-study"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Vincular depois</SelectItem>{studies.filter(s => !profiles.some(p => p.study_id === s.id)).map(s => <SelectItem value={s.id} key={s.id}>{profileFor(s).display_name}</SelectItem>)}</SelectContent></Select></div>}
      <div className="cp-form">{input('display_name', 'Nome do projeto')}{input('client_name', 'Cliente')}{input('study_type', 'Tipo de estudo (opcional)')}{input('city', 'Cidade')}{input('uf', 'UF')}{input('analyst', 'Analista responsável')}{input('reviewer', 'Revisor')}{input('reference_period', 'Referência da base')}{input('due_date', 'Prazo', 'date')}</div><div className="cp-actions"><Button type="submit" disabled={saving || !editing?.display_name.trim()}>{saving ? 'Salvando…' : 'Salvar cadastro'}</Button><Button type="button" variant="outline" disabled={saving} onClick={() => setEditing(null)}>Cancelar</Button></div></form></DialogContent></Dialog>
  </div>;
}
