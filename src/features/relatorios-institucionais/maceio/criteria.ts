import type { MaceioSelection } from './model';
import type { MonetaryPolicy } from './market-slides-data';

/** Lucas explicitly selected INCC-DI for the monthly report on 17/11/2026. */
export const maceioMonetaryPolicy = (selection: MaceioSelection): MonetaryPolicy => selection.periodicity === 'monthly' ? 'INCC-DI' : 'unconfirmed';
