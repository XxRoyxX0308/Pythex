/* Progress lives only in this browser (localStorage). Every access is guarded:
 * private windows and blocked storage must not break the app. */

const KEY = "pythex:v1";
const DRAFT = "pythex:code:";

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    const data = raw ? JSON.parse(raw) : {};
    return { solved: {}, attempts: {}, prefs: {}, ...data };
  } catch {
    return { solved: {}, attempts: {}, prefs: {} };
  }
}

let state = load();
const listeners = new Set();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable: progress stays in memory for this tab */
  }
  for (const fn of listeners) fn();
}

window.addEventListener("storage", (e) => {
  if (e.key === KEY) {
    state = load();
    for (const fn of listeners) fn();
  }
});

export const store = {
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  isSolved: (id) => Boolean(state.solved[id]),
  solvedAt: (id) => state.solved[id]?.at ?? null,
  attempt: (id) => state.attempts[id] ?? null,

  /** Record one judged submission. Returns true if this is the first time it was solved. */
  record(id, { verdict, passed, total }) {
    const prev = state.attempts[id] || { count: 0 };
    state.attempts[id] = { count: prev.count + 1, verdict, passed, total, at: Date.now() };
    let firstSolve = false;
    if (verdict === "AC" && !state.solved[id]) {
      state.solved[id] = { at: Date.now() };
      firstSolve = true;
    }
    save();
    return firstSolve;
  },

  pref(key, fallback = null) {
    return state.prefs[key] ?? fallback;
  },
  setPref(key, value) {
    state.prefs[key] = value;
    save();
  },

  /** Code drafts are stored per problem, separately from progress. */
  draft(id) {
    try { return localStorage.getItem(DRAFT + id); } catch { return null; }
  },
  saveDraft(id, code) {
    try { localStorage.setItem(DRAFT + id, code); return true; } catch { return false; }
  },
  clearDraft(id) {
    try { localStorage.removeItem(DRAFT + id); } catch { /* ignore */ }
  },

  exportJSON() {
    return JSON.stringify({ solved: state.solved, attempts: state.attempts }, null, 2);
  },
  importJSON(text) {
    const data = JSON.parse(text);
    if (typeof data !== "object" || !data.solved) throw new Error("invalid format");
    state.solved = { ...state.solved, ...data.solved };
    state.attempts = { ...state.attempts, ...(data.attempts || {}) };
    save();
  },
  reset() {
    state = { solved: {}, attempts: {}, prefs: state.prefs };
    save();
  },
};
