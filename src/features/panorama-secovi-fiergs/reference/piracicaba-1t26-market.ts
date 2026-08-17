import type { Quarter } from '../types';

const quarters: Quarter[] = ['1T2022', '2T2022', '3T2022', '4T2022', '1T2023', '2T2023', '3T2023', '4T2023', '1T2024', '2T2024', '3T2024', '4T2024', '1T2025', '2T2025', '3T2025', '4T2025', '1T2026'];

export interface MarketReferenceSeries { quarters: Quarter[]; salesUnits: Record<'vertical' | 'horizontal', number[]>; salesVgvMillions: Record<'vertical' | 'horizontal', number[]>; finalStock: Record<'vertical' | 'horizontal', number>; }

/** Frozen slide 21–24 and 29 values. VGV is stored in R$ millions. */
export const PIRACICABA_1T26_MARKET_REFERENCE: MarketReferenceSeries = {
  quarters,
  salesUnits: {
    vertical: [589, 369, 274, 763, 509, 342, 427, 522, 200, 396, 825, 569, 607, 615, 306, 634, 508],
    horizontal: [33, 293, 176, 236, 40, 141, 279, 38, 161, 54, 158, 108, 65, 17, 273, 70, 60],
  },
  salesVgvMillions: {
    vertical: [151.958, 182.688, 110.975, 296.638, 180.145, 166.151, 233.064, 253.315, 69.417, 160.669, 279.463, 192.829, 172.621, 256.776, 121.953, 183.735, 266.087],
    horizontal: [19.192, 132.045, 68.123, 51.171, 14.529, 56.707, 83.892, 11.156, 47.059, 16.604, 54.775, 39.344, 20.66, 5.195, 93.051, 30.233, 23.494],
  },
  finalStock: { vertical: 1491, horizontal: 256 },
};
