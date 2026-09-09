/* ---------------------------------------------------------------
 * 中文命名 + 氧化數推算 + 鍵結分析
 * -------------------------------------------------------------*/
(function (global) {
  'use strict';

  var NUM_ZH = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
                '十一', '十二'];

  function numZh(n) { return NUM_ZH[n] || String(n); }

  function sup(n) {
    // 把 +2 / -1 轉成 ²⁺ / ⁻ 形式
    var map = { '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹' };
    var abs = Math.abs(n);
    var digits = abs === 1 ? '' : String(abs).replace(/[0-9]/g, function (c) { return map[c]; });
    return digits + (n >= 0 ? '⁺' : '⁻');
  }

  function signed(n) { return (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n); }

  /* ---------- 1. 氧化數推算 ---------------------------------- */
  // 依「已知價數優先」逐步指定，最後只剩一種元素時解方程式
  var OX_RULES = [
    { test: function (e) { return e.sym === 'F'; },                    val: -1, why: '氟在化合物中固定為 −1' },
    { test: function (e) { return e.cat === 'alkali'; },               val: +1, why: '鹼金屬固定為 +1' },
    { test: function (e) { return e.cat === 'alkaline'; },             val: +2, why: '鹼土金屬固定為 +2' },
    { test: function (e) { return e.sym === 'Al'; },                   val: +3, why: '鋁固定為 +3' },
    { test: function (e) { return e.sym === 'Zn' || e.sym === 'Cd'; }, val: +2, why: '鋅固定為 +2' },
    { test: function (e) { return e.sym === 'Ag'; },                   val: +1, why: '銀固定為 +1' },
    { test: function (e) { return e.sym === 'H'; },                    val: +1, why: '氫與非金屬結合時為 +1' },
    { test: function (e) { return e.sym === 'O'; },                    val: -2, why: '氧一般為 −2' }
  ];

  // 解一個「群組」的氧化數：所有 氧化數×原子數 的總和 = target（分子為 0，離子為其電荷）
  function solveGroup(counts, order, target) {
    var known = {}, steps = [], unknown = order.slice();

    if (order.length === 1 && target === 0) {
      known[order[0]] = 0;
      steps.push('單一元素組成的物質（單質），氧化數定為 0');
      return { known: known, resolved: true, steps: steps };
    }

    for (var r = 0; r < OX_RULES.length && unknown.length > 1; r++) {
      var rule = OX_RULES[r];
      for (var k = unknown.length - 1; k >= 0 && unknown.length > 1; k--) {
        var el = global.Elements.bySym(unknown[k]);
        if (el && rule.test(el)) {
          known[el.sym] = rule.val;
          steps.push(el.zh + ' ' + el.sym + ' = ' + signed(rule.val) + '（' + rule.why + '）');
          unknown.splice(k, 1);
        }
      }
    }

    if (unknown.length === 1) {
      var sym = unknown[0];
      var sum = 0;
      Object.keys(known).forEach(function (s2) { sum += known[s2] * counts[s2]; });
      var val = (target - sum) / counts[sym];
      var e2 = global.Elements.bySym(sym);
      var goal = target === 0 ? '整體電中性（總和 = 0）' : '整顆離子帶 ' + signed(target) + ' 價';
      if (Number.isInteger(val)) {
        known[sym] = val;
        var sumTxt = sum < 0 ? '(' + signed(sum) + ')' : signed(sum);
        steps.push(goal + ' → ' + (e2 ? e2.zh : sym) + ' ' + sym + ' = [' + signed(target) +
                   ' − ' + sumTxt + '] ÷ ' + counts[sym] + ' 個 = ' + signed(val));
        return { known: known, resolved: true, steps: steps };
      }
      known[sym] = val;
      steps.push('計算得 ' + sym + ' 的平均氧化數 = ' + val.toFixed(2) +
                 '（非整數，代表同一元素在化合物中有不同價態，例如 Fe₃O₄ 同時含 +2 與 +3 價鐵）');
      return { known: known, resolved: true, fractional: true, steps: steps };
    }

    steps.push('剩下 ' + unknown.join('、') + ' 無法只靠通則判斷');
    return { known: known, resolved: false, unresolved: unknown, steps: steps };
  }

  function oxidationStates(counts, order) {
    return solveGroup(counts, order, 0);
  }

  // 把化學式片段（如 SO4、NH4）拆成元素個數
  function fragmentCounts(frag) {
    var p = global.ChemParser.parse(frag);
    return p.ok ? { counts: p.counts, order: p.order } : null;
  }

  /* ---------- 2. 離子化合物拆解 ------------------------------ */
  function matchCationAtStart(s) {
    var cat = global.Ions.cation('NH4');
    if (s.indexOf('(NH4)') === 0) {
      var m = s.slice(5).match(/^([0-9]*)/);
      var n = m[1] ? parseInt(m[1], 10) : 1;
      return { kind: 'ion', key: 'NH4', zh: cat.zh, charge: cat.charge, n: n, len: 5 + m[1].length };
    }
    if (s.indexOf('NH4') === 0) {
      var m2 = s.slice(3).match(/^([0-9]*)/);
      return { kind: 'ion', key: 'NH4', zh: cat.zh, charge: cat.charge,
               n: m2[1] ? parseInt(m2[1], 10) : 1, len: 3 + m2[1].length };
    }
    for (var len = 2; len >= 1; len--) {
      var sym = s.slice(0, len);
      var el = global.Elements.bySym(sym);
      if (el && el.metal) {
        var m3 = s.slice(len).match(/^([0-9]*)/);
        return { kind: 'el', key: sym, el: el, zh: el.zh,
                 n: m3[1] ? parseInt(m3[1], 10) : 1, len: len + m3[1].length };
      }
    }
    return null;
  }

  function matchAnionWhole(s) {
    if (!s) return null;
    // 帶括號的根：(OH)2、(SO4)3
    if (s[0] === '(') {
      var close = s.indexOf(')');
      if (close < 0) return null;
      var inner = s.slice(1, close);
      var rest = s.slice(close + 1);
      if (!/^[0-9]*$/.test(rest)) return null;
      var ion = global.Ions.anion(inner);
      if (!ion) return null;
      return { kind: 'ion', key: inner, ion: ion, zh: ion.zh, charge: ion.charge,
               n: rest ? parseInt(rest, 10) : 1 };
    }
    // 不帶括號的根：SO4、HCO3、NO3
    for (var i = 0; i < global.Ions.anionKeys.length; i++) {
      var key = global.Ions.anionKeys[i];
      if (s.indexOf(key) === 0) {
        var tail = s.slice(key.length);
        if (/^[0-9]*$/.test(tail)) {
          var a = global.Ions.anion(key);
          return { kind: 'ion', key: key, ion: a, zh: a.zh, charge: a.charge,
                   n: tail ? parseInt(tail, 10) : 1 };
        }
      }
    }
    // 單一非金屬元素：Cl、O2、S
    var m = s.match(/^([A-Z][a-z]?)([0-9]*)$/);
    if (m) {
      var el = global.Elements.bySym(m[1]);
      if (el && !el.metal) {
        var charge = global.Ions.simpleAnionCharge[el.sym];
        if (charge == null) return null;
        return { kind: 'el', key: el.sym, el: el, zh: el.zh, charge: charge,
                 n: m[2] ? parseInt(m[2], 10) : 1 };
      }
    }
    return null;
  }

  var YA_METALS = ['Fe', 'Cu', 'Sn', 'Pb', 'Hg', 'Cr', 'Mn', 'Co', 'Ni', 'Au', 'Tl'];

  // 決定金屬中文名是否要加「亞」
  function metalName(el, oxidation) {
    if (!el) return '';
    var states = el.oxNum.filter(function (v) { return v > 0; }).sort(function (a, b) { return a - b; });
    if (states.length < 2 || YA_METALS.indexOf(el.sym) === -1 || oxidation == null) {
      return { name: el.zh, note: null };
    }
    if (oxidation === states[0]) {
      return { name: '亞' + el.zh, note: el.zh + '有 ' + states.map(signed).join('、') +
               ' 兩種價數，此處為較低的 ' + signed(oxidation) + '，所以叫「亞' + el.zh + '」' };
    }
    if (oxidation === states[states.length - 1]) {
      return { name: el.zh, note: el.zh + '有 ' + states.map(signed).join('、') +
               ' 兩種價數，此處為較高的 ' + signed(oxidation) + '，直接叫「' + el.zh + '」' };
    }
    return { name: el.zh, note: el.zh + '在此的價數為 ' + signed(oxidation) };
  }

  /* ---------- 3. 命名主流程 ---------------------------------- */
  function nameIonic(formula, ox) {
    var cation = matchCationAtStart(formula);
    if (!cation) return null;
    var anion = matchAnionWhole(formula.slice(cation.len));
    if (!anion) return null;

    var totalNeg = anion.charge * anion.n;
    var metalOx = cation.kind === 'el' ? -totalNeg / cation.n : cation.charge;
    var mn = cation.kind === 'el'
      ? metalName(cation.el, Number.isInteger(metalOx) ? metalOx : null)
      : { name: cation.zh, note: '銨根 NH₄⁺ 帶 +1 價，命名時當作金屬離子處理' };

    var name;
    if (anion.kind === 'ion') {
      name = anion.ion.zh + (anion.ion.join === 'hua' ? '化' : '') + mn.name;
    } else {
      name = anion.zh + '化' + mn.name;
    }

    var explain = [];
    explain.push('這是**離子化合物**，中文命名的順序是「陰離子 → 陽離子」，和化學式的書寫順序相反。');
    if (anion.kind === 'ion') {
      explain.push('陰離子是 ' + anion.key + sup(anion.charge) + '（' + anion.ion.zh + '根），' +
                   (anion.ion.join === 'hua'
                     ? '酸根以外的根命名時中間要加「化」。'
                     : '酸根直接接在金屬名前面。'));
    } else {
      explain.push('陰離子是 ' + anion.key + sup(anion.charge) + '（' + anion.zh + '離子），' +
                   '兩種元素組成的鹽用「非金屬 + 化 + 金屬」命名。');
    }
    explain.push('陽離子是 ' + cation.key + (Number.isInteger(metalOx) ? sup(metalOx) : '') + '（' + mn.name + '）。');
    if (mn.note) explain.push(mn.note + '。');

    var balance = null;
    if (Number.isInteger(metalOx)) {
      balance = {
        cation: { key: cation.key, charge: metalOx, n: cation.n },
        anion: { key: anion.key, charge: anion.charge, n: anion.n },
        text: '(' + signed(metalOx) + ') × ' + cation.n + ' 個 ＋ (' + signed(anion.charge) +
              ') × ' + anion.n + ' 個 ＝ ' + signed(metalOx * cation.n + anion.charge * anion.n) +
              '，正負電荷剛好抵消，所以化學式是 ' + formula + '。'
      };
    }

    return {
      name: name,
      type: '離子化合物',
      rule: '離子化合物命名法',
      explain: explain,
      balance: balance,
      cation: cation,
      anion: anion
    };
  }

  function nameAcid(formula) {
    if (formula[0] !== 'H') return null;
    var m = formula.match(/^H([0-9]*)(.*)$/);
    var hCount = m[1] ? parseInt(m[1], 10) : 1;
    var rest = m[2];
    if (!rest) return null;

    var ion = global.Ions.anion(rest);
    if (ion && ion.acid && ion.join === 'direct' && Math.abs(ion.charge) === hCount) {
      return {
        name: ion.acid,
        type: '酸',
        rule: '含氧酸命名法',
        explain: [
          '化學式以 H 開頭、後面接酸根，屬於**酸**。',
          '酸根 ' + rest + sup(ion.charge) + ' 是「' + ion.zh + '根」，配上 ' + hCount +
            ' 個 H⁺ 剛好電中性，所以叫「' + ion.acid + '」。',
          '在水溶液中會解離出 H⁺，使溶液呈酸性、pH < 7。'
        ]
      };
    }

    if (ion && ion.join === 'hua' && Math.abs(ion.charge) === hCount) {
      return {
        name: ion.zh + '化氫',
        type: '共價化合物（分子化合物）',
        rule: '根離子 + 氫',
        explain: [
          rest + sup(ion.charge) + ' 是「' + ion.zh + '根」，配上 ' + hCount +
            ' 個氫剛好電中性，命名為「' + ion.zh + '化氫」。'
        ]
      };
    }

    var em = rest.match(/^([A-Z][a-z]?)([0-9]*)$/);
    if (em) {
      var el = global.Elements.bySym(em[1]);
      if (el && !el.metal && el.sym !== 'O') {
        return {
          name: el.zh + '化氫',
          type: '二元酸（氫化物）',
          rule: '二元酸命名法',
          explain: [
            '由氫和一個非金屬組成，純物質叫「' + el.zh + '化氫」。',
            '溶於水後會解離出 H⁺，水溶液另有酸名（例如 HCl 氣體叫氯化氫，水溶液叫鹽酸）。'
          ]
        };
      }
    }
    return null;
  }

  function nameCovalent(formula, counts, order) {
    if (order.length !== 2) return null;
    var a = global.Elements.bySym(order[0]);
    var b = global.Elements.bySym(order[1]);
    if (!a || !b || a.metal || b.metal) return null;
    var na = counts[a.sym], nb = counts[b.sym];
    var name = numZh(nb) + b.zh + '化' + (na > 1 ? numZh(na) : '') + a.zh;
    return {
      name: name,
      type: '共價化合物（分子化合物）',
      rule: '共價化合物命名法',
      explain: [
        '兩個都是**非金屬**，以共用電子對結合，屬於共價（分子）化合物。',
        '命名寫成「數字＋後面元素＋化＋數字＋前面元素」，順序和化學式相反。',
        '後面元素的個數一定要寫（' + numZh(nb) + '），前面元素只有在超過 1 個時才寫（本例為 ' +
          (na > 1 ? numZh(na) : '省略') + '）。'
      ]
    };
  }

  function nameElement(counts, order) {
    if (order.length !== 1) return null;
    var el = global.Elements.bySym(order[0]);
    var n = counts[el.sym];
    return {
      name: el.zh + (el.cat === 'noble' || (n === 2 && ['H','O','N','F','Cl'].indexOf(el.sym) >= 0) ? '氣' : ''),
      type: '單質（純元素）',
      rule: '單質',
      explain: [
        '只由一種元素組成，稱為**單質**。',
        n > 1 ? '一個分子由 ' + n + ' 個 ' + el.sym + ' 原子組成。'
              : '以單一原子或巨大結構的形式存在。',
        '單質中原子的氧化數定為 0。'
      ]
    };
  }

  /* ---------- 4. 鍵結分析 ------------------------------------ */
  function bonding(parsed, ionicInfo) {
    var order = parsed.order;
    var metals = order.filter(function (s) { return global.Elements.isMetal(s); });
    var nonmetals = order.filter(function (s) { return !global.Elements.isMetal(s); });

    var kind, desc, extras = [];

    if (order.length === 1) {
      var el = global.Elements.bySym(order[0]);
      if (el.metal) {
        kind = '金屬鍵';
        desc = '金屬原子放出價電子形成「電子海」，把金屬陽離子黏在一起，因此能導電、有延展性。';
      } else if (parsed.counts[el.sym] > 1) {
        kind = '共價鍵';
        desc = '同種非金屬原子以共用電子對結合成分子，因為兩端電負度相同，屬於「非極性共價鍵」。';
      } else {
        kind = '無化學鍵（單原子）';
        desc = '惰性氣體最外層電子已達安定，通常以單原子存在，不形成化學鍵。';
      }
    } else if ((metals.length && nonmetals.length) ||
               (ionicInfo && ionicInfo.type === '離子化合物')) {
      kind = '離子鍵';
      desc = (metals.length
        ? '金屬把電子給非金屬，形成帶正電與帶負電的離子，靠靜電引力結合。'
        : '雖然組成裡沒有金屬，但銨根 NH₄⁺ 扮演陽離子的角色，與陰離子以靜電引力結合，仍屬離子化合物。');
      extras.push('離子化合物在常溫多為晶體，熔點高、硬而脆。');
      extras.push('固態不導電，熔融或溶於水後可導電（是電解質）。');
      if (ionicInfo && ionicInfo.anion && ionicInfo.anion.kind === 'ion') {
        extras.push('注意：根離子 ' + ionicInfo.anion.key + ' 的內部（例如 ' +
                    ionicInfo.anion.key + ' 裡的原子之間）是**共價鍵**，' +
                    '整顆根離子再與金屬離子形成離子鍵。');
      }
    } else if (metals.length > 1 && !nonmetals.length) {
      kind = '金屬鍵';
      desc = '全部都是金屬，原子間以金屬鍵結合（合金）。';
    } else {
      kind = '共價鍵';
      desc = '全部都是非金屬，原子之間共用電子對達到安定。';
      extras.push('分子化合物熔點沸點通常較低，多半不導電。');
    }

    // 電負度差：只在共價鍵時顯示，用來分辨極性／非極性；
    // 離子化合物若也顯示差值容易和「金屬＋非金屬 → 離子鍵」的判準互相矛盾，故略過。
    var enPairs = [];
    if (order.length >= 2 && kind === '共價鍵') {
      var withEn = order.filter(function (s) { return global.Elements.bySym(s).en != null; });
      if (withEn.length >= 2) {
        var vals = withEn.map(function (s) { return global.Elements.bySym(s); });
        vals.sort(function (x, y) { return x.en - y.en; });
        var lo = vals[0], hi = vals[vals.length - 1];
        var d = +(hi.en - lo.en).toFixed(2);
        enPairs.push({
          pair: lo.sym + ' – ' + hi.sym,
          diff: d,
          hint: d >= 1.7 ? '差值 ≥ 1.7，偏向離子鍵'
              : d >= 0.4 ? '差值介於 0.4 ～ 1.7，屬於極性共價鍵'
              : '差值 < 0.4，屬於非極性共價鍵'
        });
      }
    }

    return { kind: kind, desc: desc, extras: extras, metals: metals, nonmetals: nonmetals, en: enPairs };
  }

  /* ---------- 5. 離子分開求氧化數 ---------------------------- */
  function buildOxParts(naming) {
    if (!naming || !naming.cation || !naming.anion) return null;
    var parts = [];

    var c = naming.cation;
    if (c.kind === 'el' && naming.balance) {
      var k = {}; k[c.key] = naming.balance.cation.charge;
      parts.push({
        label: c.key + sup(naming.balance.cation.charge),
        title: c.zh + '離子',
        known: k,
        steps: [c.zh + ' ' + c.key + ' = ' + signed(naming.balance.cation.charge) +
                '（由電荷平衡推得）']
      });
    } else if (c.kind === 'ion') {
      var fc = fragmentCounts(c.key);
      if (fc) {
        var r = solveGroup(fc.counts, fc.order, c.charge);
        parts.push({ label: c.key + sup(c.charge), title: c.zh + '根',
                     known: r.known, steps: r.steps });
      }
    }

    var a = naming.anion;
    if (a.kind === 'ion') {
      var fa = fragmentCounts(a.key);
      if (fa) {
        var r2 = solveGroup(fa.counts, fa.order, a.charge);
        parts.push({ label: a.key + sup(a.charge), title: a.zh + '根',
                     known: r2.known, steps: r2.steps });
      }
    } else if (a.kind === 'el') {
      var k2 = {}; k2[a.key] = a.charge;
      parts.push({ label: a.key + sup(a.charge), title: a.zh + '離子',
                   known: k2, steps: [a.zh + ' ' + a.key + ' = ' + signed(a.charge)] });
    }

    return parts.length >= 2 ? parts : null;
  }

  // 用各離子的結果補上整體算不出來的元素；同一元素在不同離子價數不同時記錄下來
  function mergeOxParts(ox, counts) {
    if (!ox.parts) return;
    var conflicts = [];
    ox.parts.forEach(function (part) {
      Object.keys(part.known).forEach(function (sym) {
        var v = part.known[sym];
        if (ox.known[sym] == null) {
          ox.known[sym] = v;
        } else if (ox.known[sym] !== v && conflicts.indexOf(sym) === -1) {
          conflicts.push(sym);
        }
      });
    });
    ox.conflicts = conflicts;
    // 補完後檢查是否所有元素都有值
    ox.resolved = Object.keys(counts).every(function (s) { return ox.known[s] != null; });
    if (ox.parts) {
      ox.steps.push('把化合物拆成「' + ox.parts.map(function (p) { return p.label; }).join('」和「') +
                    '」兩個離子，各自求解會更清楚。');
    }
  }

  /* ---------- 5. 對外主函式 ---------------------------------- */
  function analyze(input) {
    var parsed = global.ChemParser.parse(input);
    if (!parsed.ok) return parsed;

    var ox = oxidationStates(parsed.counts, parsed.order);

    var dict = global.Compounds.lookup(parsed.formula);
    var naming = null;

    // 水合物：先命名主體，再加上「n 水合」
    var mainFormula = parsed.segments[0].body;
    var hydrate = null;
    if (parsed.isHydrate) {
      var last = parsed.segments[parsed.segments.length - 1];
      if (last.body === 'H2O') hydrate = last.mult;
    }

    var target = parsed.isHydrate ? mainFormula : parsed.formula;
    naming = nameElement(parsed.counts, parsed.order)
          || nameIonic(target, ox)
          || nameAcid(target)
          || nameCovalent(target, parsed.counts, parsed.order);

    if (parsed.isHydrate && naming && hydrate) {
      naming = {
        name: numZh(hydrate) + '水合' + naming.name,
        type: '結晶水合物',
        rule: naming.rule + ' ＋ 水合物命名',
        explain: naming.explain.concat([
          '化學式中的「·' + hydrate + 'H₂O」是**結晶水**，代表每 1 個 ' + mainFormula +
            ' 帶著 ' + hydrate + ' 個水分子一起結晶，所以名稱前面加「' + numZh(hydrate) + '水合」。',
          '加熱後結晶水會脫離，變成無水化合物（常伴隨明顯的顏色變化）。'
        ]),
        balance: naming.balance,
        cation: naming.cation,
        anion: naming.anion
      };
    }

    // 離子化合物：把陽離子、陰離子分開各自求氧化數，比整體平均更準也更好教
    ox.parts = buildOxParts(naming);
    mergeOxParts(ox, parsed.counts);

    var bond = bonding(parsed, naming);

    var elements = parsed.order.map(function (sym) {
      var el = global.Elements.bySym(sym);
      return {
        el: el,
        count: parsed.counts[sym],
        ox: ox.known[sym] != null ? ox.known[sym] : null,
        massPercent: parsed.mass ? (el.mass * parsed.counts[sym] / parsed.mass * 100) : null
      };
    });

    return {
      ok: true,
      parsed: parsed,
      dict: dict,
      name: dict ? dict.name : (naming ? naming.name : null),
      alias: dict ? dict.alias : '',
      note: dict ? dict.note : '',
      autoName: naming ? naming.name : null,
      naming: naming,
      oxidation: ox,
      bond: bond,
      elements: elements
    };
  }

  global.ChemNamer = { analyze: analyze, signed: signed, sup: sup, numZh: numZh };
})(window);
