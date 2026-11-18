import { marked } from "https://cdn.jsdelivr.net/npm/marked@12.0.2/lib/marked.esm.js";
import { Engine, buildCases, judge } from "./judge.js";
import { explainError, diagnoseWrongAnswer, explainTimeout, normalize } from "./diagnose.js";
import { highlightPython } from "./highlight.js";
import { store } from "./store.js";

/* ------------------------------------------------------------------ constants */

const DIFF = {
  easy: { label: "簡單", level: 1 },
  medium: { label: "中等", level: 2 },
  hard: { label: "困難", level: 3 },
};
const VERDICT = {
  AC: { label: "通過", icon: "check-circle" },
  WA: { label: "答案錯誤", icon: "x-circle" },
  RE: { label: "執行錯誤", icon: "warning-octagon" },
  TLE: { label: "超過時間", icon: "timer" },
  CE: { label: "語法錯誤", icon: "code" },
  SE: { label: "系統錯誤", icon: "plugs" },
  SK: { label: "已略過", icon: "skip-forward" },
  RUN: { label: "執行中", icon: "circle-notch" },
  WAIT: { label: "等待中", icon: "circle" },
};
const KIND = { normal: "一般", edge: "極端", boundary: "邊界", stress: "大量資料" };
const MAX_FILE_BYTES = 200_000;
const MAX_SHOW_LINES = 120;

marked.setOptions({ gfm: true, breaks: false });

const app = document.getElementById("app");
const toastEl = document.getElementById("toast");
let indexData = null;
const problemCache = new Map();
let engine = null;
let view = null; // current view controller, has destroy()

/* ------------------------------------------------------------------ helpers */

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const icon = (name, extra = "") => `<i class="ph ph-${name} ${extra}" aria-hidden="true"></i>`;
const bars = (level) => `<span class="bars" data-level="${level}" aria-hidden="true"><i></i><i></i><i></i></span>`;
const ms = (t) => (t == null ? "" : t >= 1000 ? `${(t / 1000).toFixed(2)} s` : `${Math.max(1, Math.round(t))} ms`);
const seconds = (limit) => `${(limit / 1000).toFixed(limit % 1000 ? 1 : 0)} 秒`;

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

function allProblems(idx) {
  return idx.families.flatMap((f) => f.problems.map((p) => ({ ...p, family: f })));
}

function loadErrorView(err) {
  const local = location.protocol === "file:";
  return `
    <section class="state-block">
      ${icon("cloud-slash", "state-icon")}
      <h1>題庫讀取失敗</h1>
      <p>${local
        ? "直接開啟 index.html 時瀏覽器不允許讀取題庫。請在專案資料夾執行 <code>python -m http.server -d docs</code>，再打開 <code>http://localhost:8000</code>。"
        : `請稍後重新整理。錯誤訊息：${esc(err.message)}`}</p>
      <a class="btn btn-primary" href="#/">${icon("arrow-clockwise")}重新整理</a>
    </section>`;
}

/* ------------------------------------------------------------------ header & theme */

const THEMES = ["auto", "light", "dark"];
const THEME_META = {
  auto: { icon: "circle-half", label: "跟隨系統" },
  light: { icon: "sun", label: "淺色" },
  dark: { icon: "moon", label: "深色" },
};

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === "auto") delete root.dataset.theme;
  else root.dataset.theme = theme;
  const btn = document.getElementById("theme-toggle");
  btn.innerHTML = icon(THEME_META[theme].icon);
  btn.setAttribute("aria-label", `主題：${THEME_META[theme].label}，點擊切換`);
  btn.title = `主題：${THEME_META[theme].label}`;
}

document.getElementById("theme-toggle").addEventListener("click", () => {
  const next = THEMES[(THEMES.indexOf(store.pref("theme", "auto")) + 1) % THEMES.length];
  store.setPref("theme", next);
  applyTheme(next);
});
applyTheme(store.pref("theme", "auto"));

async function updateHeader() {
  const el = document.getElementById("hdr-progress");
  try {
    const idx = await loadIndex();
    const all = allProblems(idx);
    const solved = all.filter((p) => store.isSolved(p.id)).length;
    el.innerHTML = `${icon("check-circle")}<span>已完成 <b>${solved}</b> / ${all.length}</span>`;
    el.hidden = false;
  } catch {
    el.hidden = true;
  }
}
store.subscribe(updateHeader);

/* ------------------------------------------------------------------ home */

function rungStatus(p) {
  if (store.isSolved(p.id)) return `<span class="rung-status is-solved">${icon("check-circle", "ph-fill")}已完成</span>`;
  const a = store.attempt(p.id);
  if (a) return `<span class="rung-status is-tried">${icon("circle-dashed")}最近 ${a.passed}/${a.total}</span>`;
  return `<span class="rung-status">${icon("circle")}尚未作答</span>`;
}

/* A real, looping preview of the judge panel: it tells the product's story
 * (drop file → hidden edge case fails with a hint → fix → all pass). */
const DEMO_ROWS = [
  { name: "範例 1", label: "公開範例" },
  { name: "範例 2", label: "公開範例" },
  { name: "隱藏 1", label: "開燈戶數比 N 還少", kind: "edge" },
  { name: "隱藏 2", label: "中心格同時屬於兩條對角線", kind: "edge" },
  { name: "隱藏 3", label: "只有右上到左下的對角線連線", kind: "edge", fails: true },
  { name: "隱藏 4", label: "公布的最後一戶才完成連線", kind: "boundary" },
];

function demoRow(row, verdict) {
  const v = VERDICT[verdict];
  const mark = verdict === "RUN" ? `<span class="pulse-dot"></span>` : icon(v.icon, verdict === "AC" ? "ph-fill" : "");
  return `
    <li class="case" data-v="${verdict.toLowerCase()}">
      <div class="case-head">
        <span class="case-icon">${mark}</span>
        <span class="case-name">${row.name}</span>
        <span class="case-label">${esc(row.label)}${row.kind ? `<em class="kind">${KIND[row.kind]}</em>` : ""}</span>
        <span class="case-time"></span>
        <span class="case-verdict">${v.label}</span>
      </div>
    </li>`;
}

function startDemo(root) {
  const list = root.querySelector(".demo-cases");
  const state = root.querySelector(".demo-state");
  const hint = root.querySelector(".demo-hint");
  const file = root.querySelector(".demo-file small");
  let stopped = false;
  const sleep = (t) => new Promise((r) => setTimeout(r, t));
  const paint = (verdicts) => { list.innerHTML = DEMO_ROWS.map((r, i) => demoRow(r, verdicts[i])).join(""); };
  const setState = (text, tone) => { state.textContent = text; state.dataset.tone = tone; };

  const finalFail = DEMO_ROWS.map((r) => (r.fails ? "WA" : "AC"));
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    paint(finalFail);
    setState("答案錯誤 5 / 6", "bad");
    hint.hidden = false;
    return () => {};
  }

  (async () => {
    while (!stopped) {
      for (const fixed of [false, true]) {
        const verdicts = DEMO_ROWS.map(() => "WAIT");
        hint.hidden = true;
        file.textContent = fixed ? "存檔後自動重新檢查" : "剛剛拖進來";
        setState("評測中", "run");
        paint(verdicts);
        await sleep(700);
        for (let i = 0; i < DEMO_ROWS.length && !stopped; i++) {
          verdicts[i] = "RUN";
          paint(verdicts);
          await sleep(420);
          verdicts[i] = DEMO_ROWS[i].fails && !fixed ? "WA" : "AC";
          paint(verdicts);
        }
        if (stopped) return;
        if (fixed) {
          setState("全部通過 6 / 6", "ok");
          await sleep(3200);
        } else {
          setState("答案錯誤 5 / 6", "bad");
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
  document.title = "Pythex 題目列表";
  app.innerHTML = `<div class="skeleton-home"><div class="sk-cols"><div><div class="sk sk-title"></div><div class="sk sk-line"></div></div><div class="sk sk-block"></div></div><div class="sk sk-block"></div><div class="sk sk-block"></div></div>`;
  let filters = { q: "", diff: "all", status: "all", ...store.pref("filters", {}) };
  let disposed = false;
  let cleanup = () => {};

  loadIndex().then((idx) => {
    if (disposed) return;
    const all = allProblems(idx);
    const solved = all.filter((p) => store.isSolved(p.id)).length;
    const start = all.find((p) => !store.isSolved(p.id)) || all[0];
    const ctaLabel = solved === 0 ? "開始第一題" : solved === all.length ? "回顧題目" : "繼續練習";

    app.innerHTML = `
      <section class="hero">
        <div class="hero-copy">
          <h1><span>把 .py 拖進來，</span><span>立刻知道哪裡錯。</span></h1>
          <p class="lede">範例測資公開，隱藏測資專挑極端情況。答錯時會指出是哪一種情況出錯，以及可能的原因。</p>
          <div class="hero-actions">
            ${start ? `<a class="btn btn-primary btn-lg" href="#/p/${start.id}">${ctaLabel}${icon("arrow-right")}</a>` : ""}
            <span class="hero-note">${icon("lock-simple")}程式只在你的瀏覽器執行</span>
          </div>
          <ol class="steps">
            <li><span class="step-n">1</span><div><b>用 input() 讀資料</b><span>測資從標準輸入送進程式，就像有人在鍵盤上打字。</span></div></li>
            <li><span class="step-n">2</span><div><b>用 print() 印答案</b><span>只印題目要求的內容，不要加「請輸入」之類的提示文字。</span></div></li>
            <li><span class="step-n">3</span><div><b>把檔案拖進題目頁</b><span>每組測資跑完立刻看到結果，錯了會給提示。</span></div></li>
          </ol>
        </div>
        <div class="hero-demo" aria-hidden="true">
          <div class="demo">
            <div class="demo-file">
              ${icon("file-py")}
              <div><b>solution.py</b><small>剛剛拖進來</small></div>
              <span class="demo-state" data-tone="run">評測中</span>
            </div>
            <ol class="cases demo-cases"></ol>
            <p class="test-hint demo-hint" hidden>${icon("lightbulb")}<span>對角線有兩條。右上到左下那條的格子滿足 r + c == N - 1。</span></p>
          </div>
        </div>
      </section>

      <section class="board">
        <div class="board-main">
          <div class="toolbar" role="search">
            <div class="search">
              <label for="q" class="sr-only">搜尋題目</label>
              ${icon("magnifying-glass")}
              <input id="q" type="search" placeholder="搜尋題名、主題或標籤" value="${esc(filters.q)}" autocomplete="off">
            </div>
            <div class="seg" role="group" aria-label="難度">
              ${[["all", "全部"], ["easy", "簡單"], ["medium", "中等"], ["hard", "困難"]].map(([v, l]) =>
                `<button type="button" data-filter="diff" data-value="${v}" aria-pressed="${filters.diff === v}">${l}</button>`).join("")}
            </div>
            <div class="seg" role="group" aria-label="狀態">
              ${[["all", "全部"], ["todo", "未完成"], ["done", "已完成"]].map(([v, l]) =>
                `<button type="button" data-filter="status" data-value="${v}" aria-pressed="${filters.status === v}">${l}</button>`).join("")}
            </div>
          </div>
          <div class="families" id="families" aria-live="polite"></div>
        </div>

        <aside class="board-side" aria-label="完成進度">
          <div class="side-panel">
            <p class="progress-num"><b>${solved}</b><span>/ ${all.length} 題完成</span></p>
            <div class="progress-rows">
              ${Object.keys(DIFF).map((d) => {
                const list = all.filter((p) => p.difficulty === d);
                return `
                  <div class="progress-row">
                    <span class="progress-label">${bars(DIFF[d].level)}${DIFF[d].label}</span>
                    <span class="progress-cells">${list.map((p) => `<a href="#/p/${p.id}" class="cell ${store.isSolved(p.id) ? "is-on" : ""}" title="${esc(p.title)}" aria-label="${esc(p.title)}${store.isSolved(p.id) ? "，已完成" : ""}"></a>`).join("") || `<span class="muted small">尚無題目</span>`}</span>
                  </div>`;
              }).join("")}
            </div>
          </div>
          <div class="side-store">
            <p>進度只存在這台裝置的瀏覽器裡。換電腦前可以先匯出。</p>
            <div class="side-actions">
              <button type="button" class="btn btn-ghost" data-act="export">${icon("download-simple")}匯出進度</button>
              <button type="button" class="btn btn-ghost" data-act="import">${icon("upload-simple")}匯入進度</button>
              <button type="button" class="btn btn-ghost btn-danger" data-act="reset">${icon("trash")}清除進度</button>
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
        return [p.title, f.title, f.concept, ...(p.tags || [])].join(" ").toLowerCase().includes(q);
      };
      let n = 0;
      const blocks = idx.families.map((f) => {
        const shown = f.problems.filter((p) => match(p, f));
        if (!shown.length) return "";
        const done = f.problems.filter((p) => store.isSolved(p.id)).length;
        return `
          <article class="family ${animate ? "reveal" : ""}" style="--i:${n++}">
            <header class="family-head">
              <h2>${esc(f.title)}</h2>
              <p class="family-concept">${esc(f.concept)}</p>
              <p class="family-core">${icon("git-branch")}<span>${esc(f.core)}</span></p>
              <div class="family-meter" aria-label="完成 ${done} / ${f.problems.length}">
                <span class="meter">${f.problems.map((p) => `<i class="${store.isSolved(p.id) ? "is-on" : ""}"></i>`).join("")}</span>
                <span>${done} / ${f.problems.length} 完成</span>
              </div>
            </header>
            <ol class="ladder">
              ${shown.map((p, j) => `
                <li class="${animate ? "reveal" : ""}" style="--i:${n + j}">
                  <a class="rung ${store.isSolved(p.id) ? "is-solved" : ""}" href="#/p/${p.id}">
                    <span class="rung-diff">${bars(DIFF[p.difficulty].level)}${DIFF[p.difficulty].label}</span>
                    <span class="rung-main">
                      <span class="rung-title">${esc(p.title)}</span>
                      <span class="rung-tags">${(p.tags || []).map(esc).join("、")}</span>
                    </span>
                    ${rungStatus(p)}
                    ${icon("caret-right", "rung-go")}
                  </a>
                </li>`).join("")}
            </ol>
          </article>`;
      }).join("");
      familiesEl.innerHTML = blocks || `
        <div class="state-block is-compact">
          ${icon("funnel-x", "state-icon")}
          <h2>沒有符合條件的題目</h2>
          <p>換個關鍵字，或清除篩選條件。</p>
          <button type="button" class="btn btn-ghost" data-act="clear-filters">清除篩選</button>
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
        if (confirm("確定要清除這台裝置上的所有完成紀錄嗎？這個動作無法復原。")) {
          store.reset();
          route();
          toast("已清除進度");
        }
      }
    };
    app.addEventListener("click", onClick);
    app.querySelector("#import-file").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        store.importJSON(await file.text());
        toast("已匯入進度");
        route();
      } catch (err) {
        toast(`匯入失敗：${err.message}`);
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
  return `
    <div class="sample">
      <div class="sample-io">
        <figure>
          <figcaption>輸入 ${i + 1}<button type="button" class="copy" data-copy="in-${i}" aria-label="複製輸入 ${i + 1}">${icon("copy")}</button></figcaption>
          <pre id="in-${i}">${esc(s.input)}</pre>
        </figure>
        <figure>
          <figcaption>輸出 ${i + 1}<button type="button" class="copy" data-copy="out-${i}" aria-label="複製輸出 ${i + 1}">${icon("copy")}</button></figcaption>
          <pre id="out-${i}">${esc(s.output)}</pre>
        </figure>
      </div>
      ${s.explain ? `<p class="sample-explain">${esc(s.explain)}</p>` : ""}
    </div>`;
}

function renderProblem(id) {
  app.innerHTML = `<div class="skeleton-problem"><div class="sk sk-line"></div><div class="sk-cols"><div><div class="sk sk-title"></div><div class="sk sk-block tall"></div></div><div class="sk sk-block tall"></div></div></div>`;
  let panel = null;
  let disposed = false;
  engine ??= new Engine();

  Promise.all([loadIndex(), loadProblem(id)]).then(([idx, problem]) => {
    if (disposed) return;
    const family = idx.families.find((f) => f.id === problem.family);
    const siblings = family ? family.problems : [];
    document.title = `${problem.title} · Pythex`;
    const revealed = Math.min(store.pref(`hints:${id}`, 0), problem.hints.length);

    app.innerHTML = `
      <div class="pview">
        <nav class="pnav" aria-label="題目導覽">
          <a class="back" href="#/">${icon("arrow-left")}題目列表</a>
          <div class="sibs" role="list">
            ${siblings.map((s) => `
              <a role="listitem" class="sib ${s.id === id ? "is-current" : ""}" href="#/p/${s.id}" ${s.id === id ? 'aria-current="page"' : ""}>
                ${bars(DIFF[s.difficulty].level)}<span>${DIFF[s.difficulty].label}</span>
                ${store.isSolved(s.id) ? icon("check-circle", "ph-fill sib-check") : ""}
              </a>`).join("")}
          </div>
        </nav>

        <div class="pgrid">
          <article class="statement">
            <header class="st-head">
              <p class="st-family">${esc(family?.title || "")}</p>
              <h1>${esc(problem.title)}</h1>
              <ul class="st-meta">
                <li>${bars(DIFF[problem.difficulty].level)}${DIFF[problem.difficulty].label}</li>
                <li>${icon("timer")}時間限制 ${seconds(problem.time_limit_ms)}</li>
                <li>${icon("list-checks")}範例 ${problem.samples.length} 組、隱藏 ${problem.hidden_count} 組</li>
              </ul>
            </header>
            <div class="md">${marked.parse(problem.statement)}</div>
            <section class="samples">
              <h2>範例</h2>
              ${problem.samples.map(sampleBlock).join("")}
            </section>
            ${problem.hints.length ? `
            <section class="hints">
              <h2>提示</h2>
              <ol class="hint-list">${problem.hints.slice(0, revealed).map((h) => `<li>${esc(h)}</li>`).join("")}</ol>
              ${revealed < problem.hints.length
                ? `<button type="button" class="btn btn-ghost" data-act="hint">${icon("lightbulb")}${revealed ? "再看一個提示" : "卡住了？看提示"}（${revealed}/${problem.hints.length}）</button>`
                : ""}
            </section>` : ""}
          </article>

          <aside class="judge" aria-label="評測">
            <div class="judge-inner">
              <div id="engine-line" class="engine-line"></div>
              <div id="drop-slot"></div>
              <div id="result"></div>
            </div>
          </aside>
        </div>
      </div>`;

    app.querySelector(".statement").addEventListener("click", async (e) => {
      const copy = e.target.closest("[data-copy]");
      if (copy) {
        const text = document.getElementById(copy.dataset.copy)?.textContent ?? "";
        try {
          await navigator.clipboard.writeText(text);
          toast("已複製");
        } catch {
          toast("無法存取剪貼簿，請手動選取");
        }
      }
      if (e.target.closest('[data-act="hint"]')) {
        const n = Math.min(store.pref(`hints:${id}`, 0) + 1, problem.hints.length);
        store.setPref(`hints:${id}`, n);
        const hintsEl = app.querySelector(".hints");
        hintsEl.querySelector(".hint-list").innerHTML = problem.hints.slice(0, n).map((h) => `<li>${esc(h)}</li>`).join("");
        const btn = hintsEl.querySelector('[data-act="hint"]');
        if (n >= problem.hints.length) btn.remove();
        else btn.innerHTML = `${icon("lightbulb")}再看一個提示（${n}/${problem.hints.length}）`;
        hintsEl.querySelector(".hint-list li:last-child")?.classList.add("is-new");
      }
    });

    panel = new JudgePanel(problem, siblings);
  }).catch((err) => {
    if (disposed) return;
    app.innerHTML = err.message === "not-found"
      ? `<section class="state-block">${icon("question", "state-icon")}<h1>找不到這一題</h1><p>題目可能已經改名或移除。</p><a class="btn btn-primary" href="#/">${icon("arrow-left")}回題目列表</a></section>`
      : loadErrorView(err);
  });

  return { destroy() { disposed = true; panel?.destroy(); } };
}

/* ------------------------------------------------------------------ judge panel */

class JudgePanel {
  constructor(problem, siblings) {
    this.problem = problem;
    this.siblings = siblings;
    this.cases = buildCases(problem);
    this.file = null; // { name, code, handle, lastModified }
    this.runId = 0;
    this.running = false;
    this.watch = Boolean(store.pref("watch", false));
    this.engineLine = document.getElementById("engine-line");
    this.dropSlot = document.getElementById("drop-slot");
    this.resultEl = document.getElementById("result");
    this.dragDepth = 0;

    this.offStatus = engine.onStatus((state, detail) => this.renderEngine(state, detail));
    this.renderDrop();

    this.overlay = document.createElement("div");
    this.overlay.className = "drop-overlay";
    this.overlay.innerHTML = `<div class="drop-overlay-box">${icon("file-py")}<p>放開即可檢查</p></div>`;
    document.body.appendChild(this.overlay);

    this.onDragEnter = (e) => {
      if (!hasFiles(e)) return;
      this.dragDepth += 1;
      this.overlay.classList.add("is-active");
    };
    this.onDragLeave = (e) => {
      if (!hasFiles(e)) return;
      this.dragDepth = Math.max(0, this.dragDepth - 1);
      if (!this.dragDepth) this.overlay.classList.remove("is-active");
    };
    this.onDrop = (e) => {
      e.preventDefault();
      this.dragDepth = 0;
      this.overlay.classList.remove("is-active");
      this.acceptDrop(e.dataTransfer);
    };
    this.onKey = (e) => {
      if (e.key !== "r" || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target.closest("input, textarea, [contenteditable]")) return;
      if (this.file) { e.preventDefault(); this.recheck(); }
    };
    this.onClick = (e) => {
      const act = e.target.closest("[data-act]")?.dataset.act;
      if (act === "pick") this.pick();
      else if (act === "recheck") this.recheck();
      else if (act === "retry-engine") engine.retry();
      const head = e.target.closest(".case-head");
      if (head) {
        const body = head.nextElementSibling;
        const open = head.getAttribute("aria-expanded") === "true";
        head.setAttribute("aria-expanded", String(!open));
        body.hidden = open;
      }
    };
    this.onChange = (e) => {
      if (e.target.id === "file-input" && e.target.files[0]) {
        this.loadFile(e.target.files[0], null);
        e.target.value = "";
      }
      if (e.target.id === "watch-toggle") {
        this.watch = e.target.checked;
        store.setPref("watch", this.watch);
        this.setupWatch();
      }
    };
    document.addEventListener("dragenter", this.onDragEnter);
    document.addEventListener("dragleave", this.onDragLeave);
    document.addEventListener("drop", this.onDrop);
    document.addEventListener("keydown", this.onKey);
    this.root = document.querySelector(".judge");
    this.root.addEventListener("click", this.onClick);
    this.root.addEventListener("change", this.onChange);
  }

  destroy() {
    this.runId += 1;
    this.offStatus();
    clearInterval(this.watchTimer);
    this.overlay.remove();
    document.removeEventListener("dragenter", this.onDragEnter);
    document.removeEventListener("dragleave", this.onDragLeave);
    document.removeEventListener("drop", this.onDrop);
    document.removeEventListener("keydown", this.onKey);
  }

  renderEngine(state, detail) {
    if (!this.engineLine) return;
    const map = {
      loading: `<span class="load-track" aria-hidden="true"><span></span></span>正在載入 Python 執行環境（第一次約需 5 到 15 秒）`,
      ready: `<span class="live-dot" aria-hidden="true"></span>${esc(detail)} 已就緒，程式只在這台電腦上執行`,
      error: `${icon("warning")}無法載入 Python 執行環境，請檢查網路連線 <button type="button" class="link-btn" data-act="retry-engine">重試</button>`,
      idle: "",
    };
    this.engineLine.dataset.state = state;
    this.engineLine.innerHTML = map[state] ?? "";
  }

  renderDrop() {
    if (!this.file) {
      this.dropSlot.innerHTML = `
        <button type="button" class="dropzone" data-act="pick">
          ${icon("file-py", "dropzone-icon")}
          <strong>把 .py 檔拖到這裡</strong>
          <span>或點一下選擇檔案。也可以直接拖到頁面任何地方。</span>
        </button>
        <input type="file" id="file-input" accept=".py" hidden>`;
      return;
    }
    const f = this.file;
    const lines = f.code.split("\n").length;
    const time = new Date(f.loadedAt).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    this.dropSlot.innerHTML = `
      <div class="filebar">
        ${icon("file-py", "filebar-icon")}
        <div class="filebar-name">
          <strong title="${esc(f.name)}">${esc(f.name)}</strong>
          <span>${lines} 行，讀取於 ${time}</span>
        </div>
        <div class="filebar-actions">
          <button type="button" class="btn btn-primary" data-act="recheck" ${this.running ? "disabled" : ""}>
            ${icon("arrow-clockwise")}${f.handle ? "重新檢查" : "再跑一次"}<kbd>R</kbd>
          </button>
          <button type="button" class="btn btn-ghost" data-act="pick">換檔案</button>
        </div>
        ${f.handle
          ? `<label class="watch"><input type="checkbox" id="watch-toggle" ${this.watch ? "checked" : ""}>存檔後自動重新檢查</label>`
          : `<p class="filebar-note">這個瀏覽器無法重新讀取檔案。修改程式後，請把檔案再拖進來一次。</p>`}
        <input type="file" id="file-input" accept=".py" hidden>
      </div>`;
  }

  async pick() {
    if (supportsHandlePicker()) {
      try {
        const [handle] = await window.showOpenFilePicker({
          types: [{ description: "Python 程式", accept: { "text/x-python": [".py"] } }],
          excludeAcceptAllOption: false,
        });
        await this.loadFile(await handle.getFile(), handle);
      } catch (err) {
        if (err.name !== "AbortError") toast(`無法開啟檔案：${err.message}`);
      }
      return;
    }
    this.dropSlot.querySelector("#file-input")?.click();
  }

  async acceptDrop(dt) {
    const item = [...(dt.items || [])].find((it) => it.kind === "file");
    // getAsFileSystemHandle must be called synchronously inside the drop event
    const handlePromise = item?.getAsFileSystemHandle ? item.getAsFileSystemHandle().catch(() => null) : Promise.resolve(null);
    const file = item ? item.getAsFile() : dt.files[0];
    if (!file) return;
    const handle = await handlePromise;
    await this.loadFile(file, handle?.kind === "file" ? handle : null);
  }

  async loadFile(file, handle) {
    if (!/\.py$/i.test(file.name)) {
      toast("請放入 .py 檔案");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast("檔案太大了，請確認是不是放錯檔案");
      return;
    }
    const code = (await file.text()).replace(/^﻿/, "").replace(/\r\n?/g, "\n");
    this.file = { name: file.name, code, handle, lastModified: file.lastModified, loadedAt: Date.now() };
    this.setupWatch();
    this.run();
  }

  async recheck() {
    if (!this.file || this.running) return;
    if (this.file.handle) {
      try {
        const file = await this.file.handle.getFile();
        await this.loadFile(file, this.file.handle);
        return;
      } catch {
        toast("無法重新讀取檔案，改用上次讀到的內容");
      }
    }
    this.file.loadedAt = Date.now();
    this.run();
  }

  setupWatch() {
    clearInterval(this.watchTimer);
    if (!this.watch || !this.file?.handle) return;
    this.watchTimer = setInterval(async () => {
      if (this.running || !this.file?.handle) return;
      try {
        const f = await this.file.handle.getFile();
        if (f.lastModified !== this.file.lastModified) this.loadFile(f, this.file.handle);
      } catch {
        clearInterval(this.watchTimer);
      }
    }, 1000);
  }

  /* -------------------------------------------------- run */

  async run() {
    const myRun = ++this.runId;
    this.running = true;
    this.renderDrop();
    const { problem, cases } = this;
    const code = this.file.code;
    const results = new Map();

    this.resultEl.innerHTML = `
      <section class="verdict is-running" aria-live="polite">
        <span class="verdict-badge"><span class="pulse-ring"></span></span>
        <div class="verdict-text"><strong id="run-title">${engine.state === "ready" ? "編譯中" : "等待 Python 執行環境"}</strong><span id="run-sub">共 ${cases.length} 組測資</span></div>
      </section>
      <ol class="cases" id="cases">${cases.map((tc) => this.caseRow(tc, { verdict: "WAIT" })).join("")}</ol>`;

    let outcome;
    try {
      outcome = await judge(engine, problem, cases, code, {
      isCancelled: () => myRun !== this.runId,
      onUpdate: (key, r) => {
        if (myRun !== this.runId) return;
        results.set(key, r);
        const tc = cases.find((c) => c.key === key);
        const row = this.resultEl.querySelector(`[data-key="${key}"]`);
        if (row) row.outerHTML = this.caseRow(tc, r);
        const done = [...results.values()].filter((x) => x.verdict !== "RUN").length;
        const title = this.resultEl.querySelector("#run-title");
        if (title) title.textContent = `評測中 ${done} / ${cases.length}`;
      },
      });
    } catch (err) {
      outcome = { verdict: "SE", systemError: `Python 執行環境無法載入：${err.message}`, results: [] };
    }
    if (myRun !== this.runId || !outcome) return;
    this.running = false;
    this.renderDrop();
    if (outcome.verdict === "SE") {
      this.resultEl.innerHTML = `
        <section class="verdict v-se" aria-live="polite">
          <span class="verdict-badge">${icon(VERDICT.SE.icon)}</span>
          <div class="verdict-text"><strong>${VERDICT.SE.label}</strong><span>${esc(outcome.systemError)}</span></div>
        </section>`;
      return;
    }
    this.renderOutcome(outcome);
  }

  caseRow(tc, r) {
    const v = VERDICT[r.verdict];
    const label = tc.hidden ? tc.label : "公開範例";
    const expandable = !["WAIT", "RUN", "SK"].includes(r.verdict);
    return `
      <li class="case" data-key="${tc.key}" data-v="${r.verdict.toLowerCase()}">
        <button type="button" class="case-head" aria-expanded="false" ${expandable ? "" : "disabled"}>
          <span class="case-icon">${r.verdict === "RUN" ? `<span class="pulse-dot"></span>` : icon(v.icon, r.verdict === "AC" ? "ph-fill" : "")}</span>
          <span class="case-name">${tc.name}</span>
          <span class="case-label">${esc(label)}${tc.hidden && tc.kind && tc.kind !== "normal" ? `<em class="kind kind-${tc.kind}">${KIND[tc.kind]}</em>` : ""}</span>
          <span class="case-time">${r.time != null && r.verdict !== "TLE" ? ms(r.time) : ""}</span>
          <span class="case-verdict">${v.label}</span>
        </button>
        <div class="case-body" hidden>${expandable ? this.caseDetail(tc, r) : ""}</div>
      </li>`;
  }

  caseDetail(tc, r) {
    const parts = [];
    if (tc.hidden) {
      parts.push(`<p class="hidden-note">${icon("eye-slash")}隱藏測資不公開資料，只提供描述：<b>${esc(tc.label)}</b></p>`);
    } else {
      parts.push(ioBlock("輸入", tc.input));
    }

    if (r.verdict === "AC") {
      if (!tc.hidden) parts.push(ioBlock("你的輸出", r.stdout));
    } else if (r.verdict === "WA") {
      const { findings, firstDiff } = diagnoseWrongAnswer(tc.output, r.stdout, this.file.code, { reveal: !tc.hidden });
      parts.push(findingsBlock(findings));
      if (tc.hidden && tc.hint) parts.push(hintBlock(tc.hint));
      if (!tc.hidden) parts.push(diffBlock(tc.output, r.stdout, firstDiff, r.truncated));
    } else if (r.verdict === "RE") {
      const ex = explainError(r.error, this.file.code);
      parts.push(errorBlock(ex, r.error, this.file.code));
      if (tc.hidden && tc.hint) parts.push(hintBlock(tc.hint));
      if (!tc.hidden && r.stdout) parts.push(ioBlock("出錯前的輸出", r.stdout));
    } else if (r.verdict === "TLE") {
      const ex = explainTimeout(tc, this.problem.time_limit_ms);
      parts.push(findingsBlock([{ title: ex.title, detail: ex.detail }], ex.tips));
      if (tc.hidden && tc.hint) parts.push(hintBlock(tc.hint));
    }
    if (r.stderr && r.verdict !== "RE") {
      parts.push(`<details class="stderr"><summary>stderr 輸出（不列入評分）</summary><pre>${esc(r.stderr)}</pre></details>`);
    }
    return parts.join("");
  }

  renderOutcome(outcome) {
    const { problem, cases } = this;
    const total = cases.length;
    const passed = outcome.results.filter((r) => r.verdict === "AC").length;
    const slowest = Math.max(0, ...outcome.results.filter((r) => r.verdict === "AC").map((r) => r.time || 0));
    const firstSolve = store.record(problem.id, { verdict: outcome.verdict, passed, total });

    const v = VERDICT[outcome.verdict];
    let sub = `通過 ${passed} / ${total} 組`;
    if (outcome.verdict === "AC") sub += `，最慢 ${ms(slowest)}`;
    if (outcome.verdict === "CE") sub = "程式沒有執行，請先修正語法";
    if (outcome.verdict === "SE") sub = outcome.systemError || "請重新整理頁面再試一次";

    let next = "";
    if (outcome.verdict === "AC") {
      const idx = this.siblings.findIndex((s) => s.id === problem.id);
      const target = this.siblings.slice(idx + 1).find((s) => !store.isSolved(s.id)) || this.siblings.find((s) => !store.isSolved(s.id));
      if (target) next = `<a class="btn btn-primary next-btn" href="#/p/${target.id}">下一題：${DIFF[target.difficulty].label}・${esc(target.title)}${icon("arrow-right")}</a>`;
      else next = `<a class="btn btn-ghost next-btn" href="#/">這個主題全部完成，回題目列表${icon("arrow-right")}</a>`;
    }

    // Diagnosis for the first failing case
    let diagnosis = "";
    const failing = outcome.results.find((r) => !["AC", "SK"].includes(r.verdict));
    let errorLine = null;
    if (outcome.verdict === "CE") {
      const ex = explainError(outcome.compileError, this.file.code);
      errorLine = outcome.compileError.line;
      diagnosis = `<section class="diagnosis"><h3>${icon("stethoscope")}問題出在哪</h3>${errorBlock(ex, outcome.compileError, this.file.code)}</section>`;
    } else if (failing) {
      const tc = cases.find((c) => c.key === failing.key);
      if (failing.verdict === "RE") errorLine = failing.error?.line ?? null;
      diagnosis = `
        <section class="diagnosis">
          <h3>${icon("stethoscope")}從${tc.name} 開始出錯${tc.hidden ? `：${esc(tc.label)}` : ""}</h3>
          ${this.caseDetail(tc, failing)}
        </section>`;
    }

    this.resultEl.innerHTML = `
      <section class="verdict v-${outcome.verdict.toLowerCase()} ${firstSolve ? "is-first" : ""}" aria-live="polite">
        <span class="verdict-badge">${icon(v.icon, outcome.verdict === "AC" ? "ph-fill" : "")}</span>
        <div class="verdict-text">
          <strong>${outcome.verdict === "AC" ? (firstSolve ? "第一次就全部通過了" : "全部通過") : v.label}</strong>
          <span>${sub}</span>
        </div>
        ${next}
      </section>
      ${diagnosis}
      ${outcome.results.length ? `<ol class="cases is-revealing">${cases.map((tc, i) => this.caseRow(tc, outcome.results.find((r) => r.key === tc.key) || { verdict: "SK" }).replace('<li class="case"', `<li style="--i:${i}" class="case`)).join("")}</ol>` : ""}
      ${codeView(this.file, errorLine, outcome)}`;

    if (errorLine) this.resultEl.querySelector(".code-line.is-error")?.scrollIntoView({ block: "nearest" });
  }
}

function hasFiles(e) {
  return [...(e.dataTransfer?.types || [])].includes("Files");
}

function supportsHandlePicker() {
  return typeof window.showOpenFilePicker === "function" && window.isSecureContext;
}

/* ------------------------------------------------------------------ result blocks */

function ioBlock(title, text) {
  const t = String(text ?? "");
  const lines = t.split("\n");
  const shown = lines.length > MAX_SHOW_LINES ? lines.slice(0, MAX_SHOW_LINES).join("\n") + `\n…（還有 ${lines.length - MAX_SHOW_LINES} 行）` : t;
  return `<figure class="io"><figcaption>${title}</figcaption><pre>${t ? esc(shown) : '<span class="muted">（沒有輸出）</span>'}</pre></figure>`;
}

function findingsBlock(findings, tips = []) {
  return `
    <ul class="findings">
      ${findings.map((f) => `<li><b>${esc(f.title)}</b><span>${esc(f.detail)}</span></li>`).join("")}
    </ul>
    ${tips.length ? `<ul class="tips">${tips.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}`;
}

function hintBlock(hint) {
  return `<p class="test-hint">${icon("lightbulb")}<span>${esc(hint)}</span></p>`;
}

function errorBlock(ex, error, code) {
  const line = error?.line;
  const srcLines = code.split("\n");
  let excerpt = "";
  if (line && line <= srcLines.length) {
    const hl = highlightPython(code);
    const from = Math.max(1, line - 2);
    const to = Math.min(srcLines.length, line + 1);
    const rows = [];
    for (let n = from; n <= to; n++) {
      rows.push(`<div class="code-line ${n === line ? "is-error" : ""}"><span class="ln">${n}</span><span class="src">${hl[n - 1] || " "}</span></div>`);
      if (n === line && error.col && ["SyntaxError", "IndentationError", "TabError"].includes(error.type)) {
        rows.push(`<div class="code-line caret"><span class="ln"></span><span class="src">${" ".repeat(Math.max(0, error.col - 1))}^</span></div>`);
      }
    }
    excerpt = `<div class="code excerpt">${rows.join("")}</div>`;
  }
  return `
    <div class="error-explain">
      <p class="error-title"><b>${esc(ex.title)}</b>${line ? `<span>第 ${line} 行</span>` : ""}<code>${esc(ex.type)}${ex.message ? `: ${esc(ex.message)}` : ""}</code></p>
      ${ex.detail ? `<p>${esc(ex.detail)}</p>` : ""}
      ${excerpt}
      ${ex.tips.length ? `<ul class="tips">${ex.tips.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
      ${error?.traceback ? `<details class="traceback"><summary>完整錯誤訊息</summary><pre>${esc(error.traceback)}</pre></details>` : ""}
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
      rows.push(`<div class="diff-line ${bad ? "is-diff" : ""} ${i === firstDiff ? "is-first" : ""}"><span class="ln">${i + 1}</span><span class="src">${arr[i] === undefined ? '<span class="muted">（沒有這一行）</span>' : esc(arr[i]) || " "}</span></div>`);
    }
    return rows.join("");
  };
  const more = Math.max(eL.length, oL.length) > n ? `<p class="muted small">只顯示前 ${MAX_SHOW_LINES} 行。</p>` : "";
  return `
    <div class="diff">
      <figure><figcaption>預期輸出</figcaption><div class="code">${col(eL, oL)}</div></figure>
      <figure><figcaption>你的輸出${truncated ? "（太長，已截斷）" : ""}</figcaption><div class="code">${col(oL, eL)}</div></figure>
    </div>${more}`;
}

function codeView(file, errorLine, outcome) {
  const hl = highlightPython(file.code);
  const open = outcome.verdict === "CE" || outcome.verdict === "RE";
  return `
    <details class="codeview" ${open ? "open" : ""}>
      <summary>${icon("code")}${esc(file.name)}<span class="muted">${hl.length} 行</span></summary>
      <div class="code">${hl.map((h, i) => `<div class="code-line ${i + 1 === errorLine ? "is-error" : ""}"><span class="ln">${i + 1}</span><span class="src">${h || " "}</span></div>`).join("")}</div>
    </details>`;
}

/* ------------------------------------------------------------------ router */

// Never let the browser navigate away when a file is dropped outside a drop zone.
window.addEventListener("dragover", (e) => { if (hasFiles(e)) e.preventDefault(); });
window.addEventListener("drop", (e) => {
  if (!hasFiles(e)) return;
  e.preventDefault();
  if (!location.hash.startsWith("#/p/")) toast("請先選一題，再把檔案拖進題目頁");
});

function route() {
  view?.destroy();
  const hash = location.hash.slice(1) || "/";
  const m = hash.match(/^\/p\/([\w-]+)\/?$/);
  view = m ? renderProblem(m[1]) : renderHome();
  window.scrollTo(0, 0);
  updateHeader();
}

window.addEventListener("hashchange", route);
route();
