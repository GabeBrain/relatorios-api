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

function barsToSvg(element: HTMLElement, variables: Record<string, string>) {
  const bars = Array.from(element.querySelectorAll<HTMLElement>('[data-svg-export-bar]'));
  const width = 760;
  const rowHeight = 38;
  const labelWidth = 170;
  const valueWidth = 120;
  const barWidth = width - labelWidth - valueWidth;
  const height = Math.max(rowHeight, bars.length * rowHeight);
  const max = Math.max(...bars.map((item) => Number(item.dataset.count ?? 0)), 1);
  const group = document.createElementNS(SVG_NS, 'g');

  bars.forEach((bar, index) => {
    const y = index * rowHeight + 7;
    const count = Number(bar.dataset.count ?? 0);
    const pct = Number(bar.dataset.pct ?? 0);
    const label = bar.dataset.label ?? '';

    const labelText = document.createElementNS(SVG_NS, 'text');
    labelText.setAttribute('x', '0');
    labelText.setAttribute('y', String(y + 17));
    labelText.setAttribute('fill', variables['--qd-text'] || '#1f2a12');
    labelText.setAttribute('font-family', 'Arial, sans-serif');
    labelText.setAttribute('font-size', '13');
    labelText.textContent = label;
    group.appendChild(labelText);

    const background = document.createElementNS(SVG_NS, 'rect');
    background.setAttribute('x', String(labelWidth));
    background.setAttribute('y', String(y));
    background.setAttribute('width', String(barWidth));
    background.setAttribute('height', '20');
    background.setAttribute('rx', '5');
    background.setAttribute('fill', variables['--qd-border'] || '#eef2f5');
    group.appendChild(background);

    const fill = document.createElementNS(SVG_NS, 'rect');
    fill.setAttribute('x', String(labelWidth));
    fill.setAttribute('y', String(y));
    fill.setAttribute('width', String((count / max) * barWidth));
    fill.setAttribute('height', '20');
    fill.setAttribute('rx', '5');
    fill.setAttribute('fill', '#5B7537');
    group.appendChild(fill);

    const valueText = document.createElementNS(SVG_NS, 'text');
    valueText.setAttribute('x', String(labelWidth + barWidth + 12));
    valueText.setAttribute('y', String(y + 16));
    valueText.setAttribute('fill', variables['--qd-text-muted'] || '#6e7b55');
    valueText.setAttribute('font-family', 'Arial, sans-serif');
    valueText.setAttribute('font-size', '12');
    valueText.textContent = `${count.toLocaleString('pt-BR')} - ${pct.toFixed(1)}%`;
    group.appendChild(valueText);
  });

  return { node: group, width, height };
}

interface LegendItem { label: string; color: string }

function readLegendItems(element: HTMLElement, variables: Record<string, string>): LegendItem[] {
  return Array.from(element.querySelectorAll<HTMLElement>('.recharts-legend-item, .qd-cross-series-legend-item'))
    .map((item) => {
      const label = (item.querySelector('.recharts-legend-item-text, .qd-cross-series-legend-item span:last-child')?.textContent ?? item.textContent ?? '').trim();
      const swatch = item.querySelector<HTMLElement>('.qd-cross-series-legend-swatch, .recharts-legend-icon');
      const style = swatch ? getComputedStyle(swatch) : null;
      const color = swatch?.getAttribute('fill') || swatch?.getAttribute('stroke') || style?.backgroundColor || style?.color || variables['--qd-primary'] || '#5B7537';
      return { label, color: cssValue(color, variables) };
    })
    .filter((item) => item.label);
}

function legendToSvg(items: LegendItem[], width: number, variables: Record<string, string>) {
  if (!items.length) return null;
  const group = document.createElementNS(SVG_NS, 'g');
  const rowHeight = 22;
  const gap = 12;
  let x = 0;
  let y = 0;
  let rows = 1;

  items.forEach((item) => {
    const itemWidth = Math.min(260, Math.max(76, item.label.length * 7 + 28));
    if (x > 0 && x + itemWidth > width) {
      x = 0;
      y += rowHeight;
      rows += 1;
    }

    const swatch = document.createElementNS(SVG_NS, 'rect');
    swatch.setAttribute('x', String(x));
    swatch.setAttribute('y', String(y + 5));
    swatch.setAttribute('width', '10');
    swatch.setAttribute('height', '10');
    swatch.setAttribute('rx', '2');
    swatch.setAttribute('fill', item.color);
    group.appendChild(swatch);

    const text = document.createElementNS(SVG_NS, 'text');
    text.setAttribute('x', String(x + 16));
    text.setAttribute('y', String(y + 15));
    text.setAttribute('fill', variables['--qd-text'] || '#1f2a12');
    text.setAttribute('font-family', 'Arial, sans-serif');
    text.setAttribute('font-size', '11');
    text.textContent = item.label;
    group.appendChild(text);
    x += itemWidth + gap;
  });

  return { node: group, height: rows * rowHeight };
}

export function exportElementAsSvg(element: HTMLElement | null, title: string, filename: string) {
  if (!element) return;
  const svg = element.querySelector<SVGSVGElement>('svg');
  const table = element.querySelector<HTMLTableElement>('table');
  const bars = element.querySelector('[data-svg-export-bar]');
  if (!svg && !table && !bars) return;

  const variables = readThemeVariables(element.closest<HTMLElement>('.qd-root') ?? element);
  const visual = svg
    ? copyChartSvg(svg, variables)
    : table
      ? tableToSvg(table, variables)
      : barsToSvg(element, variables);
  const legend = svg ? legendToSvg(readLegendItems(element, variables), visual.width, variables) : null;
  const padding = 24;
  const titleHeight = title ? 30 : 0;
  const legendHeight = legend ? legend.height + 8 : 0;
  const outputHeight = visual.height + padding * 2 + titleHeight + legendHeight;
  const output = document.createElementNS(SVG_NS, 'svg');
  output.setAttribute('xmlns', SVG_NS);
  output.setAttribute('width', String(visual.width + padding * 2));
  output.setAttribute('height', String(outputHeight));
  output.setAttribute('viewBox', `0 0 ${visual.width + padding * 2} ${outputHeight}`);

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
  if (legend) {
    legend.node.setAttribute('transform', `translate(${padding}, ${padding + titleHeight + visual.height + 8})`);
    output.appendChild(legend.node);
  }
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
