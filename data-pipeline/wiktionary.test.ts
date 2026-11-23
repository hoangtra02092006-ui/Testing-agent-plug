import {
  cleanWikitext,
  isFormOnly,
  isSentence,
  overlap,
  parseEnglishSenses,
  primaryWiktSense,
  wiktionaryPos,
} from './wiktionary';

const page = (english: string) =>
  [
    '==French==',
    '===Noun===',
    '# {{l|fr|pomme}}',
    '#: {{ux|fr|une pomme}}',
    '',
    '==English==',
    english,
    '',
    '==German==',
    '# Apfel',
  ].join('\n');

describe('cleanWikitext', () => {
  it.each([
    ['A [[common#Adjective|common]], [[firm]] fruit', 'A common, firm fruit'],
    ['tree of the genus {{taxfmt|Malus|genus}}.', 'Tree of the genus Malus.'],
    ['{{lb|en|countable}} a {{l|en|thing|things}} {{gloss|item}}', 'A things (item)'],
    ['{{w|Book of Genesis}} and {{w|Page|shown}}', 'Book of Genesis and shown'],
    ["''italic'' and '''bold'''", 'Italic and bold'],
    ['text<ref>{{R:OED}}</ref> end {{defdate|from 15th c.}}', 'Text end'],
    ['{{n-g|Used before a noun}}', 'Used before a noun'],
    ['{{cap|enjoyable}} or [[amusing]].', 'Enjoyable or amusing.'],
    ['{{U|thick}}; [[large]].', 'Thick; large.'],
    ['{{initialism of|en|compact disc}}.', 'Initialism of compact disc.'],
    ['{{infl of|en|be||3|s|pres}}', 'Inflection of be'],
    ['An example of (something); {{ng|the article}}.', 'An example of (something); the article.'],
    ['meet between two and three&emsp;&emsp;later', 'Meet between two and three later'],
    ['Possessive determiner. See Appendix:Possessive#English.', 'Possessive determiner.'],
    ['Between two things (See Usage notes below.)', 'Between two things'],
    [
      'Dogs salivate when [i.e. at any time that] they hear a bell.',
      'Dogs salivate when they hear a bell.',
    ],
  ])('%s → %s', (input, expected) => {
    expect(cleanWikitext(input)).toBe(expected);
  });
});

describe('parseEnglishSenses', () => {
  it('reads only the English section, by part of speech, with usage examples but no quotations', () => {
    const senses = parseEnglishSenses(
      page(
        [
          '===Noun===',
          '# A place where planes land.',
          "#: {{ux|en|We met at the '''airport'''.}}",
          "#: ''The '''airport''' is busy.''",
          '#* {{quote-book|en|year=1900|passage=An old quotation with airport}}',
          '#: {{syn|en|airfield}}',
          '===Verb===',
          '# {{lb|en|rare}} To fly.',
        ].join('\n'),
      ),
    );
    expect(senses).toEqual([
      {
        pos: 'noun',
        definition: 'A place where planes land.',
        labels: [],
        examples: ['We met at the airport.', 'The airport is busy.'],
        subSenseExamples: [],
      },
      { pos: 'verb', definition: 'To fly.', labels: ['rare'], examples: [], subSenseExamples: [] },
    ]);
  });

  it('takes sub-sense examples only along the first child of each level', () => {
    const [top] = parseEnglishSenses(
      page(
        [
          '===Noun===',
          '# A round fruit.',
          '## The fruit of the apple tree.',
          '##: {{ux|en|I ate an apple.}}',
          '### A cooking apple.',
          '###: {{ux|en|Bake the apple.}}',
          '## A unit of height.',
          "##: {{ux|en|He's three apples tall.}}",
        ].join('\n'),
      ),
    );
    expect(top.examples).toEqual([]);
    expect(top.subSenseExamples).toEqual(['I ate an apple.', 'Bake the apple.']);
  });

  it('skips a heading-only definition line and keeps its sub-senses', () => {
    const senses = parseEnglishSenses(
      page(['===Noun===', '# {{lb|en|countable|zoology}}', '## A body laid by birds.'].join('\n')),
    );
    expect(senses.map((s) => s.definition)).toEqual(['A body laid by birds.']);
  });

  it('returns nothing without an English section', () => {
    expect(parseEnglishSenses('==French==\n===Noun===\n# pomme')).toEqual([]);
  });
});

describe('primaryWiktSense', () => {
  const senses = parseEnglishSenses(
    page(
      [
        '===Noun===',
        '# {{lb|en|obsolete|legal}} A plaintiff.',
        '# {{lb|en|general}} Any game played on foot.',
        '# {{lb|en|informal}} Someone who takes part.',
        '===Article===',
        '# Used before a noun.',
      ].join('\n'),
    ),
  );

  it('skips obsolete, rare or specialist senses but keeps informal ones', () => {
    expect(primaryWiktSense(senses, 'noun')?.definition).toBe('Someone who takes part.');
  });

  it('maps CEFR-J parts of speech to Wiktionary headings', () => {
    expect(primaryWiktSense(senses, 'determiner')?.definition).toBe('Used before a noun.');
    expect(primaryWiktSense(senses, 'verb')).toBeUndefined();
    expect(wiktionaryPos('modal auxiliary')).toEqual(['verb']);
    expect(wiktionaryPos('unknown')).toEqual([]);
  });
});

describe('isSentence', () => {
  it.each([
    ['She met Sam at the airport.', true],
    ['"They love each other", Mr. Chad said.', true],
    ['College of Engineering', false],
    ['no contest', false],
    ['Hi!', false],
    ['We should buy a house. ~ With whose money?', false],
    [`${'Word '.repeat(22)}end.`, false],
    ['For whose benefit are you acting.?', false],
  ])('isSentence(%s) = %s', (text, expected) => {
    expect(isSentence(text)).toBe(expected);
  });
});

describe('primaryWiktSense with a WordNet reference', () => {
  const senses = parseEnglishSenses(
    page(
      [
        '===Noun===',
        '# A confrontational game of daring.',
        '#: {{ux|en|They played chicken on the road.}}',
        '# A domestic fowl kept for its eggs and meat.',
        '#: {{ux|en|The chicken laid an egg.}}',
        '# A young fowl bred for meat.',
      ].join('\n'),
    ),
  );

  it('picks the sense whose wording is closest to WordNet, among senses with examples', () => {
    const ref = 'a domestic fowl bred for flesh or eggs';
    expect(overlap(ref, 'A domestic fowl kept for its eggs and meat.')).toBeGreaterThan(0.5);
    expect(primaryWiktSense(senses, 'noun', ref)?.definition).toBe(
      'A domestic fowl kept for its eggs and meat.',
    );
  });

  it('takes nothing when no sense is close enough', () => {
    expect(primaryWiktSense(senses, 'noun', 'an electronic computing machine')).toBeUndefined();
    expect(overlap('', 'anything')).toBe(0);
  });
});

describe('isFormOnly', () => {
  it.each([
    ['Inflection of be', true],
    ['Plural of that', true],
    ['Past tense of will; usually followed by a bare infinitive.', true],
    ['Superlative of much.', true],
    ['Used to form the past perfect tense.', true],
    ['Initialism of compact disc.', false],
    ['A form of address for a woman.', false],
  ])('isFormOnly(%s) = %s', (text, expected) => {
    expect(isFormOnly(text)).toBe(expected);
  });

  it('drops such senses and maintenance-template lists when parsing', () => {
    const senses = parseEnglishSenses(
      page(
        [
          '===Verb===',
          '{{rfc|en|Multiple issues:',
          '# Correct quotes',
          '# Fix layout}}',
          '# {{infl of|en|be||3|s|pres}}',
          '#: {{ux|en|He is a doctor.}}',
          '# To exist.',
        ].join('\n'),
      ),
    );
    expect(senses.map((s) => s.definition)).toEqual(['To exist.']);
  });
});

describe('primaryWiktSense picks the earliest of the closest senses', () => {
  const senses = parseEnglishSenses(
    page(
      [
        '===Noun===',
        '# The upper limb from the shoulder to the wrist.',
        '#: {{ux|en|She raised her arm.}}',
        '# The upper limb from the shoulder to the elbow only.',
        '#: {{ux|en|The arm and forearm differ.}}',
      ].join('\n'),
    ),
  );

  it('keeps the first sense when a later one is only slightly closer', () => {
    const ref = 'an upper limb with shoulder, elbow, joint, bone and muscle';
    expect(primaryWiktSense(senses, 'noun', ref)?.definition).toBe(
      'The upper limb from the shoulder to the wrist.',
    );
  });
});
