import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ESTADOS, FASES } from './state-machine';
import { RESPONSAVEIS } from '../types';

const SQL = readFileSync(resolve(__dirname, '../../../../supabase/migrations/20261112160000_slide_maker.sql'), 'utf8');
const semComentarios = SQL.replace(/--.*$/gm, '');
const TABELAS = [...semComentarios.matchAll(/create table public\.(slide_maker_\w+)/g)].map((m) => m[1]);

/** Valores do primeiro `check (<coluna> in (...))` da coluna. */
function valoresDoCheck(coluna: string): string[] {
  const m = semComentarios.match(new RegExp(`${coluna}\\s+text[^,]*?check \\(${coluna} in \\(([^)]*)\\)`, 's'));
  if (!m) throw new Error(`check de ${coluna} não encontrado`);
  return [...m[1].matchAll(/'([^']+)'/g)].map((v) => v[1]);
}

describe('migration do Slide Maker (§7.3: nenhum acesso anon)', () => {
  it('cria as seis tabelas previstas', () => {
    expect(TABELAS.sort()).toEqual([
      'slide_maker_arquivos', 'slide_maker_fases', 'slide_maker_jobs',
      'slide_maker_mensagens', 'slide_maker_relatorios', 'slide_maker_versoes',
    ]);
  });

  it('liga RLS e revoga anon/authenticated em todas as tabelas', () => {
    for (const t of TABELAS) {
      expect(semComentarios, t).toContain(`alter table public.${t} enable row level security;`);
      expect(semComentarios, t).toContain(`revoke all on table public.${t} from anon, authenticated;`);
    }
  });

  it('não cria policy nem concede nada a anon ou authenticated', () => {
    expect(semComentarios).not.toMatch(/create policy/i);
    expect(semComentarios).not.toMatch(/\bgrant\b/i);
  });

  it('buckets privados, inclusive se já existirem', () => {
    const buckets = [...semComentarios.matchAll(/\('(slide-maker-\w+)', '\1', (\w+),/g)];
    expect(buckets.map((b) => b[1])).toEqual(['slide-maker-entrada', 'slide-maker-saida', 'slide-maker-trabalho']);
    expect(buckets.every((b) => b[2] === 'false')).toBe(true);
    expect(semComentarios).toMatch(/on conflict \(id\) do update set public = false, file_size_limit = excluded\.file_size_limit;/);
  });

  it('domínios do banco batem com a máquina de estados e os tipos', () => {
    expect(valoresDoCheck('estado')).toEqual([...ESTADOS]);
    expect(valoresDoCheck('fase_em_curso')).toEqual([...FASES]);
    expect(valoresDoCheck('erro_fase')).toEqual([...FASES]);
    expect(valoresDoCheck('responsavel')).toEqual([...RESPONSAVEIS]);
  });

  it('garante no banco uma fase ativa por trabalho', () => {
    expect(semComentarios).toMatch(
      /create unique index slide_maker_fases_uma_por_job on public\.slide_maker_fases \(job_id\)\s+where status in \('enfileirada', 'executando'\);/,
    );
  });
});
