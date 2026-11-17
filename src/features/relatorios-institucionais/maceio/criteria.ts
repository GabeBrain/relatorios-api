import type { MaceioSelection, Periodicity } from './model';
import type { MonetaryPolicy } from './market-slides-data';

/** Lucas selected INCC-DI on 17/11/2026 and extended the same treatment to quarterly. */
const policies: Record<Periodicity, MonetaryPolicy> = { monthly: 'INCC-DI', quarterly: 'INCC-DI' };
export const maceioMonetaryPolicy = (selection: MaceioSelection): MonetaryPolicy => policies[selection.periodicity];
