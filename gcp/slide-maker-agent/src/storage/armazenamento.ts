import type { SupabaseClient } from '@supabase/supabase-js';

export const BUCKETS = {
  entrada: 'slide-maker-entrada',
  saida: 'slide-maker-saida',
  trabalho: 'slide-maker-trabalho',
} as const;
export type Bucket = (typeof BUCKETS)[keyof typeof BUCKETS];

/** Buckets privados (§7.2). Downloads só por URL assinada de curta duração. */
export interface Armazenamento {
  gravar(bucket: Bucket, caminho: string, dados: Uint8Array, contentType?: string): Promise<void>;
  ler(bucket: Bucket, caminho: string): Promise<Uint8Array>;
  /** Caminhos completos (recursivo) sob o prefixo. */
  listar(bucket: Bucket, prefixo: string): Promise<string[]>;
  remover(bucket: Bucket, caminhos: string[]): Promise<void>;
  urlAssinada(bucket: Bucket, caminho: string, segundos: number): Promise<string>;
}

export class ArmazenamentoMemoria implements Armazenamento {
  readonly objetos = new Map<string, Uint8Array>();
  private chave = (b: Bucket, c: string) => `${b}/${c}`;

  async gravar(b: Bucket, c: string, dados: Uint8Array) {
    this.objetos.set(this.chave(b, c), Uint8Array.from(dados));
  }
  async ler(b: Bucket, c: string) {
    const v = this.objetos.get(this.chave(b, c));
    if (!v) throw new Error('objeto inexistente');
    return Uint8Array.from(v);
  }
  async listar(b: Bucket, prefixo: string) {
    const base = this.chave(b, prefixo.replace(/\/?$/, '/'));
    return [...this.objetos.keys()].filter((k) => k.startsWith(base)).map((k) => k.slice(b.length + 1));
  }
  async remover(b: Bucket, caminhos: string[]) {
    for (const c of caminhos) this.objetos.delete(this.chave(b, c));
  }
  async urlAssinada(b: Bucket, c: string, segundos: number) {
    if (!this.objetos.has(this.chave(b, c))) throw new Error('objeto inexistente');
    return `memoria://${b}/${c}?expira=${segundos}`;
  }
}

export class ArmazenamentoSupabase implements Armazenamento {
  constructor(private readonly db: SupabaseClient) {}

  async gravar(b: Bucket, c: string, dados: Uint8Array, contentType = 'application/octet-stream') {
    const { error } = await this.db.storage.from(b).upload(c, dados, { contentType, upsert: true });
    if (error) throw new Error(`Storage: gravar em ${b} falhou`);
  }

  async ler(b: Bucket, c: string) {
    const { data, error } = await this.db.storage.from(b).download(c);
    if (error || !data) throw new Error(`Storage: ler de ${b} falhou`);
    return new Uint8Array(await data.arrayBuffer());
  }

  async listar(b: Bucket, prefixo: string) {
    const saida: string[] = [];
    const pendentes = [prefixo.replace(/\/$/, '')];
    while (pendentes.length) {
      const pasta = pendentes.pop()!;
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await this.db.storage.from(b).list(pasta, { limit: 1000, offset });
        if (error) throw new Error(`Storage: listar ${b} falhou`);
        for (const item of data ?? []) {
          const caminho = `${pasta}/${item.name}`;
          // Na listagem do Supabase, pastas vêm sem id.
          if (item.id === null) pendentes.push(caminho);
          else saida.push(caminho);
        }
        if (!data || data.length < 1000) break;
      }
    }
    return saida;
  }

  async remover(b: Bucket, caminhos: string[]) {
    for (let i = 0; i < caminhos.length; i += 500) {
      const { error } = await this.db.storage.from(b).remove(caminhos.slice(i, i + 500));
      if (error) throw new Error(`Storage: remover de ${b} falhou`);
    }
  }

  async urlAssinada(b: Bucket, c: string, segundos: number) {
    const { data, error } = await this.db.storage.from(b).createSignedUrl(c, segundos, { download: true });
    if (error || !data) throw new Error(`Storage: URL assinada de ${b} falhou`);
    return data.signedUrl;
  }
}
