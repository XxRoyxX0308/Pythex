/* Lightweight Python editor: a transparent <textarea> over a highlighted <pre>.
 * No dependencies. Edits go through insertText so the browser's undo stack keeps working. */

import { highlightPython } from "./highlight.js";

const TAB = 4;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export class CodeEditor {
  constructor(host, { value = "", label = "", help = "", onChange, onSubmit } = {}) {
    this.onChange = onChange;
    this.onSubmit = onSubmit;
    this.errorLine = null;
    this.escapeTab = false;
    const helpId = `ed-help-${Math.random().toString(36).slice(2, 8)}`;
    host.innerHTML = `
      <div class="editor">
        <div class="ed-gutter" aria-hidden="true"><div class="ed-nums"></div></div>
        <div class="ed-body">
          <div class="ed-hl" aria-hidden="true"></div>
          <textarea class="ed-input" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off"
            wrap="off" aria-label="${esc(label)}" aria-describedby="${helpId}"></textarea>
        </div>
      </div>
      <p id="${helpId}" class="ed-help">${esc(help)}</p>`;
    this.root = host.querySelector(".editor");
    this.ta = host.querySelector(".ed-input");
    this.hl = host.querySelector(".ed-hl");
    this.nums = host.querySelector(".ed-nums");
    this.ta.value = value;

    this.ta.addEventListener("input", () => {
      this.errorLine = null;
      this.render();
      this.onChange?.(this.ta.value);
    });
    this.ta.addEventListener("scroll", () => this.syncScroll());
    this.ta.addEventListener("keydown", (e) => this.onKey(e));
    this.render();
  }

  get value() {
    return this.ta.value;
  }

  setValue(v) {
    this.ta.value = v;
    this.errorLine = null;
    this.render();
    this.onChange?.(v);
  }

  focus() {
    this.ta.focus();
  }

  setErrorLine(n) {
    this.errorLine = n || null;
    this.render();
  }

  goToLine(n) {
    const lines = this.ta.value.split("\n");
    const line = Math.min(Math.max(1, n), lines.length);
    let pos = 0;
    for (let i = 0; i < line - 1; i++) pos += lines[i].length + 1;
    this.ta.focus();
    this.ta.setSelectionRange(pos, pos + lines[line - 1].length);
    const lh = parseFloat(getComputedStyle(this.ta).lineHeight) || 20;
    this.ta.scrollTop = Math.max(0, (line - 1) * lh - this.ta.clientHeight / 3);
    this.syncScroll();
  }

  render() {
    const lines = highlightPython(this.ta.value);
    this.hl.innerHTML = lines
      .map((h, i) => `<div class="ed-line${i + 1 === this.errorLine ? " is-error" : ""}">${h || " "}</div>`)
      .join("");
    this.nums.innerHTML = lines
      .map((_, i) => `<div${i + 1 === this.errorLine ? ' class="is-error"' : ""}>${i + 1}</div>`)
      .join("");
    this.root.style.setProperty("--digits", String(Math.max(2, String(lines.length).length)));
    this.syncScroll();
  }

  syncScroll() {
    const { scrollTop: y, scrollLeft: x } = this.ta;
    this.hl.style.transform = `translate(${-x}px, ${-y}px)`;
    this.nums.style.transform = `translateY(${-y}px)`;
  }

  /* -------------------------------------------------- editing helpers */

  insert(text) {
    this.ta.focus();
    const ok = text === "" ? document.execCommand("delete") : document.execCommand("insertText", false, text);
    if (!ok) {
      const { selectionStart: s, selectionEnd: e } = this.ta;
      this.ta.setRangeText(text, s, e, "end");
      this.ta.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  /** Range covering every line touched by the selection. */
  block() {
    const v = this.ta.value;
    const s = this.ta.selectionStart;
    let e = this.ta.selectionEnd;
    if (e > s && v[e - 1] === "\n") e -= 1;
    const start = v.lastIndexOf("\n", s - 1) + 1;
    let end = v.indexOf("\n", e);
    if (end === -1) end = v.length;
    return { start, end, text: v.slice(start, end) };
  }

  replaceBlock(fn) {
    const { start, end, text } = this.block();
    const next = fn(text.split("\n")).join("\n");
    if (next === text) return;
    this.ta.setSelectionRange(start, end);
    this.insert(next);
    this.ta.setSelectionRange(start, start + next.length);
  }

  onKey(e) {
    if (e.isComposing || e.keyCode === 229) return; // IME (e.g. Chinese input) is composing
    const mod = e.ctrlKey || e.metaKey;
    const ta = this.ta;

    if (mod && e.key === "Enter") {
      e.preventDefault();
      this.onSubmit?.();
      return;
    }
    if (e.key === "Escape") {
      this.escapeTab = true;
      return;
    }
    if (e.key === "Tab") {
      if (this.escapeTab) { this.escapeTab = false; return; } // let focus move on
      e.preventDefault();
      const multi = ta.value.slice(ta.selectionStart, ta.selectionEnd).includes("\n");
      if (e.shiftKey) {
        this.replaceBlock((lines) => lines.map((l) => l.replace(new RegExp(`^ {1,${TAB}}`), "")));
      } else if (multi) {
        this.replaceBlock((lines) => lines.map((l) => (l ? " ".repeat(TAB) + l : l)));
      } else {
        const lineStart = ta.value.lastIndexOf("\n", ta.selectionStart - 1) + 1;
        const col = ta.selectionStart - lineStart;
        this.insert(" ".repeat(TAB - (col % TAB)));
      }
      return;
    }
    this.escapeTab = false;

    if (mod && e.key === "/") {
      e.preventDefault();
      this.replaceBlock((lines) => {
        const filled = lines.filter((l) => l.trim());
        const allCommented = filled.length && filled.every((l) => /^\s*#/.test(l));
        if (allCommented) return lines.map((l) => l.replace(/^(\s*)# ?/, "$1"));
        const indent = Math.min(...filled.map((l) => l.match(/^ */)[0].length));
        return lines.map((l) => (l.trim() ? `${l.slice(0, indent)}# ${l.slice(indent)}` : l));
      });
      return;
    }

    if (e.key === "Enter" && !mod && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      const s = ta.selectionStart;
      const lineStart = ta.value.lastIndexOf("\n", s - 1) + 1;
      const before = ta.value.slice(lineStart, s);
      let indent = before.match(/^ */)[0];
      if (/:\s*(#.*)?$/.test(before)) indent += " ".repeat(TAB);
      this.insert(`\n${indent}`);
      return;
    }

    if (e.key === "Backspace" && !mod && ta.selectionStart === ta.selectionEnd) {
      const s = ta.selectionStart;
      const lineStart = ta.value.lastIndexOf("\n", s - 1) + 1;
      const before = ta.value.slice(lineStart, s);
      if (before.length && /^ +$/.test(before)) {
        e.preventDefault();
        const remove = ((before.length - 1) % TAB) + 1;
        ta.setSelectionRange(s - remove, s);
        this.insert("");
      }
    }
  }
}
