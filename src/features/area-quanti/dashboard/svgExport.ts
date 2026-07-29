const SVG_NS = 'http://www.w3.org/2000/svg';

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function cssValue(value: string, variables: Record<string, string>) {
  return value.replace(/var\((--[\w-]+)(?:,\s*([^\)]+))?\)/g, (_match, name: string, fallback?: string) => variables[name] ?? fallback ?? 'currentColor');
}

function readThemeVariables(element: HTMLElement) {
  const style = getComputedStyle(element);
  const names = ['--qd-text', '--qd-text-muted', '--qd-surface', '--qd-surface-2', '--qd-border', '--qd-primary'];
  return names.reduce<Record<string, string>>((variables, name) => {
    variables[name] = style.getPropertyValue(name).trim();
    return variables;
  }, {});
}

function copyChartSvg(svg: SVGSVGElement, variables: Record<string, string>) {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const width = Math.ceil(svg.getBoundingClientRect().width || Number(svg.getAttribute('width')) || 800);
  const height = Math.ceil(svg.getBoundingClientRect().height || Number(svg.getAttribute('height')) || 450);
  clone.setAttribute('xmlns', SVG_NS);
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  clone.setAttribute('viewBox', `0 0 ${width} ${height}`);

  clone.querySelectorAll<HTMLElement>('[style]').forEach((node) => {
    node.setAttribute('style', cssValue(node.getAttribute('style') ?? '', variables));
  });
  clone.querySelectorAll<SVGElement>('[fill], [stroke]').forEach((node) => {
    for (const attribute of ['fill', 'stroke']) {
      const value = node.getAttribute(attribute);
      if (value) node.setAttribute(attribute, cssValue(value, variables));
    }
  });

  const style = document.createElementNS(SVG_NS, 'style');
  style.textContent = `text { font-family: Arial, sans-serif; }`;
  clone.insertBefore(style, clone.firstChild);
  return { node: clone, width, height };
}

function tableToSvg(table: HTMLTableElement, variables: Record<string, string>) {
  const rows = Array.from(table.rows);
  const columns = Math.max(1, ...rows.map((row) => row.cells.length));
  const cellWidth = 150;
  const cellHeight = 28;
  const width = columns * cellWidth;
  const height = Math.max(cellHeight, rows.length * cellHeight);
  const group = document.createElementNS(SVG_NS, 'g');

  rows.forEach((row, rowIndex) => {
    Array.from(row.cells).forEach((cell, columnIndex) => {
      const computed = getComputedStyle(cell);
      const rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('x', String(columnIndex * cellWidth));
      rect.setAttribute('y', String(rowIndex * cellHeight));
      rect.setAttribute('width', String(cellWidth));
      rect.setAttribute('height', String(cellHeight));
      rect.setAttribute('fill', cssValue(computed.backgroundColor || variables['--qd-surface'], variables));
      rect.setAttribute('stroke', variables['--qd-border'] || '#d9ded0');
      group.appendChild(rect);

      const text = document.createElementNS(SVG_NS, 'text');
      text.setAttribute('x', String(columnIndex * cellWidth + 8));
      text.setAttribute('y', String(rowIndex * cellHeight + 18));
      text.setAttribute('fill', cssValue(computed.color || variables['--qd-text'], variables));
      text.setAttribute('font-family', 'Arial, sans-serif');
      text.setAttribute('font-size', '11');
      text.textContent = (cell.textContent ?? '').trim();
      group.appendChild(text);
    });
  });

  return { node: group, width, height };
}

export function exportElementAsSvg(element: HTMLElement | null, title: string, filename: string) {
  if (!element) return;
  const svg = element.querySelector<SVGSVGElement>('svg');
  const table = element.querySelector<HTMLTableElement>('table');
  if (!svg && !table) return;

  const variables = readThemeVariables(element.closest<HTMLElement>('.qd-root') ?? element);
  const visual = svg ? copyChartSvg(svg, variables) : tableToSvg(table as HTMLTableElement, variables);
  const padding = 24;
  const titleHeight = title ? 30 : 0;
  const output = document.createElementNS(SVG_NS, 'svg');
  output.setAttribute('xmlns', SVG_NS);
  output.setAttribute('width', String(visual.width + padding * 2));
  output.setAttribute('height', String(visual.height + padding * 2 + titleHeight));
  output.setAttribute('viewBox', `0 0 ${visual.width + padding * 2} ${visual.height + padding * 2 + titleHeight}`);

  const background = document.createElementNS(SVG_NS, 'rect');
  background.setAttribute('width', '100%');
  background.setAttribute('height', '100%');
  background.setAttribute('fill', variables['--qd-surface'] || '#ffffff');
  output.appendChild(background);

  if (title) {
    const heading = document.createElementNS(SVG_NS, 'text');
    heading.setAttribute('x', String(padding));
    heading.setAttribute('y', '22');
    heading.setAttribute('fill', variables['--qd-text'] || '#1f2a12');
    heading.setAttribute('font-family', 'Arial, sans-serif');
    heading.setAttribute('font-size', '15');
    heading.setAttribute('font-weight', '700');
    heading.textContent = title;
    output.appendChild(heading);
  }

  const content = visual.node;
  if (content.tagName.toLowerCase() === 'svg') {
    content.setAttribute('x', String(padding));
    content.setAttribute('y', String(padding + titleHeight));
  } else {
    const wrapper = document.createElementNS(SVG_NS, 'g');
    wrapper.setAttribute('transform', `translate(${padding}, ${padding + titleHeight})`);
    wrapper.appendChild(content);
    output.appendChild(wrapper);
    download(output, filename);
    return;
  }
  output.appendChild(content);
  download(output, filename);
}

function download(svg: SVGSVGElement, filename: string) {
  const source = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${source}`], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${slugify(filename) || 'grafico-quanti'}.svg`;
  anchor.click();
  URL.revokeObjectURL(url);
}
