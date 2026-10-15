import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { analysisPending, listStudies, type StudyV3 } from '../lib/v3/db';
import { savePptx, loadPptx } from '../lib/v3/pptx-store';
import { loadProfiles, loadVersions, loadOriginals, profileFor, saveProfile, uploadOriginal, downloadOriginal, type ProjectProfile, type VersionRecord, type OriginalAsset } from '../lib/projects';
import '../styles/projects.css';

function stateOf(study: StudyV3) { return analysisPending(study) ? 'Análise pendente' : study.status === 'pronto' ? 'Revisar entrega' : 'Em revisão'; }
function FriendlyName({ study, profile }: { study: StudyV3; profile?: ProjectProfile }) { return <>{profile?.display_name ?? profileFor(study).display_name}</>; }

export default function CorretorProjectsPage() {
  const { studyId } = useParams();
  const [params, setParams] = useSearchParams();
  const [studies, setStudies] = useState<StudyV3[]>([]), [profiles, setProfiles] = useState<ProjectProfile[]>([]);
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [availability, setAvailability] = useState('');
  const query = params.get('q') ?? '', filter = ['active', 'all', 'archive'].includes(params.get('filter') ?? '') ? params.get('filter')! : 'active';
  function parameter(key: string, value: string) { setParams(p => { p.set(key, value); if (key !== 'page') p.delete('page'); return p; }, { replace: key === 'q' }); }
  const setQuery = (value: string) => parameter('q', value), setFilter = (value: string) => parameter('filter', value);
  const [editing, setEditing] = useState<ProjectProfile | null>(null), [saving, setSaving] = useState(false);
  const [versions, setVersions] = useState<VersionRecord[]>([]), [assets, setAssets] = useState<OriginalAsset[]>([]);
  const [materialError, setMaterialError] = useState('');
  const versionId = params.get('version') ?? versions[0]?.id ?? '';
  const setVersionId = (value: string) => parameter('version', value);
  const [progress, setProgress] = useState<number | null>(null), [localAvailable, setLocalAvailable] = useState(false);
  const tab = ['overview', 'materials', 'history'].includes(params.get('tab') ?? '') ? params.get('tab')! : 'overview';
  const setTab = (value: string) => parameter('tab', value);
  const [identityRevision, setIdentityRevision] = useState(0);
  const uploadRef = useRef<HTMLInputElement>(null), busyRef = useRef(false);
  const dialogInvoker = useRef<HTMLElement | null>(null);
  function editProfile(value: ProjectProfile) { dialogInvoker.current = document.activeElement as HTMLElement | null; setEditing(value); }
  const study = studies.find(s => s.id === studyId), profile = profiles.find(p => p.study_id === studyId);
  const profileId = profile?.id;
  const version = versions.find(v => v.id === versionId), asset = assets.find(a => a.version_id === versionId);
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(() => { setProfiles([]); setIdentityRevision(n => n + 1); });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => { let active = true; (async () => {
    setLoading(true); setError('');
    const [current, registered] = await Promise.allSettled([listStudies(true), loadProfiles()]);
    if (!active) return;
    if (current.status === 'fulfilled') setStudies(current.value);
    else setError('Não foi possível carregar os estudos. Tente novamente.');
    if (registered.status === 'fulfilled') { setProfiles(registered.value); setAvailability(registered.value.length ? '' : 'Cadastros visíveis dependem do seu acesso ao projeto.'); }
    else setAvailability(registered.reason instanceof Error ? registered.reason.message : 'Cadastro indisponível.');
    setLoading(false);
  })(); return () => { active = false; }; }, [identityRevision]);
  useEffect(() => { let active = true; setVersions([]); setAssets([]); setMaterialError(''); setLocalAvailable(false);
    if (!studyId) return;
    loadVersions(studyId).then(v => { if (active) setVersions(v); }).catch(() => { if (active) setMaterialError('As versões não puderam ser carregadas.'); });
    if (profileId) loadOriginals(profileId).then(a => { if (active) setAssets(a); }).catch(e => { if (active) setMaterialError(e.message); });
    return () => { active = false; };
  }, [studyId, profileId]);
  useEffect(() => { let active = true; setLocalAvailable(false); if (version) loadPptx(version.sha1).then(v => { if (active) setLocalAvailable(Boolean(v)); }); return () => { active = false; }; }, [version]);
  const visible = useMemo(() => studies.filter(s => filter === 'archive' ? s.generation !== 'v3' : s.generation === 'v3' && (filter !== 'active' || s.status !== 'pronto'))
    .filter(s => { const p = profiles.find(x => x.study_id === s.id); return [s.nome, p?.display_name, p?.client_name, s.cidade, p?.analyst].join(' ').toLocaleLowerCase().includes(query.toLocaleLowerCase()); }), [studies, profiles, filter, query]);
  const pageCount = Math.max(1, Math.ceil(visible.length / 20));
  const page = Math.min(pageCount, Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1));
  const pageItems = visible.slice((page - 1) * 20, page * 20);

  async function save() {
    if (!editing || busyRef.current) return; busyRef.current = true; setSaving(true);
    try { const p = await saveProfile(editing); setProfiles(rows => [...rows.filter(r => r.id !== p.id && (!p.study_id || r.study_id !== p.study_id)), p]); setEditing(null); setAvailability(''); toast.success('Cadastro guardado.'); }
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
    <header className="cp-heading"><div><p className="cp-eyebrow">CORRETOR DE ESTUDOS</p><h1>{study ? <FriendlyName study={study} profile={profile} /> : 'Projetos'}</h1><p>{study ? `${profile?.city || study.cidade || 'Cidade a confirmar'} · ${profile?.uf || study.uf || 'UF a confirmar'}` : 'Contexto, materiais e decisões no mesmo lugar.'}</p></div>
      <div className="cp-actions">{study ? <><Button variant="outline" asChild><Link to={`/corretor/projetos?${params.get('carteira') ?? ''}`}>Voltar aos projetos</Link></Button><Button onClick={() => editProfile(profile ?? profileFor(study))}>Completar cadastro</Button></> : <><Button variant="outline" onClick={() => editProfile({ ...profileFor({ id: '', nome: '', cidade: null, uf: null } as StudyV3), study_id: null })}>Cadastrar projeto</Button><Button asChild><Link to="/corretor/analise">Enviar novo estudo</Link></Button></>}</div>
    </header>
    {availability && <p className="cp-notice" role="status">{availability}</p>}
    {loading ? <p role="status">Carregando projetos…</p> : error ? <p role="alert">{error} <Button onClick={() => location.reload()}>Tentar novamente</Button></p> : studyId && !study ? <p>Estudo não encontrado. <Link to="/corretor/projetos">Voltar à carteira</Link></p> : study ? <>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="cp-tabs"><TabsTrigger value="overview">Visão geral</TabsTrigger><TabsTrigger value="materials">Materiais</TabsTrigger><TabsTrigger value="history">Histórico</TabsTrigger></TabsList>
        <TabsContent value="overview"><div className="cp-grid"><section className="cp-panel"><h2>Próximo passo</h2><p>{stateOf(study)} · {study.pendentes ?? 0} registros pendentes</p><p>As decisões e os resultados da revisão continuam no estudo. Alertas encerrados não comprovam correção do arquivo.</p><Button asChild><Link to={`/corretor/analise?study=${study.id}`}>Abrir revisão</Link></Button><dl className="cp-context"><div><dt>Cliente</dt><dd>{profile?.client_name || 'A completar'}</dd></div><div><dt>Analista</dt><dd>{profile?.analyst || 'A definir'}</dd></div><div><dt>Revisor</dt><dd>{profile?.reviewer || 'A definir'}</dd></div><div><dt>Referência da base</dt><dd>{profile?.reference_period || 'A confirmar'}</dd></div></dl></section><section className="cp-panel"><h2>Apresentação</h2><p>{study.nSlides} slides · versão registrada {study.lastVersion}</p><p>{study.temFonte ? 'Fonte derivada vinculada. Planilhas originais ainda precisam de inventário.' : 'Fonte numérica não vinculada.'}</p><p className="cp-muted">Nome recebido: {study.nome}</p><Button variant="outline" onClick={() => setTab('materials')}>Conferir os materiais</Button></section></div></TabsContent>
        <TabsContent value="materials"><section className="cp-panel"><h2>Originais por versão</h2><p>Escolha a versão antes de vincular ou recuperar o PPTX. O arquivo é conferido pelo conteúdo.</p>{materialError && <p role="alert">{materialError}</p>}
          <Label htmlFor="version">Versão do arquivo</Label><Select value={versionId} onValueChange={setVersionId} disabled={progress !== null}><SelectTrigger id="version"><SelectValue placeholder="Selecione a versão" /></SelectTrigger><SelectContent>{versions.map(v => <SelectItem key={v.id} value={v.id}>Versão {v.n} · {v.n_slides} slides · {new Date(v.created_at).toLocaleDateString('pt-BR')}</SelectItem>)}</SelectContent></Select>
          <p>{asset ? 'Original guardado no projeto.' : 'Original remoto não confirmado para esta versão.'}</p><p>{localAvailable ? 'Original disponível neste navegador.' : 'Original indisponível neste navegador.'}</p>
          {version && <p className="cp-muted">{version.arquivo || 'Nome não registrado'}</p>}
          <input ref={uploadRef} type="file" accept=".pptx" hidden onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; void sendOriginal(file); }} />
          <div className="cp-actions"><Button disabled={!profile || !version || progress !== null || Boolean(asset)} onClick={() => uploadRef.current?.click()}>Guardar original desta versão</Button>{asset && <Button disabled={progress !== null} onClick={() => void recover()}>Recuperar neste navegador</Button>}</div>
          {!profile && <p>Complete e salve o cadastro para habilitar o vínculo remoto. O arquivo local permanece acessível ao fluxo atual de revisão.</p>}
          {progress !== null && <div role="status"><p>Transferindo e confirmando arquivo… {progress}%</p><Progress value={progress} /></div>}
        </section></TabsContent>
        <TabsContent value="history"><section className="cp-panel"><h2>Versões registradas</h2><p>Este histórico contém os registros disponíveis. Reanálises antigas podem ter usado os mesmos bytes; não são necessariamente correções do analista.</p>{versions.map(v => <div className="cp-version" key={v.id}><strong>Registro {v.n} · {v.n_slides} slides</strong><p>{v.arquivo || 'Arquivo sem nome'} · {new Date(v.created_at).toLocaleDateString('pt-BR')}</p><p className="cp-muted">{assets.some(a => a.version_id === v.id) ? 'Original remoto vinculado' : 'Original remoto não confirmado'}</p></div>)}<p className="cp-muted">Comparação de execuções e linha do tempo de decisões estão previstas para a próxima fatia.</p></section></TabsContent>
      </Tabs>
    </> : <>
      <div className="cp-toolbar"><Label htmlFor="project-search">Buscar projetos</Label><Input id="project-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Nome, cliente, cidade ou responsável" /><Select value={filter} onValueChange={setFilter}><SelectTrigger aria-label="Situação da carteira"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Em andamento</SelectItem><SelectItem value="all">Todos os atuais</SelectItem><SelectItem value="archive">Arquivo · análises anteriores</SelectItem></SelectContent></Select></div>
      <div className="cp-list">{visible.length ? pageItems.map(s => { const p = profiles.find(x => x.study_id === s.id); return <article className="cp-row" key={s.id}><div><h2><FriendlyName study={s} profile={p} /></h2><p>{p?.client_name || 'Cliente a completar'} · {s.cidade || 'Cidade a confirmar'}{s.uf ? ` · ${s.uf}` : ''}</p></div><div><strong>{stateOf(s)}</strong><p>{s.pendentes ?? 0} registros pendentes</p></div><Button variant="outline" asChild><Link to={`/corretor/projetos/${s.id}?carteira=${encodeURIComponent(params.toString())}`}>Abrir projeto</Link></Button></article>; }) : <p className="cp-panel">Nenhum estudo corresponde aos filtros.</p>}</div>
      <div className="cp-actions"><span>{visible.length} estudos · página {page} de {pageCount}</span><Button variant="outline" disabled={page === 1} onClick={() => parameter('page', String(page - 1))}>Anterior</Button><Button variant="outline" disabled={page === pageCount} onClick={() => parameter('page', String(page + 1))}>Próxima</Button></div>
      {profiles.filter(p => !p.study_id).map(p => <section className="cp-panel" key={p.id}><h2>{p.display_name}</h2><p>Cadastro sem estudo vinculado · {p.client_name || 'Cliente a completar'}</p><Button variant="outline" onClick={() => editProfile(p)}>Editar cadastro</Button><p className="cp-muted">O vínculo de um novo estudo a este cadastro será habilitado na próxima fatia.</p></section>)}
      <p className="cp-muted"><Link to="/corretor/analise">Abrir fluxo de análise e histórico V1</Link> · O arquivo mantém as gerações anteriores em consulta.</p>
    </>}
    <Dialog open={Boolean(editing)} onOpenChange={open => { if (!open && !saving) setEditing(null); }}><DialogContent className="cp-dialog" onCloseAutoFocus={e => { e.preventDefault(); dialogInvoker.current?.focus(); }}><DialogHeader><DialogTitle>Cadastro do projeto</DialogTitle></DialogHeader><form onSubmit={e => { e.preventDefault(); void save(); }}><p>Os campos complementares podem ser preenchidos depois. O cadastro só fica guardado após a confirmação.</p>
      {!editing?.study_id && <div><Label htmlFor="linked-study">Estudo vinculado</Label><Select value={editing?.study_id ?? 'none'} onValueChange={v => setEditing(p => p ? { ...p, study_id: v === 'none' ? null : v } : p)}><SelectTrigger id="linked-study"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Vincular depois</SelectItem>{studies.filter(s => !profiles.some(p => p.study_id === s.id)).map(s => <SelectItem value={s.id} key={s.id}>{profileFor(s).display_name}</SelectItem>)}</SelectContent></Select></div>}
      <div className="cp-form">{input('display_name', 'Nome do projeto')}{input('client_name', 'Cliente')}{input('city', 'Cidade')}{input('uf', 'UF')}{input('analyst', 'Analista responsável')}{input('reviewer', 'Revisor')}{input('reference_period', 'Referência da base')}{input('due_date', 'Prazo', 'date')}</div><div className="cp-actions"><Button type="submit" disabled={saving || !editing?.display_name.trim()}>{saving ? 'Salvando…' : 'Salvar cadastro'}</Button><Button type="button" variant="outline" disabled={saving} onClick={() => setEditing(null)}>Cancelar</Button></div></form></DialogContent></Dialog>
  </div>;
}
