/** Lucas authorized isolating inconsistent projects on 23/11/2026. These
 * notices are aggregate-only; identifying evidence stays in the review file. */
export function partialNotice(warnings:string[],message:string) {
  const notice=`Base parcial: ${message}`;
  if(!warnings.includes(notice))warnings.push(notice);
}

export function excludeInvalidProjects<T extends {id:string;city:string;stock:number}>(rows:T[],validate:(row:T)=>void,warnings:string[],context:string):T[] {
  const rejected=new Map<string,string>();
  for(const row of rows)try{validate(row);}catch(error){rejected.set(row.id,error instanceof Error?error.message:'registro inválido');}
  for(const city of new Set(rows.filter(row=>rejected.has(row.id)).map(row=>row.city))){
    const excluded=rows.filter(row=>row.city===city&&rejected.has(row.id));
    const ids=new Set(excluded.map(row=>row.id));
    const stock=excluded.reduce((sum,row)=>sum+row.stock,0);
    const reasons=[...new Set([...ids].map(id=>rejected.get(id)))].join(' ');
    partialNotice(warnings,`${city}, ${context}: ${ids.size} empreendimento(s) desconsiderado(s), ${stock} unidade(s) de estoque observado fora deste cálculo. ${reasons}`);
  }
  return rows.filter(row=>!rejected.has(row.id));
}
