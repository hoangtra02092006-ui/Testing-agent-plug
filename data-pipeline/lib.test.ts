import {
  buildWords,
  exampleUsesWord,
  isSensitive,
  parseCsv,
  parseProfile,
  primaryHeadword,
  slug,
  validateWords,
  wordnetPos,
  type LexEntry,
  type Synset,
} from './lib';
import type { Word } from '../src/domain/types';

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

describe('isSensitive', () => {
  it.each([
    ['She sells her body to survive', true],
    ['the drug trade', true],
    ['a spiteful woman gossip', true],
    ['Sussex is a county', false],
    ['a useful skill', false],
    ['the cat sat on the mat', false],
    ['there were stories of murders', true],
    ['he kills time', true],
    ['a young person of either sex', false],
    ['smoking stinks', true],
  ])('isSensitive(%s) = %s', (text, expected) => {
    expect(isSensitive(text)).toBe(expected);
  });

  it('does not count the headword itself, so learner words like "kill" stay teachable', () => {
    expect(isSensitive('kill time', 'kill')).toBe(false);
    expect(isSensitive('kill the drug lord', 'kill')).toBe(true);
  });
});

describe('buildWords', () => {
  const synsets = new Map<string, Synset>([
    ['s0', { examples: ['swim'] }],
    [
      's1',
      {
        definition: 'move through water',
        examples: ['she can swim', 'fish swim fast', 'they swim'],
      },
    ],
    [
      's2',
      { definition: 'be covered with a liquid', examples: ['the meat was swimming in gravy'] },
    ],
    ['c1', { definition: 'feline mammal', examples: [] }],
    ['c2', { definition: 'a spiteful woman gossip', examples: ['what a cat she is!'] }],
    ['cap1', { definition: 'computerized axial tomography', examples: ['a CAT scan'] }],
    ['d1', { definition: 'a day of the week', examples: ['a day off', 'drugs every day'] }],
    ['b1', { definition: 'a drug dealer', examples: ['a dealer sells'] }],
    ['m1', { definition: 'mammal', examples: ['kill the rat'] }],
  ]);
  const entries = new Map<string, LexEntry[]>([
    ['swim', [{ pos: 'v', synsetIds: ['s0', 's1', 's2'] }]],
    ['cat', [{ pos: 'n', synsetIds: ['c1', 'c2'] }]],
    ['CAT', [{ pos: 'n', synsetIds: ['cap1'] }]],
    ['day', [{ pos: 'n', synsetIds: ['d1'] }]],
    ['dealer', [{ pos: 'n', synsetIds: ['b1'] }]],
    ['rat', [{ pos: 'n', synsetIds: ['m1'] }]],
  ]);
  const row = (headword: string, pos = 'noun') => ({ headword, pos, level: 'A1' as const });

  it('uses the primary sense (first one with a definition) and its examples with the word', () => {
    const { words } = buildWords([row('swim', 'verb')], entries, synsets);
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

  it('reports a word whose primary sense has no example instead of using a rarer sense', () => {
    const { words, missing } = buildWords([row('cat')], entries, synsets);
    expect(words).toEqual([]);
    expect(missing).toEqual([{ headword: 'cat', pos: 'noun', reason: 'no-example' }]);
  });

  it('matches the lemma with its exact casing', () => {
    const { missing } = buildWords([row('Cat')], entries, synsets);
    expect(missing).toEqual([{ headword: 'Cat', pos: 'noun', reason: 'no-definition' }]);
  });

  it('drops sensitive examples and reports words left with no example or a sensitive definition', () => {
    const { words, missing } = buildWords(
      [row('day'), row('dealer'), row('rat')],
      entries,
      synsets,
    );
    expect(words.map((w) => w.examples)).toEqual([['a day off']]);
    expect(buildWords([row('day')], entries, synsets).droppedExamples).toEqual([
      { headword: 'day', example: 'drugs every day' },
    ]);
    expect(missing).toEqual([
      { headword: 'dealer', pos: 'noun', reason: 'sensitive' },
      { headword: 'rat', pos: 'noun', reason: 'sensitive' },
    ]);
  });

  it('reports words without a matching part of speech', () => {
    const { missing } = buildWords([row('the', 'determiner'), row('swim')], entries, synsets);
    expect(missing).toEqual([
      { headword: 'the', pos: 'determiner', reason: 'no-definition' },
      { headword: 'swim', pos: 'noun', reason: 'no-definition' },
    ]);
  });

  it('skips duplicated rows', () => {
    expect(
      buildWords([row('swim', 'verb'), row('swim', 'verb')], entries, synsets).words,
    ).toHaveLength(1);
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

  it('contains no definition or example unsuitable for school learners', async () => {
    const { readFileSync } = await import('node:fs');
    const words: Word[] = JSON.parse(readFileSync('public/words/A1.json', 'utf8'));
    const flagged = words.flatMap((w) =>
      [w.definitionEn, ...w.examples]
        .filter((text) => isSensitive(text, w.headword) || /killed .*people/i.test(text))
        .map((text) => `${w.id}: ${text}`),
    );
    expect(flagged).toEqual([]);
  });
});
