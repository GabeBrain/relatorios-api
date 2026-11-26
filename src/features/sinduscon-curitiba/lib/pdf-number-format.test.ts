import { describe, expect, it } from 'vitest';
import { hasEnglishThousands } from './pdf-number-format';

describe('separadores de milhar na exportação externa', () => {
  it.each(['1,244', '137,441', '1,014,752', '2,334,154.52', 'Total: 270,000 m²'])('identifica formato incompatível: %s', (text) => {
    expect(hasEnglishThousands(text)).toBe(true);
  });
  it.each(['1.244', '137.441', '1.014.752', '2.334.154,52', '0,24%', '12,345%', '2026', 'SE', '137.440,88'])('preserva formato brasileiro: %s', (text) => {
    expect(hasEnglishThousands(text)).toBe(false);
  });
});
