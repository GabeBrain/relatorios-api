export function hasEnglishThousands(text: string) {
  return /(?<![\d.,])\d{1,3}(?:,\d{3})+(?:\.\d+)?(?![\d,%])/u.test(text);
}

export async function validatePdfNumberFormat(buffer: ArrayBuffer) {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
  const task = pdfjs.getDocument({ data: buffer.slice(0) });
  try {
    const document = await task.promise;
    if (document.numPages !== 8) throw new Error(`O PDF exportado do Excel deve conter exatamente 8 páginas. O arquivo enviado possui ${document.numPages}. Gere novamente o relatório Excel e exporte as oito abas, ajustando cada aba a uma página completa. Não exclua páginas extras: elas podem conter dados.`);
    const pages: number[] = [];
    for (let index = 1; index <= document.numPages; index += 1) {
      const page = await document.getPage(index);
      const content = await page.getTextContent();
      if (content.items.some((item) => 'str' in item && hasEnglishThousands(item.str))) pages.push(index + 2);
      page.cleanup();
    }
    if (pages.length) throw new Error(`Não foi possível corrigir automaticamente todos os separadores nas páginas finais ${pages.join(', ')}. No Excel, abra Arquivo > Opções > Avançado, desmarque “Usar separadores do sistema” e defina decimal “,” e milhar “.”. Exporte novamente as oito abas e reenvie o PDF.`);
  } finally {
    await task.destroy();
  }
}
