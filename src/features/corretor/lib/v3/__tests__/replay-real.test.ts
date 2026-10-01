// Replay de um estudo REAL sobre as leituras de visão já cacheadas no banco.
// Não chama a OpenAI: refaz DET + visão + cruzamentos com as regras atuais e
// grava a lista de achados, para medir o efeito de uma mudança de regra.
//
// Uso (PowerShell ou bash), a partir da raiz do repo:
//   CORRETOR_REPLAY_PPTX="C:/…/deck.pptx" CORRETOR_REPLAY_STUDY=<uuid do estudo> \
//   CORRETOR_REPLAY_CITY="Campos do Jordão" CORRETOR_REPLAY_UF=SP \
//   CORRETOR_REPLAY_OUT=".tmp/replay.json" npx vitest run replay-real
// CORRETOR_REPLAY_FIXTURE=<json> lê leituras e fonte do arquivo (sem banco);
// CORRETOR_REPLAY_SAVE=<json> grava esse arquivo a partir do banco.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import { pptxToIr } from '../../audit/pptx-to-ir';
import { irToFindings } from '../../audit/ir-rules';
import { findTableImages } from '../table-images';
import { replayVisionPass } from '../ia-vision';
import { applyDeclaredExclusions } from '../declared-exclusions';
import { combineVisionFindings } from '../pipeline';
import { sourceCrosscheckFindings } from '../source-crosscheck';
import { confidenceOf } from '../confidence';
import type { Fonte } from '../fonte';

const env = process.env;
const PPTX = env.CORRETOR_REPLAY_PPTX;

function supabaseEnv(): { url: string; key: string } {
  const text = readFileSync('.env', 'utf-8');
  const get = (k: string) => text.match(new RegExp(`^${k}="?([^"\\n]+)"?`, 'm'))?.[1] ?? '';
  return { url: get('VITE_SUPABASE_URL'), key: get('VITE_SUPABASE_PUBLISHABLE_KEY') };
}

async function rest<T>(path: string): Promise<T> {
  const { url, key } = supabaseEnv();
  const res = await fetch(`${url}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

describe.skipIf(!PPTX)('replay de estudo real (leituras cacheadas)', () => {
  it('refaz os achados com as regras atuais', async () => {
    const bytes = new Uint8Array(readFileSync(PPTX as string));
    const ir = await pptxToIr(bytes, PPTX!.split(/[\\/]/).pop() ?? 'deck.pptx');
    const candidates = await findTableImages(bytes, ir);
    const readings = new Map<string, { payload: unknown; model?: string }>();
    let fonte: Fonte | null = null;
    // Fixture local (leituras + fonte) dispensa o banco; SAVE grava uma a partir dele.
    const fixture = env.CORRETOR_REPLAY_FIXTURE;
    if (fixture && existsSync(fixture)) {
      const saved = JSON.parse(readFileSync(fixture, 'utf-8')) as { readings: Record<string, { payload: unknown; model?: string }>; fonte: Fonte | null };
      for (const [sha1, r] of Object.entries(saved.readings)) readings.set(sha1, r);
      fonte = saved.fonte;
    } else {
      const sha1s = candidates.map((c) => c.sha1);
      for (let i = 0; i < sha1s.length; i += 40) {
        const rows = await rest<{ sha1: string; payload: unknown; model: string }[]>(
          `vision_cache?select=sha1,payload,model&sha1=in.(${sha1s.slice(i, i + 40).join(',')})`);
        for (const r of rows) readings.set(r.sha1, { payload: r.payload, model: r.model });
      }
      if (env.CORRETOR_REPLAY_STUDY) {
        const rows = await rest<{ payload: Fonte }[]>(`study_sources_v3?select=payload&study_id=eq.${env.CORRETOR_REPLAY_STUDY}`);
        fonte = rows[0]?.payload ?? null;
      }
      if (env.CORRETOR_REPLAY_SAVE) writeFileSync(env.CORRETOR_REPLAY_SAVE, JSON.stringify({ readings: Object.fromEntries(readings), fonte }));
    }
    if (env.CORRETOR_REPLAY_DUMP) {
      const want = new Set(env.CORRETOR_REPLAY_DUMP.split(',').map(Number));
      const dump = candidates.filter((c) => want.has(c.slide)).map((c) => ({ slide: c.slide, sha1: c.sha1, reading: readings.get(c.sha1) }));
      writeFileSync(`${env.CORRETOR_REPLAY_OUT ?? '.tmp/replay.json'}.dump.json`, JSON.stringify(dump, null, 1));
    }
    const city = env.CORRETOR_REPLAY_CITY ?? '';
    const uf = env.CORRETOR_REPLAY_UF ?? undefined;
    const vision = replayVisionPass(candidates, readings, { cidade: city, uf });
    vision.findings = applyDeclaredExclusions(ir, vision.findings);
    const acertos = { fonte: { comparados: 0, batem: 0 }, cruzamentos: { feitos: 0, batem: 0 } };
    const det = [
      ...irToFindings(ir, { city, uf }).filter((f) => !f.ok),
      ...(fonte ? sourceCrosscheckFindings(ir, fonte, acertos.fonte) : []),
    ];
    const { visionFindings } = combineVisionFindings(ir, vision, candidates, fonte, acertos);
    // Como o site grava: id único; achado com imagem de evidência é da visão.
    const seen = new Set<string>();
    const all = [...det, ...visionFindings.map((f) => ({ ...f, origem: f.origem ?? (f.evidenceSha1 ? 'IA_visao' : 'DET') }))]
      .filter((f) => (seen.has(f.id) ? false : (seen.add(f.id), true)));
    const level = { 1: 'ERRO', 2: 'PROVAVEL', 3: 'VERIFICAR' } as const;
    const rows = all.map((f) => ({
      slide: f.slideRef, tipo: f.type, nivel: level[confidenceOf(f, f.origem ?? 'DET')], titulo: f.title,
      detalhe: f.detail.replace(/\s+/g, ' ').slice(0, 240),
    })).sort((a, b) => (parseInt(a.slide?.slice(1) ?? '') || 999) - (parseInt(b.slide?.slice(1) ?? '') || 999));
    const summary = { candidatas: candidates.length, leituras: readings.size, achados: rows.length, tabelas: `${vision.tablesVerified}/${vision.tablesExtracted}`, acertos };
    if (env.CORRETOR_REPLAY_OUT) writeFileSync(env.CORRETOR_REPLAY_OUT, JSON.stringify({ summary, rows }, null, 1));
    console.log('[replay]', JSON.stringify(summary));
    for (const r of rows) console.log(`[replay] ${r.slide} ${r.tipo} ${r.nivel} | ${r.titulo} | ${r.detalhe.slice(0, 150)}`);
  }, 600_000);
});
