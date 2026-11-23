import { StaticWordRepository } from './staticWordRepository';

const words = [
  {
    id: 'a1:hello',
    headword: 'hello',
    pos: 'interjection',
    level: 'A1',
    definitionEn: 'a greeting',
    examples: [],
  },
];
const ok = (data: unknown) =>
  Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) });

describe('StaticWordRepository', () => {
  it('loads a level file once and caches it', async () => {
    const fetcher = vi.fn(() => ok(words));
    const repo = new StaticWordRepository(fetcher);
    expect(await repo.getWordsByLevel('A1')).toEqual(words);
    await repo.getWordsByLevel('A1');
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith('/words/A1.json');
  });

  it('reports HTTP errors and retries on the next call', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 404, json: () => Promise.resolve(null) })
      .mockImplementationOnce(() => ok(words));
    const repo = new StaticWordRepository(fetcher);
    await expect(repo.getWordsByLevel('B2')).rejects.toThrow(/B2.*404/);
    expect(await repo.getWordsByLevel('B2')).toEqual(words);
  });

  it('rejects a file that is not a list', async () => {
    const repo = new StaticWordRepository(() => ok({}));
    await expect(repo.getWordsByLevel('C1')).rejects.toThrow(/not a list/);
  });
});
