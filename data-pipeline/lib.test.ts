import {
  buildWords,
  exampleUsesWord,
  parseCsv,
  parseProfile,
  primaryHeadword,
  slug,
  validateWords,
  wordnetPos,
  type LexEntry,
  type Synset,
} from './lib';

describe('parseCsv', () => {
  it('handles quoted fields, escaped quotes, CRLF and a BOM', () => {
    expect(parseCsv('\uFEFFa,"b, c","say ""hi"""\r\nd,,e\n')).toEqual([
      ['a', 'b, c', 'say "hi"'],
      ['d', '', 'e'],
    ]);
  });

  it('keeps a last row without a trailing newline', () => {
    expect(parseCsv('a,b\nc,d')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });
});

describe('parseProfile', () => {
  it('reads headword, pos and level and skips rows without a valid level', () => {
    const csv = 'headword,pos,CEFR,notes\naccident,noun,A2,"News, lifestyles"\nodd,noun,X9,\n';
    expect(parseProfile(csv)).toEqual([{ headword: 'accident', pos: 'noun', level: 'A2' }]);
  });

  it('fails clearly when required columns are missing', () => {
    expect(() => parseProfile('word,level\nx,A1\n')).toThrow(/headword, pos and CEFR/);
  });
});

describe('helpers', () => {
  it('takes the first spelling variant', () => {
    expect(primaryHeadword('a.m./A.M./am/AM')).toBe('a.m.');
  });

  it('maps CEFR-J parts of speech to WordNet ones', () => {
    expect(wordnetPos('adjective')).toEqual(['a', 's']);
    expect(wordnetPos('number')).toEqual(['n', 'a', 's']);
    expect(wordnetPos('noun')).toEqual(['n']);
    expect(wordnetPos('verb')).toEqual(['v']);
    expect(wordnetPos('adverb')).toEqual(['r']);
    expect(wordnetPos('preposition')).toEqual([]);
  });

  it('makes URL-safe slugs', () => {
    expect(slug('Good Morning!')).toBe('good-morning');
    expect(slug('a.m.')).toBe('a-m');
  });

  it.each([
    ['she likes to swim', 'swim', true],
    ['he swims daily', 'swim', true],
    ['they danced', 'dance', true],
    ['we were dancing', 'dance', true],
    ['a swimmer', 'swim', false],
    ['catalog', 'cat', false],
    ['meet at 11 A.M.', 'a.m.', true],
  ])('exampleUsesWord(%s, %s) = %s', (example, word, expected) => {
    expect(exampleUsesWord(example, word)).toBe(expected);
  });
});

describe('buildWords', () => {
  const synsets = new Map<string, Synset>([
    ['s1', { definition: 'first sense without usable example', examples: ['nothing here'] }],
    [
      's2',
      {
        definition: 'move through water',
        examples: ['she can swim', 'fish swim fast', 'they swim'],
      },
    ],
    ['s3', { examples: ['swim'] }],
    ['n1', { definition: 'a pet', examples: [] }],
  ]);
  const entries = new Map<string, LexEntry[]>([
    ['swim', [{ pos: 'v', synsetIds: ['s3', 's1', 's2'] }]],
    ['cat', [{ pos: 'n', synsetIds: ['n1'] }]],
  ]);

  it('uses the first sense that has both a definition and an example with the word', () => {
    const { words } = buildWords(
      [{ headword: 'swim', pos: 'verb', level: 'A1' }],
      entries,
      synsets,
    );
    expect(words).toEqual([
      {
        id: 'a1:swim:verb',
        headword: 'swim',
        pos: 'verb',
        level: 'A1',
        definitionEn: 'move through water',
        examples: ['she can swim', 'fish swim fast'],
      },
    ]);
  });

  it('reports words without a definition or without an example', () => {
    const { words, missing } = buildWords(
      [
        { headword: 'cat', pos: 'noun', level: 'A1' },
        { headword: 'the', pos: 'determiner', level: 'A1' },
        { headword: 'swim', pos: 'noun', level: 'A1' },
      ],
      entries,
      synsets,
    );
    expect(words).toEqual([]);
    expect(missing).toEqual([
      { headword: 'cat', pos: 'noun', reason: 'no-example' },
      { headword: 'the', pos: 'determiner', reason: 'no-definition' },
      { headword: 'swim', pos: 'noun', reason: 'no-definition' },
    ]);
  });

  it('skips duplicated rows', () => {
    const row = { headword: 'swim', pos: 'verb', level: 'A1' as const };
    expect(buildWords([row, row], entries, synsets).words).toHaveLength(1);
  });
});

describe('validateWords (AC11)', () => {
  const ok = {
    id: 'a1:x:noun',
    headword: 'cat',
    pos: 'noun',
    level: 'A1' as const,
    definitionEn: 'a pet',
    examples: ['my cat'],
  };

  it('accepts complete words', () => {
    expect(validateWords([ok])).toEqual([]);
  });

  it('flags missing definitions, unusable examples and duplicates', () => {
    expect(validateWords([ok, { ...ok, definitionEn: ' ', examples: ['a dog'] }])).toEqual([
      'a1:x:noun: duplicated id',
      'a1:x:noun: missing definition',
      'a1:x:noun: no example uses the word',
    ]);
  });
});

describe('generated A1 file', () => {
  it('passes validation', async () => {
    const { readFileSync } = await import('node:fs');
    const words = JSON.parse(readFileSync('public/words/A1.json', 'utf8'));
    expect(words.length).toBeGreaterThan(500);
    expect(validateWords(words)).toEqual([]);
  });
});
