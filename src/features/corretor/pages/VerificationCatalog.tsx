import '../styles/projects.css';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ERROR_CATALOG, MODE_META, type ErrorType } from '../lib/error-catalog';
export function CatalogPage() { return <main className="corretor-projects"><Link to="/corretor">← Voltar aos estudos</Link><h1>O que o corretor verifica</h1><VerificationCatalog /></main>; }
export default function VerificationCatalog() {

  const detRules = Object.entries(ERROR_CATALOG).filter(
    ([_, meta]) => meta.motor === 'DET'
  );
  const iaRules = Object.entries(ERROR_CATALOG).filter(
    ([_, meta]) => meta.motor === 'IA' || meta.motor === 'DET+IA'
  );

  const RuleItem = ({ type, meta }: { type: string; meta: typeof ERROR_CATALOG['PERCENTAGE_SUM'] }) => (
    <div className="py-2">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{meta.label}</span>
            <span className={cn('text-[10px] rounded px-1.5 py-0.5 border', MODE_META[meta.mode].className)}>
              {MODE_META[meta.mode].label}
            </span>
            <span className="text-[10px] rounded px-1.5 py-0.5 border bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30">
              {meta.motor}
            </span>
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{meta.description}</p>
    </div>
  );

  return (
    <section aria-label="Regras aplicadas">
      <div className="rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold">Catálogo de verificações</h3><p className="cp-muted">Verificações disponíveis no motor; a cobertura deste estudo depende dos materiais e da execução registrada.</p>
        <div className="mt-4 space-y-4">
          {/* Regras Determinísticas */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground">Determinísticas (DET)</span>
              <span className="text-[10px] text-muted-foreground">{detRules.length}</span>
            </div>
            <div className="space-y-1">
              {detRules.map(([type, meta]) => (
                <RuleItem key={type} type={type as ErrorType} meta={meta} />
              ))}
            </div>
          </div>

          {/* Regras de IA */}
          <div className="space-y-2 border-t border-border pt-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground">Com IA (IA · DET+IA)</span>
              <span className="text-[10px] text-muted-foreground">{iaRules.length}</span>
            </div>
            <div className="space-y-1">
              {iaRules.map(([type, meta]) => (
                <RuleItem key={type} type={type as ErrorType} meta={meta} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
