import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { portfolioHref, studyHref, type StudySection } from '../lib/study-navigation';

export default function StudyLayout({ id, name, location, section, context, version, actions, children }: {
  id: string; name: string; location?: string; section: StudySection; context: string; version?: string;
  actions?: ReactNode; children: ReactNode;
}) {
  return <>
    <Link className="cp-back" to={portfolioHref(context)}><ArrowLeft size={16} aria-hidden="true" /> Voltar aos estudos</Link>
    <header className="cp-heading"><div><p className="cp-eyebrow">Geobrain · Corretor</p><h1>{name}</h1>{location && <p className="cp-muted">{location}</p>}</div><div className="cp-actions">{actions}</div></header>
    <nav className="cp-study-nav" aria-label="Áreas do estudo">
      {([['revisao', 'Revisão'], ['recomendacao','Sugestão de análise'], ['materiais', 'Arquivos e histórico']] as const).map(([key, label]) => <Link key={key} to={studyHref(id, key, context, version)} aria-current={(section === key || key === 'revisao' && section === 'resumo' || key === 'materiais' && section === 'historico') ? 'page' : undefined}>{label}</Link>)}
    </nav>
    {children}
  </>;
}
