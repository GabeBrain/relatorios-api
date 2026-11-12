export default function PreAnalysisNotice({ resume = false }: { resume?: boolean }) {
  return <p className="cp-muted" role="status">{resume ? 'Avaliação incompleta. Retome a preparação para conferir os materiais.' : 'Estudo preparado. Confira as informações e os materiais antes de iniciar a avaliação.'}</p>;
}
