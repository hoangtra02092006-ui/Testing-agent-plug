/**
 * Pure helpers for building public/words/<level>.json.
 * Kept free of I/O so they can be unit tested.
 */
import type { CefrLevel, Word } from '../src/domain/types';

export interface ProfileRow {
  headword: string;
  pos: string;
  level: CefrLevel;
}

export interface Synset {
  definition?: string;
  examples: string[];
}

/** Lexical entries of one lemma (keyed by exact written form): part of speech + senses in frequency order. */
export interface LexEntry {
  pos: string;
  synsetIds: string[];
}

export type MissingReason = 'no-definition' | 'no-example' | 'sensitive';

export interface BuildResult {
  words: Word[];
  missing: { headword: string; pos: string; reason: MissingReason }[];
}

/** Minimal RFC 4180 CSV parser (quoted fields, escaped quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const input = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && input[i + 1] === '\n') i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const LEVELS = new Set(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);

/** Reads a CEFR-J / Octanove profile (columns headword,pos,CEFR,...). */
export function parseProfile(text: string): ProfileRow[] {
  const [header, ...rows] = parseCsv(text);
  const col = (name: string) => header.indexOf(name);
  const [h, p, c] = [col('headword'), col('pos'), col('CEFR')];
  if (h < 0 || p < 0 || c < 0) throw new Error('Profile CSV needs headword, pos and CEFR columns.');
  return rows
    .filter((r) => r.length > c && LEVELS.has(r[c].trim()))
    .map((r) => ({ headword: r[h].trim(), pos: r[p].trim(), level: r[c].trim() as CefrLevel }));
}

/** "a.m./A.M./am/AM" → "a.m."; trims and keeps the original casing of the first variant. */
export function primaryHeadword(headword: string): string {
  return headword.split('/')[0].trim();
}

/** WordNet parts of speech matching a CEFR-J part of speech (adjective covers satellites). */
export function wordnetPos(pos: string): string[] {
  switch (pos) {
    case 'noun':
      return ['n'];
    case 'verb':
      return ['v'];
    case 'adjective':
      return ['a', 's'];
    case 'adverb':
      return ['r'];
    case 'number':
      return ['n', 'a', 's'];
    default:
      return [];
  }
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** True when the example contains the headword or a regular inflection of it, as whole words. */
export function exampleUsesWord(example: string, headword: string): boolean {
  const base = escapeRegExp(headword.toLowerCase());
  const stem = headword.toLowerCase().endsWith('e')
    ? escapeRegExp(headword.toLowerCase().slice(0, -1))
    : base;
  const pattern = new RegExp(
    `(^|[^a-z])(${base}(s|es|d|ed)?|${stem}ing|${base}ing)([^a-z]|$)`,
    'i',
  );
  return pattern.test(example);
}

export function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Words that make a definition or example unsuitable for school learners. Matching text is dropped
 * and reported rather than shown; whole words only, so "Sussex" or "skill" are not caught.
 */
const SENSITIVE_WORDS = [
  'sex',
  'sexual',
  'sexually',
  'drug',
  'drugs',
  'kill',
  'killed',
  'killing',
  'murder',
  'murdered',
  'rape',
  'raped',
  'prostitute',
  'prostitution',
  'suicide',
  'naked',
  'nude',
  'whore',
  'bitch',
  'despicable',
  'spiteful',
  'erotic',
  'genitals',
  'penis',
  'vagina',
  'cocaine',
  'heroin',
  'gun',
  'guns',
  'shoot',
  'shot',
  'corpse',
  'torture',
];
const SENSITIVE_PATTERN = new RegExp(`(^|[^a-z])(${SENSITIVE_WORDS.join('|')})([^a-z]|$)`, 'i');
/** Phrases that are harmless word by word but not suitable together. */
const SENSITIVE_PHRASES = [/sells? (her|his|their) body/i, /make love/i];

export function isSensitive(text: string): boolean {
  return SENSITIVE_PATTERN.test(text) || SENSITIVE_PHRASES.some((p) => p.test(text));
}

/**
 * Uses the primary sense only: the first WordNet sense of a matching part of speech, which is the
 * most frequent meaning and the one a learner at this level needs. Examples come from that same
 * sense. When it has no usable example the word is reported, never filled from a rarer sense.
 * The lemma is matched with its exact casing so "cat" never picks up "CAT" (the scan) and "day"
 * never picks up "Day" (the writer).
 */
export function buildWords(
  rows: ProfileRow[],
  entries: Map<string, LexEntry[]>,
  synsets: Map<string, Synset>,
  maxExamples = 2,
): BuildResult {
  const words: Word[] = [];
  const missing: BuildResult['missing'] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const headword = primaryHeadword(row.headword);
    const id = `${row.level.toLowerCase()}:${slug(headword)}:${slug(row.pos)}`;
    if (seen.has(id)) continue;
    seen.add(id);

    const posSet = wordnetPos(row.pos);
    const primary = (entries.get(headword) ?? [])
      .filter((e) => posSet.includes(e.pos))
      .flatMap((e) => e.synsetIds)
      .map((sid) => synsets.get(sid))
      .find((s): s is Synset => Boolean(s?.definition));

    const report = (reason: MissingReason) => missing.push({ headword, pos: row.pos, reason });
    if (!primary) {
      report('no-definition');
      continue;
    }
    const usable = primary.examples.filter((ex) => exampleUsesWord(ex, headword));
    if (usable.length === 0) {
      report('no-example');
      continue;
    }
    const examples = usable.filter((ex) => !isSensitive(ex));
    if (isSensitive(primary.definition!) || examples.length === 0) {
      report('sensitive');
      continue;
    }
    words.push({
      id,
      headword,
      pos: row.pos,
      level: row.level,
      definitionEn: primary.definition!,
      examples: examples.slice(0, maxExamples),
    });
  }
  return { words, missing };
}

/** AC11 check: every word has a definition and at least one example containing the word. */
export function validateWords(words: Word[]): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const w of words) {
    if (ids.has(w.id)) problems.push(`${w.id}: duplicated id`);
    ids.add(w.id);
    if (!w.definitionEn?.trim()) problems.push(`${w.id}: missing definition`);
    if (!w.examples.some((ex) => exampleUsesWord(ex, w.headword)))
      problems.push(`${w.id}: no example uses the word`);
  }
  return problems;
}
