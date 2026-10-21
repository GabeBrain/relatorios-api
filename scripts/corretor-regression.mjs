import { readFileSync, existsSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';

export function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}

// Comparar por identidade, conteúdo e cobertura: contagem igual não garante acerto mantido.
export function compareResults(expected, actual) {
  if (!actual || !Array.isArray(actual.findings) || !actual.summary) throw new Error('Resultado de replay incompleto');
  const stringify = value => JSON.stringify(canonical(value));
  const before = new Map(expected.findings.map(f => [f.id, f]));
  const after = new Map(actual.findings.map(f => [f.id, f]));
  if (after.size !== actual.findings.length) throw new Error('IDs duplicados no replay');
  const removed = [...before.keys()].filter(id => !after.has(id));
  const added = [...after.keys()].filter(id => !before.has(id));
  const changed = [...before.keys()].filter(id => after.has(id) && stringify(before.get(id)) !== stringify(after.get(id)));
  const summaryChanged = stringify(expected.summary) !== stringify(actual.summary);
  return { equal: !removed.length && !added.length && !changed.length && !summaryChanged, removed, added, changed, summaryChanged };
}

// Evolução explícita de regra: baseline original intocada, antes/depois exatos revisados.
export function resultFingerprint(value) {
  return createHash('sha256').update(JSON.stringify(canonical({summary:value.summary,findings:[...value.findings].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0)}))).digest('hex');
}
export function approvedRuleDelta(expected,actual,approval) {
  return Boolean(approval?.reason && approval.before===resultFingerprint(expected) && approval.after===resultFingerprint(actual));
}

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');

async function replay(testCase, raw, output) {
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (key.startsWith('CORRETOR_REPLAY_')) delete env[key];
  Object.assign(env, {
    CORRETOR_REPLAY_PPTX: testCase.pptxPath, CORRETOR_REPLAY_CITY: testCase.city, CORRETOR_REPLAY_UF: testCase.uf,
    CORRETOR_REPLAY_FIXTURE: resolve(repo, testCase.fixture), CORRETOR_REPLAY_OUT: output,
  });
  if (raw) env.CORRETOR_REPLAY_EXCEL_DIR = testCase.excelPath;
  await new Promise((done, reject) => {
    const child = spawn(process.execPath, [resolve(repo, 'node_modules/vitest/vitest.mjs'), 'run', '--run', 'replay-real'], { cwd: repo, env, windowsHide: true });
    let log = '';
    child.stdout.on('data', data => { log += data; });
    child.stderr.on('data', data => { log += data; });
    const timer = setTimeout(() => { child.kill(); reject(new Error('Replay excedeu 120 s')); }, 120_000);
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('close', code => {
      clearTimeout(timer); writeFileSync(output+'.log', log);
      if (code === 0 && existsSync(output)) done();
      else reject(new Error(`Replay terminou com código ${code}; consulte ${output}.log`));
    });
  });
  return readJson(output);
}

async function inspectBrowser(cases, outputDir, url) {
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [], blocked = [], findings = new Map(), responseTasks = [], requestFailures = [], responseFailures = [];
  let activeCase = null;
  page.on('pageerror', error => errors.push({ caseId: activeCase, message: error.message }));
  page.on('requestfailed', request => {
    const url = new URL(request.url());
    requestFailures.push({ caseId:activeCase, host:url.hostname, path:url.pathname, error:request.failure()?.errorText });
  });
  page.on('response', response => {
    if (!response.ok()) { const url = new URL(response.url()); responseFailures.push({ caseId:activeCase, host:url.hostname, path:url.pathname, status:response.status() }); }
    if (new URL(response.url()).pathname.endsWith('/rest/v1/findings_v3')) {
      responseTasks.push((async () => {
        try { for (const f of await response.json()) findings.set(`${f.study_id}:${f.rule_id}`, f); } catch {}
      })());
    }
  });
  // Não analisa nem muda status no site: protege as chamadas de IA e as escritas.
  await page.route('**/*', route => {
    const request = route.request(), parsed = new URL(request.url());
    if (parsed.pathname.includes('/functions/v1/') || (parsed.hostname.endsWith('.supabase.co') && !['GET','HEAD','OPTIONS'].includes(request.method()))) {
      blocked.push({ caseId:activeCase, path: parsed.pathname, method: request.method() }); return route.abort();
    }
    return route.continue();
  });
  const results = [];
  try {
    for (const c of cases) {
      activeCase = c.id;
      try {
        const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        const link = page.getByText(c.studyName, { exact: true });
        const count = await link.count();
        if (count !== 1) { results.push({ id: c.id, status: 'unavailable', reason: `Encontrados ${count} estudos desse nome na lista V3` }); continue; }
        const loaded = page.waitForResponse(r => new URL(r.url()).pathname.endsWith('/rest/v1/findings_v3'), { timeout: 15000 });
        await link.click();
        const findingsResponse = await loaded;
        if (!findingsResponse.ok()) throw new Error(`Leitura de achados retornou HTTP ${findingsResponse.status()}`);
        await page.getByText('Carregando achados…', { exact: true }).waitFor({ state: 'hidden', timeout: 10000 });
        await page.waitForLoadState('networkidle', { timeout: 15000 });
        const text = await page.locator('body').innerText();
        await page.screenshot({ path: join(outputDir, `${c.id}.png`), fullPage: true });
        const prevented = blocked.filter(b=>b.caseId===c.id && b.path.includes('/rest/v1/') && !['GET','HEAD','OPTIONS'].includes(b.method));
        results.push({ id: c.id, status: prevented.length ? 'guard_blocked' : response.status() === 200 ? 'read' : 'error',
          ...(prevented.length ? { reason:'A abertura tentou atualizar registros; escritas bloqueadas, renderização completa não confirmada' } : {}), httpStatus: response.status(), text });
      } catch (error) { results.push({ id: c.id, status: 'error', reason: error.message }); }
    }
    await Promise.allSettled(responseTasks);
    const stored = [...findings.values()].map(f => ({ studyId: f.study_id, ruleId: f.rule_id, type: f.tipo, slideRef: f.slide_ref, finding: f.payload }));
    return { mode: 'consulta de resultados já salvos, sem reprocessamento', url, results, errors, blocked, requestFailures, responseFailures, stored };
  } finally { await browser.close(); }
}

async function main() {
  const args = process.argv.slice(2);
  const selected = args.find(a => a.startsWith('--only='))?.slice(7).split(',');
  const manifest = readJson(resolve(repo, 'docs/features/corretor-vocacionais/calibracao/automacao/cases.json'));
  const approvalPath=args.find(a=>a.startsWith('--review-deltas='))?.slice('--review-deltas='.length);
  const approvals=approvalPath?readJson(resolve(repo,approvalPath)):null;
  const cases = selected ? manifest.cases.filter(c => selected.includes(c.id)) : manifest.cases;
  if (!cases.length || selected?.some(id => !manifest.cases.some(c => c.id === id))) throw new Error('Caso desconhecido em --only');
  const seRoot = resolve(repo, '..', '..');
  const inputRoot = process.env.CORRETOR_TEST_INPUT_ROOT || resolve(seRoot, '_UPLOADS_TESTE');
  const runId = new Date().toISOString().replaceAll(':','-') + '-' + process.pid;
  const outputDir = resolve(repo, '.local-inputs/corretor-regression', runId);
  mkdirSync(outputDir, { recursive: true });
  const report = { runId, scope: args.includes('--browser-only') ? 'consulta de resultados já salvos no navegador; sem replay nesta rodada' : 'regressão offline de leituras fixas; Excel bruto e browser em pistas separadas', newPaidCalls: 0, cases: [], catalog: [], browser: null };
  for (const c of args.includes('--browser-only') ? [] : cases) {
    const entry = { id: c.id, city: c.city, baseline: 'blocked', raw: 'blocked' };
    report.cases.push(entry);
    try {
      c.pptxPath = resolve(inputRoot, c.pptx); c.excelPath = resolve(inputRoot, c.excel);
      for (const [path, expectedHash] of [[c.pptxPath,c.pptxSha256],[resolve(repo,c.fixture),c.fixtureSha256]]) {
        if (!existsSync(path)) throw new Error(`Insumo ausente: ${path}`);
        if (hash(path) !== expectedHash) throw new Error(`Hash diferente do caso congelado: ${path}`);
      }
      const expected = readJson(resolve(repo,c.expected));
      const result = await replay(c, false, join(outputDir,c.id+'.fixture.json'));
      entry.diff = compareResults(expected,result); entry.summary = result.summary;
      entry.baseline = entry.diff.equal ? 'pass' : 'review';
      if(!entry.diff.equal && approvedRuleDelta(expected,result,approvals?.cases?.[c.id])) {
        entry.baseline='pass';entry.approvedDelta=approvals.cases[c.id];
      }
      if (!existsSync(c.excelPath)) throw new Error(`Excel bruto ausente: ${c.excelPath}`);
      const names = readdirSync(c.excelPath).filter(n => /\.xls[xm]$/i.test(n)).sort();
      if (JSON.stringify(names) !== JSON.stringify(c.excelFiles.map(f=>f.name))) throw new Error('Conjunto de Excel mudou: revisar material antes de comparar');
      for (const f of c.excelFiles) if (hash(join(c.excelPath,f.name)) !== f.sha256) throw new Error(`Excel mudou: ${f.name}`);
      const raw = await replay(c, true, join(outputDir,c.id+'.raw.json'));
      entry.rawDiff = compareResults(result,raw); entry.rawSummary = raw.summary;
      entry.raw = entry.rawDiff.equal ? 'pass' : 'review'; entry.source = raw.fonte;
      if (raw.fonte?.avisos?.some(a=>a.tipo==='falha_ao_abrir') || raw.fonte?.inventario?.length !== c.excelFiles.length) {
        entry.raw = 'review'; entry.reason = 'Falha de extração ou inventário incompleto';
      }
    } catch (error) { entry.reason = error.message; }
    console.log(`${c.id}: baseline=${entry.baseline}; Excel=${entry.raw}${entry.reason ? '; '+entry.reason : ''}`);
  }
  const catalogPath = resolve(seRoot, '_Referencias/Vocacionais/coortes.json');
  const assetsPath = resolve(seRoot, '_Referencias/Vocacionais/catalogo.json');
  if (!args.includes('--browser-only') && existsSync(catalogPath) && existsSync(assetsPath)) {
    const catalog = readJson(assetsPath);
    const assets = new Map(catalog.assets.map(a=>[a.id,a]));
    const pptx = catalog.assets.filter(a=>a.extensao==='.pptx').map(a=>({
      sha256:a.sha256,
      path:[a.caminho_canonico_se,...(a.copias_existentes_se||[])].find(p=>existsSync(resolve(seRoot,p))),
      replayCase: cases.find(c=>c.pptxSha256===a.sha256)?.id ?? null,
    })).filter(a=>a.path);
    report.materialInventory = { catalogDate:catalog.data_inspecao, note:'Disponibilidade por caminho; somente decks executados tiveram hash reconferido nesta rodada', pptxFound:pptx.length, covered:pptx.filter(a=>a.replayCase), notCovered:pptx.filter(a=>!a.replayCase) };
    report.catalog = readJson(catalogPath).casos.map(c => ({
      id: c.id, name: c.nome, replayCases: cases.filter(x=>x.catalogCase===c.id).map(x=>x.id),
      sourcePending: c.pendencias,
      materialPresent: c.referencias.some(r => { const a = assets.get(r.asset_id); return a && [a.caminho_canonico_se,...(a.copias_existentes_se||[])].some(p=>existsSync(resolve(seRoot,p))); }),
      reason: cases.some(x=>x.catalogCase===c.id) ? 'Incluído na rodada selecionada; baseline técnica, não gabarito humano completo' : 'Sem replay/gabarito congelado nesta suíte; localizar fonte e rotular antes de gastar IA',
    }));
  } else if (!args.includes('--browser-only')) report.catalogUnavailable = true;
  if (args.includes('--browser') || args.includes('--browser-only')) {
    try { report.browser = await inspectBrowser(cases,outputDir,'https://geobrain-relatorios.lovable.app/corretor'); }
    catch (error) { report.browser = { status: 'blocked', reason: error.message }; }
  }
  writeFileSync(join(outputDir,'report.json'),JSON.stringify(report,null,2)+'\n');
  const lines = [`# Corretor — rodada ${runId}`, '', 'Chamadas pagas novas: 0. Baseline técnica preservada não significa ausência de erros ou homologação humana.', '',
    ...report.cases.map(c=>`- ${c.id}: baseline ${c.baseline}; Excel bruto ${c.raw}; ${c.summary?.achados ?? '?'} achados; ${c.summary?.tabelas ?? '?'} tabelas conferidas.${c.reason ? ' '+c.reason : ''}`), '',
    ...report.cases.filter(c=>c.baseline==='review'||c.raw==='review').map(c=>`- Revisar ${c.id}: removidos ${JSON.stringify(c.diff?.removed)}, novos ${JSON.stringify(c.diff?.added)}, alterados ${JSON.stringify(c.diff?.changed)}; diferenças Excel ${JSON.stringify(c.rawDiff)}.`), '',
    ...(report.browser?.results||[]).map(c=>`- Navegador ${c.id}: ${c.status}${c.reason ? '; '+c.reason : ''}`), '',
    ...report.catalog.filter(c=>!c.replayCases.length).map(c=>`- Material ${c.id} — ${c.name}: ${c.reason}`), '',
    ...(report.materialInventory ? [`PPTX únicos disponíveis no catálogo: ${report.materialInventory.pptxFound}; incluídos na seleção: ${report.materialInventory.covered.length}; restantes: ${report.materialInventory.notCovered.length}. Consulte materialInventory no JSON; não foram replays desses decks.`] : []), '',
    'Consulte report.json para IDs removidos, novos ou alterados, diferenças de fonte e resultados já salvos no navegador. Não atualizar expectativas automaticamente.',
    'Prioridade humana: divergências novas de dado/unidade/recorte, confirmação de falsos positivos e casos sem gabarito.'];
  writeFileSync(join(outputDir,'report.md'),lines.join('\n')+'\n');
  console.log(`Relatório: ${join(outputDir,'report.md')}`);
  if (report.cases.some(c=>c.baseline!=='pass'||c.raw!=='pass') || (report.browser && (report.browser.status==='blocked'||report.browser.errors?.length||report.browser.results?.some(c=>c.status!=='read')))) process.exitCode=1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.message); process.exitCode=1; });
