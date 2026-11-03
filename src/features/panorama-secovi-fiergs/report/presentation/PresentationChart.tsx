import type { ReactNode } from 'react';
import type { PresentationChart as ChartSpec } from './contract';

/** Metadata-only bridge: preview/PDF keep their original children; PPT consumes typed data. */
export function PresentationChart({ children }: { spec: ChartSpec; children: ReactNode }) { return <>{children}</>; }
