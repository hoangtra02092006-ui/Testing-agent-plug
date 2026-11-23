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
        lemma = a.writtenForm;
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

const WIKTIONARY_CACHE = join(CACHE, 'wiktionary.json');
const WIKTIONARY_API = 'https://en.wiktionary.org/w/api.php';
const USER_AGENT =
  'VocabTrainerDataBuild/1.0 (https://github.com/hoangtra02092006-ui/Testing-agent-plug)';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Wikitext of the given Wiktionary pages, cached in data-pipeline/.cache/wiktionary.json
 * (null = no such page). Fetches 50 titles per request and backs off when rate limited (HTTP 429).
 */
async function wiktionaryPages(titles: string[]): Promise<Map<string, string>> {
  const cache: Record<string, string | null> = existsSync(WIKTIONARY_CACHE)
    ? JSON.parse(readFileSync(WIKTIONARY_CACHE, 'utf8'))
    : {};
  const todo = titles.filter((t) => !(t in cache));
  for (let i = 0; i < todo.length; i += 50) {
    const batch = todo.slice(i, i + 50);
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      formatversion: '2',
      prop: 'revisions',
      rvprop: 'content',
      rvslots: 'main',
      titles: batch.join('|'),
      maxlag: '5',
    });
    for (let attempt = 1; ; attempt += 1) {
      const res = await fetch(`${WIKTIONARY_API}?${params}`, {
        headers: { 'User-Agent': USER_AGENT },
      });
      const data = res.ok
        ? ((await res.json()) as {
            error?: { code: string };
            query?: {
              normalized?: { from: string; to: string }[];
              pages: { title: string; revisions?: { slots: { main: { content: string } } }[] }[];
            };
          })
        : undefined;
      if (data?.query) {
        const byTitle = new Map(data.query.pages.map((p) => [p.title, p]));
        const normalized = new Map((data.query.normalized ?? []).map((n) => [n.from, n.to]));
        for (const title of batch) {
          const page = byTitle.get(normalized.get(title) ?? title);
          cache[title] = page?.revisions?.[0]?.slots.main.content ?? null;
        }
        writeFileSync(WIKTIONARY_CACHE, JSON.stringify(cache));
        console.log(`Wiktionary: ${Math.min(i + 50, todo.length)}/${todo.length} pages`);
        break;
      }
      // Busy server: rate limit (429), unavailable (503) or replication lag (200 + maxlag error).
      const busy = res.status === 429 || res.status === 503 || data?.error?.code === 'maxlag';
      if (!busy || attempt >= 12) {
        const why = data?.error?.code ?? `HTTP ${res.status}`;
        throw new Error(`Wiktionary request failed (${why}). Run again later to resume.`);
      }
      const retryAfter = Number(res.headers.get('retry-after'));
      const wait = Math.max(20_000 * attempt, Number.isFinite(retryAfter) ? retryAfter * 1000 : 0);
      console.log(`Wiktionary busy, waiting ${wait / 1000}s (attempt ${attempt})`);
      await sleep(wait);
    }
    await sleep(2_000);
  }
  return new Map(
    titles.flatMap((t) => (typeof cache[t] === 'string' ? [[t, cache[t] as string]] : [])),
  );
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
    const first = buildWords(levelRows, entries, synsets);
    const wiktionary = await wiktionaryPages([...new Set(first.missing.map((m) => m.headword))]);
    const { words, missing, droppedExamples, fromWiktionary } = buildWords(
      levelRows,
      entries,
      synsets,
      2,
      wiktionary,
    );
    const problems = validateWords(words);
    if (problems.length) throw new Error(`Validation failed for ${level}:\n${problems.join('\n')}`);
    writeFileSync(join(OUT, `${level}.json`), JSON.stringify(words));
    const report = [
      `# Data report ${level}`,
      `Source entries: ${levelRows.length}. Included: ${words.length} (${words.length - fromWiktionary.length} from WordNet, ${fromWiktionary.length} from Wiktionary). Missing: ${missing.length}.`,
      '',
      'WordNet is used first. A word WordNet cannot give is taken from Wiktionary under the same rules.',
      'Only senses without an obsolete, archaic, rare, dated, slang, offensive or specialist label count,',
      'and only full-sentence usage examples of that sense (no book quotations, at most 20 words).',
      'When WordNet has a definition, the Wiktionary sense must share its wording: among senses about',
      'as close as the best match, the earliest is used; with no close sense the word stays missing.',
      'Senses that only name a grammatical form ("Inflection of be") have no definition.',
      '',
      'Reasons:',
      '- no-definition: Open English WordNet has no entry for this word and part of speech',
      '  (function words: articles, pronouns, prepositions, determiners).',
      '- no-example: the primary (most common) sense has no example sentence containing the word.',
      '  Rarer senses are never used instead, so the meaning shown is always the common one.',
      '- sensitive: the definition or every example is unsuitable for school learners.',
      '- rejected-in-review: the Wiktionary entry was read by hand and rejected',
      '  (wrong meaning or odd example); see data-pipeline/review-wiktionary.ts.',
      '',
      'Reasons below are the WordNet ones; these words had no usable Wiktionary sense either.',
      '',
      '## Words from Wiktionary',
      '',
      fromWiktionary.join(', '),
      '',
      '## Examples left out as unsuitable',
      '',
      ...droppedExamples.map((d) => `- ${d.headword}: "${d.example}"`),
      '',
      '## Missing words',
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
