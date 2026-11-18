/* Tiny Python highlighter: returns one HTML string per source line.
 * Full-width punctuation outside strings/comments is marked as an error. */

const KEYWORDS = new Set(("False None True and as assert async await break class continue def del elif else " +
  "except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case").split(" "));
const BUILTINS = new Set(("print input int str float list dict set tuple len range map sum min max abs sorted " +
  "enumerate zip open round bool any all reversed isinstance type chr ord divmod pow iter next filter").split(" "));

const TOKEN = new RegExp([
  /(#[^\n]*)/.source,                                                     // 1 comment
  /([rRbBuUfF]{0,2}(?:"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)))/.source, // 2 triple string
  /([rRbBuUfF]{0,2}(?:"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?))/.source, // 3 string
  /(\b\d[\d_]*(?:\.\d*)?(?:[eE][-+]?\d+)?j?\b|\.\d+\b)/.source,          // 4 number
  /([，（）：；＝　“”‘’［］＋－＊])/.source,                               // 5 full-width punctuation
  /([A-Za-z_À-￿][\wÀ-￿]*)/.source,                    // 6 identifier
  /([\s\S])/.source,                                                      // 7 anything else
].join("|"), "g");

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function highlightPython(code) {
  const lines = [""];
  let prevWord = "";
  const push = (text, cls) => {
    text.split("\n").forEach((part, i) => {
      if (i > 0) lines.push("");
      if (part) lines[lines.length - 1] += cls ? `<span class="tk-${cls}">${esc(part)}</span>` : esc(part);
    });
  };
  for (const m of code.matchAll(TOKEN)) {
    const [text, comment, triple, str, num, wide, ident] = m;
    if (comment) push(text, "com");
    else if (triple || str) push(text, "str");
    else if (num) push(text, "num");
    else if (wide) push(text, "bad");
    else if (ident) {
      if (KEYWORDS.has(text)) push(text, "kw");
      else if (prevWord === "def" || prevWord === "class") push(text, "fn");
      else if (BUILTINS.has(text)) push(text, "bi");
      else push(text, null);
      prevWord = text;
      continue;
    } else push(text, null);
    if (!/\s/.test(text)) prevWord = "";
  }
  return lines;
}
