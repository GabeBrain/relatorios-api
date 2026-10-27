import { strToU8, zipSync } from 'fflate';
import { summarizeStudy, type InventoryRow, type StudyDataset, type StudyResult } from './study';

function csv(rows: Record<string, unknown>[]) {
  const keys = [...new Set(rows.flatMap(r => Object.keys(r)))];
  const cell = (v: unknown) => {
    const raw = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
    const safe = typeof v === 'string' && /^[=+@\-\t\r]/.test(raw) ? `'${raw}` : raw;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  return '\uFEFF' + [keys.map(cell).join(';'), ...rows.map(r => keys.map(k => cell(r[k])).join(';'))].join('\r\n');
}
export function evidenceFiles(dataset: StudyDataset, rows: InventoryRow[], result: StudyResult) {
  return {
    'manifesto.json': JSON.stringify(summarizeStudy(dataset, rows, result), null, 2),
    'protocolo.json': JSON.stringify(result.protocol, null, 2),
    'avaliacoes.csv': csv(result.trials),
    'exclusoes.csv': csv(result.exclusions),
    'inventario.csv': csv(rows.map(({ origin: _origin, ...r }) => r)),
    'dicionario.json': JSON.stringify({
      id: 'Identificador estável do empreendimento na fonte.', cutoff: 'Último mês de dados permitido na previsão, AAAA-MM.', targetMonth: 'Mês do resultado posterior comparado, AAAA-MM.',
      horizon: 'Meses de calendário entre a data da previsão e o resultado posterior; não define duração do fluxo.',
      target: { stock: 'Estoque final em unidades', net: 'Vendas líquidas de todo o intervalo, com duração documentada e balanço conciliado' },
      units: 'Unidades lançadas na data da previsão.', initialStock: 'Estoque na data da previsão.', age: 'Meses desde lançamento, mês do lançamento = 1.',
      predicted: 'Valor previsto para o alvo; null = previsão indisponível.', actual: 'Valor reportado na fonte para o alvo; null = não comparável ou ausente.',
      error: 'Previsto menos reportado, em unidades; null quando não avaliável.', provenance: 'Origem do resultado posterior, não a flag atual do cadastro.',
      matched: 'Pertence à amostra comum dos métodos avaliáveis nesse horizonte e grupo de origem.',
      reason: 'Motivo de indisponibilidade ou qualificação da comparação.', modelVersion: 'Versão exata do método aplicado.',
      classification: 'Condições de estudo podem se sobrepor; são recalculadas em cada data histórica.',
    }, null, 2),
    'LEIA-ME.txt': 'Estudo exploratório de Curitiba. Não é arquivo de importação Geobrain.\nErro = previsto menos reportado. Alvo stock = estoque final em unidades; net = vendas líquidas do intervalo.\nNulos significam indisponível, nunca zero. matched identifica amostra comum por horizonte e origem entre métodos avaliáveis.\nA média do erro absoluto e o viés dão o mesmo peso a cada empreendimento. Mediana e P90 descrevem previsões individuais.\nDatas: AAAA-MM. Idade: meses desde lançamento, lançamento = mês 1. Baselines não arredondados; Finotti conserva seu arredondamento original.\nprovenance: unknown = origem não comprovada, observed = coleta documentada, estimated = estimativa documentada, synthetic = teste fictício.\nFinotti treinado até setembro/2026: guardas temporais preservadas. Nenhuma faixa nova calibrada.\nSnapshot pode conter revisões posteriores. Atributos do cadastro atual não comprovam seu estado no passado.\nDados privados: respeitar permissões ao compartilhar. Hash e protocolo permitem identificar a fonte; conservar o snapshot local para repetir.\n',
  };
}
export function downloadStudyEvidence(dataset: StudyDataset, rows: InventoryRow[], result: StudyResult) {
  const files = evidenceFiles(dataset, rows, result);
  const zip = zipSync(Object.fromEntries(Object.entries(files).map(([name, text]) => [name, strToU8(text)])));
  const url = URL.createObjectURL(new Blob([zip as BlobPart], { type: 'application/zip' }));
  const a = document.createElement('a'); a.href = url; a.download = `estudo-curitiba-${result.protocol.study}.zip`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
