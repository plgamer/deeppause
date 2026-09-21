import { Facts } from './scan';

/** Gerunds for the working spinner. */
export const VERBS = [
  'Analyzing', 'Pondering', 'Untangling', 'Deliberating', 'Percolating',
  'Synthesizing', 'Correlating', 'Distilling', 'Wrangling', 'Inspecting',
  'Reticulating', 'Simmering', 'Noodling', 'Marinating', 'Cogitating',
  'Triangulating', 'Unspooling', 'Collating', 'Weighing', 'Sifting'
];

/** Interior-monologue sentences. Slot names are filled by `fill()`. */
const THINKING = [
  'Let me look at how {sym} is wired up before I change anything.',
  'The ask is {goal}. Starting point is probably {file} — that is where the entry point lives.',
  'Okay, so {file} imports {sym} but never re-exports it. That would explain the resolution error.',
  'I need to be careful here. Changing the signature of {sym} breaks {n} call sites, and I have not read all of them yet.',
  'Two options. Patch {file} directly, or introduce a thin adapter. The adapter is cleaner but adds a file for very little; given the scope, direct is fine.',
  'Wait — {file} already handles this case further down. Let me re-read it more carefully before duplicating logic.',
  'That failure is coming from the fixture, not the implementation. The assertion still expects the old shape.',
  'Let me check whether anything already covers {sym} before I write a new test for it.',
  'Hmm. {sym} is called from both the request path and the background worker, so it cannot assume a request context.',
  'The naming in {file} is inconsistent with the rest of the module, but renaming is out of scope for this change. Leaving it.',
  'One thing I want to confirm: does {sym} run before or after the guard? If after, the early return is unreachable.',
  'Right, that is the last piece. Running the suite once more to confirm nothing else regressed.',
  'Actually, I should not touch {file} at all. The cleaner fix is one level up, where the value is constructed.',
  'There is a subtle ordering issue: {sym} mutates the object the caller still holds a reference to.'
];

/** Spoken-to-the-user sentences. */
const SPEECH = [
  "I'll start by reading {file} to get the current structure.",
  'Found it — {sym} is defined in {file}. Updating it now.',
  'Two tests are failing. Looking at the first one.',
  'Fixed. The problem was that {sym} returned early before the guard ran.',
  'All tests pass. Here is what changed:',
  'Before I edit anything, let me confirm how {sym} is used elsewhere.',
  'That is the root cause. The value was being read once at module load instead of per request.',
  "I've updated {file}. Running the tests to check nothing else depends on the old behaviour."
];

const GOALS = [
  'tighten up the auth guard',
  'stop the duplicate writes',
  'make the cache invalidate correctly',
  'get the failing suite green',
  'pull the retry logic into one place',
  'fix the race on startup'
];

const BASH = [
  { cmd: 'npm test', desc: 'Run the test suite' },
  { cmd: 'npm run typecheck', desc: 'Typecheck' },
  { cmd: 'npm run lint -- --fix', desc: 'Lint and autofix' },
  { cmd: 'git diff --stat', desc: 'Show changed files' },
  { cmd: 'npm run build', desc: 'Build' }
];

export class Corpus {
  constructor(private facts: Facts) {}

  file(): string { return pick(this.facts.files); }
  sym(): string { return pick(this.facts.symbols); }
  snippet() { return pick(this.facts.snippets); }
  verb(): string { return pick(VERBS); }
  bash() { return pick(BASH); }
  goal(): string { return pick(GOALS); }

  thinking(): string { return this.fill(pick(THINKING)); }
  speech(): string { return this.fill(pick(SPEECH)); }

  /** Replace {file} / {sym} / {n} / {goal} slots with concrete values. */
  fill(t: string): string {
    return t
      .replace(/\{file\}/g, () => this.file())
      .replace(/\{sym\}/g, () => this.sym())
      .replace(/\{goal\}/g, () => this.goal())
      .replace(/\{n\}/g, () => String(2 + Math.floor(Math.random() * 14)));
  }

  todos(): string[] {
    const verbs = ['Read', 'Trace', 'Update', 'Add a test for', 'Re-run', 'Check'];
    const out: string[] = [];
    const count = 3 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      out.push(`${verbs[i % verbs.length]} ${Math.random() < 0.5 ? this.file() : this.sym()}`);
    }
    return out;
  }
}

export function pick<T>(a: readonly T[]): T {
  return a[Math.floor(Math.random() * a.length)];
}
