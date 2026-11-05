import type { SpPreview } from './model';

/** These are editorial reference figures, never inferred from municipal market data. */
export const SP_INSTITUTIONAL_FIGURES = {
  referenceMonth:'2026-06',population:'25,6%',consumption:'39,6%',
  geobrain:[
    {x:471,y:53,value:'+12.500',lines:['empresas pesquisadas','a cada 3 meses']},
    {x:687,y:53,value:'+18.000',lines:['empreendimentos','em vendas ativas']},
    {x:471,y:156,value:'+650.000',lines:['unidades em','comercialização']},
    {x:687,y:156,value:'6,6M',lines:['de unidades','no histórico']},
    {x:471,y:260,value:'+45.000',lines:['empreendimentos','no histórico']},
    {x:687,y:260,value:'R$ 434 Bi',lines:['em estoque de','comercialização']},
  ],
} as const;

export function spInstitutionalMonth(report:SpPreview):string {
  const value=report.throughMonth??report.closingMonth;
  if(!value||!/^\d{4}-(0[1-9]|1[0-2])$/.test(value))return 'PERÍODO NÃO CONFERIDO';
  return new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric',timeZone:'UTC'})
    .format(new Date(`${value}-01T12:00:00Z`)).toLocaleUpperCase('pt-BR');
}
