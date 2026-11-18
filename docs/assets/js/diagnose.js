/* Output comparison + human explanations for errors and wrong answers. */

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
  if (mode === "tokens") return a.length === b.length && a.every((t, i) => t === b[i]);
  const eps = parseFloat(mode.split(":")[1]);
  if (a.length !== b.length) return false;
  return a.every((t, i) => {
    if (t === b[i]) return true;
    const x = Number(t);
    const y = Number(b[i]);
    if (!isNum(t) || !isNum(b[i]) || !Number.isFinite(x) || !Number.isFinite(y)) return false;
    return Math.abs(x - y) <= eps * Math.max(1, Math.abs(x));
  });
}

/* ------------------------------------------------------------------ static checks */

const FULLWIDTH = {
  "，": ",", "（": "(", "）": ")", "：": ":", "；": ";", "＝": "=", "　": "空白",
  "“": '"', "”": '"', "‘": "'", "’": "'", "［": "[", "］": "]", "＋": "+", "－": "-", "＊": "*",
};

/** Find full-width punctuation outside of strings and comments. */
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

function identifiers(code) {
  return new Set(code.match(/\b[A-Za-z_]\w*\b/g) || []);
}

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
  const pool = new Set([...identifiers(code), ...BUILTIN_NAMES]);
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

/**
 * Explain a Python exception in plain Traditional Chinese.
 * Returns { title, detail, tips: string[] }.
 */
export function explainError(error, code = "") {
  const type = error?.type || "Error";
  const msg = error?.message || "";
  const tips = [];
  let title = `${type}`;
  let detail = "";

  switch (type) {
    case "SyntaxError": {
      title = "語法錯誤";
      detail = "Python 看不懂這一行，程式完全沒有開始執行。";
      const fw = findFullWidth(code);
      if (/invalid character|invalid non-printable/.test(msg) || fw.length) {
        const first = fw[0];
        if (first) tips.push(`第 ${first.line} 行有全形符號「${first.ch}」，請改成半形「${first.fix}」。中文輸入法常常不小心打出全形標點。`);
        else tips.push("程式裡有 Python 不認得的字元，常見是中文輸入法打出的全形標點或全形空白。");
      }
      if (/expected ':'/.test(msg)) tips.push("if、for、while、def、else 這些敘述的結尾要加冒號「:」。");
      if (/was never closed|unmatched|does not match/.test(msg)) tips.push("括號沒有成對：數一數 ( [ { 和 ) ] } 是否一樣多。錯誤有時會出現在真正出錯的下一行。");
      if (/unterminated string|EOL while scanning/.test(msg)) tips.push("字串的引號沒有關起來。");
      if (/forgot a comma/.test(msg)) tips.push("這裡可能少了一個逗號。");
      if (/cannot assign to|Maybe you meant '==' /.test(msg)) tips.push("條件判斷要用 ==，= 是指定數值。");
      if (/invalid syntax/.test(msg) && !tips.length) tips.push("常見原因：少了冒號、括號沒成對、關鍵字拼錯，或把 = 和 == 搞混。");
      break;
    }
    case "IndentationError":
    case "TabError":
      title = "縮排錯誤";
      detail = "Python 用縮排來決定哪些程式碼屬於同一個區塊。";
      if (/expected an indented block/.test(msg)) tips.push("冒號「:」後面那一行要往內縮排（通常是 4 個空白）。");
      if (/unexpected indent/.test(msg)) tips.push("這一行不應該縮排，或縮排比上一行多了。");
      if (/unindent does not match/.test(msg)) tips.push("這一行退回的縮排量，跟前面任何一層都對不起來。");
      if (type === "TabError" || /tabs and spaces/.test(msg)) tips.push("同一個檔案混用了 Tab 和空白，請統一用 4 個空白。");
      break;
    case "NameError": {
      title = "名稱未定義";
      const name = (msg.match(/name '(\w+)'/) || [])[1];
      detail = name ? `Python 找不到叫做 ${name} 的變數或函式。` : "使用了還沒定義的名稱。";
      const sug = name && suggestName(name, code);
      if (sug) tips.push(`你是不是想打 ${sug}？Python 會分大小寫。`);
      tips.push("檢查拼字，以及是不是在指定數值之前就先使用了它。");
      break;
    }
    case "UnboundLocalError":
      title = "區域變數還沒有值";
      detail = "函式裡修改了外面的變數，Python 會把它當成新的區域變數。";
      tips.push("把變數當參數傳進函式，或用 return 回傳結果，不要在函式裡直接改外面的變數。");
      break;
    case "TypeError":
      title = "型別錯誤";
      detail = "對不適合的資料型別做了運算。";
      if (/can only concatenate str|unsupported operand type.*'str'|must be str, not/.test(msg)) {
        tips.push("input() 讀進來的是字串。數字要先用 int() 或 float() 轉換；要把數字接到字串後面則用 str() 或 f-string。");
      } else if (/not supported between instances of 'str' and 'int'|'int' and 'str'/.test(msg)) {
        tips.push("把字串和數字拿來比較了。讀進來的資料記得先用 int() 轉換。");
      } else if (/'int' object is not iterable/.test(msg)) {
        tips.push("不能直接用 for 走過一個整數，要寫 for i in range(n)。");
      } else if (/object is not subscriptable/.test(msg)) {
        tips.push("對不是串列或字串的東西用了 [ ]。檢查這個變數現在的型別。");
      } else if (/object is not callable/.test(msg)) {
        tips.push("把變數當成函式呼叫了。可能是變數名稱蓋掉了內建函式，例如把變數取名為 sum、max、list、input。");
      } else if (/missing \d+ required positional argument|takes \d+ positional argument/.test(msg)) {
        tips.push("呼叫函式時給的參數數量，跟定義時不一樣。");
      }
      break;
    case "ValueError":
      title = "數值錯誤";
      if (/invalid literal for int\(\) with base 10: ''/.test(msg)) {
        detail = "int() 讀到一個空字串。";
        tips.push("可能多讀了一行空行，或輸入格式跟你想的不一樣。看一下範例輸入每一行實際有什麼。");
      } else if (/invalid literal for int\(\) with base 10: '.*\s.*'/.test(msg)) {
        detail = "int() 收到了一整行包含空白的文字。";
        tips.push("同一行有好幾個數字時，要先切開：list(map(int, input().split()))。");
      } else if (/invalid literal for int\(\)/.test(msg)) {
        detail = "int() 只能轉換整數格式的字串。";
        tips.push("檢查這次讀到的是不是你以為的那一行，或它是不是小數 (要用 float())。");
      } else if (/not enough values to unpack|too many values to unpack/.test(msg)) {
        detail = "a, b = ... 左右兩邊的數量對不起來。";
        tips.push("這一行的資料個數跟你預期的不同。確認輸入格式：哪些資料在同一行、哪些分在不同行。");
      } else {
        detail = "傳入的數值不合法。";
      }
      break;
    case "EOFError":
      title = "讀取超過輸入結尾";
      detail = "呼叫 input() 的次數比輸入的行數還多。";
      tips.push("同一行的多個數字只要用一次 input().split() 讀完，不要分開讀。");
      tips.push("檢查讀取迴圈的次數是否正確，例如 range(n) 而不是 range(n + 1)。");
      break;
    case "IndexError":
      title = "索引超出範圍";
      detail = "長度為 n 的串列，合法的索引只有 0 到 n - 1。";
      tips.push("常見原因：range 多跑了一次、題目的編號從 1 開始但串列從 0 開始，或在空串列上取 [0]。");
      tips.push("極端情況（例如只有 1 筆資料或 0 筆資料）特別容易出現這個錯誤。");
      break;
    case "KeyError":
      title = "字典裡沒有這個鍵";
      detail = `字典中找不到 ${msg || "這個鍵"}。`;
      tips.push("讀取前先確認 key in d，或用 d.get(key, 預設值)。");
      tips.push("檢查鍵的型別是否一致：'3' 和 3 是不同的鍵。");
      break;
    case "ZeroDivisionError":
      title = "除以零";
      detail = "程式在某個情況下除以 0 或對 0 取餘數。";
      tips.push("想想看極端情況：資料筆數為 0、某個值剛好是 0 的時候會怎麼樣。");
      break;
    case "RecursionError":
    case "RuntimeCrash":
      title = type === "RecursionError" ? "遞迴太深" : "執行環境崩潰";
      detail = "函式呼叫自己的層數太多，通常是遞迴沒有正確的終止條件，或資料太大。";
      tips.push("確認遞迴一定會碰到終止條件。資料量大時，改用迴圈會比較安全。");
      break;
    case "AttributeError":
      title = "沒有這個屬性或方法";
      detail = msg;
      if (/'list' object has no attribute 'split'/.test(msg)) tips.push("split() 是字串的方法。這個變數已經是串列了。");
      else if (/'int' object has no attribute/.test(msg)) tips.push("整數沒有這個方法。檢查這個變數是不是被轉成了 int。");
      else if (/'NoneType'/.test(msg)) tips.push("這個變數的值是 None，常見於把 list.sort() 的回傳值存起來（sort 會回傳 None，要用 sorted()）。");
      else tips.push("檢查這個變數的型別，以及方法名稱的拼字。");
      break;
    case "ModuleNotFoundError":
    case "ImportError":
      title = "找不到模組";
      detail = "這個平台只支援 Python 標準函式庫。";
      tips.push("請不要使用 numpy 等第三方套件，題目都能只用內建功能完成。");
      break;
    case "MemoryError":
      title = "記憶體不足";
      detail = "程式建立了太大的資料。";
      tips.push("檢查是不是不小心在迴圈裡不斷累加串列，或建立了 n × n 的巨大表格。");
      break;
    case "OverflowError":
      title = "數值溢位";
      detail = "浮點數太大了。整數在 Python 中不會溢位，可以改用整數運算 (例如 //)。";
      break;
    case "SystemExit":
      title = "程式以錯誤代碼結束";
      detail = `exit(${msg}) 會被視為執行錯誤。`;
      tips.push("正常結束時不需要呼叫 exit()，或改成 exit(0)。");
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
 * Explain why an output is wrong.
 * reveal=false (hidden tests) never prints expected values.
 * Returns { findings: [{title, detail}], firstDiff: lineIndex | -1 }.
 */
export function diagnoseWrongAnswer(expected, got, code, { reveal = true } = {}) {
  const exp = normalize(expected);
  const out = normalize(got);
  const eL = toLines(exp);
  const oL = toLines(out);
  const eT = toTokens(exp);
  const oT = toTokens(out);
  const findings = [];
  const add = (title, detail) => findings.push({ title, detail });

  let firstDiff = -1;
  for (let i = 0; i < Math.max(eL.length, oL.length); i++) {
    if (eL[i] !== oL[i]) { firstDiff = i; break; }
  }

  if (!out.trim()) {
    add("沒有任何輸出", "程式沒有印出任何東西。記得用 print() 輸出答案；如果把程式寫在函式裡，確認最後有呼叫它。");
    return { findings, firstDiff };
  }

  const promptLine = hasInputPrompt(code);
  if (promptLine) {
    add("input() 的提示文字也被輸出了",
      `第 ${promptLine} 行的 input("...") 會把提示文字印出來，評測會把它當成答案的一部分。請改成不帶文字的 input()。`);
  }

  const sameTokens = eT.length === oT.length && eT.every((t, i) => t === oT[i]);
  if (sameTokens) {
    if (eL.length === 1 && oL.length > 1) add("答案應該印在同一行", "內容正確，但題目要求在同一行用空白隔開。可以用 print(a, b) 或 print(*串列)。");
    else if (eL.length > 1 && oL.length === 1) add("每個答案要各自一行", "內容正確，但題目要求分成多行輸出。");
    else add("空白或換行的格式不對", "所有數值都正確，只有空白或換行的位置不同。檢查是否多了空白，或 print 的 sep / end 參數。");
    return { findings, firstDiff };
  }

  if (exp.toLowerCase() === out.toLowerCase()) {
    add("大小寫不同", reveal ? `預期是「${eL[firstDiff]}」，你輸出的是「${oL[firstDiff]}」。評測會區分大小寫。` : "內容正確，但大小寫和題目要求不同。評測會區分大小寫。");
    return { findings, firstDiff };
  }

  if (eT.length === oT.length) {
    const floatAsInt = eT.some((t, i) => isInt(t) && isNum(oT[i]) && oT[i].includes(".") && Number(oT[i]) === Number(t));
    if (floatAsInt) add("整數被印成了小數", "例如答案是 5，你輸出 5.0。在 Python 中 / 一定得到小數，整數除法請用 //，或用 int() 轉換。");
    const decimals = eT.some((t, i) => isNum(t) && isNum(oT[i]) && t.includes(".") && t !== oT[i] && Math.abs(Number(t) - Number(oT[i])) < 1e-6 * Math.max(1, Math.abs(Number(t))) * 1000);
    if (decimals) add("小數位數不同", "數值很接近，但小數位數跟題目要求不同。可以用 f\"{x:.2f}\" 控制位數。");
  }

  if (eL.length && oL.length > eL.length && contiguousIndex(oL, eL) !== -1) {
    add("多印了其他內容", "正確答案有出現在你的輸出裡，但多了其他行。可能是除錯用的 print 忘了刪掉。");
  } else if (oL.length < eL.length && oL.every((l, i) => l === eL[i])) {
    add("輸出不完整", `你只輸出了 ${oL.length} 行，預期有 ${eL.length} 行。可能是迴圈提早結束，或少了某些情況的 print。`);
  } else if (eL.length !== oL.length) {
    add("行數不同", `預期輸出 ${eL.length} 行，你輸出了 ${oL.length} 行。`);
  }

  if (eL.length > 1 && eL.length === oL.length) {
    const a = [...eL].sort().join("\n");
    const b = [...oL].sort().join("\n");
    if (a === b) add("內容正確但順序不同", "每一行都有出現，只是順序不一樣。再讀一次題目的排序規則（例如平手時怎麼排）。");
  }

  if (firstDiff !== -1 && eL[firstDiff] !== undefined && oL[firstDiff] !== undefined) {
    const e1 = toTokens(eL[firstDiff]);
    const o1 = toTokens(oL[firstDiff]);
    const k = e1.findIndex((t, i) => t !== o1[i]);
    if (k !== -1 && isInt(e1[k] ?? "") && isInt(o1[k] ?? "")) {
      const diff = Number(o1[k]) - Number(e1[k]);
      if (Math.abs(diff) === 1) {
        add("答案差了 1", "很可能是「差一錯誤」：檢查 range 的起點與終點、計數從 0 還是 1 開始，以及 < 和 <= 的使用。");
      }
    }
    if (reveal) {
      add(`第 ${firstDiff + 1} 行開始不同`, `預期「${eL[firstDiff]}」，你輸出「${oL[firstDiff]}」。`);
    }
  }

  if (!findings.length) {
    add("答案不正確", reveal ? "比對下方的預期輸出與你的輸出，找出第一個不同的地方。" : "這組測資的答案不同。看看測資的描述，想想你的程式在這種情況下會怎麼跑。");
  }
  return { findings, firstDiff };
}

export function explainTimeout(tc, limitMs) {
  const tips = [];
  if (tc?.kind === "stress") {
    tips.push("這是資料量最大的測資。如果你的做法對每個元素又掃了一遍整份資料（雙層迴圈），就會太慢。");
  }
  tips.push("檢查有沒有無限迴圈：while 的條件是否一定會變成 False？迴圈變數有沒有更新？");
  tips.push("在迴圈中重複做昂貴的事（例如 list.count、in 串列、sum 整個串列）也會讓程式變慢。");
  return {
    title: "超過時間限制",
    detail: `這組測資的時間限制是 ${(limitMs / 1000).toFixed(limitMs % 1000 ? 1 : 0)} 秒。`,
    tips,
  };
}
