import { marked } from "https://cdn.jsdelivr.net/npm/marked@12.0.2/lib/marked.esm.js";
import { Engine, buildCases, judge } from "./judge.js";
import { explainError, diagnoseWrongAnswer, explainTimeout, normalize } from "./diagnose.js";
import { highlightPython } from "./highlight.js";
import { CodeEditor } from "./editor.js";
import { store } from "./store.js";
import { t, loc, lang, setLang } from "./i18n.js";

/* ------------------------------------------------------------------ constants */

const LEVEL = { easy: 1, medium: 2, hard: 3 };
const VERDICT_ICON = {
  AC: "check-circle", WA: "x-circle", RE: "warning-octagon", TLE: "timer", CE: "code",
  SE: "plugs", SK: "skip-forward", RUN: "circle", WAIT: "circle",
};
const MAX_SHOW_LINES = 120;
const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

marked.setOptions({ gfm: true, breaks: false });

const app = document.getElementById("app");
const toastEl = document.getElementById("toast");
let indexData = null;
const problemCache = new Map();
let engine = null;
let view = null;

/* ------------------------------------------------------------------ helpers */

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const icon = (name, extra = "") => `<i class="ph ph-${name} ${extra}" aria-hidden="true"></i>`;
const bars = (level) => `<span class="bars" data-level="${level}" aria-hidden="true"><i></i><i></i><i></i></span>`;
const diffLabel = (d) => t(`diff.${d}`);
const vLabel = (v) => t(`v.${v}`);
const ms = (x) => (x == null ? "" : x >= 1000 ? `${(x / 1000).toFixed(2)} s` : `${Math.max(1, Math.round(x))} ms`);
const secs = (limit) => (limit / 1000).toFixed(limit % 1000 ? 1 : 0);

function toast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("is-shown");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => toastEl.classList.remove("is-shown"), 2600);
}

async function loadIndex() {
  if (!indexData) {
    const res = await fetch("data/index.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(`index.json ${res.status}`);
    indexData = await res.json();
  }
  return indexData;
}

async function loadProblem(id) {
  if (!problemCache.has(id)) {
    const res = await fetch(`data/problems/${encodeURIComponent(id)}.json`, { cache: "no-cache" });
    if (!res.ok) throw new Error(res.status === 404 ? "not-found" : `problem ${res.status}`);
    problemCache.set(id, await res.json());
  }
  return problemCache.get(id);
}

const allProblems = (idx) => idx.families.flatMap((f) => f.problems.map((p) => ({ ...p, family: f })));

function loadErrorView(err) {
  return `
    <section class="state-block">
      ${icon("cloud-slash", "state-icon")}
      <h1>${t("load.title")}</h1>
      <p>${location.protocol === "file:" ? t("load.local") : esc(t("load.retry", { msg: err.message }))}</p>
      <a class="btn btn-primary" href="#/">${icon("arrow-clockwise")}${t("load.reload")}</a>
    </section>`;
}

/* ------------------------------------------------------------------ chrome: header, theme, language */

const THEMES = ["auto", "light", "dark"];
const THEME_ICON = { auto: "circle-half", light: "sun", dark: "moon" };

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === "auto") delete root.dataset.theme;
  else root.dataset.theme = theme;
  const btn = document.getElementById("theme-toggle");
  const label = t("theme.aria", { name: t(`theme.${theme}`) });
  btn.innerHTML = icon(THEME_ICON[theme]);
  btn.setAttribute("aria-label", label);
  btn.title = label;
}

function applyChrome() {
  applyTheme(store.pref("theme", "auto"));
  const langBtn = document.getElementById("lang-toggle");
  langBtn.textContent = t("lang.short");
  langBtn.setAttribute("aria-label", t("lang.switch"));
  langBtn.title = t("lang.switch");
  document.querySelector(".skip-link").textContent = t("skip");
  document.querySelector(".brand").setAttribute("aria-label", t("nav.home"));
  updateHeader();
}

document.getElementById("theme-toggle").addEventListener("click", () => {
  const next = THEMES[(THEMES.indexOf(store.pref("theme", "auto")) + 1) % THEMES.length];
  store.setPref("theme", next);
  applyTheme(next);
});

document.getElementById("lang-toggle").addEventListener("click", () => {
  setLang(lang() === "zh-Hant" ? "en" : "zh-Hant");
  applyChrome();
  route({ keepScroll: true });
});

async function updateHeader() {
  const el = document.getElementById("hdr-progress");
  try {
    const all = allProblems(await loadIndex());
    const solved = all.filter((p) => store.isSolved(p.id)).length;
    el.innerHTML = `${icon("check-circle")}<span>${t("nav.progress", { n: solved, total: all.length })}</span>`;
    el.hidden = false;
  } catch {
    el.hidden = true;
  }
}
store.subscribe(updateHeader);

/* ------------------------------------------------------------------ home */

function rungStatus(p) {
  if (store.isSolved(p.id)) return `<span class="rung-status is-solved">${icon("check-circle", "ph-fill")}${t("rung.solved")}</span>`;
  const a = store.attempt(p.id);
  if (a) return `<span class="rung-status is-tried">${icon("circle-dashed")}${t("rung.tried", { p: a.passed, t: a.total })}</span>`;
  return `<span class="rung-status">${icon("circle")}${t("rung.new")}</span>`;
}

/* A real, looping preview of the judge: submit → a hidden edge case fails with a hint → fix → all pass. */
function demoRows() {
  return [
    { name: t("case.sample", { n: 1 }), label: t("case.public") },
    { name: t("case.sample", { n: 2 }), label: t("case.public") },
    { name: t("case.hidden", { n: 1 }), label: t("demo.r3"), kind: "edge" },
    { name: t("case.hidden", { n: 2 }), label: t("demo.r4"), kind: "edge" },
    { name: t("case.hidden", { n: 3 }), label: t("demo.r5"), kind: "edge", fails: true },
    { name: t("case.hidden", { n: 4 }), label: t("demo.r6"), kind: "boundary" },
  ];
}

function demoRow(row, verdict) {
  const mark = verdict === "RUN" ? `<span class="pulse-dot"></span>` : icon(VERDICT_ICON[verdict], verdict === "AC" ? "ph-fill" : "");
  return `
    <li class="case" data-v="${verdict.toLowerCase()}">
      <div class="case-head">
        <span class="case-icon">${mark}</span>
        <span class="case-name">${esc(row.name)}</span>
        <span class="case-label">${esc(row.label)}${row.kind ? `<em class="kind">${t(`kind.${row.kind}`)}</em>` : ""}</span>
        <span class="case-time"></span>
        <span class="case-verdict">${vLabel(verdict)}</span>
      </div>
    </li>`;
}

function startDemo(root) {
  const rows = demoRows();
  const list = root.querySelector(".demo-cases");
  const state = root.querySelector(".demo-state");
  const hint = root.querySelector(".demo-hint");
  const sub = root.querySelector(".demo-file small");
  let stopped = false;
  const sleep = (x) => new Promise((r) => setTimeout(r, x));
  const paint = (vs) => { list.innerHTML = rows.map((r, i) => demoRow(r, vs[i])).join(""); };
  const setState = (text, tone) => { state.textContent = text; state.dataset.tone = tone; };

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    paint(rows.map((r) => (r.fails ? "WA" : "AC")));
    setState(t("demo.fail"), "bad");
    hint.hidden = false;
    return () => {};
  }

  (async () => {
    while (!stopped) {
      for (const fixed of [false, true]) {
        const vs = rows.map(() => "WAIT");
        hint.hidden = true;
        sub.textContent = fixed ? t("demo.second") : t("demo.first");
        setState(t("demo.judging"), "run");
        paint(vs);
        await sleep(700);
        for (let i = 0; i < rows.length && !stopped; i++) {
          vs[i] = "RUN";
          paint(vs);
          await sleep(420);
          vs[i] = rows[i].fails && !fixed ? "WA" : "AC";
          paint(vs);
        }
        if (stopped) return;
        if (fixed) {
          setState(t("demo.pass"), "ok");
          await sleep(3200);
        } else {
          setState(t("demo.fail"), "bad");
          await sleep(500);
          hint.hidden = false;
          await sleep(3600);
        }
      }
    }
  })();
  return () => { stopped = true; };
}

function renderHome() {
  document.title = t("home.doc");
  app.innerHTML = `<div class="skeleton-home"><div class="sk-cols"><div><div class="sk sk-title"></div><div class="sk sk-line"></div></div><div class="sk sk-block"></div></div><div class="sk sk-block"></div></div>`;
  let filters = { q: "", diff: "all", status: "all", ...store.pref("filters", {}) };
  let disposed = false;
  let cleanup = () => {};

  loadIndex().then((idx) => {
    if (disposed) return;
    const all = allProblems(idx);
    const solved = all.filter((p) => store.isSolved(p.id)).length;
    const start = all.find((p) => !store.isSolved(p.id)) || all[0];
    const cta = solved === 0 ? t("hero.start") : solved === all.length ? t("hero.review") : t("hero.continue");

    app.innerHTML = `
      <section class="hero">
        <div class="hero-copy">
          <h1><span>${t("hero.a")}</span> <span>${t("hero.b")}</span></h1>
          <p class="lede">${t("hero.lede")}</p>
          <div class="hero-actions">
            ${start ? `<a class="btn btn-primary btn-lg" href="#/p/${start.id}">${cta}${icon("arrow-right")}</a>` : ""}
            <span class="hero-note">${icon("lock-simple")}${t("hero.note")}</span>
          </div>
          <ol class="steps">
            ${[1, 2, 3].map((n) => `<li><span class="step-n">${n}</span><div><b>${t(`step${n}.t`)}</b><span>${esc(t(`step${n}.d`))}</span></div></li>`).join("")}
          </ol>
        </div>
        <div class="hero-demo" aria-hidden="true">
          <div class="demo">
            <div class="demo-file">
              ${icon("file-py")}
              <div><b>main.py</b><small>${t("demo.first")}</small></div>
              <span class="demo-state" data-tone="run">${t("demo.judging")}</span>
            </div>
            <ol class="cases demo-cases"></ol>
            <p class="test-hint demo-hint" hidden>${icon("lightbulb")}<span>${esc(t("demo.hint"))}</span></p>
          </div>
        </div>
      </section>

      <section class="board">
        <div class="board-main">
          <div class="toolbar" role="search">
            <div class="search">
              <label for="q" class="sr-only">${t("search.label")}</label>
              ${icon("magnifying-glass")}
              <input id="q" type="search" placeholder="${esc(t("search.ph"))}" value="${esc(filters.q)}" autocomplete="off">
            </div>
            <div class="seg" role="group" aria-label="${t("filter.diff")}">
              ${["all", "easy", "medium", "hard"].map((v) =>
                `<button type="button" data-filter="diff" data-value="${v}" aria-pressed="${filters.diff === v}">${v === "all" ? t("filter.all") : diffLabel(v)}</button>`).join("")}
            </div>
            <div class="seg" role="group" aria-label="${t("filter.status")}">
              ${[["all", "filter.all"], ["todo", "filter.todo"], ["done", "filter.done"]].map(([v, k]) =>
                `<button type="button" data-filter="status" data-value="${v}" aria-pressed="${filters.status === v}">${t(k)}</button>`).join("")}
            </div>
          </div>
          <div class="families" id="families" aria-live="polite"></div>
        </div>

        <aside class="board-side" aria-label="${t("side.aria")}">
          <div class="side-panel">
            <p class="progress-num"><b>${solved}</b><span>${t("side.of", { total: all.length })}</span></p>
            <div class="progress-rows">
              ${Object.keys(LEVEL).map((d) => {
                const list = all.filter((p) => p.difficulty === d);
                return `
                  <div class="progress-row">
                    <span class="progress-label">${bars(LEVEL[d])}${diffLabel(d)}</span>
                    <span class="progress-cells">${list.map((p) => `<a href="#/p/${p.id}" class="cell ${store.isSolved(p.id) ? "is-on" : ""}" title="${esc(loc(p.title))}" aria-label="${esc(loc(p.title))}"></a>`).join("") || `<span class="muted small">${t("side.none")}</span>`}</span>
                  </div>`;
              }).join("")}
            </div>
          </div>
          <div class="side-store">
            <p>${t("side.store")}</p>
            <div class="side-actions">
              <button type="button" class="btn btn-ghost" data-act="export">${icon("download-simple")}${t("side.export")}</button>
              <button type="button" class="btn btn-ghost" data-act="import">${icon("upload-simple")}${t("side.import")}</button>
              <button type="button" class="btn btn-ghost btn-danger" data-act="reset">${icon("trash")}${t("side.reset")}</button>
            </div>
            <input type="file" id="import-file" accept="application/json,.json" hidden>
          </div>
        </aside>
      </section>`;

    const familiesEl = document.getElementById("families");
    const stopDemo = startDemo(app.querySelector(".hero-demo"));

    const draw = (animate = false) => {
      const q = filters.q.trim().toLowerCase();
      const match = (p, f) => {
        if (filters.diff !== "all" && p.difficulty !== filters.diff) return false;
        if (filters.status === "done" && !store.isSolved(p.id)) return false;
        if (filters.status === "todo" && store.isSolved(p.id)) return false;
        if (!q) return true;
        const hay = [p.title, f.title, f.concept, p.tags].flatMap((v) => Object.values(v || {})).flat();
        return hay.join(" ").toLowerCase().includes(q);
      };
      let n = 0;
      familiesEl.innerHTML = idx.families.map((f) => {
        const shown = f.problems.filter((p) => match(p, f));
        if (!shown.length) return "";
        const done = f.problems.filter((p) => store.isSolved(p.id)).length;
        return `
          <article class="family ${animate ? "reveal" : ""}" style="--i:${n++}">
            <header class="family-head">
              <h2>${esc(loc(f.title))}</h2>
              <p class="family-concept">${esc(loc(f.concept))}</p>
              <p class="family-core">${icon("git-branch")}<span>${esc(loc(f.core))}</span></p>
              <div class="family-meter">
                <span class="meter">${f.problems.map((p) => `<i class="${store.isSolved(p.id) ? "is-on" : ""}"></i>`).join("")}</span>
                <span>${t("family.meter", { done, total: f.problems.length })}</span>
              </div>
            </header>
            <ol class="ladder">
              ${shown.map((p, j) => `
                <li class="${animate ? "reveal" : ""}" style="--i:${n + j}">
                  <a class="rung ${store.isSolved(p.id) ? "is-solved" : ""}" href="#/p/${p.id}">
                    <span class="rung-diff">${bars(LEVEL[p.difficulty])}${diffLabel(p.difficulty)}</span>
                    <span class="rung-main">
                      <span class="rung-title">${esc(loc(p.title))}</span>
                      <span class="rung-tags">${(loc(p.tags) || []).map(esc).join(lang() === "en" ? ", " : "、")}</span>
                    </span>
                    ${rungStatus(p)}
                    ${icon("caret-right", "rung-go")}
                  </a>
                </li>`).join("")}
            </ol>
          </article>`;
      }).join("") || `
        <div class="state-block is-compact">
          ${icon("funnel-x", "state-icon")}
          <h2>${t("empty.title")}</h2>
          <p>${t("empty.text")}</p>
          <button type="button" class="btn btn-ghost" data-act="clear-filters">${t("empty.clear")}</button>
        </div>`;
    };

    const saveFilters = () => store.setPref("filters", { diff: filters.diff, status: filters.status });
    app.querySelector("#q").addEventListener("input", (e) => { filters.q = e.target.value; draw(); });

    const onClick = (e) => {
      const seg = e.target.closest("[data-filter]");
      if (seg) {
        filters[seg.dataset.filter] = seg.dataset.value;
        app.querySelectorAll(`[data-filter="${seg.dataset.filter}"]`).forEach((b) => b.setAttribute("aria-pressed", String(b === seg)));
        saveFilters();
        draw();
        return;
      }
      const act = e.target.closest("[data-act]")?.dataset.act;
      if (act === "clear-filters") {
        filters = { q: "", diff: "all", status: "all" };
        saveFilters();
        route();
      } else if (act === "export") {
        const blob = new Blob([store.exportJSON()], { type: "application/json" });
        const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "pythex-progress.json" });
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      } else if (act === "import") {
        app.querySelector("#import-file").click();
      } else if (act === "reset") {
        if (confirm(t("side.resetConfirm"))) {
          store.reset();
          route();
          toast(t("toast.reset"));
        }
      }
    };
    app.addEventListener("click", onClick);
    app.querySelector("#import-file").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        store.importJSON(await file.text());
        toast(t("toast.imported"));
        route();
      } catch {
        toast(t("toast.importFail"));
      }
    });
    draw(true);
    cleanup = () => { stopDemo(); app.removeEventListener("click", onClick); };
  }).catch((err) => {
    if (!disposed) app.innerHTML = loadErrorView(err);
  });

  return { destroy() { disposed = true; cleanup(); } };
}

/* ------------------------------------------------------------------ problem */

function sampleBlock(s, i) {
  const explain = loc(s.explain);
  return `
    <div class="sample">
      <div class="sample-io">
        <figure>
          <figcaption>${t("p.input", { n: i + 1 })}<button type="button" class="copy" data-copy="in-${i}" aria-label="${t("p.copy")}">${icon("copy")}</button></figcaption>
          <pre id="in-${i}">${esc(s.input)}</pre>
        </figure>
        <figure>
          <figcaption>${t("p.output", { n: i + 1 })}<button type="button" class="copy" data-copy="out-${i}" aria-label="${t("p.copy")}">${icon("copy")}</button></figcaption>
          <pre id="out-${i}">${esc(s.output)}</pre>
        </figure>
      </div>
      ${explain ? `<p class="sample-explain">${esc(explain)}</p>` : ""}
    </div>`;
}

function hintButton(n, total) {
  return `<button type="button" class="btn btn-ghost" data-act="hint">${icon("lightbulb")}${t(n ? "p.hintMore" : "p.hintFirst", { n, t: total })}</button>`;
}

function renderProblem(id) {
  app.innerHTML = `<div class="skeleton-problem"><div class="sk sk-line"></div><div class="sk-cols"><div><div class="sk sk-title"></div><div class="sk sk-block tall"></div></div><div class="sk sk-block tall"></div></div></div>`;
  let workspace = null;
  let disposed = false;
  engine ??= new Engine();

  Promise.all([loadIndex(), loadProblem(id)]).then(([idx, problem]) => {
    if (disposed) return;
    const family = idx.families.find((f) => f.id === problem.family);
    const siblings = family ? family.problems : [];
    const hints = loc(problem.hints) || [];
    document.title = `${loc(problem.title)} · Pythex`;
    const revealed = Math.min(store.pref(`hints:${id}`, 0), hints.length);

    app.innerHTML = `
      <div class="pview">
        <nav class="pnav" aria-label="${t("p.nav")}">
          <a class="back" href="#/">${icon("arrow-left")}${t("p.back")}</a>
          <div class="sibs" role="list">
            ${siblings.map((s) => `
              <a role="listitem" class="sib ${s.id === id ? "is-current" : ""}" href="#/p/${s.id}" ${s.id === id ? 'aria-current="page"' : ""}>
                ${bars(LEVEL[s.difficulty])}<span>${diffLabel(s.difficulty)}</span>
                ${store.isSolved(s.id) ? icon("check-circle", "ph-fill sib-check") : ""}
              </a>`).join("")}
          </div>
        </nav>

        <div class="pgrid">
          <article class="statement">
            <header class="st-head">
              <p class="st-family">${esc(loc(family?.title))}</p>
              <h1>${esc(loc(problem.title))}</h1>
              <ul class="st-meta">
                <li>${bars(LEVEL[problem.difficulty])}${diffLabel(problem.difficulty)}</li>
                <li>${icon("timer")}${t("p.limit", { s: secs(problem.time_limit_ms) })}</li>
                <li>${icon("list-checks")}${t("p.counts", { a: problem.samples.length, b: problem.hidden_count })}</li>
              </ul>
            </header>
            <div class="md">${marked.parse(loc(problem.statement))}</div>
            <section class="samples">
              <h2>${t("p.examples")}</h2>
              ${problem.samples.map(sampleBlock).join("")}
            </section>
            ${hints.length ? `
            <section class="hints">
              <h2>${t("p.hints")}</h2>
              <ol class="hint-list">${hints.slice(0, revealed).map((h) => `<li>${esc(h)}</li>`).join("")}</ol>
              ${revealed < hints.length ? hintButton(revealed, hints.length) : ""}
            </section>` : ""}
          </article>

          <aside class="workspace" aria-label="${t("ws.aria")}">
            <div class="ws-inner" id="ws"></div>
          </aside>
        </div>
      </div>`;

    app.querySelector(".statement").addEventListener("click", async (e) => {
      const copy = e.target.closest("[data-copy]");
      if (copy) {
        try {
          await navigator.clipboard.writeText(document.getElementById(copy.dataset.copy)?.textContent ?? "");
          toast(t("toast.copied"));
        } catch {
          toast(t("toast.noClipboard"));
        }
      }
      if (e.target.closest('[data-act="hint"]')) {
        const n = Math.min(store.pref(`hints:${id}`, 0) + 1, hints.length);
        store.setPref(`hints:${id}`, n);
        const box = app.querySelector(".hints");
        box.querySelector(".hint-list").innerHTML = hints.slice(0, n).map((h) => `<li>${esc(h)}</li>`).join("");
        box.querySelector(".hint-list li:last-child")?.classList.add("is-new");
        const btn = box.querySelector('[data-act="hint"]');
        if (n >= hints.length) btn.remove();
        else btn.outerHTML = hintButton(n, hints.length);
      }
    });

    workspace = new Workspace(document.getElementById("ws"), problem, siblings);
  }).catch((err) => {
    if (disposed) return;
    app.innerHTML = err.message === "not-found"
      ? `<section class="state-block">${icon("question", "state-icon")}<h1>${t("p.notFound")}</h1><p>${t("p.notFoundText")}</p><a class="btn btn-primary" href="#/">${icon("arrow-left")}${t("p.backHome")}</a></section>`
      : loadErrorView(err);
  });

  return { destroy() { disposed = true; workspace?.destroy(); } };
}

/* ------------------------------------------------------------------ workspace: editor + judge */

class Workspace {
  constructor(root, problem, siblings) {
    this.root = root;
    this.problem = problem;
    this.siblings = siblings;
    this.cases = buildCases(problem);
    this.runId = 0;
    this.running = false;
    this.saveTimer = null;
    this.pendingCode = null;
    this.lastCode = "";

    const kbd = IS_MAC ? "⌘ ↵" : "Ctrl ↵";
    root.innerHTML = `
      <div id="engine-line" class="engine-line"></div>
      <div class="ws-editor">
        <div class="ws-bar">
          <span class="ws-file">${icon("file-py")}main.py</span>
          <span class="ws-saved" id="ws-saved" aria-live="polite"></span>
          <button type="button" class="ws-reset" data-act="reset">${icon("arrow-counter-clockwise")}${t("ws.reset")}</button>
        </div>
        <div id="editor-host"></div>
      </div>
      <div class="ws-actions">
        <button type="button" class="btn btn-ghost" data-act="run-samples">${icon("play")}${t("ws.runSamples")}</button>
        <button type="button" class="btn btn-primary" data-act="submit">${icon("paper-plane-tilt")}${t("ws.submit")}<kbd>${kbd}</kbd></button>
      </div>
      <div class="ws-tabs" role="tablist">
        <button type="button" role="tab" id="tab-result" aria-controls="panel-result" aria-selected="true" data-tab="result">${t("ws.tabResult")}</button>
        <button type="button" role="tab" id="tab-custom" aria-controls="panel-custom" aria-selected="false" data-tab="custom">${t("ws.tabCustom")}</button>
      </div>
      <div id="panel-result" role="tabpanel" aria-labelledby="tab-result">
        <div class="ws-empty">${icon("terminal-window", "state-icon")}<b>${t("ws.emptyTitle")}</b><p>${t("ws.emptyText")}</p></div>
      </div>
      <div id="panel-custom" role="tabpanel" aria-labelledby="tab-custom" hidden>
        <p class="ws-note">${t("ws.customHint")}</p>
        <label for="custom-in" class="field-label">${t("ws.customInput")}</label>
        <textarea id="custom-in" class="custom-in" spellcheck="false" wrap="off">${esc(problem.samples[0]?.input ?? "")}</textarea>
        <div><button type="button" class="btn btn-ghost" data-act="custom-run">${icon("play")}${t("ws.customRun")}</button></div>
        <div id="custom-out"></div>
      </div>`;

    this.engineLine = root.querySelector("#engine-line");
    this.resultEl = root.querySelector("#panel-result");
    this.customEl = root.querySelector("#panel-custom");
    this.savedEl = root.querySelector("#ws-saved");

    this.editor = new CodeEditor(root.querySelector("#editor-host"), {
      value: store.draft(problem.id) ?? t("starter"),
      label: t("ws.editor"),
      help: t("ws.help"),
      onChange: (code) => this.scheduleSave(code),
      onSubmit: () => this.run("submit"),
    });

    this.offStatus = engine.onStatus((state, detail) => this.renderEngine(state, detail));
    this.onClick = (e) => {
      const btn = e.target.closest("[data-act], [data-tab]");
      if (!btn) {
        const head = e.target.closest(".case-head");
        if (head && !head.disabled) {
          const open = head.getAttribute("aria-expanded") === "true";
          head.setAttribute("aria-expanded", String(!open));
          head.nextElementSibling.hidden = open;
        }
        return;
      }
      if (btn.dataset.tab) {
        this.showTab(btn.dataset.tab);
        return;
      }
      const act = btn.dataset.act;
      if (act === "submit") this.run("submit");
      else if (act === "run-samples") this.run("samples");
      else if (act === "custom-run") this.runCustom();
      else if (act === "retry-engine") engine.retry();
      else if (act === "goto") this.editor.goToLine(Number(btn.dataset.line));
      else if (act === "reset" && confirm(t("ws.resetConfirm"))) {
        this.editor.setValue(t("starter"));
        store.clearDraft(this.problem.id);
        this.pendingCode = null;
        this.editor.focus();
      }
    };
    this.onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !e.defaultPrevented) {
        e.preventDefault();
        this.run("submit");
      }
    };
    root.addEventListener("click", this.onClick);
    document.addEventListener("keydown", this.onKey);
  }

  destroy() {
    this.runId += 1;
    this.flushSave();
    this.offStatus();
    this.root.removeEventListener("click", this.onClick);
    document.removeEventListener("keydown", this.onKey);
  }

  scheduleSave(code) {
    clearTimeout(this.saveTimer);
    this.pendingCode = code;
    this.saveTimer = setTimeout(() => this.flushSave(), 400);
  }

  flushSave() {
    clearTimeout(this.saveTimer);
    if (this.pendingCode == null) return;
    if (store.saveDraft(this.problem.id, this.pendingCode)) {
      this.savedEl.textContent = t("ws.saved");
      clearTimeout(this.savedTimer);
      this.savedTimer = setTimeout(() => { this.savedEl.textContent = ""; }, 1500);
    }
    this.pendingCode = null;
  }

  showTab(name) {
    this.root.querySelectorAll("[data-tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === name)));
    this.resultEl.hidden = name !== "result";
    this.customEl.hidden = name !== "custom";
  }

  setBusy(busy) {
    this.running = busy;
    this.root.querySelectorAll('[data-act="submit"], [data-act="run-samples"], [data-act="custom-run"]').forEach((b) => { b.disabled = busy; });
  }

  renderEngine(state, detail) {
    const map = {
      loading: `<span class="load-track" aria-hidden="true"><span></span></span>${t("eng.loading")}`,
      ready: `<span class="live-dot" aria-hidden="true"></span>${esc(t("eng.ready", { v: detail }))}`,
      error: `${icon("warning")}${t("eng.error")} <button type="button" class="link-btn" data-act="retry-engine">${t("eng.retry")}</button>`,
      idle: "",
    };
    this.engineLine.dataset.state = state;
    this.engineLine.innerHTML = map[state] ?? "";
  }

  code() {
    return this.editor.value.replace(/\r\n?/g, "\n");
  }

  /* -------------------------------------------------- judge */

  async run(mode) {
    if (this.running) return;
    this.flushSave();
    const myRun = ++this.runId;
    this.setBusy(true);
    this.showTab("result");
    this.editor.setErrorLine(null);
    const code = this.code();
    this.lastCode = code;
    const cases = mode === "samples" ? this.cases.filter((c) => !c.hidden) : this.cases;
    const results = new Map();

    this.resultEl.innerHTML = `
      <section class="verdict is-running" aria-live="polite">
        <span class="verdict-badge"><span class="pulse-ring"></span></span>
        <div class="verdict-text"><strong id="run-title">${engine.state === "ready" ? t("run.compiling") : t("run.waiting")}</strong><span>${t("run.total", { n: cases.length })}</span></div>
      </section>
      <ol class="cases">${cases.map((tc) => this.caseRow(tc, { verdict: "WAIT" })).join("")}</ol>`;

    let outcome;
    try {
      outcome = await judge(engine, this.problem, cases, code, {
        isCancelled: () => myRun !== this.runId,
        onUpdate: (key, r) => {
          if (myRun !== this.runId) return;
          results.set(key, r);
          const row = this.resultEl.querySelector(`[data-key="${key}"]`);
          if (row) row.outerHTML = this.caseRow(cases.find((c) => c.key === key), r);
          const done = [...results.values()].filter((x) => x.verdict !== "RUN").length;
          const title = this.resultEl.querySelector("#run-title");
          if (title) title.textContent = t("run.progress", { d: done, n: cases.length });
        },
      });
    } catch (err) {
      outcome = { verdict: "SE", systemError: t("out.seLoad", { msg: err.message }), results: [] };
    }
    if (myRun !== this.runId || !outcome) return;
    this.setBusy(false);
    this.renderOutcome(outcome, mode, cases, code);
  }

  caseRow(tc, r) {
    const label = tc.hidden ? loc(tc.label) : t("case.public");
    const expandable = !["WAIT", "RUN", "SK"].includes(r.verdict);
    const mark = r.verdict === "RUN" ? `<span class="pulse-dot"></span>` : icon(VERDICT_ICON[r.verdict], r.verdict === "AC" ? "ph-fill" : "");
    return `
      <li class="case" data-key="${tc.key}" data-v="${r.verdict.toLowerCase()}">
        <button type="button" class="case-head" aria-expanded="false" ${expandable ? "" : "disabled"}>
          <span class="case-icon">${mark}</span>
          <span class="case-name">${esc(tc.name)}</span>
          <span class="case-label">${esc(label)}${tc.hidden && tc.kind && tc.kind !== "normal" ? `<em class="kind">${t(`kind.${tc.kind}`)}</em>` : ""}</span>
          <span class="case-time">${r.time != null && r.verdict !== "TLE" ? ms(r.time) : ""}</span>
          <span class="case-verdict">${vLabel(r.verdict)}</span>
        </button>
        <div class="case-body" hidden>${expandable ? this.caseDetail(tc, r, this.lastCode) : ""}</div>
      </li>`;
  }

  caseDetail(tc, r, code) {
    const parts = [];
    if (tc.hidden) parts.push(`<p class="hidden-note">${icon("eye-slash")}<span>${t("dx.hiddenNote")} <b>${esc(loc(tc.label))}</b></span></p>`);
    else parts.push(ioBlock(t("io.input"), tc.input));

    const hint = loc(tc.hint);
    if (r.verdict === "AC") {
      if (!tc.hidden) parts.push(ioBlock(t("io.yours"), r.stdout));
    } else if (r.verdict === "WA") {
      const { findings, firstDiff } = diagnoseWrongAnswer(tc.output, r.stdout, code, { reveal: !tc.hidden });
      parts.push(findingsBlock(findings));
      if (tc.hidden && hint) parts.push(hintBlock(hint));
      if (!tc.hidden) parts.push(diffBlock(tc.output, r.stdout, firstDiff, r.truncated));
    } else if (r.verdict === "RE") {
      parts.push(errorBlock(explainError(r.error, code), r.error, code));
      if (tc.hidden && hint) parts.push(hintBlock(hint));
      if (!tc.hidden && r.stdout) parts.push(ioBlock(t("io.before"), r.stdout));
    } else if (r.verdict === "TLE") {
      const ex = explainTimeout(tc, this.problem.time_limit_ms);
      parts.push(findingsBlock([{ title: ex.title, detail: ex.detail }], ex.tips));
      if (tc.hidden && hint) parts.push(hintBlock(hint));
    }
    if (r.stderr && r.verdict !== "RE") {
      parts.push(`<details class="stderr"><summary>${t("io.stderr")}</summary><pre>${esc(r.stderr)}</pre></details>`);
    }
    return parts.join("");
  }

  renderOutcome(outcome, mode, cases, code) {
    if (outcome.verdict === "SE") {
      this.resultEl.innerHTML = `
        <section class="verdict v-se" aria-live="polite">
          <span class="verdict-badge">${icon(VERDICT_ICON.SE)}</span>
          <div class="verdict-text"><strong>${vLabel("SE")}</strong><span>${esc(outcome.systemError || t("out.se"))}</span></div>
        </section>`;
      return;
    }

    const { problem } = this;
    const total = cases.length;
    const passed = outcome.results.filter((r) => r.verdict === "AC").length;
    const slowest = Math.max(0, ...outcome.results.filter((r) => r.verdict === "AC").map((r) => r.time || 0));
    const submit = mode === "submit";
    const firstSolve = submit ? store.record(problem.id, { verdict: outcome.verdict, passed, total }) : false;

    let title = vLabel(outcome.verdict);
    let sub = t("out.passed", { p: passed, t: total });
    if (outcome.verdict === "AC") {
      title = submit ? (firstSolve ? t("out.firstSolve") : t("out.allPass")) : t("out.samplesPass");
      sub = submit ? sub + t("out.slowest", { ms: ms(slowest) }) : t("out.samplesSub", { p: passed, t: total });
    }
    if (outcome.verdict === "CE") sub = t("out.ce");

    let next = "";
    if (outcome.verdict === "AC" && submit) {
      const i = this.siblings.findIndex((s) => s.id === problem.id);
      const target = this.siblings.slice(i + 1).find((s) => !store.isSolved(s.id)) || this.siblings.find((s) => !store.isSolved(s.id));
      next = target
        ? `<a class="btn btn-primary next-btn" href="#/p/${target.id}">${esc(t("out.next", { d: diffLabel(target.difficulty), title: loc(target.title) }))}${icon("arrow-right")}</a>`
        : `<a class="btn btn-ghost next-btn" href="#/">${t("out.familyDone")}${icon("arrow-right")}</a>`;
    }

    let diagnosis = "";
    let errorLine = null;
    const failing = outcome.results.find((r) => !["AC", "SK"].includes(r.verdict));
    if (outcome.verdict === "CE") {
      errorLine = outcome.compileError.line;
      diagnosis = `<section class="diagnosis"><h3>${icon("stethoscope")}${t("dx.title")}</h3>${errorBlock(explainError(outcome.compileError, code), outcome.compileError, code)}</section>`;
    } else if (failing) {
      const tc = cases.find((c) => c.key === failing.key);
      if (failing.verdict === "RE") errorLine = failing.error?.line ?? null;
      const sep = lang() === "en" ? ": " : "：";
      diagnosis = `
        <section class="diagnosis">
          <h3>${icon("stethoscope")}<span>${esc(t("dx.from", { name: tc.name }))}${tc.hidden ? `${sep}${esc(loc(tc.label))}` : ""}</span></h3>
          ${this.caseDetail(tc, failing, code)}
        </section>`;
    }
    if (errorLine) this.editor.setErrorLine(errorLine);

    this.resultEl.innerHTML = `
      <section class="verdict v-${outcome.verdict.toLowerCase()} ${firstSolve ? "is-first" : ""}" aria-live="polite">
        <span class="verdict-badge">${icon(VERDICT_ICON[outcome.verdict], outcome.verdict === "AC" ? "ph-fill" : "")}</span>
        <div class="verdict-text"><strong>${esc(title)}</strong><span>${esc(sub)}</span></div>
        ${next}
      </section>
      ${diagnosis}
      ${outcome.results.length ? `<ol class="cases is-revealing">${cases.map((tc, i) => this.caseRow(tc, outcome.results.find((r) => r.key === tc.key) || { verdict: "SK" }).replace('<li class="case"', `<li style="--i:${i}" class="case`)).join("")}</ol>` : ""}`;
  }

  /* -------------------------------------------------- custom input */

  async runCustom() {
    if (this.running) return;
    this.flushSave();
    const out = this.customEl.querySelector("#custom-out");
    let input = this.customEl.querySelector("#custom-in").value.replace(/\r\n?/g, "\n");
    if (input && !input.endsWith("\n")) input += "\n";
    const code = this.code();
    const limit = this.problem.time_limit_ms;
    this.setBusy(true);
    this.editor.setErrorLine(null);
    out.innerHTML = `<p class="engine-line"><span class="load-track" aria-hidden="true"><span></span></span>${engine.state === "ready" ? t("run.compiling") : t("run.waiting")}</p>`;
    try {
      const compiled = await engine.compile(code);
      if (!compiled.ok) {
        this.editor.setErrorLine(compiled.error?.line);
        out.innerHTML = errorBlock(explainError(compiled.error, code), compiled.error, code);
        return;
      }
      const res = await engine.run(code, input, limit + Math.max(1500, limit * 0.75));
      if (res.timeout || res.time > limit) {
        const ex = explainTimeout(null, limit);
        out.innerHTML = findingsBlock([{ title: ex.title, detail: ex.detail }], ex.tips);
        return;
      }
      const parts = [ioBlock(`${t("ws.customOutput")} <span class="muted">${ms(res.time)}</span>`, res.stdout)];
      if (res.error || res.fatal) {
        const err = res.error || { type: "RuntimeCrash", message: res.message, line: null };
        if (err.line) this.editor.setErrorLine(err.line);
        parts.push(errorBlock(explainError(err, code), err, code));
      } else if (res.stderr) {
        parts.push(`<details class="stderr" open><summary>${t("io.stderr")}</summary><pre>${esc(res.stderr)}</pre></details>`);
      }
      out.innerHTML = parts.join("");
    } catch (err) {
      out.innerHTML = `<p class="muted">${esc(t("out.seLoad", { msg: err.message }))}</p>`;
    } finally {
      this.setBusy(false);
    }
  }
}

/* ------------------------------------------------------------------ result blocks */

function ioBlock(title, text) {
  const s = String(text ?? "");
  const lines = s.split("\n");
  const shown = lines.length > MAX_SHOW_LINES
    ? `${lines.slice(0, MAX_SHOW_LINES).join("\n")}\n${t("io.more", { n: lines.length - MAX_SHOW_LINES })}`
    : s;
  return `<figure class="io"><figcaption>${title}</figcaption><pre>${s ? esc(shown) : `<span class="muted">${t("io.none")}</span>`}</pre></figure>`;
}

function findingsBlock(findings, tips = []) {
  return `
    <ul class="findings">${findings.map((f) => `<li><b>${esc(f.title)}</b><span>${esc(f.detail)}</span></li>`).join("")}</ul>
    ${tips.length ? `<ul class="tips">${tips.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}`;
}

function hintBlock(hint) {
  return `<p class="test-hint">${icon("lightbulb")}<span>${esc(hint)}</span></p>`;
}

function errorBlock(ex, error, code) {
  const line = error?.line;
  const src = code.split("\n");
  let excerpt = "";
  if (line && line <= src.length) {
    const hl = highlightPython(code);
    const rows = [];
    for (let n = Math.max(1, line - 2); n <= Math.min(src.length, line + 1); n++) {
      rows.push(`<div class="code-line ${n === line ? "is-error" : ""}"><span class="ln">${n}</span><span class="src">${hl[n - 1] || " "}</span></div>`);
      if (n === line && error.col && ["SyntaxError", "IndentationError", "TabError"].includes(error.type)) {
        rows.push(`<div class="code-line caret"><span class="ln"></span><span class="src">${" ".repeat(Math.max(0, error.col - 1))}^</span></div>`);
      }
    }
    excerpt = `<div class="code excerpt">${rows.join("")}</div>`;
  }
  return `
    <div class="error-explain">
      <p class="error-title"><b>${esc(ex.title)}</b>${line ? `<button type="button" class="line-link" data-act="goto" data-line="${line}" title="${esc(t("io.jump", { n: line }))}">${t("io.line", { n: line })}${icon("arrow-square-out")}</button>` : ""}<code>${esc(ex.type)}${ex.message ? `: ${esc(ex.message)}` : ""}</code></p>
      ${ex.detail ? `<p>${esc(ex.detail)}</p>` : ""}
      ${excerpt}
      ${ex.tips.length ? `<ul class="tips">${ex.tips.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
      ${error?.traceback ? `<details class="traceback"><summary>${t("io.traceback")}</summary><pre>${esc(error.traceback)}</pre></details>` : ""}
    </div>`;
}

function diffBlock(expected, got, firstDiff, truncated) {
  const e = normalize(expected);
  const o = normalize(got);
  const eL = e === "" ? [] : e.split("\n");
  const oL = o === "" ? [] : o.split("\n");
  const n = Math.min(Math.max(eL.length, oL.length), MAX_SHOW_LINES);
  const col = (arr, other) => {
    const rows = [];
    for (let i = 0; i < n; i++) {
      const bad = arr[i] !== other[i];
      const text = arr[i] === undefined ? `<span class="muted">${t("io.missing")}</span>` : esc(arr[i]) || " ";
      rows.push(`<div class="diff-line ${bad ? "is-diff" : ""} ${i === firstDiff ? "is-first" : ""}"><span class="ln">${i + 1}</span><span class="src">${text}</span></div>`);
    }
    return rows.join("");
  };
  const more = Math.max(eL.length, oL.length) > n ? `<p class="muted small">${t("io.firstN", { n: MAX_SHOW_LINES })}</p>` : "";
  return `
    <div class="diff">
      <figure><figcaption>${t("io.expected")}</figcaption><div class="code">${col(eL, oL)}</div></figure>
      <figure><figcaption>${t("io.yours")}${truncated ? t("io.truncated") : ""}</figcaption><div class="code">${col(oL, eL)}</div></figure>
    </div>${more}`;
}

/* ------------------------------------------------------------------ router */

function route({ keepScroll = false } = {}) {
  view?.destroy();
  const hash = location.hash.slice(1) || "/";
  const m = hash.match(/^\/p\/([\w-]+)\/?$/);
  view = m ? renderProblem(m[1]) : renderHome();
  if (!keepScroll) window.scrollTo(0, 0);
  updateHeader();
}

window.addEventListener("hashchange", () => route());
applyChrome();
route();
