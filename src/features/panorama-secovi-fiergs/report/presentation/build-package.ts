import { Fragment, isValidElement, type ReactNode } from 'react';
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis } from 'recharts';
import type { PanoramaReportModel } from '../../types';
import { quarterLabel } from '../../lib/launches';
import { panoramaPresentationBackground, PanoramaPresentationContent } from '../../components/ReportPaginator';
import { createPanoramaSections, type ReportPageDefinition } from '../manifest';
import { panoramaScopeIdentity } from '../../scope-identity';
import { PresentationChart } from './PresentationChart';
import type { PanoramaPresentationPackage, PresentationBlock, PresentationCell, PresentationChart as ChartSpec } from './contract';

type Props = Record<string, unknown> & { children?: ReactNode; className?: string };
interface View { tag: string; props: Props; children: (View | string)[]; chart?: ChartSpec; }
/**
 * Pure presentation compiler, not HTML/DOM scraping. The existing hook-free page views
 * remain the selectors for labels/table cells. Numeric chart data is taken directly
 * from typed props before Recharts renders anything; never parsed from formatted text.
 * New hook-based views must supply a pure presentation adapter rather than mount here.
 */
function resolve(node: ReactNode): (View | string)[] {
  if (node === null || node === undefined || typeof node === 'boolean') return [];
  if (typeof node === 'string' || typeof node === 'number') return [String(node)];
  if (Array.isArray(node)) return node.flatMap(resolve);
  if (!isValidElement<Props>(node)) throw new Error('Elemento de apresentação sem contrato nativo.');
  const { type, props } = node;
  if (type === Fragment || type === ResponsiveContainer) return resolve(props.children);
  if (type === PresentationChart) return [{ tag: 'chart', props: {}, children: [], chart: props.spec as ChartSpec }];
  if (type === BarChart || type === LineChart) {
    const elements = flattenElements(props.children);
    const axis = elements.find((child) => child.type === XAxis);
    const key = String(axis?.props.dataKey ?? 'quarter');
    const data = props.data as Record<string, unknown>[];
    if (!Array.isArray(data)) throw new Error('Gráfico sem série tipada.');
    const chart: ChartSpec = { type: type === LineChart ? 'line' : 'bar',
      labels: data.map((row) => key === 'quarter' ? quarterLabel(String(row[key]) as never) : String(row[key] ?? '')),
      series: elements.filter((child) => child.type === Bar || child.type === Line).map(({ type: seriesType, props: p }) => ({
        name: String(p.name ?? p.dataKey), color: String(p.stroke ?? p.fill ?? '#5d7737'), type: seriesType === Line ? 'line' : 'bar',
        values: data.map((row) => {
          const value = typeof p.dataKey === 'function' ? (p.dataKey as (r: unknown) => unknown)(row) : row[String(p.dataKey)];
          if (value === null || value === undefined) return null;
          if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Gráfico com valor não numérico.');
          return value;
        }),
      })),
    };
    return [{ tag: 'chart', props: {}, children: [], chart }];
  }
  if (typeof type === 'function') {
    if (type.prototype?.render) throw new Error('A apresentação nativa exige uma função pura, sem estado.');
    return resolve((type as (p: Props) => ReactNode)(props));
  }
  if (typeof type !== 'string') throw new Error('Componente sem adaptador de apresentação nativa.');
  if ((props['aria-hidden'] === true && type !== 'em') || /panorama-(sr-only|coverage-caption|formula|chart-legend)/.test(props.className ?? '')) return [];
  return [{ tag: type, props, children: resolve(props.children) }];
}
function flattenElements(node: ReactNode): { type: unknown; props: Props }[] {
  if (Array.isArray(node)) return node.flatMap(flattenElements);
  if (!isValidElement<Props>(node)) return [];
  return node.type === Fragment ? flattenElements(node.props.children) : [{ type: node.type, props: node.props }];
}
function text(node: View | string): string {
  if (typeof node === 'string') return node;
  if (node.tag === 'br') return '\n';
  return node.children.map((child) => {
    const value = text(child);
    if (typeof child !== 'string' && /^h[12]$/.test(node.tag) && child.tag === 'span') return `\n${value}`;
    if (typeof child !== 'string' && node.tag === 'li' && child.tag === 'b') return ` — ${value}`;
    if (typeof child !== 'string' && child.tag === 'small') return ` ${value} `;
    if (typeof child !== 'string' && node.tag === 'span' && child.tag === 'strong') return ` ${value}`;
    return value;
  }).join('');
}
function descendants(node: View, tag: string): View[] {
  return node.children.flatMap((child) => typeof child === 'string' ? [] : child.tag === tag ? [child] : descendants(child, tag));
}
function presentationColor(value: string | undefined, fallback: string) {
  if (/^#[a-f\d]{6}$/i.test(value ?? '')) return value!;
  const hsl = value?.match(/^hsl\(([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\)$/);
  if (!hsl) return fallback;
  const hue = Number(hsl[1]), saturation = Number(hsl[2]) / 100, lightness = Number(hsl[3]) / 100;
  const a = saturation * Math.min(lightness, 1 - lightness);
  const component = (n: number) => { const k = (n + hue / 30) % 12; return Math.round(255 * (lightness - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, '0'); };
  return `#${component(0)}${component(8)}${component(4)}`;
}
function collect(nodes: (View | string)[], blocks: PresentationBlock[]) {
  for (const node of nodes) {
    if (typeof node === 'string') { if (node.trim()) blocks.push({ kind: 'text', role: 'body', text: node.trim() }); continue; }
    if (node.chart) { blocks.push({ kind: 'chart', chart: node.chart }); continue; }
    if (node.props.className === 'panorama-location-map') {
      const grid = descendants(node, 'div').find((item) => item.props.className === 'panorama-map-tiles');
      const style = grid?.props.style as Record<string, string> | undefined;
      const count = (value?: string) => Number(value?.match(/repeat\((\d+)/)?.[1] ?? 1);
      blocks.push({ kind: 'map', columns: count(style?.gridTemplateColumns), rows: count(style?.gridTemplateRows),
        tiles: grid ? descendants(grid, 'img').map((img) => String(img.props.src)) : [],
        markers: descendants(node, 'button').map((marker) => {
          const p = marker.props.style as Record<string, string>;
          return { x: parseFloat(p.left) / 100, y: parseFloat(p.top) / 100, color: presentationColor(p.backgroundColor, marker.props.className?.includes('is-stock') ? '#c62026' : '#5d7737'), label: text(marker), size: parseFloat(p.width) * 13.333333 / 100 };
        }),
      }); continue;
    }
    if (node.tag === 'table') {
      const rows: PresentationCell[][] = descendants(node, 'tr').map((row) => row.children.flatMap((cell) => {
        if (typeof cell === 'string' || !['td', 'th'].includes(cell.tag)) return [];
        const total = /panorama-(total|subtotal)-row/.test(row.props.className ?? '');
        const bar = descendants(cell, 'span').find((child) => child.props.className?.includes('panorama-data-bar'));
        const classes = bar?.props.className ?? '';
        const intensity = parseFloat(String((bar?.props.style as Record<string, string> | undefined)?.['--bar-size'] ?? '0'));
        const fill = total ? 'E4E6E0' : intensity > 0 ? classes.includes('cf-negative') || classes.includes('bar-red') ? 'FCE4E5'
          : classes.includes('bar-yellow') ? 'FFF1CB' : classes.includes('bar-blue') ? 'E6F0FB' : 'E8F7ED' : undefined;
        return [{ text: text(cell), header: cell.tag === 'th', total, fill, colspan: cell.props.colSpan as number | undefined, rowspan: cell.props.rowSpan as number | undefined }];
      }));
      blocks.push({ kind: 'table', rows }); continue;
    }
    if (node.tag === 'img') {
      if (typeof node.props.src === 'string') blocks.push({ kind: 'image', src: node.props.src, alt: String(node.props.alt ?? '') });
      continue;
    }
    if (/^h[123]$/.test(node.tag) || ['p', 'li', 'footer'].includes(node.tag)) {
      const value = text(node).trim();
      if (value) blocks.push({ kind: 'text', role: node.props.className === 'panorama-analytic-context' ? 'context' : /^h[12]$/.test(node.tag) ? 'title' : node.tag === 'h3' ? 'subtitle' : node.tag === 'footer' ? 'footer' : 'body', text: value });
      continue;
    }
    if (node.children.length && node.children.every((child) => typeof child === 'string' || ['span', 'b', 'strong', 'small', 'i', 'em', 'br'].includes(child.tag))) {
      const value = text(node).trim();
      if (value) blocks.push({ kind: 'text', role: 'body', text: value });
    } else collect(node.children, blocks);
  }
}
export function buildPanoramaPresentationPackage(report: PanoramaReportModel, manifest: readonly ReportPageDefinition[]): PanoramaPresentationPackage {
  if (!manifest.length) throw new Error('Não há páginas ativas para exportar.');
  if (new Set(manifest.map((p) => p.page)).size !== manifest.length) throw new Error('Manifesto com páginas duplicadas.');
  return { schemaVersion: 'panorama-presentation-v1', generation: { generatedAt: report.generatedAt, templateVersion: 'panorama-native-16x9-v1' }, pages: manifest.map((def) => {
    const blocks: PresentationBlock[] = [];
    collect(resolve(PanoramaPresentationContent({ def, report })), blocks);
    for (const block of blocks) if (block.kind === 'chart' && !block.chart.unit) {
      const unit = /VGV|VGL/i.test(def.title) ? 'R$ milhões' : /IVV|VSO/.test(def.title) ? '%' : /R\$\/m|Preço.*m²|metro quadrado/i.test(def.title) ? 'R$/m²' : undefined;
      if (unit) { block.chart.unit = unit; block.chart.percentage = unit === '%'; }
    }
    if (def.visualFamily === 'summary') {
      blocks.splice(0, blocks.length, { kind: 'text', role: 'title', text: 'Sumário' }, { kind: 'table', rows: [
        [{ text: 'Seção', header: true }, { text: 'Páginas', header: true }],
        ...createPanoramaSections([...manifest], report.scope.entity).map((section) => [{ text: section.label }, { text: `${section.start}–${section.end}` }]),
      ] });
    }
    const background = panoramaPresentationBackground(def, report);
    const rasterized = blocks.filter((block) => block.kind === 'image').map((block) => block.kind === 'image' ? block.alt || 'Imagem individual' : '');
    if (background && !blocks.length) rasterized.push('Arte institucional integral: imagem substituível, conteúdo interno não editável.');
    if (blocks.some((b) => b.kind === 'map')) rasterized.push('Base cartográfica em imagens; marcadores e textos editáveis.');
    if (!blocks.length && !background) throw new Error(`Página ${def.page} sem apresentação publicável.`);
    const identity = panoramaScopeIdentity(report.scope);
    const cover = (report.scope.entity === 'fiergs-rs' && (def.fiergsOfficialSlide === 2 || def.fiergsOfficialSlide === 7)) || (report.scope.entity !== 'fiergs-rs' && def.referenceSlide === 2)
      ? { kind: def.fiergsOfficialSlide === 2 ? 'study' as const : 'territory' as const, cities: [...(def.scopeCities ?? identity.cities)], uf: identity.uf,
        closing: quarterLabel(report.scope.endQuarter), window: `${quarterLabel(report.scope.startQuarter ?? report.scope.endQuarter)} – ${quarterLabel(report.scope.endQuarter)}`, official: identity.official,
        entity: report.scope.entity === 'fiergs-rs' ? 'FIERGS' : 'SECOVI-SP' } : undefined;
    if (cover && report.scope.entity !== 'fiergs-rs') cover.kind = 'study';
    if (cover && !blocks.length) rasterized.splice(0, rasterized.length);
    return { id: `${report.scope.entity ?? 'secovi-sp'}:${def.fiergsOfficialSlide ?? def.referenceSlide}:${def.page}`, definition: { ...def }, blocks, background, rasterized, cover };
  }) };
}
