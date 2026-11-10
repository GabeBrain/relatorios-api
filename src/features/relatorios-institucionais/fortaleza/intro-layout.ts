import layouts from './intro-layout.json';

interface Font { family: string; size: number; bold: boolean; italic: boolean; color: string }
interface Line { x: number; y: number; width: number; height: number; align: number; font: Font; text?: string; binding?: string; format?: string }
interface Cell { row: number; column: number; x: number; y: number; width: number; height: number; font: Font; text?: string; align: number; marginLeft: number; marginRight: number }
interface Shape { slot: string; x: number; y: number; width: number; height: number; lines?: Line[]; cells?: Cell[]; rows?: number; columns?: number }
export interface IntroLayout { number: number; shapes: Shape[] }
export const INTRO_LAYOUTS = layouts as unknown as Record<'junho' | 'julho', IntroLayout[]>;

export function introTableOffset(model: 'junho' | 'julho', page: number) {
  const first = page < 5 ? 3 : 5;
  return INTRO_LAYOUTS[model].filter(layout => layout.number >= first && layout.number < page).reduce((sum, layout) => sum + (layout.shapes.find(shape => shape.slot === 'table')?.rows ?? 1) - 1, 0);
}
