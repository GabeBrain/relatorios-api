// Finotti reference adapter; provenance: REFERENCIAS_FINOTTI_DRIVE_2026-10-22.md
// Núcleo de cálculo do simulador on-line (mesma lógica da página publicada).
// Uso no Node: const S = require('./sim.js'); S.projetar(P, 'Loteamento Fechado', 300, 6, 150)
// P = conteúdo de parametros.json. Especificação: docs/04_aplicacao_simulador.md.
const MAXH = 120;
const ALIAS = { 'Loteamento Aberto': 'Loteamento Aberto', 'Loteamento Fechado': 'Loteamento Fechado',
  'Condomínio de Casas/Sobrados': 'Geral', 'Condomínio de casas': 'Geral', 'Geral': 'Geral' };

function zf(a, eps) { a = Math.min(Math.max(a, eps), 1 - eps); return Math.log(-Math.log(1 - a)); }
function kOf(P, c, n, An) { const ln = Math.log(n); return Math.max((c[0] + c[1] * ln) + (c[2] + c[3] * ln) * zf(An, P.eps), P.k_min); }
function eqA(An, n, t, k, eps) { const a = Math.min(Math.max(An, eps), 1 - eps); return 1 - Math.pow(1 - a, Math.pow(t / n, k)); }

function project(P, g, n, An) {
  const c = P.coefs[g], nres = P.nres[g], thr = P.thr, k = kOf(P, c, n, An);
  let t95 = n, A95 = An;
  if (An < thr) {
    t95 = null;
    for (let t = n + 1; t <= n + 600; t++) { const a = eqA(An, n, t, k, P.eps); if (a >= thr) { t95 = t; A95 = a; break; } }
    if (t95 === null) { t95 = n + 600; A95 = eqA(An, n, t95, k, P.eps); }
  }
  const out = [];
  for (let h = 1; h <= MAXH; h++) {
    const t = n + h; let a;
    if (t <= t95) a = (An >= thr) ? An : eqA(An, n, t, k, P.eps); else a = A95 + (1 - A95) * Math.min((t - t95) / nres, 1);
    out.push(Math.min(a, 1));
  }
  return { A: out, k };
}
function bucket(P, n) { const nb = P.bands.nb; for (let i = 0; i < nb.length; i++) { if (n >= nb[i][0] && n <= nb[i][1]) return i; } return nb.length - 1; }
function tailRule(P, b, n, An, nres) {
  const thr = P.thr; let m = An; const c = b.map(v => (m = Math.max(m, v, An)));
  let t95 = null, A95 = null;
  if (An >= thr) { t95 = n; A95 = An; } else { for (let i = 0; i < c.length; i++) { if (c[i] >= thr) { t95 = n + i + 1; A95 = c[i]; break; } } }
  if (t95 === null) return c.map(v => Math.min(v, 1));
  return c.map((v, i) => { const t = n + i + 1; return Math.min(t <= t95 ? v : A95 + (1 - A95) * Math.min((t - t95) / nres, 1), 1); });
}
function bands(P, g, n, An, k) {
  const b = bucket(P, n), D = P.del, nres = P.nres[g], out = {};
  ['q05', 'q25', 'q75', 'q95'].forEach(key => {
    const q = P.bands[key][b]; const arr = [];
    for (let h = 1; h <= MAXH; h++) { const a = eqA(An, n, n + h, k, P.eps), rem = 1 - a + D, j = Math.min(h, 36) - 1;
      arr.push(1 - Math.min(Math.max(rem * Math.exp(q[j]) - D, 0), 1 - An)); }
    out[key] = tailRule(P, arr, n, An, nres);
  });
  return { central_min: out.q75, central_max: out.q25, ampla_min: out.q95, ampla_max: out.q05 };
}
function soMonth(arr, Q, n) { for (let i = 0; i < arr.length; i++) { if (Math.round(arr[i] * Q) >= Q) return n + i + 1; } return null; }

function projetar(P, padrao, Q, n, V) {
  if (!(padrao in ALIAS)) throw new Error('Padrão desconhecido: ' + padrao);
  if (!(Q >= 1) || !(n >= 1) || !(V >= 0)) throw new Error('Entradas inválidas');
  if (V > Q) throw new Error('Vendidas maior que lançadas');
  if (n > (P.n_max || 60)) throw new Error('n acima do máximo');
  const g = ALIAS[padrao];
  if (V >= Q) return { esgotado: true, tabela: [] };
  const An = V / Q; const { A, k } = project(P, g, n, An); const F = bands(P, g, n, An, k);
  const tabela = []; let prev = V;
  for (let i = 0; i < A.length; i++) {
    const cum = Math.min(Math.max(Math.round(A[i] * Q), prev), Q);
    const l = { t: n + i + 1, vendas: cum - prev, acumulado: cum, estoque: Q - cum };
    for (const nome of Object.keys(F)) l[nome] = Math.max(Math.round(F[nome][i] * Q), V);
    tabela.push(l); prev = cum; if (cum >= Q) break;
  }
  const i12 = Math.min(11, A.length - 1);
  return { esgotado: false, tabela, resumo: { grupo: g, k, mes_esgotamento: soMonth(A, Q, n),
    vendas_12m: Math.max(Math.round(A[i12] * Q) - V, 0),
    esgotamento_central: [soMonth(F.central_max, Q, n), soMonth(F.central_min, Q, n)],
    esgotamento_amplo: [soMonth(F.ampla_max, Q, n), soMonth(F.ampla_min, Q, n)] } };
}
export { projetar, project, bands, eqA, kOf };
