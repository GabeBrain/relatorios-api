import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileSpreadsheet, Presentation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { analysisPending, loadFindings, type FindingV3, type StudyV3 } from '../lib/v3/db';
import { summarizeStudy } from '../lib/study-summary';
import { studyHref } from '../lib/study-navigation';

export default function StudySummary({ study, context }: { study: StudyV3; context: string }) {
  const [items, setItems] = useState<FindingV3[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState(false), [retry, setRetry] = useState(0);
  useEffect(() => { let active = true; setLoading(true); setError(false);
    loadFindings(study.id, true).then(rows => { if (active) setItems(rows); }).catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [study.id, retry]);
  const summary = summarizeStudy(items), pre = analysisPending(study);
  return <div className="cp-summary">
    <section className="cp-summary-lead"><div><p className="cp-eyebrow">Resumo da análise</p><h2>{pre ? 'Análise completa pendente' : study.status === 'pronto' ? 'Entrega registrada' : 'Continue a revisão'}</h2><p className="cp-muted">{study.nSlides} slides · registro de versão {study.lastVersion}</p></div>
      <Button asChild><Link to={studyHref(study.id, 'revisao', context)}>{pre ? 'Continuar análise' : 'Revisar pendências'}</Link></Button>
    </section>
    {loading ? <p role="status">Carregando apontamentos…</p> : error ? <p role="alert">Não foi possível carregar os apontamentos. <Button variant="outline" onClick={() => setRetry(n => n + 1)}>Tentar novamente</Button></p> : <>
      {pre ? <p className="cp-notice">A análise completa ainda não foi registrada. Os apontamentos da pré-análise não representam toda a cobertura do estudo.</p> : <>
        <div className="cp-metrics" aria-label="Apontamentos por confiança">{['Erros apontados', 'Prováveis', 'A verificar'].map((label, i) => <div key={label}><strong>{summary.levels[i]}</strong><span>{label}</span></div>)}</div>
        <p className="cp-muted">{summary.pending} apontamentos pendentes · {summary.slides.length} slides com referência. Contagens por confiança da análise, não por gravidade. A revisão revalida os apontamentos antigos contra as evidências disponíveis.</p>
        {summary.categories.length ? <section className="cp-category-list"><h2>O que precisa de atenção</h2>{summary.categories.map(([name, count]) => <div key={name}><span>{name}</span><strong>{count}</strong></div>)}{summary.slides.length > 0 && <p className="cp-muted">Slides: {summary.slides.join(', ')}</p>}</section> : <p>Nenhum apontamento pendente nos registros disponíveis. Isso não comprova cobertura integral nem correção do arquivo.</p>}
      </>}
      {summary.historical > 0 && <p className="cp-muted">{summary.historical} registros encerrados ou ignorados no histórico. Esse estado, sozinho, não comprova correção no documento.</p>}
    </>}
    <section className="cp-coverage"><h2>Materiais e cobertura</h2><p><Presentation size={18} aria-hidden="true" /> Apresentação · {study.nSlides} slides registrados</p><p><FileSpreadsheet size={18} aria-hidden="true" /> {study.temFonte ? 'Fonte numérica vinculada' : 'Sem planilhas de cálculo vinculadas'}</p>
      <p className="cp-muted">{study.analise ? 'Há um registro de análise. Consulte na revisão as verificações realizadas e os limites de leitura.' : 'Cobertura completa não comprovada pelos registros disponíveis.'}</p>
      <Button variant="outline" asChild><Link to={studyHref(study.id, 'materiais', context)}>Conferir materiais</Link></Button>
    </section>
  </div>;
}
