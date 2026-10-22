// Finotti reference adapter; provenance: REFERENCIAS_FINOTTI_DRIVE_2026-10-22.md
// Simulador de absorção v3 — empreendimentos comparáveis com dados censurados (esgotados + ativos)
// Vizinhos ainda em venda são completados com o próprio ritmo recente; percentis sobre os 30 vizinhos completos.
// D.pools[chave] = [[id, [A(1..H) em milésimos, -1 = não observado]], ...]
function quantileSorted(a,q){const p=(a.length-1)*q,lo=Math.floor(p),hi=Math.ceil(p);return a[lo]+(a[hi]-a[lo])*(p-lo);}
function poolKey(padrao){
  const big={'Compacto':'Compacto','Econômico':'Econômico','Standard':'Standard','Médio':'Médio','Médio-Alto':'Médio-Alto','Alto':'Alto / Luxo','Alto +':'Alto / Luxo','Luxo':'Alto / Luxo'};
  return big[padrao]||'g3:Médio+';
}
function simulate(D,padrao,Q,n,V){
  const K=D.K,H=D.H,HH=240,WIN=2;
  const pool=D.pools[poolKey(padrao)],x=V/Q;
  const cand=[];
  for(const [id,A] of pool){const v=A[n-1];if(v<0||v>=995)continue;const a=v/1000;
    cand.push({id,a,d:Math.abs(a-x),A});}
  cand.sort((p,q)=>p.d-q.d||p.id-q.id);
  const nb=cand.slice(0,K);
  const out={neighbors:nb.length};
  // completa cada vizinho censurado com o ritmo dos seus últimos 12 meses observados (mínimo 0,2% do estoque restante ao mês)
  const FL=0.002,WH=12;
  const X=nb.map(o=>{const A=o.A;let L=-1;for(let i=0;i<H;i++)if(A[i]>=0)L=i;const c=new Array(HH);
    for(let i=0;i<=L;i++)c[i]=A[i]>=0?A[i]/1000:(i>0?c[i-1]:0);
    const aL=c[L];if(aL>=0.995){for(let i=L+1;i<HH;i++)c[i]=1;return c;}
    const j0=Math.max(0,L-WH),r=1-aL,r0=1-c[j0];let h=(L>j0&&r0>0&&r>0)?1-Math.pow(r/r0,1/(L-j0)):FL;h=Math.max(h,FL);
    for(let i=L+1;i<HH;i++)c[i]=1-r*Math.pow(1-h,i-L);return c;});
  for(const [key,q] of [['central',0.5],['conservador',0.1],['otimista',0.9]]){
    const G=new Array(HH).fill(0);
    for(let i=n;i<HH;i++){const F=X.map((c,k)=>(c[i]-nb[k].a)/Math.max(1-nb[k].a,1e-6)).sort((p,r)=>p-r);G[i]=Math.min(1,Math.max(0,quantileSorted(F,q)));}
    for(let i=n;i<HH;i++)G[i]=Math.max(G[i],G[i-1]);
    for(let i=n-1;i<HH;i++)if(G[i]>=1-1e-9)G[i]=1;
    let Ts=HH;for(let i=n-1;i<HH;i++){if(G[i]>=1){Ts=i;break;}}
    const Sm=new Array(HH).fill(0);
    for(let i=n;i<HH;i++){
      if(i>=Ts){Sm[i]=1;continue;}
      let s=0;for(let j=i-WIN;j<=i+WIN;j++){const jj=Math.min(HH-1,Math.max(n-1,j));s+=(jj>=Ts?1:G[jj]);}
      Sm[i]=s/(2*WIN+1);
    }
    const cum=[];let prev=V;
    for(let i=n;i<HH;i++){let u=Math.round((x+Sm[i]*(1-x))*Q+1e-9);u=Math.max(u,prev);u=Math.min(u,Q);cum.push({t:i+1,cum:u});prev=u;if(u>=Q)break;}
    out[key]=cum;out[key+'_esgota']=prev>=Q;
  }
  return out;
}
export { simulate, poolKey };
