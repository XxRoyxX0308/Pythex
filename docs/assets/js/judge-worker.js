/* Pythex judge worker: runs user code in Pyodide, one test at a time.
 * The main thread terminates this worker on timeout, so infinite loops never freeze the page. */

const PYODIDE_VERSION = "0.26.4";
const PYODIDE_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

const RUNNER = String.raw`
import sys, io, time, json, traceback, builtins, linecache

FILENAME = "main.py"
MAX_OUT = 4_000_000
MAX_FRAMES = 8
_DEFAULT_LIMIT = sys.getrecursionlimit()


def _cache_source(code):
    linecache.cache[FILENAME] = (len(code), None, code.splitlines(True), FILENAME)


def _pythex_compile(code):
    _cache_source(code)
    try:
        compile(code, FILENAME, "exec")
        return json.dumps({"ok": True})
    except SyntaxError as e:
        return json.dumps({"ok": False, "error": {
            "type": type(e).__name__, "message": e.msg or str(e),
            "line": e.lineno, "col": e.offset,
            "text": (e.text or "").rstrip("\n"),
        }})
    except Exception as e:
        return json.dumps({"ok": False, "error": {"type": type(e).__name__, "message": str(e), "line": None}})


def _format_tb(exc):
    frames = [f for f in traceback.extract_tb(exc.__traceback__) if f.filename == FILENAME]
    out = ["Traceback (most recent call last):"]
    shown = frames[-MAX_FRAMES:]
    if len(frames) > len(shown):
        out.append("  ... (%d more frames)" % (len(frames) - len(shown)))
    for f in shown:
        out.append('  File "%s", line %d, in %s' % (f.filename, f.lineno, f.name))
        if f.line:
            out.append("    " + f.line.strip())
    out.extend(x.rstrip("\n") for x in traceback.format_exception_only(type(exc), exc))
    return frames, "\n".join(out)


def _pythex_run(code, data):
    _cache_source(code)
    stdin = io.TextIOWrapper(io.BytesIO(data.encode("utf-8")), encoding="utf-8")
    raw = io.BytesIO()
    stdout = io.TextIOWrapper(raw, encoding="utf-8", write_through=True)
    stderr = io.StringIO()
    saved = (sys.stdin, sys.stdout, sys.stderr, sys.argv)
    sys.stdin, sys.stdout, sys.stderr, sys.argv = stdin, stdout, stderr, [FILENAME]
    sys.setrecursionlimit(_DEFAULT_LIMIT)
    scope = {"__name__": "__main__", "__file__": FILENAME, "__builtins__": builtins}
    error = None
    start = time.perf_counter()
    try:
        exec(compile(code, FILENAME, "exec"), scope)
    except SystemExit as e:
        if e.code not in (None, 0):
            error = {"type": "SystemExit", "message": str(e.code), "line": None, "traceback": "SystemExit: %s" % (e.code,)}
    except BaseException as e:
        frames, tb = _format_tb(e)
        error = {
            "type": type(e).__name__,
            "message": str(e),
            "line": frames[-1].lineno if frames else None,
            "traceback": tb,
        }
    finally:
        elapsed = (time.perf_counter() - start) * 1000
        try:
            stdout.flush()
        except Exception:
            pass
        sys.stdin, sys.stdout, sys.stderr, sys.argv = saved
        sys.setrecursionlimit(_DEFAULT_LIMIT)
    out = raw.getvalue()
    return json.dumps({
        "stdout": out[:MAX_OUT].decode("utf-8", "replace"),
        "truncated": len(out) > MAX_OUT,
        "stderr": stderr.getvalue()[-8000:],
        "time": elapsed,
        "error": error,
    })


def _pythex_version():
    return sys.version.split()[0]
`;

let pyodide = null;

const boot = (async () => {
  try {
    importScripts(`${PYODIDE_BASE}pyodide.js`);
    pyodide = await self.loadPyodide({ indexURL: PYODIDE_BASE, stdout: () => {}, stderr: () => {} });
    pyodide.runPython(RUNNER);
    const version = pyodide.globals.get("_pythex_version")();
    self.postMessage({ type: "ready", version });
  } catch (err) {
    self.postMessage({ type: "boot-error", message: String((err && err.message) || err) });
  }
})();

self.onmessage = async (event) => {
  await boot;
  const { id, type, code, input } = event.data;
  if (!pyodide) {
    self.postMessage({ id, fatal: true, message: "Python runtime is not available" });
    return;
  }
  try {
    const fn = pyodide.globals.get(type === "compile" ? "_pythex_compile" : "_pythex_run");
    const json = type === "compile" ? fn(code) : fn(code, input);
    fn.destroy();
    self.postMessage({ id, ...JSON.parse(json) });
  } catch (err) {
    // e.g. JS stack overflow from very deep recursion; the interpreter may be unusable afterwards
    self.postMessage({ id, fatal: true, message: String((err && err.message) || err) });
  }
};
