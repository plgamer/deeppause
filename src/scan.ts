import * as vscode from 'vscode';

export interface Snippet {
  file: string;
  start: number;
  lines: string[];
}

export interface Facts {
  files: string[];
  symbols: string[];
  snippets: Snippet[];
  cwd: string;
}

const FALLBACK: Facts = {
  cwd: '~/project',
  files: [
    'src/server/router.ts',
    'src/auth/guard.ts',
    'src/auth/session.ts',
    'src/lib/cache.ts',
    'src/models/user.ts',
    'tests/auth.spec.ts'
  ],
  symbols: ['createSession', 'requireAuth', 'UserRepo', 'resolveToken', 'CacheEntry', 'withRetry'],
  snippets: [
    {
      file: 'src/auth/guard.ts',
      start: 34,
      lines: [
        'export async function requireAuth(req: Request) {',
        '  const token = resolveToken(req.headers);',
        '  if (!token) throw new Unauthorized();',
        '',
        '  const session = await store.get(token);',
        '  return session;',
        '}'
      ]
    }
  ]
};

const SYMBOL_RE =
  /(?:^|\n)\s*(?:export\s+)?(?:async\s+)?(?:function|class|interface|type|const|def|func|struct)\s+([A-Za-z_][A-Za-z0-9_]{3,30})/g;

/**
 * Pull real paths, symbol names and code snippets out of the open workspace so the
 * transcript talks about things that actually exist on this machine.
 */
export async function scanWorkspace(enabled: boolean): Promise<Facts> {
  if (!enabled || !vscode.workspace.workspaceFolders?.length) return FALLBACK;

  const root = vscode.workspace.workspaceFolders[0];
  try {
    const uris = await vscode.workspace.findFiles(
      '**/*.{ts,tsx,js,jsx,py,go,rs,java,rb,php,c,cpp,cs,swift,kt}',
      '**/{node_modules,dist,build,out,vendor,.git,target}/**',
      400
    );
    if (!uris.length) return FALLBACK;

    const files = uris.map(u => vscode.workspace.asRelativePath(u, false));
    const symbols = new Set<string>();
    const snippets: Snippet[] = [];

    for (const uri of pickRandom(uris, 12)) {
      let text: string;
      try {
        text = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8');
      } catch {
        continue;
      }
      if (text.length > 200_000) continue;

      SYMBOL_RE.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = SYMBOL_RE.exec(text))) symbols.add(m[1]);

      const lines = text.split('\n');
      if (lines.length > 20 && snippets.length < 8) {
        const start = 5 + Math.floor(Math.random() * Math.max(1, lines.length - 15));
        snippets.push({
          file: vscode.workspace.asRelativePath(uri, false),
          start: start + 1,
          lines: lines.slice(start, start + 7).map(l => l.slice(0, 96))
        });
      }
    }

    return {
      cwd: root.uri.fsPath.replace(process.env.HOME ?? '~~~', '~'),
      files: files.length ? files : FALLBACK.files,
      symbols: symbols.size ? [...symbols] : FALLBACK.symbols,
      snippets: snippets.length ? snippets : FALLBACK.snippets
    };
  } catch {
    return FALLBACK;
  }
}

function pickRandom<T>(arr: readonly T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  while (copy.length && out.length < n) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return out;
}
