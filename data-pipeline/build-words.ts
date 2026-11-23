/**
 * Builds public/words/<level>.json from the CEFR-J / Octanove profiles and Open English WordNet.
 * Usage: npm run data:build -- A1 [A2 ...]   (default: A1)
 * Sources are downloaded once into data-pipeline/.cache (not committed).
 */
import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createGunzip } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sax from 'sax';
import type { CefrLevel } from '../src/domain/types';
import { buildWords, parseProfile, validateWords, type LexEntry, type Synset } from './lib';

const ROOT = dirname(fileURLToPath(import.meta.url));
const CACHE = join(ROOT, '.cache');
const OUT = join(ROOT, '..', 'public', 'words');

const SOURCES = {
  cefrj: {
    file: 'cefrj-vocabulary-profile-1.5.csv',
    url: 'https://raw.githubusercontent.com/openlanguageprofiles/olp-en-cefrj/master/cefrj-vocabulary-profile-1.5.csv',
  },
  octanove: {
    file: 'octanove-vocabulary-profile-c1c2-1.0.csv',
    url: 'https://raw.githubusercontent.com/openlanguageprofiles/olp-en-cefrj/master/octanove-vocabulary-profile-c1c2-1.0.csv',
  },
  wordnet: {
    file: 'english-wordnet-2024.xml.gz',
    url: 'https://github.com/globalwordnet/english-wordnet/releases/download/2024-edition/english-wordnet-2024.xml.gz',
  },
};

async function ensure(source: { file: string; url: string }): Promise<string> {
  const path = join(CACHE, source.file);
  if (!existsSync(path)) {
    mkdirSync(CACHE, { recursive: true });
    console.log(`Downloading ${source.url}`);
    const res = await fetch(source.url);
    if (!res.ok) throw new Error(`Download failed (${res.status}): ${source.url}`);
    writeFileSync(path, Buffer.from(await res.arrayBuffer()));
  }
  return path;
}

function readWordnet(
  path: string,
): Promise<{ entries: Map<string, LexEntry[]>; synsets: Map<string, Synset> }> {
  return new Promise((resolve, reject) => {
    const entries = new Map<string, LexEntry[]>();
    const synsets = new Map<string, Synset>();
    let entry: LexEntry | null = null;
    let lemma = '';
    let synsetId: string | null = null;
    let synset: Synset | null = null;
    let textTarget: 'definition' | 'example' | null = null;
    let text = '';

    const parser = sax.createStream(true);
    parser.on('opentag', (node) => {
      const a = node.attributes as Record<string, string>;
      if (node.name === 'LexicalEntry') entry = { pos: '', synsetIds: [] };
      else if (node.name === 'Lemma' && entry) {
        lemma = a.writtenForm.toLowerCase();
        entry.pos = a.partOfSpeech;
      } else if (node.name === 'Sense' && entry) entry.synsetIds.push(a.synset);
      else if (node.name === 'Synset') {
        synsetId = a.id;
        synset = { examples: [] };
      } else if ((node.name === 'Definition' || node.name === 'Example') && synset) {
        textTarget = node.name === 'Definition' ? 'definition' : 'example';
        text = '';
      }
    });
    parser.on('text', (t) => {
      if (textTarget) text += t;
    });
    parser.on('closetag', (name) => {
      if (name === 'LexicalEntry' && entry) {
        entries.set(lemma, [...(entries.get(lemma) ?? []), entry]);
        entry = null;
      } else if (name === 'Definition' && synset && synset.definition === undefined) {
        synset.definition = text.trim();
        textTarget = null;
      } else if (name === 'Example' && synset) {
        synset.examples.push(text.trim());
        textTarget = null;
      } else if (name === 'Synset' && synset && synsetId) {
        synsets.set(synsetId, synset);
        synset = null;
      }
    });
    parser.on('error', reject);
    parser.on('end', () => resolve({ entries, synsets }));
    createReadStream(path).pipe(createGunzip()).pipe(parser);
  });
}

async function main() {
  const levels = (process.argv.slice(2).length ? process.argv.slice(2) : ['A1']) as CefrLevel[];
  const profileText = [
    readFileSync(await ensure(SOURCES.cefrj), 'utf8'),
    readFileSync(await ensure(SOURCES.octanove), 'utf8'),
  ];
  const rows = profileText.flatMap(parseProfile);
  const { entries, synsets } = await readWordnet(await ensure(SOURCES.wordnet));
  mkdirSync(OUT, { recursive: true });

  for (const level of levels) {
    const levelRows = rows.filter((r) => r.level === level);
    const { words, missing } = buildWords(levelRows, entries, synsets);
    const problems = validateWords(words);
    if (problems.length) throw new Error(`Validation failed for ${level}:\n${problems.join('\n')}`);
    writeFileSync(join(OUT, `${level}.json`), JSON.stringify(words));
    const report = [
      `# Data report ${level}`,
      `Source entries: ${levelRows.length}. Included: ${words.length}. Missing: ${missing.length}.`,
      '',
      '| Headword | Part of speech | Reason |',
      '|---|---|---|',
      ...missing.map((m) => `| ${m.headword} | ${m.pos} | ${m.reason} |`),
      '',
    ].join('\n');
    writeFileSync(join(ROOT, `report-${level}.md`), report);
    console.log(
      `${level}: ${words.length} words written, ${missing.length} missing (see data-pipeline/report-${level}.md)`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
