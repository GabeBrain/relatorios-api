import { decodePDFRawStream, PDFArray, PDFDict, PDFDocument, PDFHexString, PDFName, PDFNumber, PDFRawStream, PDFRef, PDFString, StandardFonts } from 'pdf-lib';

// Only complete thousands groups; do not change Brazilian decimals or percentages.
export function normalizeEnglishThousands(text: string) {
  return text.replace(/(?<![\d.,])\d{1,3}(?:,\d{3})+(?:\.\d+)?(?![\d.,%])/gu,
    value => value.replace(/[,.]/g, separator => separator === ',' ? '.' : ','));
}

type Codec = {
  decode: Map<string, string>; encode: Map<string, string>; widths: number[];
  advance?: (code: string) => number | undefined;
  fallback?: { name: string; width: (char: string) => number };
};
const name = (value: string) => PDFName.of(value);
const chars = (bytes: Uint8Array) => Array.from(bytes, byte => String.fromCharCode(byte)).join('');

function fontCodec(font: PDFDict): Codec {
  const decode = new Map<string, string>();
  const cmap = font.lookup(name('ToUnicode'));
  if (cmap instanceof PDFRawStream) {
    const text = chars(decodePDFRawStream(cmap).decode());
    const unicode = (hex: string) => hex.match(/.{4}/g)?.map(unit => String.fromCharCode(parseInt(unit, 16))).join('') ?? '';
    for (const section of text.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
      for (const pair of section[1].matchAll(/<([\da-f]+)>\s*<([\da-f]+)>/gi)) decode.set(pair[1].toUpperCase(), unicode(pair[2]));
    }
    for (const section of text.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
      for (const range of section[1].matchAll(/<([\da-f]+)>\s*<([\da-f]+)>\s*(<([\da-f]+)>|\[([^\]]*)\])/gi)) {
        const first = parseInt(range[1], 16), last = parseInt(range[2], 16);
        if (last - first > 65535) throw new Error('Mapa de fonte PDF inválido.');
        const array = range[5]?.match(/<([\da-f]+)>/gi)?.map(value => value.slice(1, -1));
        for (let code = first; code <= last; code++) {
          const target = array ? array[code - first] : (parseInt(range[4], 16) + code - first).toString(16).padStart(range[4].length, '0');
          if (target) decode.set(code.toString(16).padStart(range[1].length, '0').toUpperCase(), unicode(target));
        }
      }
    }
  } else if (font.lookup(name('Subtype')) !== name('Type0')) {
    // ASCII digits/punctuation are identical in the standard PDF encodings.
    for (let code = 32; code < 127; code++) decode.set(code.toString(16).toUpperCase(), String.fromCharCode(code));
    const encoding = font.lookup(name('Encoding'));
    if (encoding instanceof PDFDict) {
      const differences = encoding.lookup(name('Differences'));
      // Custom encodings without a ToUnicode map cannot safely be rewritten.
      if (differences) return { decode: new Map(), encode: new Map(), widths: [] };
    }
  }
  const encode = new Map<string, string>();
  for (const [code, value] of decode) encode.set(value, code);
  const descendants = font.lookup(name('DescendantFonts'));
  const descendant = descendants instanceof PDFArray ? descendants.lookup(0) : undefined;
  const metrics = descendant instanceof PDFDict ? descendant : font;
  const widths = metrics.lookup(name(descendant ? 'W' : 'Widths'));
  const widthMap = new Map<number, number>();
  if (widths instanceof PDFArray) {
    if (descendant) {
      for (let i = 0; i < widths.size();) {
        const start = widths.lookup(i++), next = widths.lookup(i++);
        if (!(start instanceof PDFNumber)) break;
        if (next instanceof PDFArray) {
          for (let j = 0; j < next.size(); j++) {
            const value = next.lookup(j);
            if (value instanceof PDFNumber) widthMap.set(start.asNumber() + j, value.asNumber());
          }
        } else if (next instanceof PDFNumber) {
          const value = widths.lookup(i++);
          if (value instanceof PDFNumber && next.asNumber() - start.asNumber() <= 65535) {
            for (let code = start.asNumber(); code <= next.asNumber(); code++) widthMap.set(code, value.asNumber());
          }
        }
      }
    } else {
      const first = font.lookup(name('FirstChar'));
      if (first instanceof PDFNumber) for (let i = 0; i < widths.size(); i++) {
        const value = widths.lookup(i);
        if (value instanceof PDFNumber) widthMap.set(first.asNumber() + i, value.asNumber());
      }
    }
  }
  const defaultWidth = metrics.lookup(name('DW'));
  const identity = font.lookup(name('Encoding')) === name('Identity-H');
  const advance = (code: string) => {
    if (descendant && !identity) return undefined;
    return widthMap.get(parseInt(code, 16)) ?? (descendant ? defaultWidth instanceof PDFNumber ? defaultWidth.asNumber() : 1000 : undefined);
  };
  return { decode, encode, widths: [...new Set([...decode.keys()].map(code => code.length))].sort((a, b) => b - a), advance };
}

function rewriteContent(content: string, fonts: Map<string, Codec>) {
  // PDF strings are parsed before operators, so text containing "Tf" or "Tj" is inert.
  const tokens = content.match(/%[^\r\n]*|\((?:\\[\s\S]|[^()\\]|\((?:\\[\s\S]|[^()\\])*\))*\)|<[^<>]*>|\/[\w#.-]+|[^\s()[\]<>/%]+|[\s\S]/g) ?? [];
  let codec: Codec | undefined;
  let activeFont = '', fontSize = 0;
  const savedCodecs: { codec: Codec | undefined; activeFont: string; fontSize: number }[] = [];
  let pending: { index: number; codes: string[]; text: string[] }[] = [];
  let lastName = '';
  let inText = false;
  let unknownText = false;
  let arrayStart = -1;
  const flush = (operatorIndex = -1, operator = '') => {
    const original = pending.flatMap(item => item.text).join('');
    const normalized = normalizeEnglishThousands(original);
    if (normalized !== original && codec && !unknownText) {
      let offset = 0;
      const fallbackOperations = new Map<number, string>();
      let needsFallback = false;
      for (const item of pending) {
        let operations = '', run = '';
        const emitRun = () => { if (run) operations += `<${run}> Tj\n`; run = ''; };
        for (let i = 0; i < item.codes.length; i++, offset++) {
          if (normalized[offset] !== original[offset]) {
            const replacement = codec.encode.get(normalized[offset]);
            if (!replacement) {
              const advance = codec.advance?.(item.codes[i]);
              const fallback = codec.fallback;
              if (!fallback || advance === undefined || !Number.isFinite(advance) || !fontSize || !activeFont || !['Tj', 'TJ'].includes(operator)) {
                throw new Error('Não foi possível corrigir os separadores da fonte deste PDF. Exporte novamente com decimal “,” e milhar “.”.');
              }
              emitRun();
              const char = normalized[offset];
              const adjustment = Number((fallback.width(char) - advance).toFixed(6));
              // Keep the original character advance, Tc, Tz, baseline and color.
              operations += `/${fallback.name} ${fontSize} Tf <${char.charCodeAt(0).toString(16)}> Tj [${adjustment}] TJ /${activeFont} ${fontSize} Tf\n`;
              needsFallback = true;
              continue;
            }
            item.codes[i] = replacement;
          }
          run += item.codes[i];
        }
        emitRun();
        fallbackOperations.set(item.index, operations);
        tokens[item.index] = `<${item.codes.join('')}>`;
      }
      if (needsFallback) {
        const start = operator === 'TJ' ? arrayStart : pending[0].index;
        if (start < 0) throw new Error('Não foi possível localizar o texto numérico para corrigir o PDF.');
        let operations = '';
        for (let i = start; i < operatorIndex; i++) {
          if (fallbackOperations.has(i)) operations += fallbackOperations.get(i);
          else if (/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(tokens[i])) operations += `[${tokens[i]}] TJ\n`;
        }
        for (let i = start; i <= operatorIndex; i++) tokens[i] = '';
        tokens[start] = operations;
      }
    }
    pending = [];
    unknownText = false;
    arrayStart = -1;
  };
  tokens.forEach((token, index) => {
    if (token.startsWith('%')) return;
    if (token === 'q') { savedCodecs.push({ codec, activeFont, fontSize }); return; }
    if (token === 'Q') { flush(); const saved = savedCodecs.pop(); codec = saved?.codec; activeFont = saved?.activeFont ?? ''; fontSize = saved?.fontSize ?? 0; return; }
    if (token === 'BT') { inText = true; return; }
    if (token === 'ET') { flush(); inText = false; return; }
    if (token.startsWith('/')) { lastName = token.slice(1); return; }
    if (token === 'Tf') {
      flush(); codec = fonts.get(lastName); activeFont = lastName;
      let operandIndex = index - 1;
      while (operandIndex >= 0 && (!tokens[operandIndex].trim() || tokens[operandIndex].startsWith('%'))) operandIndex--;
      fontSize = Number(tokens[operandIndex]);
      return;
    }
    if (!inText) return;
    if (token === '[') { arrayStart = index; return; }
    if (token === 'Tj' || token === 'TJ' || token === "'" || token === '"') { flush(index, token); return; }
    if (!codec || (!token.startsWith('(') && !/^<[^<>]*>$/.test(token))) return;
    const bytes = token.startsWith('(') ? PDFString.of(token.slice(1, -1)).asBytes() : PDFHexString.of(token.slice(1, -1)).asBytes();
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
    const codes: string[] = [], text: string[] = [];
    for (let position = 0; position < hex.length;) {
      const width = codec.widths.find(length => codec!.decode.has(hex.slice(position, position + length)));
      if (!width) { unknownText = true; return; }
      const code = hex.slice(position, position + width), value = codec.decode.get(code)!;
      if (value.length !== 1) { unknownText = true; return; }
      codes.push(code); text.push(value); position += width;
    }
    pending.push({ index, codes, text });
  });
  return tokens.join('');
}

export async function normalizePdfNumberFormat(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  const document = await PDFDocument.load(buffer);
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const fallbackResources = new WeakMap<PDFDict, { regular: string; bold: string }>();
  const visited = new Set<PDFRawStream>();
  const processStream = (stream: PDFRawStream, resources: PDFDict): PDFRawStream => {
    const fonts = new Map<string, Codec>();
    const dictionary = resources.lookup(name('Font'));
    if (dictionary instanceof PDFDict && !fallbackResources.has(dictionary)) {
      const regularKey = dictionary.uniqueKey('BrainNumberRegular');
      const boldKey = dictionary.uniqueKey('BrainNumberBold');
      dictionary.set(regularKey, regular.ref); dictionary.set(boldKey, bold.ref);
      fallbackResources.set(dictionary, { regular: regularKey.asString().slice(1), bold: boldKey.asString().slice(1) });
    }
    if (dictionary instanceof PDFDict) for (const [key, value] of dictionary.entries()) {
      const font = document.context.lookup(value);
      if (font instanceof PDFDict) {
        const codec = fontCodec(font);
        const isBold = /bold/i.test(font.lookup(name('BaseFont'))?.toString() ?? '');
        const auxiliary = isBold ? bold : regular;
        codec.fallback = { name: fallbackResources.get(dictionary)![isBold ? 'bold' : 'regular'], width: char => auxiliary.widthOfTextAtSize(char, 1000) };
        fonts.set(key.asString().slice(1), codec);
      }
    }
    const text = chars(decodePDFRawStream(stream).decode());
    const rewritten = rewriteContent(text, fonts);
    const dictionaryCopy = stream.dict.clone(document.context);
    dictionaryCopy.delete(name('Filter')); dictionaryCopy.delete(name('DecodeParms'));
    return document.context.flateStream(Uint8Array.from(rewritten, char => char.charCodeAt(0)), Object.fromEntries(dictionaryCopy.entries().filter(([key]) => key !== name('Length')).map(([key, value]) => [key.asString().slice(1), value])));
  };
  const forms = (resources: PDFDict) => {
    const objects = resources.lookup(name('XObject'));
    if (!(objects instanceof PDFDict)) return;
    for (const [key, ref] of objects.entries()) {
      const stream = document.context.lookup(ref);
      if (!(stream instanceof PDFRawStream) || stream.dict.lookup(name('Subtype')) !== name('Form') || visited.has(stream)) continue;
      visited.add(stream);
      const own = stream.dict.lookup(name('Resources'));
      const scope = own instanceof PDFDict ? own : resources;
      forms(scope);
      const result = processStream(stream, scope);
      if (ref instanceof PDFRef) document.context.assign(ref, result); else objects.set(key, result);
    }
  };
  for (const page of document.getPages()) {
    const resources = page.node.Resources();
    if (!resources) continue;
    forms(resources);
    const contents = page.node.Contents();
    const replace = (value: unknown) => {
      const stream = document.context.lookup(value as PDFRef);
      if (!(stream instanceof PDFRawStream)) return value;
      return document.context.register(processStream(stream, resources));
    };
    if (contents instanceof PDFArray) for (let i = 0; i < contents.size(); i++) contents.set(i, replace(contents.get(i)) as PDFRef);
    else if (contents) page.node.set(name('Contents'), replace(contents) as PDFRef);
  }
  return (await document.save()).buffer as ArrayBuffer;
}
