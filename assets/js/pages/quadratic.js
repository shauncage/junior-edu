/* ---------------------------------------------------------------
 * 一元二次方程式 — 頁面邏輯
 * -------------------------------------------------------------*/
(function () {
  'use strict';

  var M = window.MathNum;
  var Q = window.Quadratic;
  var MINUS = M.MINUS;

  var $ = function (s) { return document.querySelector(s); };
  var inA = $('#coef-a'), inB = $('#coef-b'), inC = $('#coef-c');
  var resultBox = $('#result');
  var echoBox = $('#eq-echo');

  function esc(s) {
    return String(s).replace(/[&<>]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c];
    });
  }

  /* ---------- 各個區塊 ---------- */

  function head(r) {
    var ans;
    if (r.kind === 'none') {
      ans = '沒有實數解';
    } else if (r.kind === 'double') {
      ans = 'x = ' + M.surdHTML(r.roots[0]);
    } else {
      ans = 'x = ' + M.surdHTML(r.roots[0]) + '　或　x = ' + M.surdHTML(r.roots[1]);
    }

    var badges = [
      '<span class="badge badge-accent">' +
        (r.kind === 'two' ? '兩個相異實根' : r.kind === 'double' ? '重根（兩根相同）' : '無實數解') + '</span>',
      '<span class="badge">判別式 D = ' + M.numStr(r.D) + '</span>',
      '<span class="badge">開口向' + (r.opens === 'up' ? '上' : '下') + '</span>',
      '<span class="badge ' + (r.factor ? 'badge-ok' : 'badge-warn') + '">' +
        (r.factor ? '可以因式分解' : '整數範圍內分解不了') + '</span>'
    ];
    if (r.kind !== 'none' && r.roots.every(function (s) { return M.surdIsRational(s); })) {
      badges.push('<span class="badge badge-ok">有理根</span>');
    } else if (r.kind !== 'none') {
      badges.push('<span class="badge">無理根（帶根號）</span>');
    }

    return '<div class="result-head">' +
      (r.normalized
        ? '<div class="result-alias" style="margin-bottom:4px">原式 <span class="math">' + r.givenEqHTML +
          '</span>　→　整理成整數係數：</div>'
        : '') +
      '<div class="result-formula math">' + r.eqHTML + '</div>' +
      '<div class="result-name" style="font-size:1.9rem;margin-top:10px">' + ans + '</div>' +
      '<div class="badges">' + badges.join('') + '</div></div>';
  }

  function graphCard(r) {
    var stats = [
      ['判別式 D = b² ' + MINUS + ' 4ac', M.numStr(r.D) + '　' +
        (r.D > 0 ? '> 0' : r.D === 0 ? '= 0' : '< 0')],
      ['對稱軸', 'x = ' + M.fracHTML(r.vertex.h)],
      ['頂點', '(' + M.fracHTML(r.vertex.h) + ', ' + M.fracHTML(r.vertex.k) + ')'],
      ['與 y 軸交點', '(0, ' + M.numStr(r.c) + ')'],
      ['兩根之和 ' + MINUS + 'b/a', M.fracHTML(r.sum)],
      ['兩根之積 c/a', M.fracHTML(r.prod)]
    ].map(function (p) {
      return '<div class="stat"><div class="stat-k">' + p[0] + '</div><div class="stat-v">' + p[1] + '</div></div>';
    }).join('');

    return '<div class="card"><h2>圖形長什麼樣子</h2>' +
      '<div class="card-sub">紅點是方程式的解（拋物線和 x 軸的交點），紫點是頂點，紫色虛線是對稱軸。' +
      '「解方程式」在圖上就是「找拋物線穿過 x 軸的地方」。</div>' +
      '<div class="plot-wrap" id="plot"></div>' +
      '<div class="callout"><span class="k">頂點式</span>：<span class="math">' + r.tw.vertexForm +
      '</span>　— 這就是配方法算出來的東西，把它畫出來就是上面這條線。' +
      (r.kind === 'none'
        ? '　因為判別式是負的，拋物線整條在 x 軸的' + (r.opens === 'up' ? '上' : '下') + '方，碰不到 x 軸。'
        : '') +
      '</div></div>';
  }

  function methodHTML(m, cls, flagText) {
    if (!m) return '';
    return '<div class="method ' + cls + (m.hit === false ? ' is-off' : '') + '">' +
      '<h3><span class="flag ' + (cls === 'method-tw' ? 'flag-tw' : 'flag-in') + '">' + flagText + '</span>' +
      esc(m.title) + (m.sanskrit ? '<span class="romaji">' + esc(m.sanskrit) + '</span>' : '') + '</h3>' +
      '<ol>' + m.steps.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ol></div>';
  }

  function twCard(r) {
    var cards = [
      methodHTML(r.tw.formula, 'method-tw', '台灣'),
      methodHTML(r.tw.complete, 'method-tw', '台灣'),
      r.tw.cross ? methodHTML(r.tw.cross, 'method-tw', '台灣')
        : '<div class="method method-tw is-off"><h3><span class="flag flag-tw">台灣</span>十字相乘法</h3>' +
          '<p style="margin:10px 0 0;font-size:.93rem;color:var(--muted)">' +
          '這一題在整數範圍內湊不出來（判別式 ' + M.numStr(r.D) +
          ' 不是完全平方數），十字相乘沒辦法用，只能走公式解或配方法。</p></div>'
    ];
    return '<div class="card"><h2>台灣課本的解法</h2>' +
      '<div class="card-sub">課本順序是「先看能不能因式分解 → 不行就配方法／公式解」。三招都會得到同樣的答案。</div>' +
      '<div class="grid grid-3">' + cards.join('') + '</div></div>';
  }

  function inCard(r) {
    var cards = [
      methodHTML(r.in.vilokanam, 'method-in', '印度'),
      r.in.split ? methodHTML(r.in.split, 'method-in', '印度')
        : '<div class="method method-in is-off"><h3><span class="flag flag-in">印度</span>分裂中項法' +
          '<span class="romaji">Splitting the Middle Term</span></h3>' +
          '<p style="margin:10px 0 0;font-size:.93rem;color:var(--muted)">' +
          '找不到兩個整數同時滿足「相乘 = a×c = ' + M.numStr(r.a * r.c) + '」和「相加 = b = ' +
          M.numStr(r.b) + '」，所以這題分裂不了。</p></div>',
      methodHTML(r.in.sumdiff, 'method-in', '印度'),
      methodHTML(r.in.differential, 'method-in', '印度')
    ];
    return '<div class="card"><h2>印度式（吠陀數學）的解法</h2>' +
      '<div class="card-sub">印度式的順序反過來：<b>先看係數有沒有模式可以偷懶</b>，真的沒有才動筆算。' +
      '灰掉的那張表示這一題沒命中該招的條件。</div>' +
      '<div class="grid grid-2">' + cards.join('') + '</div>' +
      '<div class="callout"><span class="k">先講清楚</span>：台灣講的「印度式數學」多半是指 1965 年出版的' +
      '《Vedic Mathematics》整理的 16 條口訣（sūtra），走的是<b>心算捷徑</b>路線。' +
      '印度學校的正式課本（NCERT）其實也教公式解與配方法，只是因式分解習慣寫成「分裂中項」。' +
      '所以下面比的是<b>「口訣捷徑」與「台灣課本流程」</b>，不是在說哪一國比較厲害。</div></div>';
  }

  function compareCard(r) {
    var rows = [
      ['第一步想什麼', '先算判別式 D，判斷有幾個根', '先看係數有沒有特殊關係，能秒解就不算了'],
      ['因式分解', '十字相乘：畫交叉圖，心算湊中間項', '分裂中項：把 b 拆成兩個數，分組提公因式'],
      ['主力公式', 'x = (' + MINUS + 'b ± ' + M.sqrtHTML('D') + ') / 2a，一招打天下',
        '和 = ' + MINUS + 'b/a、差 = ' + M.sqrtHTML('D') + '/|a|，再取平均'],
      ['判別式的角色', '每題必算，是流程的一部分', '只有需要「兩根之差」時才算'],
      ['特殊型', '課本不特別強調',
        'a+b+c=0 → 一根是 1；a' + MINUS + 'b+c=0 → 一根是 ' + MINUS + '1'],
      ['寫法', '步驟完整寫出來，方便老師改', '盡量壓成一兩行，靠心算'],
      ['強在哪', '任何題目都能做，考試好拿過程分', '選擇題、檢查答案、心算比賽快很多'],
      ['弱在哪', '遇到簡單題也要繞一大圈', '口訣多，記錯就用錯；不合模式時還是要回到公式解']
    ].map(function (p) {
      return '<tr><td style="font-weight:600;white-space:nowrap">' + p[0] +
        '</td><td>' + p[1] + '</td><td>' + p[2] + '</td></tr>';
    }).join('');

    /* 這一題實際上各招花幾步 */
    var counts = [
      ['台灣・公式解', r.tw.formula.steps.length, true],
      ['台灣・配方法', r.tw.complete.steps.length, true],
      ['台灣・十字相乘', r.tw.cross ? r.tw.cross.steps.length : null, true],
      ['印度・觀察法', r.in.vilokanam.hit ? r.in.vilokanam.steps.length : null, false],
      ['印度・分裂中項', r.in.split ? r.in.split.steps.length : null, false],
      ['印度・和差法', r.in.sumdiff.steps.length, false],
      ['印度・微分式法', r.in.differential.steps.length, false]
    ].map(function (p) {
      return '<tr><td style="white-space:nowrap"><span class="flag ' + (p[2] ? 'flag-tw' : 'flag-in') +
        '">' + (p[2] ? '台灣' : '印度') + '</span> ' + p[0].split('・')[1] + '</td>' +
        (p[1] == null
          ? '<td class="no">這題用不了</td><td class="no">—</td>'
          : '<td class="yes">' + p[1] + ' 步</td><td>' +
            '<span class="bar" style="display:inline-block;width:' + (p[1] * 26) + 'px;vertical-align:middle">' +
            '<i style="width:100%"></i></span></td>') + '</tr>';
    }).join('');

    return '<div class="card"><h2>兩種教法的比較</h2>' +
      '<div class="table-scroll"><table class="data"><thead><tr>' +
      '<th></th><th><span class="flag flag-tw">台灣</span> 課本流程</th>' +
      '<th><span class="flag flag-in">印度</span> 吠陀口訣</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>' +
      '<h3 style="font-size:1rem;margin:22px 0 8px">這一題各招的步驟數</h3>' +
      '<div class="card-sub" style="margin-top:0">步驟數只是粗略的參考 — 印度式的一步常常包含心算，' +
      '寫在紙上不見得比較短，但腦袋裡跑比較快。</div>' +
      '<div class="table-scroll"><table class="data"><tbody>' + counts + '</tbody></table></div></div>';
  }

  function checkCard(r) {
    if (r.kind === 'none') {
      return '<div class="card"><h2>驗算</h2>' +
        '<p style="margin:0">判別式 D = ' + M.numStr(r.D) + ' < 0，沒有實數解，所以沒得代回去驗。' +
        '但「兩根之和 = ' + M.fracHTML(r.sum) + '、兩根之積 = ' + M.fracHTML(r.prod) +
        '」這兩條在複數範圍仍然成立（高中會學到）。</p></div>';
    }
    var r0 = r.rootsNum[0], r1 = r.rootsNum.length > 1 ? r.rootsNum[1] : r.rootsNum[0];
    var f = function (x) { return r.a * x * x + r.b * x + r.c; };
    return '<div class="card"><h2>驗算：把答案代回去</h2>' +
      '<ul class="explain">' +
      r.rootsNum.map(function (x, i) {
        return '<li>把 <b>x = ' + M.surdHTML(r.roots[i]) + '</b>（約 ' + M.numStr(Math.round(x * 1e6) / 1e6) +
          '）代入 <span class="math">' + Q.polyHTML(r.a, r.b, r.c) + '</span>，得到 <b>' +
          M.numStr(Math.round(f(x) * 1e6) / 1e6) + '</b> — 是 0，答案對。</li>';
      }).join('') +
      '<li>再用<b>根與係數關係</b>快速檢查：兩根相加 = ' +
        M.numStr(Math.round((r0 + r1) * 1e6) / 1e6) + '，應該等於 ' + MINUS + 'b/a = ' +
        M.fracHTML(r.sum) + '；兩根相乘 = ' + M.numStr(Math.round(r0 * r1 * 1e6) / 1e6) +
        '，應該等於 c/a = ' + M.fracHTML(r.prod) + '。</li>' +
      (r.factor ? '<li>因式分解的結果 <span class="math">' + r.tw.cross.html +
        ' = 0</span> 展開回去也會變回原式。</li>' : '') +
      '</ul>' +
      '<div class="callout"><span class="k">考試小技巧</span>：算完先把兩個根<b>加起來</b>看是不是 ' +
      M.fracHTML(r.sum) + '，三秒就知道有沒有算錯 — 這一招台灣印度都在用。</div></div>';
  }

  /* ---------- 主流程 ---------- */

  function render(r) {
    resultBox.innerHTML = head(r) + graphCard(r) + twCard(r) + inCard(r) + compareCard(r) + checkCard(r);
    window.Plot.parabola(document.getElementById('plot'), r);
  }

  function showError(msg) {
    resultBox.innerHTML = '<div class="error"><strong>算不下去：</strong>' + esc(msg) + '<br>' +
      '<span style="color:var(--muted);font-size:.9rem">' +
      '三個格子可以填整數（<b>-3</b>）、小數（<b>0.5</b>）或分數（<b>1/2</b>）。' +
      'b 或 c 留白就當成 0。</span></div>';
  }

  function run() {
    var r = Q.solve(inA.value, inB.value, inC.value);
    if (!r.ok) { echoBox.innerHTML = ''; showError(r.error); return; }
    // 三個格子拼出來的式子，就寫在輸入區底下
    echoBox.innerHTML = '<span class="arrow">→</span><span class="math">' + r.givenEqHTML + '</span>';
    render(r);
    try {
      history.replaceState(null, '', '?a=' + encodeURIComponent(inA.value) +
        '&b=' + encodeURIComponent(inB.value) + '&c=' + encodeURIComponent(inC.value));
    } catch (e) {}
  }

  function setCoefs(a, b, c) {
    inA.value = a; inB.value = b; inC.value = c;
    run();
  }

  /* ---------- 事件 ---------- */
  /* 三個格子都是打字就重算，所以不需要「解」的按鈕 */
  [inA, inB, inC].forEach(function (el) {
    el.addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); });
    el.addEventListener('input', run);
  });
  document.querySelectorAll('.chip').forEach(function (ch) {
    ch.addEventListener('click', function () {
      setCoefs(ch.dataset.a, ch.dataset.b, ch.dataset.c);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  /* 初始：網址帶參數就用，否則給一題經典的。
     要用 has() 而不是 ||，不然使用者把 b 清空後（網址寫成 b=）重新整理，
     空字串會被當成「沒給」而套回預設值。 */
  var p = new URLSearchParams(location.search);
  var pick = function (k, dflt) { return p.has(k) ? p.get(k) : dflt; };
  setCoefs(pick('a', '1'), pick('b', '-5'), pick('c', '6'));
  inA.focus();
  inA.select();
})();
