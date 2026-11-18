import { outputsMatch } from "./diagnose.js";

const WORKER_URL = new URL("./judge-worker.js", import.meta.url);
const MAX_TLE_BEFORE_SKIP = 2;

/** Owns one Pyodide worker. Restarts it after a timeout or a fatal crash. */
export class Engine {
  constructor() {
    this.listeners = new Set();
    this.state = "idle";
    this.version = "";
    this.seq = 0;
    this.pending = new Map();
    this.boot();
  }

  onStatus(fn) {
    this.listeners.add(fn);
    fn(this.state, this.version);
    return () => this.listeners.delete(fn);
  }

  setState(state, detail = "") {
    this.state = state;
    if (detail) this.version = detail;
    for (const fn of this.listeners) fn(state, state === "error" ? detail : this.version);
  }

  boot() {
    this.setState("loading");
    this.worker = new Worker(WORKER_URL);
    this.ready = new Promise((resolve, reject) => {
      this.worker.onmessage = (e) => {
        const msg = e.data;
        if (msg.type === "ready") {
          this.setState("ready", `Python ${msg.version}`);
          resolve();
        } else if (msg.type === "boot-error") {
          this.setState("error", msg.message);
          reject(new Error(msg.message));
        } else if (msg.id != null) {
          const job = this.pending.get(msg.id);
          if (!job) return;
          this.pending.delete(msg.id);
          clearTimeout(job.timer);
          job.resolve(msg);
          if (msg.fatal) this.restart();
        }
      };
      this.worker.onerror = (e) => {
        e.preventDefault?.();
        if (this.state === "loading") {
          this.setState("error", e.message || "無法載入 Pyodide");
          reject(new Error(e.message));
        }
      };
    });
    this.ready.catch(() => {});
  }

  /** Kill the worker and boot a fresh one. Jobs that were still queued are sent again. */
  restart() {
    this.worker.terminate();
    const queued = [...this.pending.values()];
    this.pending.clear();
    for (const job of queued) clearTimeout(job.timer);
    this.boot();
    for (const job of queued) this.dispatch(job);
  }

  retry() {
    if (this.state === "error") this.restart();
  }

  async dispatch(job) {
    try {
      await this.ready;
    } catch (err) {
      job.resolve({ fatal: true, message: err.message });
      return;
    }
    const id = ++this.seq;
    job.timer = setTimeout(() => {
      if (!this.pending.has(id)) return;
      this.pending.delete(id);
      job.resolve({ id, timeout: true });
      this.restart();
    }, job.timeoutMs);
    this.pending.set(id, job);
    this.worker.postMessage({ id, ...job.payload });
  }

  call(payload, timeoutMs) {
    return new Promise((resolve, reject) => {
      this.ready.then(
        () => this.dispatch({ payload, timeoutMs, resolve }),
        reject,
      );
    });
  }

  compile(code) {
    return this.call({ type: "compile", code }, 20000);
  }

  run(code, input, timeoutMs) {
    return this.call({ type: "run", code, input }, timeoutMs);
  }
}

export function decodeHidden(b64) {
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

/** Build the ordered list of test cases: samples first, then hidden. */
export function buildCases(problem) {
  const samples = problem.samples.map((s, i) => ({
    key: `s${i}`, name: `範例 ${i + 1}`, hidden: false,
    input: s.input, output: s.output, explain: s.explain || "",
  }));
  const hidden = decodeHidden(problem.hidden).map((h, i) => ({
    key: `h${i}`, name: `隱藏 ${i + 1}`, hidden: true,
    input: h.input, output: h.output, label: h.label, kind: h.kind, hint: h.hint || "",
  }));
  return [...samples, ...hidden];
}

/**
 * Judge a submission. Calls onUpdate(caseKey, result) as each case finishes.
 * Returns { verdict, compileError, results }.
 */
export async function judge(engine, problem, cases, code, { onStart, onUpdate, isCancelled }) {
  const limit = problem.time_limit_ms;
  const hardKill = limit + Math.max(1500, limit * 0.75);

  onStart?.("compile");
  const compiled = await engine.compile(code);
  if (isCancelled()) return null;
  if (compiled.timeout || compiled.fatal) {
    return { verdict: "SE", systemError: compiled.message || "編譯逾時", results: [] };
  }
  if (!compiled.ok) {
    return { verdict: "CE", compileError: compiled.error, results: [] };
  }

  const results = [];
  let tleCount = 0;
  for (const tc of cases) {
    if (tleCount >= MAX_TLE_BEFORE_SKIP) {
      const r = { key: tc.key, verdict: "SK" };
      results.push(r);
      onUpdate?.(tc.key, r);
      continue;
    }
    onUpdate?.(tc.key, { key: tc.key, verdict: "RUN" });
    const res = await engine.run(code, tc.input, hardKill);
    if (isCancelled()) return null;

    let r;
    if (res.timeout) {
      r = { key: tc.key, verdict: "TLE", time: hardKill, killed: true };
    } else if (res.fatal) {
      r = { key: tc.key, verdict: "RE", error: { type: "RuntimeCrash", message: res.message, line: null } };
    } else if (res.error) {
      r = { key: tc.key, verdict: "RE", error: res.error, stdout: res.stdout, stderr: res.stderr, time: res.time };
    } else if (res.time > limit) {
      r = { key: tc.key, verdict: "TLE", time: res.time, stdout: res.stdout };
    } else if (outputsMatch(tc.output, res.stdout, problem.compare)) {
      r = { key: tc.key, verdict: "AC", time: res.time, stdout: res.stdout, stderr: res.stderr };
    } else {
      r = { key: tc.key, verdict: "WA", time: res.time, stdout: res.stdout, stderr: res.stderr, truncated: res.truncated };
    }
    if (r.verdict === "TLE") tleCount += 1;
    results.push(r);
    onUpdate?.(tc.key, r);
  }

  // Skipped cases only happen after timeouts, so the first failure decides the verdict.
  const firstBad = results.find((r) => r.verdict !== "AC" && r.verdict !== "SK");
  return { verdict: firstBad ? firstBad.verdict : "AC", results };
}
