import { cloneElement, isValidElement, type ReactNode } from 'react';
import type { PresentationChart as ChartSpec } from './contract';

/** Metadata-only bridge: preview/PDF keep their original children; PPT consumes typed data. */
export function PresentationChart({ children }: { spec: ChartSpec; children: ReactNode }) {
  // Mark the existing DOM root without adding a wrapper or changing chart dimensions.
  return isValidElement<Record<string, unknown>>(children) ? cloneElement(children, { 'data-panorama-chart': '' }) : <>{children}</>;
}
