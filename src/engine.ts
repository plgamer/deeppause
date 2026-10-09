import { Corpus, pick } from './corpus';
import { Facts } from './scan';

export type DiffLine = { t: '+' | '-' | ' '; n: number; s: string };

export type Ev =
  | { k: 'user'; text: string }
  | { k: 'thinkStart' }
  | { k: 'textStart' }
  | { k: 'stream'; text: string }
  | { k: 'endBlock' }
  | { k: 'tool'; id: string; name: string; arg: string }
  | { k: 'toolResult'; id: string; lines: string[]; tone: 'ok' | 'warn' | 'err'; ms: number }
  | { k: 'todo'; id: string; items: { text: string; state: 'done' | 'doing' | 'todo' }[] }
  | { k: 'diff'; id: string; file: string; adds: number; dels: number; lines: DiffLine[] }
  | { k: 'spinner'; on: boolean; verb?: string }
  | { k: 'tokens'; n: number }
  | { k: 'idle' };

class Cancelled extends Error {}
class Expired extends Error {}

/** Tokens at which the session pretends to compact, so the context meter can recover. */
const COMPACT_AT = 78_000;

let seq = 0;
const nextId = () => `b${++seq}`;

export class Engine {
  private cancelled = false;
  private deadline: number | undefined;
  private tokens = 0;
  private list: string[] = [];
  private doneUpTo = 0;
  private c: Corpus;

  constructor(
    facts: Facts,
    private speed: () => number,
    private emit: (e: Ev) => void
  ) {
    this.c = new Corpus(facts);
  }

  cancel() { this.cancelled = true; }

  // ---------------------------------------------------------------- timing

  private async sleep(ms: number) {
    let left = ms / Math.max(0.25, this.speed());
    while (left > 0) {
      if (this.cancelled) throw new Cancelled();
      if (this.deadline !== undefined && Date.now() >= this.deadline) throw new Expired();
      await new Promise(r => setTimeout(r, 25));
      left -= 25;
    }
    if (this.cancelled) throw new Cancelled();
  }

  private bump(text: string) {
    this.tokens += Math.max(1, Math.round(text.length / 4));
    this.emit({ k: 'tokens', n: this.tokens });
  }

  /**
   * Word-level streaming with jitter, plus the occasional long stall. The stalls are
   * what sell it — perfectly even output reads as a typewriter effect, not a model.
   */
  private async streamWords(s: string) {
    for (const part of s.split(/(\s+)/)) {
      if (!part) continue;
      this.emit({ k: 'stream', text: part });
      this.bump(part);
      if (part.trim()) {
        await this.sleep(22 + Math.random() * 55);
        if (Math.random() < 0.035) await this.sleep(500 + Math.random() * 1300);
      }
    }
  }

  // ----------------------------------------------------------------- beats

  private async think(sentences = 2 + Math.floor(Math.random() * 3)) {
    this.emit({ k: 'spinner', on: true, verb: this.c.verb() });
    this.emit({ k: 'thinkStart' });
    for (let i = 0; i < sentences; i++) {
      if (i) this.emit({ k: 'stream', text: ' ' });
      await this.streamWords(this.c.thinking());
    }
    this.emit({ k: 'endBlock' });
    await this.sleep(300);
  }

  private async say(text?: string) {
    this.emit({ k: 'textStart' });
    await this.streamWords(text ?? this.c.speech());
    this.emit({ k: 'endBlock' });
    await this.sleep(250);
  }

  private async tool(
    name: string,
    arg: string,
    lines: string[],
    tone: 'ok' | 'warn' | 'err' = 'ok'
  ) {
    const id = nextId();
    this.emit({ k: 'tool', id, name, arg });
    this.emit({ k: 'spinner', on: true, verb: this.c.verb() });
    const ms = 200 + Math.floor(Math.random() * 1600);
    await this.sleep(ms);
    this.emit({ k: 'toolResult', id, lines, tone, ms });
    await this.sleep(200);
  }

  private async todos(items: string[], doneUpTo: number) {
    this.emit({
      k: 'todo',
      id: nextId(),
      items: items.map((text, i) => ({
        text,
        state: i < doneUpTo ? 'done' : i === doneUpTo ? 'doing' : 'todo'
      }))
    });
    await this.sleep(400);
  }

  /** Build a small, plausible hunk out of a real snippet from the workspace. */
  private async edit() {
    const sn = this.c.snippet();
    const target = Math.floor(sn.lines.length / 2);
    const lines: DiffLine[] = [];
    let adds = 0;
    let dels = 0;

    sn.lines.forEach((s, i) => {
      const n = sn.start + i;
      if (i === target) {
        lines.push({ t: '-', n, s });
        lines.push({ t: '+', n, s: rewrite(s, this.c.sym()) });
        adds++; dels++;
      } else {
        lines.push({ t: ' ', n, s });
      }
    });

    if (Math.random() < 0.5) {
      lines.splice(target + 2, 0, {
        t: '+',
        n: sn.start + target + 1,
        s: indentOf(sn.lines[target]) + `if (!${this.c.sym()}) return null;`
      });
      adds++;
    }

    const id = nextId();
    this.emit({ k: 'tool', id, name: 'Edit', arg: sn.file });
    this.emit({ k: 'spinner', on: true, verb: this.c.verb() });
    await this.sleep(500 + Math.random() * 1200);
    this.emit({ k: 'diff', id, file: sn.file, adds, dels, lines });
    await this.sleep(300);
  }

  // ----------------------------------------------------------------- todos

  /** One persistent checklist that advances a step at a time, then rolls over. */
  private async nextTodo() {
    if (!this.list.length || this.doneUpTo >= this.list.length) {
      if (this.list.length) await this.todos(this.list, this.list.length);
      this.list = this.c.todos();
      this.doneUpTo = 0;
    }
    await this.todos(this.list, this.doneUpTo);
    this.doneUpTo++;
  }

  /** Keeps the context meter from pinning at its floor during a long session. */
  private async compact() {
    const kept = 4 + Math.floor(Math.random() * 9);
    await this.tool('Compact', 'conversation', [
      `Compacted ${Math.round(this.tokens / 1000)}k tokens into a summary`,
      `Kept ${kept} recent turns`
    ]);
    this.tokens = 2000 + Math.floor(Math.random() * 3000);
    this.emit({ k: 'tokens', n: this.tokens });
  }

  // ------------------------------------------------------------------ beats

  private async readBeat() {
    await this.tool('Read', this.c.file(), [
      `Read ${40 + Math.floor(Math.random() * 380)} lines`
    ]);
  }

  private async grepBeat() {
    const sym = this.c.sym();
    await this.tool('Grep', `"${sym}"`, [
      `Found ${2 + Math.floor(Math.random() * 20)} matches across ${1 + Math.floor(Math.random() * 6)} files`
    ]);
  }

  /** A run that passes, or — more interestingly — fails and then gets fixed. */
  private async testBeat() {
    const cmd = this.c.bash();
    const sym = this.c.sym();

    if (Math.random() < 0.45) {
      await this.tool(
        'Bash',
        cmd.cmd,
        [
          `FAIL tests/${sym.toLowerCase()}.spec.ts`,
          `  ● ${sym} › returns null for an expired token`,
          '',
          '    expect(received).toEqual(expected)',
          '    - Expected: null',
          '    + Received: { token: "…" }',
          '',
          `Tests: 2 failed, ${8 + Math.floor(Math.random() * 40)} passed`
        ],
        'err'
      );
      await this.think(2);
      await this.say('The fixture still returns the pre-refactor shape. Updating it.');
      await this.edit();
    }

    await this.tool(
      'Bash',
      cmd.cmd,
      [`Tests: ${12 + Math.floor(Math.random() * 60)} passed`, 'Done in 4.1s'],
      'ok'
    );
  }

  /** Orientation beats, played once at the top of a turn. */
  private async opening() {
    await this.think();
    this.list = this.c.todos();
    this.doneUpTo = 0;
    await this.todos(this.list, 0);
    this.doneUpTo = 1;
    await this.readBeat();
    await this.grepBeat();
    await this.say();
  }

  /** One unit of work. The loop calls this forever unless a limit cuts it short. */
  private async step(i: number) {
    if (i > 0 && i % 6 === 0) await this.nextTodo();

    const r = Math.random();
    if (r < 0.22) await this.think(1 + Math.floor(Math.random() * 3));
    else if (r < 0.38) await this.readBeat();
    else if (r < 0.50) await this.grepBeat();
    else if (r < 0.68) await this.edit();
    else if (r < 0.80) await this.say();
    else if (r < 0.94) await this.testBeat();
    else await this.nextTodo();

    if (this.tokens > COMPACT_AT) await this.compact();
  }

  /** Wrap-up. Runs with the budget lifted so the closing line always completes. */
  private async finish() {
    this.deadline = undefined;
    this.emit({ k: 'endBlock' }); // the budget can run out mid-stream
    try {
      if (this.list.length) await this.todos(this.list, this.list.length);
      await this.say(
        `Done. ${this.c.fill('Root cause was in {file}: {sym} was evaluated once at module load rather than per call, so the expired-token branch never ran.')}`
      );
    } catch (e) {
      if (!(e instanceof Cancelled)) throw e;
      this.emit({ k: 'endBlock' });
    }
  }

  // ------------------------------------------------------------------- turn

  /**
   * Open-ended by default: beats keep coming until the user interrupts. `limitMs` caps
   * the wall clock, after which the turn wraps up instead of stopping mid-sentence.
   */
  async run(prompt: string, limitMs?: number) {
    this.deadline = limitMs === undefined ? undefined : Date.now() + limitMs;

    try {
      this.emit({ k: 'user', text: prompt });
      await this.sleep(500);

      await this.opening();

      for (let i = 0; ; i++) await this.step(i);
    } catch (e) {
      if (e instanceof Expired) await this.finish();
      else if (e instanceof Cancelled) this.emit({ k: 'endBlock' });
      else throw e;
    } finally {
      this.emit({ k: 'spinner', on: false });
      this.emit({ k: 'idle' });
    }
  }
}

function indentOf(s: string) {
  return (s.match(/^\s*/) ?? [''])[0];
}

function rewrite(s: string, sym: string) {
  const trimmed = s.trim();
  if (!trimmed) return indentOf(s) + `const ${sym} = await resolve(ctx);`;
  if (/=/.test(s)) return s.replace(/=\s*(.*)$/, `= await ${sym}($1`).replace(/;?$/, ');');
  if (/\(/.test(s)) return s.replace(/\(/, `(/* via ${sym} */ `);
  return `${s} // routed through ${sym}`;
}
