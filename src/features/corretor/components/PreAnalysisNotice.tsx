/** Aviso persistente de cobertura: pré-análise não equivale à avaliação completa. */
export default function PreAnalysisNotice({ resume = false }: { resume?: boolean }) {
  return <div className="cp-pre-analysis-notice" role="status">
    <strong>Este estudo ainda não foi avaliado por completo.</strong>
    <p>{resume ? 'Retome a análise para confirmar a cidade, a UF e se vai incluir planilhas de cálculo.' : 'Confirme abaixo a cidade, a UF e se vai incluir planilhas de cálculo. Depois, clique em “Rodar análise” para iniciar a avaliação completa.'}</p>
    <p className="cp-muted">A pré-análise é apenas uma etapa inicial. Ela não substitui a avaliação do estudo.</p>
  </div>;
}
