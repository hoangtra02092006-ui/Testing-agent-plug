/**
 * Pure helpers that read English entries from Wiktionary wikitext (CC BY-SA 4.0).
 * Used only for words that Open English WordNet cannot cover; see buildWords in lib.ts.
 */

export interface WiktSense {
  /** Part-of-speech heading, lower case ("noun", "verb", "article", ...). */
  pos: string;
  definition: string;
  labels: string[];
  /** Usage examples written for the entry (ux/usex templates or italic lines), not quotations. */
  examples: string[];
  /** Examples of this sense's sub-senses (refinements of the same meaning). */
  subSenseExamples: string[];
}

/** CEFR-J parts of speech → Wiktionary part-of-speech headings. */
const POS_HEADINGS: Record<string, string[]> = {
  noun: ['noun'],
  verb: ['verb'],
  'be-verb': ['verb'],
  'do-verb': ['verb'],
  'have-verb': ['verb'],
  'modal auxiliary': ['verb'],
  adjective: ['adjective'],
  adverb: ['adverb'],
  preposition: ['preposition'],
  determiner: ['determiner', 'article'],
  pronoun: ['pronoun'],
  conjunction: ['conjunction'],
  interjection: ['interjection'],
  number: ['numeral', 'number'],
  'infinitive-to': ['particle'],
};

export function wiktionaryPos(pos: string): string[] {
  return POS_HEADINGS[pos] ?? [];
}

/**
 * Senses a school learner should not get as the main meaning: old, rare, regional, specialist or
 * offensive uses. A sense with any of these labels is skipped.
 */
const SKIPPED_LABELS = new Set([
  'obsolete',
  'archaic',
  'dated',
  'rare',
  'historical',
  'nonstandard',
  'dialectal',
  'dialect',
  'poetic',
  'literary',
  'slang',
  'vulgar',
  'offensive',
  'derogatory',
  'pejorative',
  'ethnic slur',
  'euphemistic',
  'legal',
  'law',
  'nautical',
  'military',
  'obsolete outside dialects',
]);

/** Templates whose first positional value is the visible text. */
const KEEP_TEXT = new Set([
  'l',
  'm',
  'w',
  'ng',
  'n-g',
  'non-gloss',
  'ngd',
  'taxfmt',
  'vern',
  'taxlink',
]);

const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Positional (unnamed) parameters of a template body "name|a|b|x=y". */
function positional(body: string): string[] {
  return splitTemplate(body)
    .slice(1)
    .filter((p) => !/^\s*[\w-]+\s*=/.test(p));
}

/** Splits a template body on top-level "|" (ignores pipes inside nested [[...]] or {{...}}). */
function splitTemplate(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (let i = 0; i < body.length; i += 1) {
    const two = body.slice(i, i + 2);
    if (two === '{{' || two === '[[') {
      depth += 1;
      current += two;
      i += 1;
    } else if (two === '}}' || two === ']]') {
      depth -= 1;
      current += two;
      i += 1;
    } else if (body[i] === '|' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += body[i];
    }
  }
  parts.push(current);
  return parts;
}

/** Replaces innermost templates repeatedly using `render` until none are left. */
function replaceTemplates(text: string, render: (name: string, body: string) => string): string {
  let out = text;
  for (let guard = 0; guard < 20 && out.includes('{{'); guard += 1) {
    const next = out.replace(/\{\{([^{}]*)\}\}/g, (_, body: string) => {
      const name = body.split('|')[0].trim().toLowerCase();
      return render(name, body);
    });
    if (next === out) break;
    out = next;
  }
  return out;
}

/** Wikitext → plain text: links resolved, kept templates rendered, other templates removed. */
export function cleanWikitext(text: string): string {
  let out = replaceTemplates(text, (name, body) => {
    const args = positional(body);
    if (KEEP_TEXT.has(name)) {
      // {{l|en|word|display}} → display or word; {{w|Page|display}} → display or page;
      // {{taxfmt|Malus|genus}} and the gloss templates → first value.
      if (name === 'l' || name === 'm') return args[2] || args[1] || '';
      if (name === 'w') return args[1] || args[0] || '';
      return args[0] ?? '';
    }
    if (name === 'gloss' || name === 'q' || name === 'qualifier' || name === 'i')
      return `(${args.join(', ')})`;
    // {{cap|enjoyable}}, {{U|thick}}: a capitalised word.
    if (name === 'cap' || name === 'u') return capitalise(args.join(''));
    // Form-of templates: {{initialism of|en|compact disc}} → "Initialism of compact disc".
    if (name === 'infl of' && args[1]) return `Inflection of ${args[1]}`;
    if (name.endsWith(' of') && args[1]) return `${capitalise(name)} ${args[1]}`;
    return '';
  });
  out = out
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/<ref[^>]*\/>|<ref[^>]*>[\s\S]*?<\/ref>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/'''?/g, '')
    .replace(/&(?:nbsp|emsp|ensp|thinsp);/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?)])/g, '$1')
    .replace(/\(\s*\)/g, '')
    .replace(/;\s*\./g, '.')
    .trim();
  return capitalise(out.replace(/^[,;:.\s]+/, ''));
}

function labelsOf(line: string): string[] {
  const labels: string[] = [];
  line.replace(/\{\{(?:lb|lbl|label)\|en\|([^{}]*)\}\}/g, (_, body: string) => {
    for (const l of body.split('|'))
      if (!/=/.test(l) && l !== '_') labels.push(l.trim().toLowerCase());
    return '';
  });
  return labels;
}

/** A learner example must be a full sentence, not a phrase such as "College of Engineering". */
export function isSentence(text: string): boolean {
  return /^["“‘(]?[A-Z0-9]/.test(text) && /[.!?]["”’)]?$/.test(text) && text.split(' ').length >= 3;
}

/** Text of a usage-example line "#: {{ux|en|...}}" or "#: ''...''"; undefined for other lines. */
function exampleOf(line: string): string | undefined {
  const body = line.replace(/^#+:\s*/, '');
  const ux = body.match(/^\{\{(?:ux|usex|eg)\|en\|([\s\S]*)\}\}\s*$/);
  if (ux) {
    const first = positional(`ux|${ux[1]}`)[0] ?? '';
    return cleanWikitext(first) || undefined;
  }
  if (/^''[^']/.test(body) || /^'''''/.test(body)) {
    const italic = body.match(/^''([\s\S]*?)''(?!')\s*(?:\(.*)?$/);
    return italic ? cleanWikitext(italic[1]) || undefined : undefined;
  }
  return undefined;
}

/** English senses of an entry, in page order, with their labels and usage examples. */
export function parseEnglishSenses(wikitext: string): WiktSense[] {
  const start = wikitext.search(/^==English==\s*$/m);
  if (start < 0) return [];
  const rest = wikitext.slice(start + 1);
  const end = rest.search(/^==[^=]/m);
  const english = end < 0 ? rest : rest.slice(0, end);

  const senses: WiktSense[] = [];
  let pos = '';
  // Open senses by depth ("#" = 1, "##" = 2, ...); examples also count for parent senses.
  // Sub-sense examples only come from the first child at each level: a second child is a
  // different meaning (e.g. "apple" the fruit vs "three apples tall").
  let stack: { depth: number; sense: WiktSense; children: number }[] = [];
  for (const line of english.split('\n')) {
    const heading = line.match(/^={3,5}\s*([^=]+?)\s*={3,5}\s*$/);
    if (heading) {
      pos = heading[1].toLowerCase();
      stack = [];
      continue;
    }
    const definitionLine = line.match(/^(#+)(?:\s|$)/);
    if (definitionLine) {
      const depth = definitionLine[1].length;
      const sense: WiktSense = {
        pos,
        definition: cleanWikitext(line.slice(depth)),
        labels: labelsOf(line),
        examples: [],
        subSenseExamples: [],
      };
      stack = stack.filter((o) => o.depth < depth);
      for (const open of stack) if (open.depth === depth - 1) open.children += 1;
      stack.push({ depth, sense, children: 0 });
      // A definition ending in ":" only introduces its sub-senses.
      if (/[A-Za-z]{2}/.test(sense.definition) && !sense.definition.endsWith(':'))
        senses.push(sense);
      continue;
    }
    const exampleLine = line.match(/^(#+):/);
    if (exampleLine && stack.length) {
      const example = exampleOf(line);
      if (!example || !isSentence(example)) continue;
      const depth = exampleLine[1].length;
      for (const open of stack) {
        if (open.depth === depth) open.sense.examples.push(example);
        else if (open.depth < depth && onFirstChildPath(stack, open))
          open.sense.subSenseExamples.push(example);
      }
    }
  }
  return senses;
}

/** True when every open sense below `ancestor` is the first child of its parent. */
function onFirstChildPath(
  stack: { depth: number; children: number }[],
  ancestor: { depth: number },
): boolean {
  return stack
    .filter((o) => o.depth >= ancestor.depth)
    .slice(0, -1)
    .every((o) => o.children <= 1);
}

const STOPWORDS = new Set(
  'the and for that with from into onto over under used usually often especially some any one ones which who whom whose this these those their them they its his her are was were been being have has had not but can may such other than more most very also either each every all something someone person thing things kind part term terms informal address form'.split(
    ' ',
  ),
);

/** Content words of a definition, for comparing two dictionaries' wording. */
function contentWords(text: string): Set<string> {
  return new Set(
    (text.toLowerCase().match(/[a-z]+/g) ?? [])
      .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
      .map((w) => w.replace(/(ies|es|s)$/, '')),
  );
}

/** Share of the reference definition's content words that also appear in `definition`. */
export function overlap(reference: string, definition: string): number {
  const ref = contentWords(reference);
  if (ref.size === 0) return 0;
  const words = contentWords(definition);
  return [...ref].filter((w) => words.has(w)).length / ref.size;
}

/** Below this share of shared wording, a Wiktionary sense is not taken as the WordNet meaning. */
export const MIN_OVERLAP = 0.25;

/**
 * The sense a learner should get as the main meaning.
 * - With a `reference` (the WordNet primary definition, which is ordered by frequency): the
 *   allowed sense with examples whose wording is closest to it, so the common meaning is kept even
 *   though Wiktionary orders senses by history.
 * - Without one (WordNet has no entry, mostly function words): the first allowed sense.
 * Allowed = matching part of speech and no old, rare, specialist or offensive label.
 */
export function primaryWiktSense(
  senses: WiktSense[],
  pos: string,
  reference?: string,
): WiktSense | undefined {
  const headings = wiktionaryPos(pos);
  const allowed = senses.filter(
    (s) => headings.includes(s.pos) && !s.labels.some((l) => SKIPPED_LABELS.has(l)),
  );
  if (!reference) return allowed[0];
  let best: WiktSense | undefined;
  let bestScore = MIN_OVERLAP;
  for (const sense of allowed) {
    if (sense.examples.length + sense.subSenseExamples.length === 0) continue;
    const score = overlap(reference, sense.definition);
    if (score >= bestScore && (!best || score > bestScore)) {
      best = sense;
      bestScore = score;
    }
  }
  return best;
}
