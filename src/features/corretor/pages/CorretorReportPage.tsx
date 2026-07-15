// Corretor v5 / WS-2 — RELATÓRIO DE VERIFICAÇÃO (attestation). Read-only, imprimível.
// Mostra o trabalho POSITIVO do corretor ("o que foi verificado e fechou"), não só os
// problemas — é o que o A&R vê primeiro e o que torna o valor do corretor visível.

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, Loader2, PackageCheck, ArrowLeft, Printer } from 'lucide-react';
import { errorLabel, type ErrorType } from '../lib/error-catalog';
import { formatBRL } from '../lib/v3/config';
import { loadDeliveryReport, type DeliveryReport } from '../lib/v3/db';

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 text-center">
      <div className="text-2xl font-bold tabular-nums">{n}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

export default function CorretorReportPage() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<DeliveryReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const r = await loadDeliveryReport(id);
        if (!r) setNotFound(true); else setReport(r);
      } finally { setLoading(false); }
    })();
  }, [id]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground gap-2 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Carregando relatório…</div>;
  }
  if (notFound || !report) {
    return <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground"><p>Relatório não encontrado.</p><Link to="/corretor" className="text-primary hover:underline">Voltar ao corretor</Link></div>;
  }

  const { study, snapshot, corrigidos, ignorados, fps, verificarAssumidos, porTipo } = report;
  const local = [study.cidade, study.uf].filter(Boolean).join(' / ');
  const entregue = study.status === 'pronto';

  return (
    <div className="min-h-screen bg-background">
      {/* barra de navegação — oculta na impressão */}
      <div className="print:hidden border-b bg-card px-6 py-2 flex items-center justify-between">
        <Link to="/corretor" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"><ArrowLeft className="w-3.5 h-3.5" /> Corretor</Link>
        <button onClick={() => window.print()} className="text-xs rounded-md px-2.5 py-1.5 border border-border hover:border-primary/50 inline-flex items-center gap-1.5"><Printer className="w-3.5 h-3.5" /> Imprimir / PDF</button>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <header className="space-y-1 border-b border-border pb-4">
          <div className="flex items-center gap-2">
            {entregue && <PackageCheck className="w-5 h-5 text-emerald-600" />}
            <h1 className="text-xl font-bold">{study.nome}</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {local && <>{local} · </>}versão {study.lastVersion} · {study.nSlides} slides
            {study.custoTotal > 0 && <> · IA {formatBRL(study.custoTotal)}</>}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {entregue
              ? <>Entregue ao A&R{study.concludedAt ? ` em ${new Date(study.concludedAt).toLocaleDateString('pt-BR')}` : ''}. Relatório gerado pelo Corretor de Vocacionais.</>
              : <>Estudo ainda em correção — este é um relatório parcial.</>}
          </p>
        </header>

        {/* Verificado ✓ — o trabalho positivo */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold inline-flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Verificado</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat n={snapshot?.tabelasVerificadas ?? 0} label="tabelas fecham nos totais" />
            <Stat n={snapshot?.imagensAnalisadas ?? 0} label="imagens de tabela lidas" />
            <Stat n={snapshot?.tabelasNativas ?? 0} label="tabelas nativas conferidas" />
            <Stat n={corrigidos} label="apontamentos corrigidos" />
          </div>
          {!snapshot && <p className="text-[11px] text-muted-foreground italic">Estudo analisado antes do relatório de verificação — contagens de tabela indisponíveis.</p>}
        </section>

        {/* Resumo dos apontamentos por tipo */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Apontamentos por tipo</h2>
          {porTipo.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum apontamento registrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th className="py-1.5 pr-3 font-medium">Tipo</th>
                    <th className="py-1.5 px-3 font-medium text-right">Corrigidos</th>
                    <th className="py-1.5 px-3 font-medium text-right">Pendentes</th>
                    <th className="py-1.5 pl-3 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {porTipo.map((t) => (
                    <tr key={t.tipo} className="border-b border-border/50">
                      <td className="py-1.5 pr-3">{errorLabel(t.tipo as ErrorType)}</td>
                      <td className="py-1.5 px-3 text-right tabular-nums text-emerald-600">{t.corrigidos}</td>
                      <td className="py-1.5 px-3 text-right tabular-nums">{t.pendentes || '—'}</td>
                      <td className="py-1.5 pl-3 text-right tabular-nums font-medium">{t.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Assumidos com justificativa + FP */}
        {(verificarAssumidos > 0 || fps > 0 || ignorados > 0) && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Decisões do analista</h2>
            <ul className="text-xs text-muted-foreground space-y-1">
              {verificarAssumidos > 0 && <li>• {verificarAssumidos} item(ns) de verificação assumidos e entregues com justificativa.</li>}
              {ignorados > 0 && <li>• {ignorados} item(ns) marcados como não aplicáveis.</li>}
              {fps > 0 && <li>• {fps} apontamento(s) reportados como falso positivo (retornam à calibração).</li>}
            </ul>
          </section>
        )}

        <footer className="pt-4 border-t border-border text-[10px] text-muted-foreground">
          Gerado pelo Corretor de Vocacionais em {new Date().toLocaleString('pt-BR')}.
        </footer>
      </div>
    </div>
  );
}
