// Tests of the build scripts' robustness (design-system #27): a checkout path with a space,
// render-previews.mjs exiting non-zero on a failed render, and the rules the Python logo
// scripts follow (files opened by `with`, text files as UTF-8, no `assert`, checked with `ast`; JSON files end with a newline).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const scripts = readdirSync(path.join(ROOT, 'scripts'));
const read = (p) => readFileSync(path.join(ROOT, p), 'utf8');

// A fresh directory whose name has a space, removed at the end of the test.
function spaced(t, name) {
  const base = mkdtempSync(path.join(tmpdir(), 'pklnx-'));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const dir = path.join(base, name);
  mkdirSync(dir);
  return { base, dir };
}

const run = (file, args, opts) => spawnSync(process.execPath, [file, ...args], { encoding: 'utf8', timeout: 120000, ...opts });

test('no script derives a path from `new URL(import.meta.url).pathname`', () => {
  for (const f of scripts.filter((s) => /\.mjs$/.test(s) && s !== 'script-robustness.test.mjs')) {
    assert.doesNotMatch(read(`scripts/${f}`), /new URL\([^)]*import\.meta\.url\)\.pathname/, `${f} keeps %20 for a space in the path; use fileURLToPath`);
  }
});

test('the build, icon and site scripts work in a checkout whose path has a space', (t) => {
  const { dir } = spaced(t, 'with space');
  for (const f of ['package.json', 'scripts', 'src', 'theme', 'project']) cpSync(path.join(ROOT, f), path.join(dir, f), { recursive: true });
  symlinkSync(path.join(ROOT, 'node_modules'), path.join(dir, 'node_modules'));
  for (const script of ['build.mjs', 'build_icons.mjs', 'build_site.mjs']) {
    const r = run(path.join(dir, 'scripts', script), [], { cwd: dir });
    assert.equal(r.status, 0, `${script}: ${r.stderr}`);
  }
  // The build wrote into the checkout itself, not into a directory named with %20.
  assert.equal(read('theme/tokens.json'), readFileSync(path.join(dir, 'theme/tokens.json'), 'utf8'));
  assert.ok(existsSync(path.join(dir, 'project/assets/Icons/star.svg')));
  assert.ok(existsSync(path.join(dir, 'site/index.html')));
  assert.deepEqual(readdirSync(path.dirname(dir)).filter((n) => n.includes('%')), []);
});

// render-previews.mjs in a throw-away checkout with one preview and a stand-in for Chromium.
function previewCheckout(t) {
  const { dir } = spaced(t, 'preview checkout');
  mkdirSync(path.join(dir, 'scripts'));
  cpSync(path.join(ROOT, 'scripts/render-previews.mjs'), path.join(dir, 'scripts/render-previews.mjs'));
  mkdirSync(path.join(dir, 'project/components/Demo'), { recursive: true });
  writeFileSync(path.join(dir, 'project/components/Demo/preview.html'), '<!-- @dsCard width=200 height=100 -->\n<html><head></head><body>x</body></html>\n');
  const fake = (name, body) => {
    const file = path.join(dir, name);
    writeFileSync(file, `#!/bin/sh\n${body}\n`);
    chmodSync(file, 0o755);
    return file;
  };
  const render = (chrome) => {
    const env = { ...process.env };
    delete env.CHROME;
    if (chrome !== undefined) env.CHROME = chrome;
    return run(path.join(dir, 'scripts/render-previews.mjs'), [], { cwd: dir, env });
  };
  return { dir, fake, render };
}

test('render-previews: exits 0 and writes both themes when Chromium renders', (t) => {
  const { dir, fake, render } = previewCheckout(t);
  // Writes the file named by --screenshot=..., as Chromium does.
  const chrome = fake('chrome-ok', 'for a in "$@"; do case "$a" in --screenshot=*) printf png > "${a#--screenshot=}";; esac; done');
  const r = render(chrome);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /rendered Demo/);
  assert.ok(existsSync(path.join(dir, '.render/Demo-dark.png')) && existsSync(path.join(dir, '.render/Demo-light.png')));
});

test('render-previews: exits non-zero when Chromium fails', (t) => {
  const { fake, render } = previewCheckout(t);
  const r = render(fake('chrome-fails', 'exit 1'));
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /fail Demo dark/);
  assert.match(r.stderr, /2 renders failed/);
  assert.doesNotMatch(r.stdout, /rendered Demo/);
});

test('render-previews: exits non-zero when Chromium exits 0 without a screenshot', (t) => {
  const { fake, render } = previewCheckout(t);
  const r = render(fake('chrome-silent', 'exit 0'));
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /wrote no screenshot/);
});

test('render-previews: requires CHROME to be set to an executable file', (t) => {
  const { dir, render } = previewCheckout(t);
  const unset = render(undefined);
  assert.notEqual(unset.status, 0);
  assert.match(unset.stderr, /set CHROME/);
  const missing = render(path.join(dir, 'no-such-chromium'));
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /not an executable file/);
  const plain = path.join(dir, 'plain-file');
  writeFileSync(plain, 'not executable');
  chmodSync(plain, 0o644);
  const notExecutable = render(plain);
  assert.notEqual(notExecutable.status, 0);
  assert.match(notExecutable.stderr, /not an executable file/);
  const directory = render(dir);
  assert.notEqual(directory.status, 0);
  assert.match(directory.stderr, /not an executable file/);
});

// The rules the Python scripts follow, checked with Python's own parser (`ast`), so comments,
// docstrings and string contents never count and `x = 1; assert x` is seen like any assert.
// Run as `python3 -I -c <checker> <directory>`; it prints one `file:line: message` per violation
// and exits 0 (clean) or 3 (violations). Any other exit status is a crash: Python itself exits 1 on
// an uncaught exception, so 1 must not mean "violations".
//
// What it does not follow:
// - any attribute call named `open` counts as a file open, except `os.open`;
// - `encoding` must be the literal `"utf-8"` keyword;
// - aliases such as `op = open` are not seen.
const PYTHON_CHECKER = String.raw`
import ast, os, sys

TEXT_RULE = 'encoding="utf-8"'

def keyword(call, name):
    for kw in call.keywords:
        if kw.arg == name:
            return kw.value
    return None

def has_utf8(call):
    value = keyword(call, "encoding")
    return isinstance(value, ast.Constant) and value.value == "utf-8"

def open_mode(call, index):
    """The mode of an open() call: a str, "r" if absent, None if it is not a literal."""
    value = keyword(call, "mode")
    if value is None and len(call.args) > index:
        value = call.args[index]
    if value is None:
        return "r"
    if isinstance(value, ast.Constant) and isinstance(value.value, str):
        return value.value
    return None

def check(path, name):
    with open(path, encoding="utf-8") as f:
        source = f.read()
    try:
        tree = ast.parse(source, filename=name)
    except SyntaxError as e:
        return [f"{name}:{e.lineno or 1}: not valid Python ({e.msg})"]
    with_items = {id(item.context_expr) for node in ast.walk(tree) if isinstance(node, (ast.With, ast.AsyncWith)) for item in node.items}
    problems = []
    for node in ast.walk(tree):
        where = f"{name}:{getattr(node, 'lineno', 1)}"
        if isinstance(node, ast.Assert):
            problems.append(f"{where}: assert is stripped by python -O; raise an exception")
        if not isinstance(node, ast.Call):
            continue
        func = node.func
        if isinstance(func, ast.Name) and func.id == "open":
            mode_index = 1
        elif isinstance(func, ast.Attribute) and func.attr == "open" and not (isinstance(func.value, ast.Name) and func.value.id == "os"):
            # Path.open(mode) takes the mode first, io.open(file, mode) second; os.open is a different call.
            mode_index = 1 if isinstance(func.value, ast.Name) and func.value.id in ("io", "codecs") else 0
        elif isinstance(func, ast.Attribute) and func.attr in ("read_text", "write_text"):
            if not has_utf8(node):
                problems.append(f"{where}: {func.attr}() without {TEXT_RULE}")
            continue
        else:
            continue
        if id(node) not in with_items:
            problems.append(f"{where}: open() outside a with statement")
        mode = open_mode(node, mode_index)
        if mode is None:
            problems.append(f"{where}: open() mode is not a string literal, so the encoding rule cannot be checked")
        elif "b" not in mode and not has_utf8(node):
            problems.append(f"{where}: open() in text mode without {TEXT_RULE}")
    return problems

problems = []
for name in sorted(os.listdir(sys.argv[1])):
    if name.endswith(".py"):
        problems += check(os.path.join(sys.argv[1], name), name)
print("\n".join(problems))
sys.exit(3 if problems else 0)
`;

const VIOLATIONS_EXIT = 3;

// The violations of the Python rules in every *.py of a directory, as `file:line: message`.
// `checker` is the Python source to run; only the tests of the lint itself pass another one.
function lintPython(dir, checker = PYTHON_CHECKER) {
  const python = process.env.PYTHON || 'python3';
  const r = spawnSync(python, ['-I', '-c', checker, dir], { encoding: 'utf8', timeout: 60000 });
  assert.ifError(r.error && new Error(`cannot run ${python} for the Python lint (set PYTHON to a Python 3): ${r.error.message}`));
  assert.ok(r.status === 0 || r.status === VIOLATIONS_EXIT, `the Python lint crashed (${python}, exit ${r.status}): ${r.stderr}`);
  return r.stdout.split('\n').filter(Boolean);
}

// A throw-away directory with one Python file per entry of `files` ({name: source}).
function pythonDir(t, files) {
  const { dir } = spaced(t, 'py');
  for (const [name, source] of Object.entries(files)) writeFileSync(path.join(dir, name), source);
  return dir;
}

test('the Python scripts open files with `with` and UTF-8 (or binary), and do not use assert', () => {
  assert.ok(scripts.some((s) => s.endsWith('.py')), 'no Python scripts found; the lint would pass on nothing');
  assert.deepEqual(lintPython(path.join(ROOT, 'scripts')), []);
});

test('the Python lint accepts comments, docstrings, strings and binary files', (t) => {
  const dir = pythonDir(t, {
    'ok.py': [
      '"""Docstring with open(x) and a line that starts with',
      'assert x',
      '"""',
      'import io, os',
      '# open(x) in a comment, assert y, Path(p).read_text()',
      'note = "open(x); assert x; p.read_text()"',
      'with open(p, "rb") as f:',
      '    data = f.read()',
      'with open(p, mode="wb") as f, open(q, "r+b") as g:',
      '    pass',
      'with open(p, "w", encoding="utf-8") as f:',
      '    pass',
      'with open(p, encoding="utf-8") as f:',
      '    pass',
      'with Path(p).open("ab") as f:',
      '    pass',
      'with Path(p).open("w", encoding="utf-8") as f:',
      '    pass',
      'with io.open(p, "rb") as f:',
      '    pass',
      'fd = os.open(p, os.O_RDONLY)',
      'text = Path(p).read_text(encoding="utf-8")',
      'Path(p).write_text(text, encoding="utf-8")',
      'raw = Path(p).read_bytes()',
      'if not ok:',
      '    raise ValueError("x")',
      '',
    ].join('\n'),
  });
  assert.deepEqual(lintPython(dir), []);
});

test('the Python lint reports each violation with file and line', (t) => {
  const cases = {
    'read_text() without encoding': ['text = Path(p).read_text()', 'read_text() without encoding="utf-8"'],
    'write_text() without encoding': ['Path(p).write_text(text)', 'write_text() without encoding="utf-8"'],
    'read_text() with another encoding': ['text = Path(p).read_text(encoding="latin-1")', 'read_text() without encoding="utf-8"'],
    'assert after a semicolon': ['x = 1; assert x', 'assert is stripped by python -O'],
    'assert in a function': ['def f(x):\n    assert x', 'assert is stripped by python -O'],
    'open outside with': ['f = open(p, encoding="utf-8")', 'open() outside a with statement'],
    'open in a call argument': ['data = json.load(open(p, encoding="utf-8"))', 'open() outside a with statement'],
    'text open without encoding': ['with open(p) as f:\n    pass', 'open() in text mode without encoding="utf-8"'],
    'write open without encoding': ['with open(p, "w") as f:\n    pass', 'open() in text mode without encoding="utf-8"'],
    'Path.open in text mode without encoding': ['with Path(p).open() as f:\n    pass', 'open() in text mode without encoding="utf-8"'],
    'second open of one with without encoding': ['with open(p, "rb") as f, open(q, "w") as g:\n    pass', 'open() in text mode without encoding="utf-8"'],
    'mode that is not a literal': ['with open(p, mode, encoding="utf-8") as f:\n    pass', 'mode is not a string literal'],
    'a syntax error': ['def f(:', 'not valid Python'],
  };
  const files = Object.fromEntries(Object.entries(cases).map(([name, [source]], i) => [`case${i}.py`, `# line 1\n${source}\n`]));
  const dir = pythonDir(t, files);
  const problems = lintPython(dir);
  Object.entries(cases).forEach(([name, [source, message]], i) => {
    const line = source.includes('def f(x)') ? 3 : 2;
    const found = problems.filter((p) => p.startsWith(`case${i}.py:`));
    assert.equal(found.length, 1, `${name}: expected one report, got ${JSON.stringify(found)}`);
    assert.match(found[0], new RegExp(`^case${i}\\.py:${line}: .*${message.replace(/[.*+?^${}()|[\]\\`]/g, '\\$&')}`), name);
  });
  assert.equal(problems.length, Object.keys(cases).length);
});

test('the Python lint fails loudly when the interpreter cannot be started', (t) => {
  const dir = pythonDir(t, { 'a.py': 'x = 1\n' });
  const saved = process.env.PYTHON;
  t.after(() => {
    if (saved === undefined) delete process.env.PYTHON;
    else process.env.PYTHON = saved;
  });
  process.env.PYTHON = path.join(dir, 'no-such-python');
  assert.throws(() => lintPython(dir), /cannot run .*no-such-python/);
});

test('the Python lint reports a crash of the checker or of the interpreter, never "violations found"', (t) => {
  const dir = pythonDir(t, { 'a.py': 'x = 1\n' });
  // A checker that raises at startup: Python exits 1, as for violations before the distinct code.
  assert.throws(() => lintPython(dir, `raise RuntimeError("checker bug")\n${PYTHON_CHECKER}`), /the Python lint crashed .*exit 1.*RuntimeError: checker bug/s);
  // A checker that exits with some other status.
  assert.throws(() => lintPython(dir, 'import sys; sys.exit(2)'), /the Python lint crashed .*exit 2/);
  // Violations are reported, not thrown, with the same wrapper.
  assert.deepEqual(lintPython(dir, 'print("a.py:1: x"); raise SystemExit(3)'), ['a.py:1: x']);
  // An interpreter that exits 1 without output.
  const saved = process.env.PYTHON;
  t.after(() => {
    if (saved === undefined) delete process.env.PYTHON;
    else process.env.PYTHON = saved;
  });
  process.env.PYTHON = '/bin/false';
  assert.throws(() => lintPython(dir), /the Python lint crashed .*exit 1/);
});

test('the JSON files the logo scripts and the index keep end with a newline', () => {
  for (const f of ['theme/logo-geometry.json', 'project/design-system.json']) {
    assert.ok(read(f).endsWith('}\n'), `${f} must end with a newline`);
  }
});
