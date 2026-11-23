import en from './en.json';
import vi from './vi.json';

// Plural forms differ by language (English: _one/_other, Vietnamese: _other only).
const base = (keys: string[]) =>
  [...new Set(keys.map((k) => k.replace(/_(one|other)$/, '')))].sort();
const vars = (s: string) => (s.match(/{{\w+}}/g) ?? []).sort();
const enTexts: Record<string, string> = en;
const viTexts: Record<string, string> = vi;

describe('translations (AC9)', () => {
  it('have the same keys in Vietnamese and English', () => {
    expect(base(Object.keys(enTexts))).toEqual(base(Object.keys(viTexts)));
  });

  it('give English a singular and plural form for every plural key', () => {
    for (const key of Object.keys(enTexts).filter((k) => k.endsWith('_other'))) {
      expect(enTexts, key).toHaveProperty(key.replace(/_other$/, '_one'));
    }
  });

  it('have no empty text', () => {
    for (const [key, text] of [...Object.entries(viTexts), ...Object.entries(enTexts)]) {
      expect(text.trim(), key).not.toBe('');
    }
  });

  it('use the same placeholders in both languages', () => {
    for (const [key, text] of Object.entries(viTexts)) {
      expect(vars(enTexts[key]), key).toEqual(vars(text));
    }
  });
});
