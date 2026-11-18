/* Output comparison + plain-language explanations for errors and wrong answers. */

import { lang } from "./i18n.js";

const MSG = {
  "zh-Hant": {
    "SyntaxError": "語法錯誤",
    "syntax.detail": "Python 看不懂這一行，程式完全沒有開始執行。",
    "syntax.fullwidth": "第 {line} 行有全形符號「{ch}」，請改成半形「{fix}」。中文輸入法常常不小心打出全形標點。",
    "syntax.badchar": "程式裡有 Python 不認得的字元，常見是中文輸入法打出的全形標點或全形空白。",
    "syntax.colon": "if、for、while、def、else 這些敘述的結尾要加冒號「:」。",
    "syntax.paren": "括號沒有成對：數一數 ( [ { 和 ) ] } 是否一樣多。錯誤有時會出現在真正出錯的下一行。",
    "syntax.string": "字串的引號沒有關起來。",
    "syntax.comma": "這裡可能少了一個逗號。",
    "syntax.assign": "條件判斷要用 ==，= 是指定數值。",
    "syntax.generic": "常見原因：少了冒號、括號沒成對、關鍵字拼錯，或把 = 和 == 搞混。",
    "IndentationError": "縮排錯誤",
    "indent.detail": "Python 用縮排來決定哪些程式碼屬於同一個區塊。",
    "indent.expected": "冒號「:」後面那一行要往內縮排（通常是 4 個空白）。",
    "indent.unexpected": "這一行不應該縮排，或縮排比上一行多了。",
    "indent.unindent": "這一行退回的縮排量，跟前面任何一層都對不起來。",
    "indent.tabs": "同一個檔案混用了 Tab 和空白，請統一用 4 個空白。",
    "NameError": "名稱未定義",
    "name.detail": "Python 找不到叫做 {name} 的變數或函式。",
    "name.detailAny": "使用了還沒定義的名稱。",
    "name.suggest": "你是不是想打 {name}？Python 會分大小寫。",
    "name.check": "檢查拼字，以及是不是在指定數值之前就先使用了它。",
    "UnboundLocalError": "區域變數還沒有值",
    "unbound.detail": "函式裡修改了外面的變數，Python 會把它當成新的區域變數。",
    "unbound.tip": "把變數當參數傳進函式，或用 return 回傳結果，不要在函式裡直接改外面的變數。",
    "TypeError": "型別錯誤",
    "type.detail": "對不適合的資料型別做了運算。",
    "type.str": "input() 讀進來的是字串。數字要先用 int() 或 float() 轉換；要把數字接到字串後面則用 str() 或 f-string。",
    "type.compare": "把字串和數字拿來比較了。讀進來的資料記得先用 int() 轉換。",
    "type.iterInt": "不能直接用 for 走過一個整數，要寫 for i in range(n)。",
    "type.subscript": "對不是串列或字串的東西用了 [ ]。檢查這個變數現在的型別。",
    "type.callable": "把變數當成函式呼叫了。可能是變數名稱蓋掉了內建函式，例如把變數取名為 sum、max、list、input。",
    "type.args": "呼叫函式時給的參數數量，跟定義時不一樣。",
    "ValueError": "數值錯誤",
    "value.empty": "int() 讀到一個空字串。",
    "value.emptyTip": "可能多讀了一行空行，或輸入格式跟你想的不一樣。看一下範例輸入每一行實際有什麼。",
    "value.spaces": "int() 收到了一整行包含空白的文字。",
    "value.spacesTip": "同一行有好幾個數字時，要先切開：list(map(int, input().split()))。",
    "value.int": "int() 只能轉換整數格式的字串。",
    "value.intTip": "檢查這次讀到的是不是你以為的那一行，或它是不是小數（要用 float()）。",
    "value.unpack": "a, b = ... 左右兩邊的數量對不起來。",
    "value.unpackTip": "這一行的資料個數跟你預期的不同。確認輸入格式：哪些資料在同一行、哪些分在不同行。",
    "value.other": "傳入的數值不合法。",
    "EOFError": "讀取超過輸入結尾",
    "eof.detail": "呼叫 input() 的次數比輸入的行數還多。",
    "eof.tip1": "同一行的多個數字只要用一次 input().split() 讀完，不要分開讀。",
    "eof.tip2": "檢查讀取迴圈的次數是否正確，例如 range(n) 而不是 range(n + 1)。",
    "IndexError": "索引超出範圍",
    "index.detail": "長度為 n 的串列，合法的索引只有 0 到 n - 1。",
    "index.tip1": "常見原因：range 多跑了一次、題目的編號從 1 開始但串列從 0 開始，或在空串列上取 [0]。",
    "index.tip2": "極端情況（例如只有 1 筆資料或 0 筆資料）特別容易出現這個錯誤。",
    "KeyError": "字典裡沒有這個鍵",
    "key.detail": "字典中找不到 {key}。",
    "key.tip1": "讀取前先確認 key in d，或用 d.get(key, 預設值)。",
    "key.tip2": "檢查鍵的型別是否一致：'3' 和 3 是不同的鍵。",
    "ZeroDivisionError": "除以零",
    "zero.detail": "程式在某個情況下除以 0 或對 0 取餘數。",
    "zero.tip": "想想看極端情況：資料筆數為 0、某個值剛好是 0 的時候會怎麼樣。",
    "RecursionError": "遞迴太深",
    "RuntimeCrash": "執行環境崩潰",
    "recursion.detail": "函式呼叫自己的層數太多，通常是遞迴沒有正確的終止條件，或資料太大。",
    "recursion.tip": "確認遞迴一定會碰到終止條件。資料量大時，改用迴圈會比較安全。",
    "AttributeError": "沒有這個屬性或方法",
    "attr.split": "split() 是字串的方法。這個變數已經是串列了。",
    "attr.int": "整數沒有這個方法。檢查這個變數是不是被轉成了 int。",
    "attr.none": "這個變數的值是 None，常見於把 list.sort() 的回傳值存起來（sort 會回傳 None，要用 sorted()）。",
    "attr.other": "檢查這個變數的型別，以及方法名稱的拼字。",
    "ModuleNotFoundError": "找不到模組",
    "module.detail": "這個平台只支援 Python 標準函式庫。",
    "module.tip": "請不要使用 numpy 等第三方套件，題目都能只用內建功能完成。",
    "MemoryError": "記憶體不足",
    "memory.detail": "程式建立了太大的資料。",
    "memory.tip": "檢查是不是不小心在迴圈裡不斷累加串列，或建立了巨大的表格。",
    "OverflowError": "數值溢位",
    "overflow.detail": "浮點數太大了。整數在 Python 中不會溢位，可以改用整數運算（例如 //）。",
    "SystemExit": "程式以錯誤代碼結束",
    "exit.detail": "exit({code}) 會被視為執行錯誤。",
    "exit.tip": "正常結束時不需要呼叫 exit()，或改成 exit(0)。",

    "wa.empty": "沒有任何輸出",
    "wa.emptyD": "程式沒有印出任何東西。記得用 print() 輸出答案；如果把程式寫在函式裡，確認最後有呼叫它。",
    "wa.prompt": "input() 的提示文字也被輸出了",
    "wa.promptD": "第 {line} 行的 input(\"...\") 會把提示文字印出來，評測會把它當成答案的一部分。請改成不帶文字的 input()。",
    "wa.oneLine": "答案應該印在同一行",
    "wa.oneLineD": "內容正確，但題目要求在同一行用空白隔開。可以用 print(a, b) 或 print(*串列)。",
    "wa.manyLines": "每個答案要各自一行",
    "wa.manyLinesD": "內容正確，但題目要求分成多行輸出。",
    "wa.space": "空白或換行的格式不對",
    "wa.spaceD": "所有數值都正確，只有空白或換行的位置不同。檢查是否多了空白，或 print 的 sep / end 參數。",
    "wa.case": "大小寫不同",
    "wa.caseD": "預期是「{e}」，你輸出的是「{o}」。評測會區分大小寫。",
    "wa.caseHidden": "內容正確，但大小寫和題目要求不同。評測會區分大小寫。",
    "wa.float": "整數被印成了小數",
    "wa.floatD": "例如答案是 5，你輸出 5.0。在 Python 中 / 一定得到小數，整數除法請用 //，或用 int() 轉換。",
    "wa.decimals": "小數位數不同",
    "wa.decimalsD": "數值很接近，但小數位數跟題目要求不同。可以用 f\"{x:.2f}\" 控制位數。",
    "wa.extra": "多印了其他內容",
    "wa.extraD": "正確答案有出現在你的輸出裡，但多了其他行。可能是除錯用的 print 忘了刪掉。",
    "wa.short": "輸出不完整",
    "wa.shortD": "你只輸出了 {o} 行，預期有 {e} 行。可能是迴圈提早結束，或少了某些情況的 print。",
    "wa.lines": "行數不同",
    "wa.linesD": "預期輸出 {e} 行，你輸出了 {o} 行。",
    "wa.order": "內容正確但順序不同",
    "wa.orderD": "每一行都有出現，只是順序不一樣。再讀一次題目的排序規則（例如平手時怎麼排）。",
    "wa.offByOne": "答案差了 1",
    "wa.offByOneD": "很可能是「差一錯誤」：檢查 range 的起點與終點、計數從 0 還是 1 開始，以及 < 和 <= 的使用。",
    "wa.firstDiff": "第 {n} 行開始不同",
    "wa.firstDiffD": "預期「{e}」，你輸出「{o}」。",
    "wa.generic": "答案不正確",
    "wa.genericD": "比對下方的預期輸出與你的輸出，找出第一個不同的地方。",
    "wa.genericHidden": "這組測資的答案不同。看看測資的描述，想想你的程式在這種情況下會怎麼跑。",

    "tle.title": "超過時間限制",
    "tle.detail": "這組測資的時間限制是 {s} 秒。",
    "tle.stress": "這是資料量最大的測資。如果你的做法對每個元素又掃了一遍整份資料（雙層迴圈），就會太慢。",
    "tle.loop": "檢查有沒有無限迴圈：while 的條件是否一定會變成 False？迴圈變數有沒有更新？",
    "tle.slow": "在迴圈中重複做昂貴的事（例如 list.count、in 串列、sum 整個串列）也會讓程式變慢。",
    "tle.input": "如果你的程式在等待更多輸入（例如用了 while True: input()），讀到結尾時會出錯而不是超時；請確認讀取次數。",
  },

  en: {
    "SyntaxError": "Syntax error",
    "syntax.detail": "Python cannot parse this line, so the program never started.",
    "syntax.fullwidth": "Line {line} contains the full-width character \"{ch}\". Replace it with the ASCII \"{fix}\". Chinese input methods often produce full-width punctuation.",
    "syntax.badchar": "The code contains a character Python does not accept, often full-width punctuation or a full-width space from a Chinese input method.",
    "syntax.colon": "Statements like if, for, while, def and else must end with a colon \":\".",
    "syntax.paren": "Brackets do not match: count ( [ { against ) ] }. The error is sometimes reported on the line after the real mistake.",
    "syntax.string": "A string is missing its closing quote.",
    "syntax.comma": "A comma may be missing here.",
    "syntax.assign": "Use == to compare. A single = assigns a value.",
    "syntax.generic": "Common causes: a missing colon, unmatched brackets, a misspelled keyword, or = used instead of ==.",
    "IndentationError": "Indentation error",
    "indent.detail": "Python uses indentation to decide which lines belong to the same block.",
    "indent.expected": "The line after a colon \":\" must be indented (usually 4 spaces).",
    "indent.unexpected": "This line should not be indented, or it is indented more than the line above.",
    "indent.unindent": "This line's indentation does not match any outer level.",
    "indent.tabs": "The file mixes tabs and spaces. Use 4 spaces everywhere.",
    "NameError": "Name not defined",
    "name.detail": "Python cannot find a variable or function called {name}.",
    "name.detailAny": "A name is used before it is defined.",
    "name.suggest": "Did you mean {name}? Python is case-sensitive.",
    "name.check": "Check the spelling, and make sure the name is assigned before it is used.",
    "UnboundLocalError": "Local variable has no value",
    "unbound.detail": "A function changes a variable from outside, so Python treats it as a new local variable.",
    "unbound.tip": "Pass the value in as a parameter and return the result, instead of changing an outer variable inside the function.",
    "TypeError": "Type error",
    "type.detail": "An operation was used on the wrong type of data.",
    "type.str": "input() always returns a string. Convert numbers with int() or float(); to join a number to a string, use str() or an f-string.",
    "type.compare": "A string is being compared with a number. Convert the input with int() first.",
    "type.iterInt": "You cannot loop over an integer directly. Write for i in range(n).",
    "type.subscript": "[ ] was used on something that is not a list or string. Check the variable's type at this point.",
    "type.callable": "A variable is being called like a function. A variable may be hiding a built-in, for example one named sum, max, list or input.",
    "type.args": "The function is called with a different number of arguments than it was defined with.",
    "ValueError": "Value error",
    "value.empty": "int() received an empty string.",
    "value.emptyTip": "You may be reading an extra blank line, or the input format differs from what you expect. Look at what each sample input line actually contains.",
    "value.spaces": "int() received a whole line containing spaces.",
    "value.spacesTip": "When a line holds several numbers, split it first: list(map(int, input().split())).",
    "value.int": "int() only converts strings that look like whole numbers.",
    "value.intTip": "Check that you are reading the line you think you are, and whether it is a decimal (use float()).",
    "value.unpack": "The two sides of a, b = ... do not have the same number of values.",
    "value.unpackTip": "This line holds a different number of values than expected. Check which values share a line and which are on separate lines.",
    "value.other": "An invalid value was passed.",
    "EOFError": "Read past the end of input",
    "eof.detail": "input() was called more times than there are input lines.",
    "eof.tip1": "Read several numbers on one line with a single input().split(), not one input() each.",
    "eof.tip2": "Check how many times your reading loop runs, for example range(n) rather than range(n + 1).",
    "IndexError": "Index out of range",
    "index.detail": "A list of length n only has indexes 0 to n - 1.",
    "index.tip1": "Common causes: a range that runs one step too far, problem numbering that starts at 1 while lists start at 0, or [0] on an empty list.",
    "index.tip2": "Edge cases such as a single item or no items are especially likely to trigger this.",
    "KeyError": "Key not in dict",
    "key.detail": "The dict has no key {key}.",
    "key.tip1": "Check key in d first, or use d.get(key, default).",
    "key.tip2": "Make sure key types match: '3' and 3 are different keys.",
    "ZeroDivisionError": "Division by zero",
    "zero.detail": "The program divides by 0, or takes a remainder by 0, in some case.",
    "zero.tip": "Think about edge cases: what happens when there are no items, or when a value is exactly 0?",
    "RecursionError": "Recursion too deep",
    "RuntimeCrash": "Runtime crashed",
    "recursion.detail": "A function calls itself too many levels deep, usually because the base case is never reached or the data is very large.",
    "recursion.tip": "Make sure the recursion always reaches a base case. For large inputs a loop is safer.",
    "AttributeError": "No such attribute or method",
    "attr.split": "split() is a string method. This variable is already a list.",
    "attr.int": "Integers do not have this method. Check whether the variable was converted to int.",
    "attr.none": "This variable is None. A common cause is saving the result of list.sort(), which returns None; use sorted() instead.",
    "attr.other": "Check the variable's type and the spelling of the method name.",
    "ModuleNotFoundError": "Module not found",
    "module.detail": "Only the Python standard library is available here.",
    "module.tip": "Please do not use third-party packages such as numpy. Every problem can be solved with built-ins.",
    "MemoryError": "Out of memory",
    "memory.detail": "The program built data that is too large.",
    "memory.tip": "Check for a list that keeps growing inside a loop, or a huge table.",
    "OverflowError": "Numeric overflow",
    "overflow.detail": "A float became too large. Python integers never overflow, so integer arithmetic (such as //) may help.",
    "SystemExit": "Exited with an error code",
    "exit.detail": "exit({code}) counts as a runtime error.",
    "exit.tip": "You do not need exit() to finish normally. Use exit(0) if you must.",

    "wa.empty": "No output",
    "wa.emptyD": "The program printed nothing. Use print() for the answer, and if your code is inside a function, make sure you call it.",
    "wa.prompt": "The input() prompt was printed too",
    "wa.promptD": "input(\"...\") on line {line} prints its prompt text, and the judge counts it as part of your answer. Use input() with no text.",
    "wa.oneLine": "Print the answer on one line",
    "wa.oneLineD": "The values are right, but they belong on one line separated by spaces. Try print(a, b) or print(*items).",
    "wa.manyLines": "Print each answer on its own line",
    "wa.manyLinesD": "The values are right, but the problem expects them on separate lines.",
    "wa.space": "Spacing or line breaks are off",
    "wa.spaceD": "Every value is correct; only spaces or line breaks differ. Look for extra spaces, or check print's sep and end arguments.",
    "wa.case": "Upper or lower case differs",
    "wa.caseD": "Expected \"{e}\" but you printed \"{o}\". The judge is case-sensitive.",
    "wa.caseHidden": "The content is right but the letter case differs. The judge is case-sensitive.",
    "wa.float": "A whole number was printed as a decimal",
    "wa.floatD": "For example, the answer is 5 but you printed 5.0. In Python, / always produces a float. Use // for integer division, or convert with int().",
    "wa.decimals": "Different number of decimal places",
    "wa.decimalsD": "The values are close, but the decimal places differ from what the problem asks. Use f\"{x:.2f}\" to control them.",
    "wa.extra": "Extra output",
    "wa.extraD": "The correct answer appears in your output, along with extra lines. A debugging print may have been left in.",
    "wa.short": "Output is incomplete",
    "wa.shortD": "You printed {o} lines but {e} were expected. A loop may end too early, or some case is missing a print.",
    "wa.lines": "Wrong number of lines",
    "wa.linesD": "Expected {e} lines, you printed {o}.",
    "wa.order": "Right lines, wrong order",
    "wa.orderD": "Every line is there, just in a different order. Re-read the ordering rules, for example how ties are sorted.",
    "wa.offByOne": "Off by one",
    "wa.offByOneD": "Likely an off-by-one mistake: check where your range starts and stops, whether counting starts at 0 or 1, and < versus <=.",
    "wa.firstDiff": "Line {n} is the first difference",
    "wa.firstDiffD": "Expected \"{e}\", you printed \"{o}\".",
    "wa.generic": "Wrong answer",
    "wa.genericD": "Compare the expected output below with yours and find the first difference.",
    "wa.genericHidden": "This test's answer differs. Read what the test covers and trace how your code behaves in that situation.",

    "tle.title": "Time limit exceeded",
    "tle.detail": "The time limit for this test is {s} s.",
    "tle.stress": "This is the largest test. If your approach scans all the data again for every element (nested loops), it will be too slow.",
    "tle.loop": "Look for an infinite loop: will the while condition ever become False? Is the loop variable updated?",
    "tle.slow": "Repeating expensive work inside a loop, such as list.count, `in` on a list or sum over a whole list, also slows things down.",
    "tle.input": "Reading past the end of input raises an error rather than timing out, so check how many times you read.",
  },
};

function m(key, vars = {}) {
  const s = MSG[lang()][key] ?? MSG["zh-Hant"][key] ?? key;
  return s.replace(/\{(\w+)\}/g, (all, k) => (k in vars ? vars[k] : all));
}

/* ------------------------------------------------------------------ comparison */

export function normalize(text) {
  const lines = String(text ?? "").replace(/\r\n?/g, "\n").split("\n").map((l) => l.replace(/\s+$/, ""));
  while (lines.length && lines[lines.length - 1] === "") lines.pop();
  return lines.join("\n");
}

const toLines = (s) => (s === "" ? [] : s.split("\n"));
const toTokens = (s) => s.split(/\s+/).filter(Boolean);
const isInt = (t) => /^[-+]?\d+$/.test(t);
const isNum = (t) => /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(t);

export function outputsMatch(expected, got, mode = "lines") {
  const exp = normalize(expected);
  const out = normalize(got);
  if (mode === "lines") return exp === out;
  const a = toTokens(exp);
  const b = toTokens(out);
  if (mode === "tokens") return a.length === b.length && a.every((tk, i) => tk === b[i]);
  const eps = parseFloat(mode.split(":")[1]);
  if (a.length !== b.length) return false;
  return a.every((tk, i) => {
    if (tk === b[i]) return true;
    const x = Number(tk);
    const y = Number(b[i]);
    if (!isNum(tk) || !isNum(b[i]) || !Number.isFinite(x) || !Number.isFinite(y)) return false;
    return Math.abs(x - y) <= eps * Math.max(1, Math.abs(x));
  });
}

/* ------------------------------------------------------------------ static checks */

export const FULLWIDTH = {
  "，": ",", "（": "(", "）": ")", "：": ":", "；": ";", "＝": "=", "　": " ",
  "“": '"', "”": '"', "‘": "'", "’": "'", "［": "[", "］": "]", "＋": "+", "－": "-", "＊": "*",
};

/** Full-width punctuation outside strings and comments. */
export function findFullWidth(code) {
  const hits = [];
  code.split("\n").forEach((line, i) => {
    let quote = null;
    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (quote) {
        if (ch === "\\") j++;
        else if (ch === quote) quote = null;
        continue;
      }
      if (ch === "#") break;
      if (ch === '"' || ch === "'") { quote = ch; continue; }
      if (FULLWIDTH[ch]) hits.push({ line: i + 1, col: j + 1, ch, fix: FULLWIDTH[ch] });
    }
  });
  return hits;
}

const PROMPT_RE = /\binput\s*\(\s*[rRfF]?(["'])(?!\1)/;

export function hasInputPrompt(code) {
  const lineNo = code.split("\n").findIndex((l) => PROMPT_RE.test(l.replace(/#.*/, "")));
  return lineNo === -1 ? null : lineNo + 1;
}

/* ------------------------------------------------------------------ errors */

function editDistance(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

const BUILTIN_NAMES = ["print", "input", "int", "str", "float", "list", "dict", "set", "tuple", "len", "range",
  "map", "sum", "min", "max", "abs", "sorted", "enumerate", "zip", "round", "bool", "any", "all", "reversed", "True", "False", "None"];

function suggestName(name, code) {
  const pool = new Set([...(code.match(/\b[A-Za-z_]\w*\b/g) || []), ...BUILTIN_NAMES]);
  pool.delete(name);
  let best = null;
  let bestD = 3;
  for (const cand of pool) {
    if (cand.toLowerCase() === name.toLowerCase()) return cand;
    const d = editDistance(cand, name);
    if (d < bestD && Math.abs(cand.length - name.length) <= 2) { best = cand; bestD = d; }
  }
  return name.length > 2 || bestD === 1 ? best : null;
}

/** Explain a Python exception. Returns { title, detail, tips, type, message }. */
export function explainError(error, code = "") {
  const type = error?.type || "Error";
  const msg = error?.message || "";
  const tips = [];
  let title = MSG[lang()][type] ? m(type) : type;
  let detail = "";

  switch (type) {
    case "SyntaxError": {
      detail = m("syntax.detail");
      const fw = findFullWidth(code);
      if (/invalid character|invalid non-printable/.test(msg) || fw.length) {
        const first = fw[0];
        tips.push(first ? m("syntax.fullwidth", { line: first.line, ch: first.ch, fix: first.fix.trim() || "␣" }) : m("syntax.badchar"));
      }
      if (/expected ':'/.test(msg)) tips.push(m("syntax.colon"));
      if (/was never closed|unmatched|does not match/.test(msg)) tips.push(m("syntax.paren"));
      if (/unterminated string|EOL while scanning/.test(msg)) tips.push(m("syntax.string"));
      if (/forgot a comma/.test(msg)) tips.push(m("syntax.comma"));
      if (/cannot assign to|Maybe you meant '=='/.test(msg)) tips.push(m("syntax.assign"));
      if (/invalid syntax/.test(msg) && !tips.length) tips.push(m("syntax.generic"));
      break;
    }
    case "IndentationError":
    case "TabError":
      title = m("IndentationError");
      detail = m("indent.detail");
      if (/expected an indented block/.test(msg)) tips.push(m("indent.expected"));
      if (/unexpected indent/.test(msg)) tips.push(m("indent.unexpected"));
      if (/unindent does not match/.test(msg)) tips.push(m("indent.unindent"));
      if (type === "TabError" || /tabs and spaces/.test(msg)) tips.push(m("indent.tabs"));
      break;
    case "NameError": {
      const name = (msg.match(/name '(\w+)'/) || [])[1];
      detail = name ? m("name.detail", { name }) : m("name.detailAny");
      const sug = name && suggestName(name, code);
      if (sug) tips.push(m("name.suggest", { name: sug }));
      tips.push(m("name.check"));
      break;
    }
    case "UnboundLocalError":
      detail = m("unbound.detail");
      tips.push(m("unbound.tip"));
      break;
    case "TypeError":
      detail = m("type.detail");
      if (/can only concatenate str|unsupported operand type.*'str'|must be str, not/.test(msg)) tips.push(m("type.str"));
      else if (/not supported between instances of 'str' and 'int'|'int' and 'str'/.test(msg)) tips.push(m("type.compare"));
      else if (/'int' object is not iterable/.test(msg)) tips.push(m("type.iterInt"));
      else if (/object is not subscriptable/.test(msg)) tips.push(m("type.subscript"));
      else if (/object is not callable/.test(msg)) tips.push(m("type.callable"));
      else if (/missing \d+ required positional argument|takes \d+ positional argument/.test(msg)) tips.push(m("type.args"));
      break;
    case "ValueError":
      if (/invalid literal for int\(\) with base 10: ''/.test(msg)) {
        detail = m("value.empty");
        tips.push(m("value.emptyTip"));
      } else if (/invalid literal for int\(\) with base 10: '.*\s.*'/.test(msg)) {
        detail = m("value.spaces");
        tips.push(m("value.spacesTip"));
      } else if (/invalid literal for int\(\)/.test(msg)) {
        detail = m("value.int");
        tips.push(m("value.intTip"));
      } else if (/not enough values to unpack|too many values to unpack/.test(msg)) {
        detail = m("value.unpack");
        tips.push(m("value.unpackTip"));
      } else {
        detail = m("value.other");
      }
      break;
    case "EOFError":
      detail = m("eof.detail");
      tips.push(m("eof.tip1"), m("eof.tip2"));
      break;
    case "IndexError":
      detail = m("index.detail");
      tips.push(m("index.tip1"), m("index.tip2"));
      break;
    case "KeyError":
      detail = m("key.detail", { key: msg || "?" });
      tips.push(m("key.tip1"), m("key.tip2"));
      break;
    case "ZeroDivisionError":
      detail = m("zero.detail");
      tips.push(m("zero.tip"));
      break;
    case "RecursionError":
    case "RuntimeCrash":
      detail = m("recursion.detail");
      tips.push(m("recursion.tip"));
      break;
    case "AttributeError":
      detail = msg;
      if (/'list' object has no attribute 'split'/.test(msg)) tips.push(m("attr.split"));
      else if (/'int' object has no attribute/.test(msg)) tips.push(m("attr.int"));
      else if (/'NoneType'/.test(msg)) tips.push(m("attr.none"));
      else tips.push(m("attr.other"));
      break;
    case "ModuleNotFoundError":
    case "ImportError":
      title = m("ModuleNotFoundError");
      detail = m("module.detail");
      tips.push(m("module.tip"));
      break;
    case "MemoryError":
      detail = m("memory.detail");
      tips.push(m("memory.tip"));
      break;
    case "OverflowError":
      detail = m("overflow.detail");
      break;
    case "SystemExit":
      detail = m("exit.detail", { code: msg });
      tips.push(m("exit.tip"));
      break;
    default:
      detail = msg;
  }
  return { title, detail, tips, type, message: msg };
}

/* ------------------------------------------------------------------ wrong answers */

function contiguousIndex(hay, needle) {
  if (!needle.length) return -1;
  for (let i = 0; i + needle.length <= hay.length; i++) {
    if (needle.every((x, j) => hay[i + j] === x)) return i;
  }
  return -1;
}

/**
 * Explain why an output is wrong. reveal=false (hidden tests) never shows expected values.
 * Returns { findings: [{title, detail}], firstDiff }.
 */
export function diagnoseWrongAnswer(expected, got, code, { reveal = true } = {}) {
  const exp = normalize(expected);
  const out = normalize(got);
  const eL = toLines(exp);
  const oL = toLines(out);
  const eT = toTokens(exp);
  const oT = toTokens(out);
  const findings = [];
  const add = (key, vars) => findings.push({ title: m(key), detail: m(`${key}D`, vars) });

  let firstDiff = -1;
  for (let i = 0; i < Math.max(eL.length, oL.length); i++) {
    if (eL[i] !== oL[i]) { firstDiff = i; break; }
  }

  if (!out.trim()) {
    add("wa.empty");
    return { findings, firstDiff };
  }

  const promptLine = hasInputPrompt(code);
  if (promptLine) add("wa.prompt", { line: promptLine });

  const sameTokens = eT.length === oT.length && eT.every((tk, i) => tk === oT[i]);
  if (sameTokens) {
    if (eL.length === 1 && oL.length > 1) add("wa.oneLine");
    else if (eL.length > 1 && oL.length === 1) add("wa.manyLines");
    else add("wa.space");
    return { findings, firstDiff };
  }

  if (exp.toLowerCase() === out.toLowerCase()) {
    findings.push({
      title: m("wa.case"),
      detail: reveal ? m("wa.caseD", { e: eL[firstDiff], o: oL[firstDiff] }) : m("wa.caseHidden"),
    });
    return { findings, firstDiff };
  }

  if (eT.length === oT.length) {
    if (eT.some((tk, i) => isInt(tk) && isNum(oT[i]) && oT[i].includes(".") && Number(oT[i]) === Number(tk))) add("wa.float");
    if (eT.some((tk, i) => isNum(tk) && isNum(oT[i]) && tk.includes(".") && tk !== oT[i]
      && Math.abs(Number(tk) - Number(oT[i])) <= 1e-3 * Math.max(1, Math.abs(Number(tk))))) add("wa.decimals");
  }

  if (eL.length && oL.length > eL.length && contiguousIndex(oL, eL) !== -1) {
    add("wa.extra");
  } else if (oL.length < eL.length && oL.every((l, i) => l === eL[i])) {
    add("wa.short", { o: oL.length, e: eL.length });
  } else if (eL.length !== oL.length) {
    add("wa.lines", { e: eL.length, o: oL.length });
  }

  if (eL.length > 1 && eL.length === oL.length && [...eL].sort().join("\n") === [...oL].sort().join("\n")) {
    add("wa.order");
  }

  if (firstDiff !== -1 && eL[firstDiff] !== undefined && oL[firstDiff] !== undefined) {
    const e1 = toTokens(eL[firstDiff]);
    const o1 = toTokens(oL[firstDiff]);
    const k = e1.findIndex((tk, i) => tk !== o1[i]);
    if (k !== -1 && isInt(e1[k] ?? "") && isInt(o1[k] ?? "") && Math.abs(Number(o1[k]) - Number(e1[k])) === 1) {
      add("wa.offByOne");
    }
    if (reveal) {
      findings.push({ title: m("wa.firstDiff", { n: firstDiff + 1 }), detail: m("wa.firstDiffD", { e: eL[firstDiff], o: oL[firstDiff] }) });
    }
  }

  if (!findings.length) {
    findings.push({ title: m("wa.generic"), detail: reveal ? m("wa.genericD") : m("wa.genericHidden") });
  }
  return { findings, firstDiff };
}

export function explainTimeout(tc, limitMs) {
  const tips = [];
  if (tc?.kind === "stress") tips.push(m("tle.stress"));
  tips.push(m("tle.loop"), m("tle.slow"));
  return {
    title: m("tle.title"),
    detail: m("tle.detail", { s: (limitMs / 1000).toFixed(limitMs % 1000 ? 1 : 0) }),
    tips,
  };
}
