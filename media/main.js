(function () {
  const vscode = acquireVsCodeApi();

  const $ = id => document.getElementById(id);
  const scroll = $('scroll');
  const transcript = $('transcript');
  const spinner = $('spinner');
  const input = $('input');
  const modelSel = $('model');
  const ctxEl = $('ctx');
  const limitSel = $('limit');

  let cur = null;            // block currently being streamed into
  let curText = null;        // its text node
  let running = false;
  let tokens = 0;
  let startedAt = 0;
  let verb = 'Working';
  let spinTimer = null;

  const GLYPHS = ['✢', '✳', '∗', '✻', '✽', '✻', '∗', '✳'];
  let glyphIx = 0;

  // ------------------------------------------------------------------ util

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };

  const atBottom = () => scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight < 80;

  let stick = true;
  scroll.addEventListener('scroll', () => { stick = atBottom(); });
  const nudge = () => { if (stick) scroll.scrollTop = scroll.scrollHeight; };

  // An open-ended session appends forever, so drop the oldest blocks.
  const MAX_BLOCKS = 400;
  function trim() {
    while (transcript.childElementCount > MAX_BLOCKS) {
      transcript.removeChild(transcript.firstElementChild);
    }
  }

  const fmtTokens = n => (n < 1000 ? String(n) : (n / 1000).toFixed(1) + 'k');

  // --------------------------------------------------------------- spinner

  function tickSpinner() {
    if (!running) return;
    glyphIx = (glyphIx + 1) % GLYPHS.length;
    const secs = Math.floor((Date.now() - startedAt) / 1000);
    spinner.innerHTML = '';
    spinner.append(
      el('span', 'glyph', GLYPHS[glyphIx]),
      el('span', null, verb + '… '),
      el('span', 'meta', `(${secs}s · ↑ ${fmtTokens(tokens)} tokens · esc to interrupt)`)
    );
    nudge();
  }

  function setRunning(on, v) {
    if (v) verb = v;
    if (on && !running) { running = true; startedAt = Date.now(); }
    if (!on) running = false;
    spinner.hidden = !running;
    if (running && !spinTimer) spinTimer = setInterval(tickSpinner, 380);
    if (!running && spinTimer) { clearInterval(spinTimer); spinTimer = null; }
    if (running) tickSpinner();
  }

  // ---------------------------------------------------------------- blocks

  function endBlock() {
    if (cur) cur.querySelector('.cursor')?.remove();
    cur = null;
    curText = null;
  }

  function openBlock(kind) {
    endBlock();
    cur = el('div', 'block ' + kind);
    curText = document.createTextNode('');
    cur.append(curText, el('span', 'cursor'));
    transcript.append(cur);
    trim();
    nudge();
  }

  function toolNode(id, name, arg, cls) {
    const wrap = el('div', 'tool ' + (cls || ''));
    wrap.dataset.id = id;
    const head = el('div', 'head');
    head.append(
      el('span', 'bullet', '● '),
      el('span', 'name', name),
      el('span', 'arg', arg ? `(${arg})` : '')
    );
    wrap.append(head);
    transcript.append(wrap);
    trim();
    nudge();
    return wrap;
  }

  function body(wrap) {
    const b = el('div', 'body');
    b.append(el('span', 'elbow', '⎿'), el('div', 'lines'));
    wrap.append(b);
    return b.querySelector('.lines');
  }

  const find = id => transcript.querySelector(`.tool[data-id="${id}"]`);

  // ---------------------------------------------------------------- render

  function handle(e) {
    switch (e.k) {
      case 'init': {
        document.documentElement.style.setProperty('--accent', e.accent);
        modelSel.innerHTML = '';
        (e.models || []).forEach(m => modelSel.append(new Option(m, m)));
        renderBanner(e.agentName, e.cwd);
        break;
      }

      case 'user': {
        endBlock();
        const n = el('div', 'block user');
        n.append(el('span', 'gt', '>'), document.createTextNode(e.text));
        transcript.append(n);
        trim();
        nudge();
        break;
      }

      case 'thinkStart': openBlock('think'); break;
      case 'textStart': openBlock('text'); break;

      case 'stream':
        if (curText) { curText.nodeValue += e.text; nudge(); }
        break;

      case 'endBlock': endBlock(); break;

      case 'tool':
        endBlock();
        toolNode(e.id, e.name, e.arg);
        break;

      case 'toolResult': {
        const w = find(e.id);
        if (!w) break;
        w.classList.add(e.tone);
        const lines = body(w);
        lines.textContent = e.lines.join('\n');
        const ms = el('span', 'ms', `  · ${(e.ms / 1000).toFixed(1)}s`);
        w.querySelector('.head').append(ms);
        nudge();
        break;
      }

      case 'todo': {
        endBlock();
        const w = toolNode(e.id, 'Update Todos', '', 'todo');
        const lines = body(w);
        e.items.forEach(it => {
          const cls = it.state === 'done' ? 'done' : it.state === 'doing' ? 'doing' : 'pending';
          const box = it.state === 'done' ? '☒' : '☐';
          lines.append(el('span', 'item ' + cls, `${box} ${it.text}`));
        });
        nudge();
        break;
      }

      case 'diff': {
        const w = find(e.id) || toolNode(e.id, 'Edit', e.file);
        w.classList.add('diff');
        const lines = body(w);
        const stat = el('span', 'stat');
        stat.append(
          document.createTextNode(`Updated ${e.file} with `),
          el('span', 'a', `${e.adds} addition${e.adds === 1 ? '' : 's'}`),
          document.createTextNode(' and '),
          el('span', 'd', `${e.dels} removal${e.dels === 1 ? '' : 's'}`),
          document.createTextNode('\n')
        );
        lines.append(stat);
        e.lines.forEach(d => {
          const row = el('span', 'dl ' + (d.t === '+' ? 'plus' : d.t === '-' ? 'minus' : ''));
          row.append(el('span', 'ln', String(d.n)), document.createTextNode(d.t + ' ' + d.s));
          lines.append(row);
        });
        nudge();
        break;
      }

      case 'spinner': setRunning(e.on, e.verb); break;

      case 'tokens':
        tokens = e.n;
        ctxEl.textContent = `context left: ${Math.max(3, 98 - Math.floor(tokens / 900))}%`;
        break;

      case 'interrupted': {
        endBlock();
        setRunning(false);
        const n = el('div', 'block');
        n.style.color = 'var(--del)';
        n.textContent = '⏺ Interrupted by user';
        transcript.append(n);
        trim();
        nudge();
        break;
      }

      case 'idle': setRunning(false); break;
    }
  }

  window.addEventListener('message', ev => handle(ev.data));

  function renderBanner(name, cwd) {
    const b = $('banner');
    b.innerHTML = '';
    const title = el('div', 'row');
    title.append(el('span', 'glyph', '✳'), el('span', 'title', `Welcome to ${name}`));
    b.append(
      title,
      el('div', 'row', ''),
      el('div', 'row', '  /help for commands · /clear to reset'),
      el('div', 'row', '  a task runs until you press esc · cap it with the run picker below'),
      el('div', 'row', `  cwd: ${cwd}`)
    );
  }

  // ----------------------------------------------------------------- input

  function autosize() {
    input.style.height = 'auto';
    input.style.height = Math.min(180, input.scrollHeight) + 'px';
  }

  input.addEventListener('input', autosize);

  input.addEventListener('keydown', ev => {
    if (ev.key === 'Enter' && !ev.shiftKey) {
      ev.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      if (text === '/clear' || text === '/help') {
        input.value = '';
        autosize();
        if (text === '/clear') transcript.innerHTML = '';
        else showHelp();
        return;
      }
      input.value = '';
      autosize();
      stick = true;
      vscode.postMessage({ type: 'submit', text, limitMs: Number(limitSel.value) || undefined });
    } else if (ev.key === 'Escape') {
      ev.preventDefault();
      vscode.postMessage({ type: 'interrupt' });
    }
  });

  function showHelp() {
    const n = el('div', 'block help');
    n.textContent = [
      'Commands',
      '  /help                  this list',
      '  /clear                 reset the transcript',
      '',
      'Keys',
      '  enter                  send · shift+enter for a newline',
      '  esc                    interrupt the current run',
      '  cmd/ctrl+shift+bksp    close the panel',
      '',
      'A task runs until you interrupt it. The picker next to the model sets',
      'a time cap instead — when it runs out the turn wraps up on its own.'
    ].join('\n');
    transcript.append(n);
    stick = true;
    trim();
    nudge();
  }

  document.addEventListener('keydown', ev => {
    const panic = (ev.metaKey || ev.ctrlKey) && ev.shiftKey && ev.key === 'Backspace';
    if (panic) { ev.preventDefault(); vscode.postMessage({ type: 'panic' }); }
  });

  input.focus();
  vscode.postMessage({ type: 'ready' });
})();
