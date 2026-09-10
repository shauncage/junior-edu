/* ---------------------------------------------------------------
 * 數學共用工具 — 分數、根式、數值格式化
 * 目標是把答案寫成「課本會寫的樣子」：能約分就約分，
 * 能寫成最簡根式就不要留小數。
 * -------------------------------------------------------------*/
(function () {
  'use strict';

  var MINUS = '−';           // 真正的減號，比 hyphen 好看

  function gcd(a, b) {
    a = Math.abs(a); b = Math.abs(b);
    while (b) { var t = a % b; a = b; b = t; }
    return a;
  }
  function lcm(a, b) { return Math.abs(a * b) / (gcd(a, b) || 1); }

  /* ---------- 分數 ---------- */
  function frac(n, d) {
    if (d === undefined) d = 1;
    if (d === 0) throw new Error('分母不能為 0');
    if (d < 0) { n = -n; d = -d; }
    var g = gcd(n, d) || 1;
    return { n: n / g, d: d / g };
  }
  function fAdd(x, y) { return frac(x.n * y.d + y.n * x.d, x.d * y.d); }
  function fSub(x, y) { return frac(x.n * y.d - y.n * x.d, x.d * y.d); }
  function fMul(x, y) { return frac(x.n * y.n, x.d * y.d); }
  function fDiv(x, y) { return frac(x.n * y.d, x.d * y.n); }
  function fNeg(x) { return { n: -x.n, d: x.d }; }
  function fVal(x) { return x.n / x.d; }
  function fIsInt(x) { return x.d === 1; }
  function fIsZero(x) { return x.n === 0; }

  /* 分數的純文字寫法：3/4、−3/4、5 */
  function fracStr(x) {
    if (x.d === 1) return numStr(x.n);
    return (x.n < 0 ? MINUS : '') + Math.abs(x.n) + '/' + x.d;
  }
  /* 分數的直式 HTML，負號放在分數線外面 */
  function fracHTML(x) {
    if (x.d === 1) return numStr(x.n);
    return (x.n < 0 ? MINUS : '') +
      '<span class="frac"><span>' + Math.abs(x.n) + '</span><span>' + x.d + '</span></span>';
  }

  function numStr(n) {
    if (n < 0) return MINUS + numStr(-n);
    if (Number.isInteger(n)) return String(n);
    return String(Math.round(n * 10000) / 10000);
  }

  /* ---------- 根式 ---------- */
  /* √n = k√r，r 不再含平方因數 */
  function simplifySqrt(n) {
    if (n < 0) return { k: 0, r: 0 };
    if (n === 0) return { k: 0, r: 1 };
    var k = 1, r = n;
    for (var i = 2; i * i <= r; i++) {
      while (r % (i * i) === 0) { r /= i * i; k *= i; }
    }
    return { k: k, r: r };
  }
  function sqrtHTML(r) {
    return '<span class="sqrt">√<span class="rad">' + r + '</span></span>';
  }

  /* ---------- 帶根號的數：(p + k√r) / q ---------- */
  /* 建構時自動約分，並讓 q > 0。r === 1 時就退化成普通分數。 */
  function surd(p, k, r, q) {
    if (q < 0) { p = -p; k = -k; q = -q; }
    if (r === 1) { p += k; k = 0; r = 1; }
    if (k === 0) { var f = frac(p, q); return { p: f.n, k: 0, r: 1, q: f.d }; }
    var g = gcd(gcd(p, k), q) || 1;
    return { p: p / g, k: k / g, r: r, q: q / g };
  }
  function surdVal(s) { return (s.p + s.k * Math.sqrt(s.r)) / s.q; }
  function surdIsRational(s) { return s.k === 0; }

  function surdHTML(s) {
    if (s.k === 0) return fracHTML(frac(s.p, s.q));
    var num = '';
    if (s.p !== 0) num += numStr(s.p) + ' ' + (s.k < 0 ? MINUS : '+') + ' ';
    else if (s.k < 0) num += MINUS;
    var mag = Math.abs(s.k);
    num += (mag === 1 ? '' : mag) + sqrtHTML(s.r);
    if (s.q === 1) return num;
    return '<span class="frac"><span>' + num + '</span><span>' + s.q + '</span></span>';
  }

  /* ---------- 係數輸入：吃整數、小數、分數 ---------- */
  function parseCoef(str) {
    var t = String(str == null ? '' : str).trim()
      .replace(/[−–—]/g, '-')     // 各種破折號一律當減號
      .replace(/[０-９]/g, function (c) { // 全形數字
        return String.fromCharCode(c.charCodeAt(0) - 0xFEE0);
      })
      .replace(/\s+/g, '');
    if (t === '') return null;
    var m;
    if ((m = t.match(/^([+-]?\d+)\/(\d+)$/))) {
      if (+m[2] === 0) return null;
      return frac(+m[1], +m[2]);
    }
    if ((m = t.match(/^([+-]?)(\d*)\.(\d+)$/))) {
      var d = Math.pow(10, m[3].length);
      var n = (+((m[2] || '0') + m[3])) * (m[1] === '-' ? -1 : 1);
      return frac(n, d);
    }
    if (/^[+-]?\d+$/.test(t)) return frac(+t, 1);
    return null;
  }

  window.MathNum = {
    MINUS: MINUS,
    gcd: gcd, lcm: lcm,
    frac: frac, fAdd: fAdd, fSub: fSub, fMul: fMul, fDiv: fDiv, fNeg: fNeg,
    fVal: fVal, fIsInt: fIsInt, fIsZero: fIsZero,
    fracStr: fracStr, fracHTML: fracHTML, numStr: numStr,
    simplifySqrt: simplifySqrt, sqrtHTML: sqrtHTML,
    surd: surd, surdVal: surdVal, surdIsRational: surdIsRational, surdHTML: surdHTML,
    parseCoef: parseCoef
  };
})();
