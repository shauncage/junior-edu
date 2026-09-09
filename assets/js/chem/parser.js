/* ---------------------------------------------------------------
 * 化學式解析器
 * 支援：Ca(OH)2、Fe2(SO4)3、CuSO4·5H2O、K₂Cr₂O₇（下標數字）
 * -------------------------------------------------------------*/
(function (global) {
  'use strict';

  var SUBSCRIPT = { '₀':'0','₁':'1','₂':'2','₃':'3','₄':'4','₅':'5','₆':'6','₇':'7','₈':'8','₉':'9' };
  var SUPERSCRIPT = { '⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9' };

  function normalize(input) {
    var s = String(input || '').trim();
    s = s.replace(/[₀-₉]/g, function (c) { return SUBSCRIPT[c]; });
    s = s.replace(/[⁰-⁹]/g, function (c) { return SUPERSCRIPT[c]; });
    s = s.replace(/[\s　]/g, '');
    s = s.replace(/[（]/g, '(').replace(/[）]/g, ')');
    s = s.replace(/[［【]/g, '[').replace(/[］】]/g, ']');
    // 各種水合點統一成「·」
    s = s.replace(/[.。、*x×⋅•‧・]/g, '·');
    return s;
  }

  // 解析單一片段（無水合點），回傳頂層單元陣列
  function parseUnits(s) {
    var units = [];
    var i = 0;
    while (i < s.length) {
      var c = s[i];
      if (c === '(' || c === '[') {
        var close = c === '(' ? ')' : ']';
        var depth = 1, j = i + 1;
        while (j < s.length && depth > 0) {
          if (s[j] === c) depth++;
          else if (s[j] === close) depth--;
          j++;
        }
        if (depth !== 0) throw new Error('括號沒有成對關閉');
        var inner = s.slice(i + 1, j - 1);
        if (!inner) throw new Error('括號內是空的');
        i = j;
        var gn = '';
        while (i < s.length && /[0-9]/.test(s[i])) gn += s[i++];
        units.push({ type: 'group', raw: inner, n: gn ? parseInt(gn, 10) : 1, units: parseUnits(inner) });
      } else if (/[A-Z]/.test(c)) {
        var sym = c; i++;
        while (i < s.length && /[a-z]/.test(s[i])) sym += s[i++];
        if (!global.Elements.bySym(sym)) {
          // 可能是把兩個元素連寫（例如 CO 被誤讀），先試著只取一個大寫字母
          if (sym.length > 1 && global.Elements.bySym(sym[0])) {
            i -= (sym.length - 1);
            sym = sym[0];
          } else {
            throw new Error('查無元素符號「' + sym + '」');
          }
        }
        var en = '';
        while (i < s.length && /[0-9]/.test(s[i])) en += s[i++];
        units.push({ type: 'el', sym: sym, n: en ? parseInt(en, 10) : 1 });
      } else if (c === ')' || c === ']') {
        throw new Error('多餘的右括號');
      } else {
        throw new Error('無法辨識的字元「' + c + '」');
      }
    }
    return units;
  }

  function accumulate(units, factor, counts) {
    units.forEach(function (u) {
      if (u.type === 'el') {
        counts[u.sym] = (counts[u.sym] || 0) + u.n * factor;
      } else {
        accumulate(u.units, u.n * factor, counts);
      }
    });
    return counts;
  }

  function parse(input) {
    var norm = normalize(input);
    if (!norm) return { ok: false, error: '請先輸入化學式' };
    try {
      var rawSegs = norm.split('·').filter(function (x) { return x !== ''; });
      if (!rawSegs.length) throw new Error('請先輸入化學式');
      var segments = rawSegs.map(function (seg) {
        var m = seg.match(/^([0-9]+)(.*)$/);
        var mult = 1, body = seg;
        if (m) { mult = parseInt(m[1], 10); body = m[2]; }
        if (!body) throw new Error('「' + seg + '」缺少化學式主體');
        return { mult: mult, body: body, units: parseUnits(body) };
      });

      var counts = {};
      segments.forEach(function (sg) { accumulate(sg.units, sg.mult, counts); });

      var order = [];
      (function walk(units) {
        units.forEach(function (u) {
          if (u.type === 'el') { if (order.indexOf(u.sym) === -1) order.push(u.sym); }
          else walk(u.units);
        });
      })(segments.reduce(function (a, s) { return a.concat(s.units); }, []));

      var mass = 0, massKnown = true;
      order.forEach(function (sym) {
        var el = global.Elements.bySym(sym);
        if (!el || !isFinite(el.mass)) { massKnown = false; return; }
        mass += el.mass * counts[sym];
      });

      var totalAtoms = order.reduce(function (a, s) { return a + counts[s]; }, 0);

      return {
        ok: true,
        input: String(input).trim(),
        formula: norm,
        segments: segments,
        isHydrate: segments.length > 1,
        counts: counts,
        order: order,
        mass: massKnown ? mass : null,
        totalAtoms: totalAtoms
      };
    } catch (e) {
      return { ok: false, error: e.message, formula: norm };
    }
  }

  // 把 H2SO4 轉成帶 <sub> 的 HTML
  function toHTML(formula) {
    var s = normalize(formula);
    var out = '';
    for (var i = 0; i < s.length; i++) {
      if (/[0-9]/.test(s[i])) {
        var num = '';
        while (i < s.length && /[0-9]/.test(s[i])) num += s[i++];
        i--;
        // 水合點後、或字串開頭的數字是係數，不做下標
        var prev = out.replace(/<\/?sub>/g, '').slice(-1);
        if (prev === '' || prev === '·') out += num;
        else out += '<sub>' + num + '</sub>';
      } else {
        out += s[i] === '&' ? '&amp;' : s[i];
      }
    }
    return out;
  }

  global.ChemParser = { parse: parse, normalize: normalize, toHTML: toHTML };
})(window);
