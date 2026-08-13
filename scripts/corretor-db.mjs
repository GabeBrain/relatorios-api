/**
 * corretor-db — consulta de leitura ao banco do Corretor de Vocacionais.
 *
 * Existe para a sessão de calibração de falsos positivos: buscar um achado pelo
 * slide, ler o payload da visão e baixar a imagem-evidência sem abrir a UI.
 *
 * Lê a chave anon de .env (as políticas do corretor são anon_all_*, ver
 * supabase/migrations/20260709100000_corretor_v3.sql). Somente leitura: nenhum
 * comando escreve no banco.
 *
 *   node scripts/corretor-db.mjs <comando> [args]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Teto e câmbio vivem em src/features/corretor/lib/v3/config.ts; repetidos aqui
// para o script não depender do build do app.
const BUDGET_STUDY_BRL = 4;
const FX_BRL_PER_USD = 5.16;

function loadEnv() {
  const env = {};
  for (const line of readFileSync(join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (match) env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
  }
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('.env sem VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY');
  return { url, key };
}

const { url: SUPABASE_URL, key: SUPABASE_KEY } = loadEnv();

async function rest(path) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} em ${path}\n${await response.text()}`);
  return response.json();
}

const brl = (usd) => `R$ ${(usd * FX_BRL_PER_USD).toFixed(2).replace('.', ',')}`;
const pad = (value, width) => String(value ?? '').padEnd(width).slice(0, width);
const num = (value, width) => String(value ?? '').padStart(width);

/**
 * Estado real do processamento, deduzido dos passes de IA gravados.
 * O portão da ata roda na fase 1 e cobra sozinho; texto+visão só rodam depois da
 * confirmação. Estudo com apenas `visao_ata` foi abandonado no portão.
 */
function processingState(passes) {
  const kinds = new Set(passes.map((p) => p.tipo));
  if (kinds.size === 0) return { label: 'só triagem DET', warn: true };
  if (!kinds.has('texto') && !kinds.has('visao_tabela')) return { label: 'PAROU no portão da ata', warn: true };
  if (!kinds.has('visao_tabela')) return { label: 'sem passe de visão', warn: true };
  return { label: 'completo', warn: false };
}

async function loadStudies() {
  const [studies, passes, findings] = await Promise.all([
    rest('studies_v3?select=id,nome,cidade,uf,status,custo_total,created_at,concluded_at,ata_confirmada,ata&order=created_at.desc'),
    rest('ia_passes?select=study_id,tipo,escopo,custo_usd,created_at&limit=2000'),
    rest('findings_v3?select=study_id,status,verdict,tipo,origem,slide_ref,rule_id&limit=10000'),
  ]);
  return studies.map((study) => {
    const studyPasses = passes.filter((p) => p.study_id === study.id);
    const studyFindings = findings.filter((f) => f.study_id === study.id);
    return {
      ...study,
      passes: studyPasses,
      findings: studyFindings,
      usd: studyPasses.reduce((total, p) => total + Number(p.custo_usd), 0),
      state: processingState(studyPasses),
      pendentes: studyFindings.filter((f) => f.status === 'pendente').length,
      triados: studyFindings.filter((f) => f.verdict).length,
    };
  });
}

/** Resolve estudo por uuid, prefixo de uuid, trecho do nome ou cidade. */
function resolveStudy(studies, term) {
  const needle = term.toLowerCase();
  const hit = studies.filter(
    (s) =>
      s.id === term ||
      s.id.startsWith(needle) ||
      s.nome.toLowerCase().includes(needle) ||
      (s.cidade ?? '').toLowerCase().includes(needle)
  );
  if (hit.length === 0) throw new Error(`nenhum estudo casa com "${term}" — rode: estudos`);
  if (hit.length > 1) {
    throw new Error(
      `"${term}" é ambíguo:\n${hit.map((s) => `  ${s.id.slice(0, 8)}  ${s.nome}`).join('\n')}`
    );
  }
  return hit[0];
}

const commands = {};

commands.estudos = async () => {
  const studies = await loadStudies();
  console.log(
    `\n${pad('id', 9)}${pad('estudo', 46)}${pad('cidade', 16)}${num('US$', 8)}${num('R$', 9)}  ${pad('processamento', 24)}${num('pend', 6)}${num('triad', 6)}`
  );
  console.log('─'.repeat(126));
  for (const study of studies) {
    const flag = study.state.warn ? '⚠ ' : '  ';
    console.log(
      `${pad(study.id.slice(0, 8), 9)}${pad(study.nome, 46)}${pad(study.cidade ?? '—', 16)}` +
        `${num(study.usd.toFixed(4), 8)}${num(brl(study.usd), 9)}  ${flag}${pad(study.state.label, 22)}` +
        `${num(study.pendentes, 6)}${num(study.triados, 6)}`
    );
  }
  const total = studies.reduce((sum, s) => sum + s.usd, 0);
  const incompletos = studies.filter((s) => s.state.warn);
  console.log('─'.repeat(126));
  console.log(`${studies.length} estudos · custo total US$ ${total.toFixed(4)} (${brl(total)})`);
  if (incompletos.length) {
    console.log(`\n⚠ ${incompletos.length} estudo(s) NÃO processados por completo:`);
    for (const s of incompletos) console.log(`   ${s.id.slice(0, 8)}  ${s.state.label.padEnd(22)} ${s.nome}`);
  }
  console.log();
};

commands.custo = async () => {
  const studies = await loadStudies();
  const teto = BUDGET_STUDY_BRL / FX_BRL_PER_USD;
  console.log(`\nTeto por estudo: R$ ${BUDGET_STUDY_BRL.toFixed(2)} (US$ ${teto.toFixed(4)}) — BUDGET_STUDY_BRL\n`);
  console.log(`${pad('id', 9)}${pad('estudo', 46)}${num('US$', 9)}${num('R$', 9)}${num('% teto', 9)}`);
  console.log('─'.repeat(82));
  for (const study of [...studies].sort((a, b) => b.usd - a.usd)) {
    const share = (study.usd / teto) * 100;
    const alert = share >= 80 ? '  ← perto do teto' : '';
    console.log(
      `${pad(study.id.slice(0, 8), 9)}${pad(study.nome, 46)}${num(study.usd.toFixed(4), 9)}${num(brl(study.usd), 9)}${num(share.toFixed(1) + '%', 9)}${alert}`
    );
  }
  const total = studies.reduce((sum, s) => sum + s.usd, 0);
  const estourou = studies.filter((s) => s.usd > teto);
  console.log('─'.repeat(82));
  console.log(`TOTAL  US$ ${total.toFixed(4)}  (${brl(total)})`);
  console.log(
    estourou.length
      ? `\n⚠ ${estourou.length} estudo(s) passaram do teto.`
      : '\n✅ Nenhum estudo atingiu o teto — o corte de custo não interrompeu nada.'
  );
  console.log('\nPasses por tipo:');
  const porTipo = {};
  for (const study of studies) {
    for (const p of study.passes) {
      porTipo[p.tipo] ??= { n: 0, usd: 0 };
      porTipo[p.tipo].n++;
      porTipo[p.tipo].usd += Number(p.custo_usd);
    }
  }
  for (const [tipo, agg] of Object.entries(porTipo).sort((a, b) => b[1].usd - a[1].usd)) {
    console.log(`  ${pad(tipo, 16)}${num(agg.n, 4)} passes   US$ ${agg.usd.toFixed(4)}  (${brl(agg.usd)})`);
  }
  console.log();
};

commands.triagem = async () => {
  const studies = await loadStudies();
  const all = studies.flatMap((s) => s.findings.map((f) => ({ ...f, estudo: s.nome, sid: s.id })));
  const count = (list, key) => {
    const map = new Map();
    for (const item of list) map.set(item[key], (map.get(item[key]) ?? 0) + 1);
    return [...map].sort((a, b) => b[1] - a[1]);
  };
  console.log(`\n${all.length} achados no banco\n`);
  console.log('--- status ---');
  for (const [k, v] of count(all, 'status')) console.log(`  ${num(v, 5)}  ${k}`);

  const explicit = all.filter((f) => f.verdict);
  console.log(`\n--- veredito humano explícito: ${explicit.length} de ${all.length} ---`);
  for (const [k, v] of count(explicit, 'verdict')) console.log(`  ${num(v, 5)}  ${k}`);

  console.log('\n--- FP marcados, por tipo de erro ---');
  for (const [k, v] of count(explicit.filter((f) => f.verdict === 'fp'), 'tipo')) {
    console.log(`  ${num(v, 5)}  ${k}`);
  }

  // status mexido sem veredito = reconciliação automática, não triagem humana.
  const auto = all.filter((f) => f.status !== 'pendente' && !f.verdict);
  console.log(`\n--- status alterado SEM veredito (reconciliação automática): ${auto.length} ---`);
  for (const [k, v] of count(auto, 'tipo').slice(0, 8)) console.log(`  ${num(v, 5)}  ${k}`);

  console.log('\n--- triagem por estudo ---');
  for (const study of studies) {
    if (!study.findings.length) continue;
    const fps = study.findings.filter((f) => f.verdict === 'fp').length;
    console.log(
      `  ${pad(study.nome, 46)}${num(study.findings.length, 5)} achados  ${num(study.triados, 4)} triados  ${num(fps, 4)} FP`
    );
  }
  console.log();
};

commands.achados = async (term, ...flags) => {
  if (!term) throw new Error('uso: achados <estudo> [--tipo X] [--status Y] [--slide sNN] [--origem Z]');
  const studies = await loadStudies();
  const study = resolveStudy(studies, term);
  const flag = (name) => {
    const index = flags.indexOf(`--${name}`);
    return index >= 0 ? flags[index + 1] : null;
  };
  const filters = { tipo: flag('tipo'), status: flag('status'), slide: flag('slide'), origem: flag('origem') };
  let rows = study.findings;
  for (const [key, value] of Object.entries(filters)) {
    if (!value) continue;
    const field = key === 'slide' ? 'slide_ref' : key;
    rows = rows.filter((f) => String(f[field]).toLowerCase() === value.toLowerCase());
  }
  console.log(`\n${study.nome}  ·  ${study.id}`);
  console.log(`${study.cidade ?? '—'}/${study.uf ?? '—'} · ${study.state.label} · ${brl(study.usd)} · ata_confirmada=${study.ata_confirmada}`);
  console.log(`${rows.length} achado(s)${Object.values(filters).some(Boolean) ? ' (filtrado)' : ''}\n`);
  console.log(`${pad('slide', 7)}${pad('tipo', 24)}${pad('origem', 10)}${pad('status', 11)}${pad('verd', 6)}rule_id`);
  console.log('─'.repeat(100));
  const order = (ref) => Number(String(ref).replace(/\D/g, '')) || 9999;
  for (const f of [...rows].sort((a, b) => order(a.slide_ref) - order(b.slide_ref))) {
    console.log(
      `${pad(f.slide_ref, 7)}${pad(f.tipo, 24)}${pad(f.origem, 10)}${pad(f.status, 11)}${pad(f.verdict ?? '—', 6)}${f.rule_id}`
    );
  }
  console.log(`\nDetalhe de um achado:  node scripts/corretor-db.mjs achado ${study.id.slice(0, 8)} <rule_id>\n`);
};

commands.achado = async (term, ruleId, ...flags) => {
  if (!term || !ruleId) throw new Error('uso: achado <estudo> <rule_id> [--img <dir>]');
  const studies = await loadStudies();
  const study = resolveStudy(studies, term);
  const rows = await rest(
    `findings_v3?study_id=eq.${study.id}&rule_id=eq.${encodeURIComponent(ruleId)}&select=*`
  );
  if (!rows.length) throw new Error(`rule_id "${ruleId}" não existe em ${study.nome}`);
  const finding = rows[0];
  const payload = finding.payload ?? {};

  console.log(`\n${'═'.repeat(90)}`);
  console.log(`${finding.tipo}  ·  ${finding.slide_ref}  ·  ${finding.origem}  ·  ${finding.status}${finding.verdict ? ` · veredito=${finding.verdict}` : ''}`);
  console.log(`${finding.titulo}`);
  console.log(`${'═'.repeat(90)}`);
  console.log(`${finding.detalhe}\n`);
  console.log(`estudo   ${study.nome}  (${study.id})`);
  console.log(`rule_id  ${finding.rule_id}`);
  console.log(`id       ${finding.id}`);
  if (payload.escalated) console.log(`escalado para o modelo maior: sim`);

  const table = payload.viz?.table;
  if (table) {
    console.log(`\n── tabela extraída: ${table.title ?? '(sem título)'} ──`);
    console.log(`colunas (${table.columns?.length ?? 0}): ${JSON.stringify(table.columns)}`);
    console.log(`colKinds: ${JSON.stringify(table.colKinds)}`);
    console.log(`totals   (${table.totals?.length ?? 0}): ${JSON.stringify(table.totals)}`);
    console.log(`linhas: ${table.rows?.length ?? 0} · badColumns: ${JSON.stringify(payload.viz.badColumns)} · badRows: ${JSON.stringify(payload.viz.badRows)}`);

    // O array de totais costuma vir compacto (a visão pula as células vazias que
    // o rótulo "Total" atravessa), enquanto o motor casa por posição. Quando os
    // tamanhos divergem, a comparação sai trocada de coluna.
    if (table.totals && table.columns && table.totals.length !== table.columns.length) {
      console.log(
        `\n⚠ ALERTA DE ALINHAMENTO: ${table.totals.length} totais para ${table.columns.length} colunas.` +
          `\n  O casamento por posição pode estar comparando a coluna errada — confira contra a imagem.`
      );
    }
    if (table.rows?.length) {
      console.log('\nprimeiras linhas:');
      for (const row of table.rows.slice(0, 5)) console.log(`  ${JSON.stringify(row)}`);
    }
  }
  for (const note of payload.viz?.notes ?? []) console.log(`\n  ▸ ${note}`);

  const image = payload.evidenceImage;
  if (image) {
    console.log(`\nimagem-evidência: ${image}`);
    const dirIndex = flags.indexOf('--img');
    if (dirIndex >= 0) {
      const dir = flags[dirIndex + 1] ?? '.';
      mkdirSync(dir, { recursive: true });
      const target = join(dir, `${study.id.slice(0, 8)}_${finding.slide_ref}_${finding.rule_id}.png`);
      const response = await fetch(image);
      if (!response.ok) throw new Error(`download falhou: ${response.status}`);
      writeFileSync(target, Buffer.from(await response.arrayBuffer()));
      console.log(`salva em: ${target}`);
    } else {
      console.log('(passe --img <dir> para baixar o PNG)');
    }
  }
  console.log();
};

/**
 * Inventário de arquivos-fonte: quais PPTX dos estudos analisados existem nesta
 * máquina e quais precisam ser pedidos. Sem o arquivo não há como reprocessar —
 * o pipeline extrai as imagens dos bytes e o banco não guarda o PPTX.
 *
 * O `sha1` do banco é o do arquivo inteiro (`pptxToIr`), então o casamento por
 * nome é confirmado por hash. Autor sai de `docProps/core.xml`.
 */
commands.arquivos = async (...flags) => {
  const { createHash } = await import('node:crypto');
  const { readdirSync, statSync } = await import('node:fs');
  const { unzipSync, strFromU8 } = await import('fflate');

  const extra = flags.filter((f) => !f.startsWith('--'));
  const roots = extra.length ? extra : [join(ROOT, '..'), join(process.env.USERPROFILE ?? ROOT, 'Desktop')];

  // Varredura por nome primeiro: hashear 200+ PPTX (alguns de 270 MB) é caro.
  const local = new Map();
  const walk = (dir, depth = 0) => {
    if (depth > 6) return;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full, depth + 1);
      else if (/\.pptx$/i.test(entry.name)) {
        const key = entry.name.toLowerCase();
        if (!local.has(key)) local.set(key, []);
        local.get(key).push(full);
      }
    }
  };
  for (const root of new Set(roots)) walk(root);

  const authorOf = (path) => {
    try {
      const zip = unzipSync(readFileSync(path), { filter: (f) => f.name === 'docProps/core.xml' });
      const xml = zip['docProps/core.xml'];
      if (!xml) return null;
      const text = strFromU8(xml);
      const grab = (tag) => new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`).exec(text)?.[1]?.trim() || null;
      return { criador: grab('dc:creator'), ultimo: grab('cp:lastModifiedBy'), modificado: grab('dcterms:modified') };
    } catch {
      return null;
    }
  };

  const studies = await loadStudies();
  const versions = await rest('study_versions?select=study_id,sha1,n_slides,arquivo,n&order=n');

  // O nome do arquivo é renomeado com frequência ("_estudo exemplo", "_Reduzido"),
  // então o casamento por nome perde caso. Com --hash, indexa tudo por sha1 e
  // acha o arquivo onde quer que esteja. É caro (lê todos os PPTX), daí ser opcional.
  const bySha = new Map();
  if (flags.includes('--hash')) {
    const paths = [...local.values()].flat();
    let done = 0;
    for (const path of paths) {
      done++;
      try {
        const size = statSync(path).size;
        process.stderr.write(`\r  hash ${done}/${paths.length} (${(size / 1048576).toFixed(0)} MB) …          `);
        bySha.set(createHash('sha1').update(readFileSync(path)).digest('hex'), path);
      } catch {
        /* arquivo grande demais p/ o heap ou sem permissão — segue */
      }
    }
    process.stderr.write('\r'.padEnd(60) + '\r');
  }

  console.log(`\nVarrido: ${[...new Set(roots)].join(', ')}\n${local.size} nome(s) de .pptx distintos encontrados\n`);
  const faltando = [];
  const achados = [];

  for (const study of studies) {
    const version = versions.find((v) => v.study_id === study.id);
    const arquivo = version?.arquivo ?? `${study.nome}.pptx`;
    const candidates = local.get(arquivo.toLowerCase()) ?? [];
    let match = bySha.get(version?.sha1) ?? null;
    for (const path of candidates) {
      if (match) break;
      const hash = createHash('sha1').update(readFileSync(path)).digest('hex');
      if (hash === version?.sha1) match = path;
    }
    // nome bate mas conteúdo não: é outra versão do mesmo estudo, não serve p/ reprocessar
    const outraVersao = !match && candidates.length ? candidates[0] : null;
    const linha = { study, arquivo, match, outraVersao, version };
    if (match) achados.push(linha);
    else faltando.push(linha);
  }

  const show = (linha, prefix) => {
    const { study, arquivo, match, outraVersao } = linha;
    // cliente/projeto saem da ata lida no portão — é o que dá para saber de quem
    // é o estudo sem nome de analista no banco.
    const cliente = study.ata?.cliente && study.ata.cliente !== '—' ? study.ata.cliente : null;
    const local = [study.cidade, study.uf].filter(Boolean).join('/');
    console.log(`${prefix} ${arquivo}`);
    console.log(
      `     ${study.id.slice(0, 8)} · ${linha.version?.n_slides ?? '?'} slides · ${study.state.label} · ${brl(study.usd)}` +
        `${cliente ? ` · cliente: ${cliente}` : ''}${local ? ` · ${local}` : ''}`
    );
    if (match) {
      console.log(`     local: ${match}`);
      const author = authorOf(match);
      if (author) {
        console.log(
          `     autor: ${author.criador ?? '—'}${author.ultimo && author.ultimo !== author.criador ? `  ·  último a salvar: ${author.ultimo}` : ''}${author.modificado ? `  ·  ${author.modificado.slice(0, 10)}` : ''}`
        );
      }
    } else if (outraVersao) {
      console.log(`     ⚠ existe arquivo de mesmo nome, mas com conteúdo diferente (outra versão): ${outraVersao}`);
    }
  };

  console.log(`${'═'.repeat(96)}\nTEMOS O ARQUIVO — ${achados.length} estudo(s)\n${'═'.repeat(96)}`);
  for (const linha of achados) show(linha, '✅');

  console.log(`\n${'═'.repeat(96)}\nFALTA O ARQUIVO — ${faltando.length} estudo(s) · pedir ao time\n${'═'.repeat(96)}`);
  const prioridade = (linha) => (linha.study.state.warn ? 0 : 1);
  for (const linha of faltando.sort((a, b) => prioridade(a) - prioridade(b))) {
    show(linha, linha.study.state.warn ? '⛔' : '  ');
  }

  console.log(`\nLista de nomes para pedir:\n`);
  for (const linha of faltando) console.log(`  ${linha.arquivo}`);
  console.log();
};

commands.raw = async (path) => {
  if (!path) throw new Error('uso: raw "findings_v3?select=*&limit=5"  (query PostgREST crua)');
  console.log(JSON.stringify(await rest(path), null, 2));
};

const HELP = `
corretor-db — leitura do banco do Corretor (somente leitura)

  estudos                          panorama: custo, estado do processamento, pendentes, triagem
  custo                            custo por estudo contra o teto de R$ ${BUDGET_STUDY_BRL} + passes por tipo
  triagem                          o que foi marcado por gente vs. reconciliação automática
  achados <estudo> [filtros]       achados do estudo · --tipo --status --slide --origem
  achado <estudo> <rule_id>        payload completo, tabela, notas · --img <dir> baixa a evidência
  arquivos [dir...]                quais PPTX temos localmente, quais faltam pedir, e o autor de cada um
  raw "<query>"                    query PostgREST crua

<estudo> aceita uuid, prefixo do uuid ou trecho do nome ("toledo", "marka").

  node scripts/corretor-db.mjs estudos
  node scripts/corretor-db.mjs achados toledo --tipo ABSOLUTE_SUM
  node scripts/corretor-db.mjs achado toledo iavis-sum-66225dd785-0 --img ./tmp
`;

const [command, ...args] = process.argv.slice(2);
if (!command || !commands[command]) {
  console.log(HELP);
  // exitCode em vez de exit(): com fetch pendente o process.exit derruba o libuv no Windows.
  process.exitCode = command ? 2 : 0;
} else {
  commands[command](...args).catch((error) => {
    console.error(`\n✖ ${error.message}\n`);
    process.exitCode = 1;
  });
}
