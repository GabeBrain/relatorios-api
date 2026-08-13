// Aceite do `fonte_extractor.py` sobre os 3 pacotes de planilhas reais
// (Rolândia e Toledo, jul/2026; Marka, jan/2026), extraídos em 13/ago/2026.
//
// Trava a verdade numérica que o SOURCE_CROSSCHECK vai consumir e, junto, o
// contrato medido em `fontes/README.md`: o nome do arquivo varia em toda
// dimensão, mas a aba não; o cabeçalho muda de linha entre gerações; e
// "Oferta Atual" e "Oferta         Final" são o mesmo conceito.
//
// Os valores conferidos à mão contra as planilhas estão em FP_sessao_2026-08-12.md
// (FN-04) e no MANIFEST de cada pacote.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

interface Bloco {
  papel: string;
  tabela: string;
  recorte: string | null;
  arquivo: string;
  aba: string;
  cabecalho_linha: number;
  conceitos?: string[];
  recortes?: string[];
  itens: Array<{ rotulo: string | null; linha: number; valores?: Record<string, number | null>; recortes?: Record<string, Record<string, number>> }>;
  total?: { valores?: Record<string, number | null>; recortes?: Record<string, Record<string, number>> } | null;
}

interface Fonte {
  fonte_version: number;
  estudo: string;
  inventario: Array<{ arquivo: string; papel: string | null; recorte: string | null }>;
  blocos: Bloco[];
  avisos: Array<Record<string, unknown>>;
}

const CALIBRACAO = join(__dirname, '../../../../../../docs/features/corretor-vocacionais/calibracao');

const carrega = (slug: string, nome: string): Fonte =>
  JSON.parse(readFileSync(join(CALIBRACAO, slug, `${nome}.fonte.json`), 'utf8'));

const rolandia = carrega('housi-rolandia-2026-07', 'rolandia');
const toledo = carrega('housi-toledo-2026-07', 'toledo');
const marka = carrega('marka-tancredo-2026-01', 'marka');

const oferta = (f: Fonte, tabela: string, recorte: string | null) =>
  f.blocos.find((b) => b.papel === 'oferta' && b.tabela === tabela && b.recorte === recorte);

const socio = (f: Fonte, tabela: string) => f.blocos.find((b) => b.papel === 'socio' && b.tabela === tabela);

describe('fonte_extractor — verdade numérica das planilhas do analista', () => {
  it('extrai os 3 pacotes com a mesma versão de schema', () => {
    for (const f of [rolandia, toledo, marka]) expect(f.fonte_version).toBe(1);
  });

  describe('Toledo — confirma os totais que o estudo declara', () => {
    // Estes números fecham o caso dos ABSOLUTE_SUM: os totais do deck (s42/s43/s98
    // = 1099/702/397 e s100/s101 = 665/524/141) estavam CERTOS o tempo todo.
    it('1 Km: 28 empreendimentos, 1.099 lançadas, 397 em oferta', () => {
      const bloco = oferta(toledo, 'padrao', '1 km');
      expect(bloco?.arquivo).toBe('1.CONSOLIDADA 1 KM.xlsm');
      expect(bloco?.total?.valores).toMatchObject({
        n_empreendimentos: 28,
        oferta_lancada: 1099,
        oferta_atual: 397,
      });
    });

    it('2 Km: 19 empreendimentos, 665 lançadas, 141 em oferta', () => {
      expect(oferta(toledo, 'padrao', '2 km')?.total?.valores).toMatchObject({
        n_empreendimentos: 19,
        oferta_lancada: 665,
        oferta_atual: 141,
      });
    });

    it('19 empreendimentos batem com as 19 linhas lidas em s100+s101', () => {
      // 11 linhas no s100 + 8 no s101 — por isso o par fecha na paginação (v0.51).
      // Já s42+s43 somam 36 linhas para 28 empreendimentos: 8 linhas fantasma.
      const doisKm = oferta(toledo, 'padrao', '2 km')?.total?.valores?.n_empreendimentos;
      expect(doisKm).toBe(11 + 8);
      expect(oferta(toledo, 'padrao', '1 km')?.total?.valores?.n_empreendimentos).not.toBe(12 + 24);
    });
  });

  describe('Rolândia — o gabarito do FN-04', () => {
    it('verticalização: 5,16% em Rolândia, não os 5,7% que o deck afirma', () => {
      const apto = socio(rolandia, 'domicilios_por_tipo')?.itens.find((i) => i.rotulo === 'Apartamento');
      expect(apto?.recortes?.['Rolândia']['%']).toBe(0.0516);
      // e os três raios, que o deck acertou
      expect(apto?.recortes?.['Até 1 km']['%']).toBe(0.1571);
      expect(apto?.recortes?.['Até 2 km']['%']).toBe(0.0913);
      expect(apto?.recortes?.['Até 3 Km']['%']).toBe(0.0594);
    });

    it('domicílios do PR: 4.216.107, não os 4.216.017 do deck', () => {
      expect(socio(rolandia, 'domicilios_por_tipo')?.total?.recortes?.['PR'].absoluto).toBe(4216107);
      expect(socio(rolandia, 'domicilios_por_tipo')?.total?.recortes?.['Rolândia'].absoluto).toBe(25787);
    });

    it('condição de ocupação confirma os 65,1% do deck', () => {
      const proprio = socio(rolandia, 'condicao_ocupacao')?.itens.find((i) => i.rotulo === 'Próprio');
      expect(proprio?.recortes?.['Rolândia']['%']).toBeCloseTo(0.6509, 4);
      expect(proprio?.recortes?.['Até 1 km']['%']).toBeCloseTo(0.6507, 4);
    });
  });

  describe('o contrato: âncora na aba, não no nome nem na coordenada', () => {
    it('mesmo papel, três nomes de arquivo irreconhecíveis entre si', () => {
      const nome = (f: Fonte, papel: string) => f.inventario.find((i) => i.papel === papel)?.arquivo;
      expect(nome(rolandia, 'socio')).toBe('02. SOCIODEMOGRAFIA.xlsm');
      expect(nome(toledo, 'socio')).toBe('02. SOCIODEMOGRAFIA 2 raios.xlsm');
      expect(nome(marka, 'socio')).toBe('1. OnMaps (5.xlsm');
      // …e os três produzem o mesmo bloco
      for (const f of [rolandia, toledo, marka]) expect(socio(f, 'domicilios_por_tipo')).toBeDefined();
    });

    it('cabeçalho de Tipologia muda de linha entre gerações (5 em jul/26, 6 em jan/26)', () => {
      expect(oferta(toledo, 'tipologia', '1 km')?.cabecalho_linha).toBe(5);
      expect(oferta(marka, 'tipologia', 'primaria')?.cabecalho_linha).toBe(6);
      // Padrão fica na 5 nas duas — por isso a linha não pode ser assumida por aba.
      expect(oferta(marka, 'padrao', 'primaria')?.cabecalho_linha).toBe(5);
    });

    it('"Oferta Final" do Marka é o mesmo conceito que "Oferta Atual"', () => {
      const bloco = oferta(marka, 'padrao', 'primaria');
      expect(bloco?.conceitos).toContain('oferta_atual');
      expect(bloco?.total?.valores?.oferta_atual).toBe(2259);
      expect(bloco?.total?.valores?.oferta_lancada).toBe(12660);
    });

    it('recorte sai do nome do arquivo, mesmo com sufixo colado ("1 Km_verificação")', () => {
      // Nome vindo do disco chega decomposto (NFD) no Windows; o literal aqui é
      // NFC. Comparar sem normalizar falha por um acento invisível.
      const nfc = (s?: string) => s?.normalize('NFC');
      expect(nfc(oferta(rolandia, 'padrao', '1 km')?.arquivo)).toBe(
        '01. Consolidada - 1 Km_verificação - OK.xlsm'.normalize('NFC')
      );
      expect(oferta(marka, 'padrao', 'his 1')).toBeDefined();
    });
  });

  describe('falhar alto, nunca em silêncio', () => {
    it('célula quebrada vira null + aviso, jamais zero', () => {
      const invalidas = rolandia.avisos.filter((a) => a.tipo === 'celula_invalida');
      expect(invalidas.length).toBeGreaterThan(0);
      const ano = oferta(rolandia, 'ano', '1 km');
      const apos2024 = ano?.itens.find((i) => i.rotulo && /ap[oó]s/i.test(i.rotulo));
      if (apos2024) expect(apos2024.valores?.vendas).toBeNull();
    });

    it('dois arquivos disputando o mesmo papel viram aviso, não escolha calada', () => {
      const ambiguo = toledo.avisos.find((a) => a.tipo === 'papel_ambiguo');
      expect(ambiguo).toBeDefined();
      expect((ambiguo?.arquivos as string[]).length).toBe(2);
    });

    it('as duas absorções do Toledo são escopos distintos, ambas preservadas', () => {
      // "- ZI" (23.499 domicílios) x sufixo vazio (56.405): escolher pelo nome
      // pegaria o escopo errado calado.
      const absorcoes = toledo.blocos.filter((b) => b.papel === 'absorcao');
      expect(absorcoes.length).toBe(2);
      expect(new Set(absorcoes.map((b) => b.arquivo)).size).toBe(2);
    });
  });
});
