/* ---------------------------------------------------------------
 * 一元二次方程式 ax² + bx + c = 0
 * 解出根、頂點、因式分解，並把「解法過程」整理成一步一步的說明。
 * 台灣課本解法與印度（吠陀數學）解法都算，方便並排比較。
 * -------------------------------------------------------------*/
(function () {
  'use strict';

  var M = window.MathNum;
  var MINUS = M.MINUS;

  /* ---------- 式子的排版 ---------- */

  /* 一項：係數 coef 配上 varPart（'x²'、'x'、''） */
  function term(coef, varPart, isFirst) {
    if (coef === 0) return '';
    var neg = coef < 0;
    var mag = Math.abs(coef);
    var sign = isFirst ? (neg ? MINUS : '') : (neg ? ' ' + MINUS + ' ' : ' + ');
    var num = (mag === 1 && varPart) ? '' : String(mag);
    return sign + num + varPart;
  }

  /* ax² + bx + c */
  function polyHTML(a, b, c) {
    var s = term(a, 'x²', true);
    s += term(b, 'x', s === '');
    s += term(c, '', s === '');
    return s === '' ? '0' : s;
  }

  /* 一次因式 (px + q) */
  function linHTML(p, q) {
    // 常數項是 0 就不用括號，寫成 2x 比 (2x) 順眼
    if (q === 0) return term(p, 'x', true);
    return '(' + term(p, 'x', true) + term(q, '', false) + ')';
  }

  /* 分數係數的式子，用來顯示「先化成整數」之前的原式 */
  function polyFracHTML(fa, fb, fc) {
    function ft(f, varPart, isFirst) {
      if (f.n === 0) return '';
      var neg = f.n < 0;
      var mag = M.frac(Math.abs(f.n), f.d);
      var sign = isFirst ? (neg ? MINUS : '') : (neg ? ' ' + MINUS + ' ' : ' + ');
      var num = (mag.n === 1 && mag.d === 1 && varPart)
        ? '' : (varPart ? M.fracCoefHTML(mag) : M.fracHTML(mag));
      return sign + num + varPart;
    }
    var s = ft(fa, 'x²', true);
    s += ft(fb, 'x', s === '');
    s += ft(fc, '', s === '');
    return s === '' ? '0' : s;
  }

  /* 接在式子後面的一項分數，自己帶正負號： + 3/2 或 − 3/2。
     isCoef 表示後面還會接 x，那就得寫成 (3/2)x 才不會被讀成 3/(2x)。 */
  function plusFrac(f, isCoef) {
    if (f.n === 0) return '';
    var mag = M.frac(Math.abs(f.n), f.d);
    return (f.n < 0 ? ' ' + MINUS + ' ' : ' + ') +
           (isCoef ? M.fracCoefHTML(mag) : M.fracHTML(mag));
  }

  /* √D 要怎麼寫：開得盡就直接寫整數，開不盡才留根號 */
  function radHTML(sq) {
    if (sq.r === 1) return M.numStr(sq.k);
    return (sq.k === 1 ? '' : sq.k) + M.sqrtHTML(sq.r);
  }

  /* ---------- 因式分解：找出 (px+q)(sx+t) ---------- */
  /* 先找兩數 m、n 滿足 m·n = a·c 且 m+n = b（印度課本說的「分裂中項」，
     台灣課本的十字相乘湊的是同一組數），再分組提公因式。 */
  function splitMiddle(a, b, c) {
    var target = a * c;
    var best = null;
    var lim = Math.floor(Math.sqrt(Math.abs(target))) || 0;
    for (var m = -Math.max(lim, Math.abs(b)) - 1; m <= Math.max(lim, Math.abs(b)) + 1; m++) {
      if (m === 0 && target !== 0) continue;
      var n = b - m;
      if (m * n !== target) continue;
      // 讓絕對值大的排前面，念起來比較像課本
      if (!best || Math.abs(m) > Math.abs(best.m)) best = { m: m, n: n };
    }
    if (!best) return null;

    var m1 = best.m, n1 = best.n;
    var g1 = M.gcd(a, m1) || 1;
    if (a < 0) g1 = -g1;
    var s = a / g1, t = m1 / g1;          // 第一組提出 g1·x 後剩 (s x + t)
    if (s === 0) return null;
    var q = n1 / s;                        // 第二組要湊出同樣的 (s x + t)
    if (!Number.isInteger(q) || q * t !== c) return null;

    return { m: m1, n: n1, p: g1, q: q, s: s, t: t, zeroC: c === 0 };
  }

  /* ---------- 主分析 ---------- */
  function solve(inA, inB, inC) {
    var fa = typeof inA === 'object' ? inA : M.parseCoef(inA);
    var fb = typeof inB === 'object' ? inB : M.parseCoef(inB);
    var fc = typeof inC === 'object' ? inC : M.parseCoef(inC);
    if (!fa) return { ok: false, error: 'a 沒有填，或不是看得懂的數字。' };
    if (!fb) fb = M.frac(0, 1);
    if (!fc) fc = M.frac(0, 1);
    if (fa.n === 0) return { ok: false, error: 'a 不能是 0 — a = 0 的話 x² 就不見了，那是一元一次方程式。' };

    // 係數有分數就整條乘上分母的最小公倍數，化成整數係數
    var L = M.lcm(M.lcm(fa.d, fb.d), fc.d);
    var a = fa.n * (L / fa.d), b = fb.n * (L / fb.d), c = fc.n * (L / fc.d);

    // 再約掉公因數。a 的正負號要保留 —— 乘上 −1 會讓拋物線上下翻過來，
    // 根雖然一樣，但「開口向上／向下」就講錯了。
    var g = M.gcd(M.gcd(a, b), c) || 1;
    a /= g; b /= g; c /= g;

    var normalized = (L !== 1 || g !== 1);

    var D = b * b - 4 * a * c;
    var sq = M.simplifySqrt(D);
    var kind = D > 0 ? 'two' : D === 0 ? 'double' : 'none';

    var roots = [];
    if (D >= 0) {
      roots.push(M.surd(-b, sq.k, sq.r, 2 * a));
      if (D > 0) roots.push(M.surd(-b, -sq.k, sq.r, 2 * a));
      roots.sort(function (x, y) { return M.surdVal(y) - M.surdVal(x); });
    }

    var h = M.frac(-b, 2 * a);                 // 對稱軸 x = −b/2a
    var kk = M.frac(-D, 4 * a);                // 頂點 y = (4ac−b²)/4a
    var sum = M.frac(-b, a);
    var prod = M.frac(c, a);
    var fac = splitMiddle(a, b, c);

    var res = {
      ok: true,
      given: { a: fa, b: fb, c: fc },
      normalized: normalized, mult: L, divided: g,
      a: a, b: b, c: c,
      eqHTML: polyHTML(a, b, c) + ' = 0',
      givenEqHTML: polyFracHTML(fa, fb, fc) + ' = 0',
      D: D, sq: sq, kind: kind,
      roots: roots,
      rootsNum: roots.map(M.surdVal),
      vertex: { h: h, k: kk },
      opens: a > 0 ? 'up' : 'down',
      yInt: c,
      sum: sum, prod: prod,
      factor: fac
    };

    res.tw = twMethods(res);
    res.in = inMethods(res);
    return res;
  }

  /* ---------- 台灣課本的三招 ---------- */
  function twMethods(r) {
    var a = r.a, b = r.b, c = r.c, D = r.D, sq = r.sq;
    var out = {};

    /* ① 公式解 */
    var f = ['把 <b>a = ' + M.numStr(a) + '</b>、<b>b = ' + M.numStr(b) + '</b>、<b>c = ' + M.numStr(c) +
             '</b> 代進公式 x = ' +
               M.ratioHTML(MINUS + 'b ± ' + M.sqrtHTML('b² ' + MINUS + ' 4ac'), '2a') + '。',
             '先算判別式：b² ' + MINUS + ' 4ac = (' + M.numStr(b) + ')² ' + MINUS + ' 4·(' + M.numStr(a) +
             ')·(' + M.numStr(c) + ') = ' + M.numStr(b * b) + ' ' + MINUS + ' ' + M.parenNeg(4 * a * c) +
             ' = <b>' + M.numStr(D) + '</b>。'];
    if (D < 0) {
      f.push('判別式是負的，負數開不出實數平方根 → <b>沒有實數解</b>（圖形整條在 x 軸的同一側）。');
    } else {
      f.push('代回去：x = ' +
             M.ratioHTML(M.numStr(-b) + ' ± ' + M.sqrtHTML(M.numStr(D)), M.numStr(2 * a)) +
             (sq.r === 1
               ? '，而 ' + M.sqrtHTML(M.numStr(D)) + ' = <b>' + M.numStr(sq.k) + '</b>（開得盡）'
               : sq.k !== 1
                 ? '，其中 ' + M.sqrtHTML(M.numStr(D)) + ' = ' + radHTML(sq) + '（把平方因數開出來）'
                 : '') + '。');
      f.push(D === 0
        ? '判別式是 0，± 之後兩個答案一樣 → <b>重根</b> x = ' + M.surdHTML(r.roots[0]) + '。'
        : '約分後得到 <b>x = ' + M.surdHTML(r.roots[0]) + '</b> 或 <b>x = ' + M.surdHTML(r.roots[1]) + '</b>。');
    }
    out.formula = { title: '公式解', steps: f };

    /* ② 配方法 */
    var cs = [];
    cs.push('原式：' + polyHTML(a, b, c) + ' = 0');
    if (a !== 1) cs.push('兩邊同除以 a = ' + M.numStr(a) + '：x²' + plusFrac(M.frac(b, a), true) +
                         'x' + plusFrac(M.frac(c, a)) + ' = 0');
    cs.push('常數移到右邊：x²' + plusFrac(M.frac(b, a), true) + 'x = ' + M.fracHTML(M.frac(-c, a)));
    var half = M.frac(b, 2 * a);
    cs.push('取一次項係數的一半 <b>' + M.fracHTML(half) + '</b>，平方後 <b>' +
            M.fracHTML(M.fMul(half, half)) + '</b>，兩邊同加。');
    cs.push('左邊變成完全平方：(x' + plusFrac(half) + ')² = ' + M.fracHTML(M.frac(D, 4 * a * a)));
    if (D < 0) {
      cs.push('右邊是負數，但左邊是平方一定 ≥ 0 → <b>沒有實數解</b>。');
    } else {
      cs.push('兩邊開根號後移項：<b>x = ' + M.surdHTML(r.roots[0]) + '</b>' +
              (r.roots[1] ? ' 或 <b>x = ' + M.surdHTML(r.roots[1]) + '</b>' : '（重根）') + '。');
    }
    out.complete = { title: '配方法', steps: cs };

    /* 頂點式（配方法的副產品） */
    out.vertexForm = 'y = ' + (a === 1 ? '' : a === -1 ? MINUS : M.numStr(a)) +
      '(x ' + (r.vertex.h.n > 0 ? MINUS + ' ' + M.fracHTML(r.vertex.h) :
               r.vertex.h.n < 0 ? '+ ' + M.fracHTML(M.frac(-r.vertex.h.n, r.vertex.h.d)) : '') + ')²' +
      (r.vertex.k.n === 0 ? '' : (r.vertex.k.n > 0 ? ' + ' + M.fracHTML(r.vertex.k) :
        ' ' + MINUS + ' ' + M.fracHTML(M.frac(-r.vertex.k.n, r.vertex.k.d))));

    /* ③ 十字相乘 */
    if (r.factor) {
      var F = r.factor;
      out.cross = {
        title: '十字相乘法',
        steps: [
          '把 a = ' + M.numStr(a) + ' 拆成 ' + M.parenNeg(F.p) + ' × ' + M.parenNeg(F.s) +
            '，c = ' + M.numStr(c) + ' 拆成 ' + M.parenNeg(F.q) + ' × ' + M.parenNeg(F.t) + '。',
          '交叉相乘再相加：' + M.parenNeg(F.p) + '×' + M.parenNeg(F.t) + ' + ' + M.parenNeg(F.q) + '×' +
            M.parenNeg(F.s) + ' = ' + M.parenNeg(F.p * F.t) + ' + ' + M.parenNeg(F.q * F.s) +
            ' = <b>' + M.numStr(b) + '</b>，剛好等於中間那項的係數，湊對了。',
          '所以 ' + polyHTML(a, b, c) + ' = ' + linHTML(F.p, F.q) + linHTML(F.s, F.t) + '。',
          '兩個括號各自等於 0：<b>x = ' + M.surdHTML(M.surd(-F.q, 0, 1, F.p)) + '</b>' +
            (r.kind === 'double' ? '（重根）' : ' 或 <b>x = ' + M.surdHTML(M.surd(-F.t, 0, 1, F.s)) + '</b>') + '。'
        ],
        cross: F,
        html: linHTML(F.p, F.q) + linHTML(F.s, F.t)
      };
    } else {
      out.cross = null;
    }

    return out;
  }

  /* ---------- 印度（吠陀數學）的招式 ---------- */
  function inMethods(r) {
    var a = r.a, b = r.b, c = r.c, D = r.D, sq = r.sq;
    var out = {};

    /* ① 分裂中項法（Splitting the Middle Term）— 印度課本的標準做法 */
    if (r.factor && r.factor.zeroC) {
      out.split = {
        title: '分裂中項法',
        sanskrit: 'Splitting the Middle Term',
        steps: [
          '常數項 c = 0，這種就不用拆了 — 兩項都有 x，直接提公因式。',
          polyHTML(a, b, c) + ' = ' + linHTML(r.factor.p, r.factor.q) + linHTML(r.factor.s, r.factor.t) + ' = 0',
          '所以 <b>x = 0</b> 或 <b>x = ' + M.fracHTML(M.frac(-r.factor.t, r.factor.s)) + '</b>。'
        ]
      };
    } else if (r.factor) {
      var F = r.factor;
      out.split = {
        title: '分裂中項法',
        sanskrit: 'Splitting the Middle Term',
        steps: [
          '先看 a × c = ' + M.parenNeg(a) + ' × ' + M.parenNeg(c) + ' = <b>' + M.numStr(a * c) + '</b>。',
          '找兩個數，<b>相乘等於 ' + M.numStr(a * c) + '，相加等於 b = ' + M.numStr(b) +
            '</b> → 找到 <b>' + M.numStr(F.m) + '</b> 和 <b>' + M.numStr(F.n) + '</b>。',
          '把中間那項拆成這兩項重寫：' + polyHTML(a, b, c) + ' = ' +
            term(a, 'x²', true) + term(F.m, 'x', false) + term(F.n, 'x', false) + term(c, '', false),
          '前兩項、後兩項各自提公因式，會冒出<b>同一個括號</b>：' +
            (F.p === 1 ? 'x' : M.numStr(F.p) + 'x') + linHTML(F.s, F.t) +
            term(F.q, '', false) + linHTML(F.s, F.t),
          '再把共同的括號提出來：<b>' + linHTML(F.s, F.t) + linHTML(F.p, F.q) + ' = 0</b>，' +
            '得到的答案跟十字相乘一模一樣 — 差別只在<b>印度課本把過程完整寫出來，台灣課本用交叉圖心算</b>。'
        ]
      };
    } else {
      out.split = null;
    }

    /* ② 觀察法 Vilokanam — 特殊係數可以直接看出根 */
    if (a + b + c === 0) {
      out.vilokanam = {
        hit: true,
        title: '觀察法（Vilokanam）',
        sanskrit: 'Vilokanam — 「由觀察」',
        steps: [
          '先加加看：a + b + c = ' + M.numStr(a) + ' + ' + M.parenNeg(b) + ' + ' + M.parenNeg(c) +
            ' = <b>0</b>。',
          '係數相加是 0，代表 <b>x = 1</b> 一定是一個根（把 1 代進去就是 a+b+c）。',
          '另一個根用「兩根相乘 = c/a」直接得到：<b>x = ' + M.fracHTML(r.prod) + '</b>。',
          '完全不用算判別式，兩秒看出答案。'
        ]
      };
    } else if (a - b + c === 0) {
      out.vilokanam = {
        hit: true,
        title: '觀察法（Vilokanam）',
        sanskrit: 'Vilokanam — 「由觀察」',
        steps: [
          '算算看：a ' + MINUS + ' b + c = ' + M.numStr(a) + ' ' + MINUS + ' ' + M.parenNeg(b) +
            ' + ' + M.parenNeg(c) + ' = <b>0</b>。',
          '這代表 <b>x = ' + MINUS + '1</b> 一定是一個根（把 ' + MINUS + '1 代進去就是 a−b+c）。',
          '另一個根 = ' + MINUS + 'c/a = <b>x = ' + M.fracHTML(M.frac(-r.prod.n, r.prod.d)) + '</b>。'
        ]
      };
    } else {
      out.vilokanam = {
        hit: false,
        title: '觀察法（Vilokanam）',
        sanskrit: 'Vilokanam — 「由觀察」',
        steps: [
          'a + b + c = ' + M.numStr(a + b + c) + '（不是 0）、a ' + MINUS + ' b + c = ' +
            M.numStr(a - b + c) + '（不是 0）。',
          '這一題沒有命中「秒解」的特殊型，要改用下面的方法。',
          '記法：<b>係數相加為 0 → 有一根是 1</b>；<b>奇偶項相消（a−b+c=0）→ 有一根是 ' + MINUS + '1</b>。'
        ]
      };
    }

    /* ③ 和差法 — 用「兩根之和」與「兩根之差」夾出答案 */
    var sd = ['吠陀數學把根看成一組：<b>和</b>與<b>差</b>各算一次，再取平均。',
              '兩根之和 = ' + MINUS + 'b/a = <b>' + M.fracHTML(r.sum) + '</b>（這步不用算判別式）。'];
    if (D >= 0) {
      var diff = M.surd(0, sq.k, sq.r, Math.abs(a));
      sd.push('兩根之差 = ' + M.sqrtHTML('b² ' + MINUS + ' 4ac') + ' ÷ |a| = ' +
              radHTML(sq) + ' ÷ ' + M.numStr(Math.abs(a)) + ' = <b>' + M.surdHTML(diff) + '</b>。');
      sd.push('大的根 = (和 + 差) ÷ 2 = <b>' + M.surdHTML(r.roots[0]) + '</b>；' +
              (r.roots[1] ? '小的根 = (和 ' + MINUS + ' 差) ÷ 2 = <b>' + M.surdHTML(r.roots[1]) + '</b>。'
                          : '差是 0，兩根重合。'));
      sd.push('好處是<b>和</b>通常心算就出來，只有<b>差</b>需要開根號，檢查答案也快：把兩個根加起來看是不是 ' +
              M.fracHTML(r.sum) + '。');
    } else {
      sd.push('兩根之差要開 ' + M.sqrtHTML(M.numStr(D)) + '，負數開不出來 → 沒有實數解。');
    }
    out.sumdiff = { title: '和差法', sanskrit: '由根的和與差反推', steps: sd };

    /* ④ 微分式法 Calana-kalana — 2ax + b = ±√D */
    var df = ['吠陀數學有一條「一次微分」的用法：把 ' + polyHTML(a, b, c) +
              ' 的<b>一次微分</b>寫出來，就是 <b>' + polyHTML(0, 2 * a, b) + '</b>。',
              '定理：方程式的根會讓 <b>' + polyHTML(0, 2 * a, b) + ' = ±' +
                M.sqrtHTML('b² ' + MINUS + ' 4ac') + '</b>。'];
    if (D >= 0) {
      df.push('代進去：' + polyHTML(0, 2 * a, b) + ' = ±' + M.sqrtHTML(M.numStr(D)) +
              (sq.r !== 1 && sq.k === 1 ? '' : ' = ±' + radHTML(sq)) + '。');
      df.push('移項除以 ' + M.numStr(2 * a) + '，一樣得到 <b>x = ' + M.surdHTML(r.roots[0]) + '</b>' +
              (r.roots[1] ? ' 或 <b>x = ' + M.surdHTML(r.roots[1]) + '</b>' : '（重根）') + '。');
      df.push('這其實就是公式解換個講法（' + polyHTML(0, 2 * a, b) + ' = ±' +
              M.sqrtHTML('D') + ' 兩邊同除 2a 就是公式），但少寫一層分數，比較不會抄錯。');
    } else {
      df.push('右邊要開負數的根號，開不出來 → 沒有實數解。');
    }
    out.differential = { title: '微分式法', sanskrit: 'Calana-kalana', steps: df };

    return out;
  }

  window.Quadratic = {
    solve: solve,
    polyHTML: polyHTML,
    linHTML: linHTML,
    term: term
  };
})();
