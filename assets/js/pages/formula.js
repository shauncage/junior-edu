/* ---------------------------------------------------------------
 * 化學式翻譯機 — 頁面邏輯
 * -------------------------------------------------------------*/
(function () {
  'use strict';

  var $ = function (s) { return document.querySelector(s); };
  var input = $('#formula-input');
  var resultBox = $('#result');
  var ptBox = $('#periodic-wrap');

  function esc(s) {
    return String(s).replace(/[&<>]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c];
    });
  }
  function fh(f) { return '<span class="formula-inline">' + window.ChemParser.toHTML(f) + '</span>'; }
  function md(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'); }

  function oxPill(v) {
    if (v == null) return '<span class="ox-pill ox-zero">—</span>';
    var cls = v > 0 ? 'ox-pos' : v < 0 ? 'ox-neg' : 'ox-zero';
    var mag = Number.isInteger(v) ? Math.abs(v) : Math.abs(v).toFixed(2);
    var txt = v === 0 ? '0' : (v > 0 ? '+' : '−') + mag;
    return '<span class="ox-pill ' + cls + '">' + txt + '</span>';
  }

  function showError(msg, formula) {
    resultBox.innerHTML =
      '<div class="error"><strong>看不懂這個化學式：</strong>' + esc(msg) + '<br>' +
      '<span style="color:var(--muted);font-size:.9rem">' +
      '元素符號第一個字母要大寫、第二個小寫（例如 <b>Na</b>、<b>Cl</b>、<b>Fe</b>）；' +
      '原子數寫在後面（H2O）；根離子用括號（Ca(OH)2）；結晶水用 · 連接（CuSO4·5H2O）。</span></div>';
    window.PeriodicTable.render(ptBox, { highlight: {} });
  }

  function elementsTable(a) {
    var rows = a.elements.map(function (item) {
      var el = item.el;
      var pct = item.massPercent;
      return '<tr>' +
        '<td class="sym">' + el.sym + '</td>' +
        '<td>' + el.zh + '</td>' +
        '<td>' + el.z + '</td>' +
        '<td>第 ' + el.period + ' 週期<br><span style="color:var(--muted)">第 ' + el.group + ' 族</span></td>' +
        '<td>' + el.catZh + '</td>' +
        '<td style="font-weight:700">' + item.count + '</td>' +
        '<td>' + oxPill(item.ox) + '</td>' +
        '<td style="color:var(--muted)">' + (el.ox.length ? el.ox.join('、') : '—') + '</td>' +
        '<td>' + (pct == null ? '—' :
          '<div style="display:flex;align-items:center;gap:8px">' +
          '<span style="min-width:46px">' + pct.toFixed(1) + '%</span>' +
          '<span class="bar"><i style="width:' + pct.toFixed(1) + '%"></i></span></div>') + '</td>' +
        '</tr>';
    }).join('');

    return '<div class="card"><h2>組成元素與週期表位置</h2>' +
      '<div class="table-scroll"><table class="data"><thead><tr>' +
      '<th>符號</th><th>中文名</th><th>原子序</th><th>位置</th><th>分類</th>' +
      '<th>個數</th><th>本化合物中<br>氧化數</th><th>常見價數</th><th>質量百分比</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div></div>';
  }

  function bondCard(a) {
    var b = a.bond;
    var html = '<div class="card"><h2>鍵結分析</h2>' +
      '<p style="margin:0 0 10px"><span class="badge badge-accent" style="font-size:1rem;padding:6px 16px">' +
      esc(b.kind) + '</span></p>' +
      '<p style="margin:0 0 12px">' + esc(b.desc) + '</p>';

    if (b.metals.length || b.nonmetals.length) {
      html += '<div class="callout"><span class="k">判斷依據</span>：' +
        (b.metals.length ? '金屬 ' + b.metals.map(function (s) {
            return s + '（' + window.Elements.zh(s) + '）'; }).join('、') : '無金屬') +
        '　／　' +
        (b.nonmetals.length ? '非金屬 ' + b.nonmetals.map(function (s) {
            return s + '（' + window.Elements.zh(s) + '）'; }).join('、') : '無非金屬') +
        '<br><span style="color:var(--muted)">金屬＋非金屬 → 離子鍵；非金屬＋非金屬 → 共價鍵；金屬＋金屬 → 金屬鍵。' +
        (!b.metals.length && b.kind === '離子鍵' ? '（銨鹽是例外：NH₄⁺ 代替金屬離子。）' : '') +
        '</span></div>';
    }

    if (a.naming && a.naming.balance) {
      var bal = a.naming.balance;
      html += '<div class="callout"><span class="k">價數（電荷）平衡驗算</span><br>' +
        fh(bal.cation.key) + window.ChemNamer.sup(bal.cation.charge) + ' × ' + bal.cation.n + '　＋　' +
        fh(bal.anion.key) + window.ChemNamer.sup(bal.anion.charge) + ' × ' + bal.anion.n + '<br>' +
        esc(bal.text) + '</div>';
    }

    if (b.en.length) {
      html += '<div class="callout"><span class="k">電負度差</span>：' +
        b.en.map(function (p) { return p.pair + ' 相差 ' + p.diff + '　→　' + p.hint; }).join('<br>') +
        '</div>';
    }

    if (b.extras.length) {
      html += '<ul class="explain" style="margin-top:13px">' +
        b.extras.map(function (t) { return '<li>' + md(t) + '</li>'; }).join('') + '</ul>';
    }
    return html + '</div>';
  }

  function namingCard(a) {
    if (!a.naming) {
      return '<div class="card"><h2>命名說明</h2>' +
        '<p style="margin:0;color:var(--muted)">這個化學式的結構比較特殊，' +
        (a.dict ? '名稱取自常見化合物字典。' : '目前的命名規則無法自動推導，可在 ' +
         '<code>assets/js/data/compounds.js</code> 補上這筆資料。') + '</p></div>';
    }
    var n = a.naming;
    var html = '<div class="card"><h2>命名怎麼來的？</h2>' +
      '<div class="card-sub">套用規則：' + esc(n.rule) + '</div>' +
      '<ul class="explain">' + n.explain.map(function (t) { return '<li>' + md(t) + '</li>'; }).join('') + '</ul>';
    if (a.dict && a.dict.name !== n.name && !a.oxidation.fractional) {
      html += '<div class="callout"><span class="k">附註</span>：機械式套用規則會得到「' + esc(n.name) +
        '」，但這個化合物在課本與日常上習慣稱為「' + esc(a.dict.name) +
        '」，考試請以習慣名稱為準。</div>';
    }
    return html + '</div>';
  }

  function oxCard(a) {
    var ox = a.oxidation;
    var html = '<div class="card"><h2>氧化數是怎麼推出來的</h2>' +
      '<ol class="explain" style="padding-left:22px">' +
      ox.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') +
      '</ol>';

    if (ox.parts) {
      html += '<div class="grid grid-2" style="margin-top:6px">' + ox.parts.map(function (part) {
        return '<div class="callout" style="margin-top:0">' +
          '<div style="font-size:1.15rem;font-weight:700;margin-bottom:2px" class="formula-inline">' +
            window.ChemParser.toHTML(part.label) + '</div>' +
          '<div style="color:var(--muted);font-size:.86rem;margin-bottom:8px">' + esc(part.title) + '</div>' +
          Object.keys(part.known).map(function (sym) {
            return '<span style="margin-right:12px"><b>' + sym + '</b> ' + oxPill(part.known[sym]) + '</span>';
          }).join('') +
          '<ul class="explain" style="margin-top:9px;font-size:.86rem;color:var(--muted)">' +
            part.steps.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') +
          '</ul></div>';
      }).join('') + '</div>';
    }

    if (ox.conflicts && ox.conflicts.length) {
      html += '<div class="callout"><span class="k">注意</span>：' +
        ox.conflicts.map(function (s) { return window.Elements.zh(s) + '（' + s + '）'; }).join('、') +
        ' 在兩個離子裡的氧化數<b>不一樣</b>，上面表格顯示的是整體的平均值，' +
        '真正的價數請看下方拆開的兩顆離子。</div>';
    }

    return html +
      '<div class="callout"><span class="k">通則</span>：單質 = 0；鹼金屬 = +1；鹼土金屬 = +2；' +
      '鋁 = +3；氫（與非金屬結合時）= +1；氧一般 = −2（過氧化物例外，如 H₂O₂ 中的氧為 −1）；' +
      '化合物中所有氧化數乘上原子數後總和 = 0（若是離子，總和等於該離子的電荷）。</div></div>';
  }

  function render(a) {
    var p = a.parsed;
    var badges = [];
    if (a.naming) badges.push('<span class="badge badge-accent">' + esc(a.naming.type) + '</span>');
    badges.push('<span class="badge">' + a.bond.kind + '</span>');
    if (p.mass) badges.push('<span class="badge">分子量／式量 ' + p.mass.toFixed(2) + '</span>');
    badges.push('<span class="badge">共 ' + p.totalAtoms + ' 個原子</span>');
    badges.push('<span class="badge">' + p.order.length + ' 種元素</span>');
    badges.push('<span class="badge ' + (a.dict ? 'badge-ok' : 'badge-warn') + '">' +
      (a.dict ? '字典收錄' : '規則自動命名') + '</span>');

    var head = '<div class="result-head">' +
      '<div class="result-formula">' + window.ChemParser.toHTML(p.formula) + '</div>' +
      '<div class="result-name">' + esc(a.name || '（無法命名）') + '</div>' +
      (a.alias ? '<div class="result-alias">別名／俗名：' + esc(a.alias) + '</div>' : '') +
      (a.note ? '<div class="result-alias">' + esc(a.note) + '</div>' : '') +
      '<div class="badges">' + badges.join('') + '</div></div>';

    resultBox.innerHTML = head + elementsTable(a) + bondCard(a) + namingCard(a) + oxCard(a);

    var hl = {};
    p.order.forEach(function (s) { hl[s] = p.counts[s]; });
    window.PeriodicTable.render(ptBox, {
      highlight: hl,
      onSelect: function (el) { run(el.sym); }
    });
  }

  function run(value) {
    var v = (value != null ? value : input.value);
    input.value = v;
    if (!String(v).trim()) {
      resultBox.innerHTML = '';
      window.PeriodicTable.render(ptBox, { highlight: {} });
      return;
    }
    var a = window.ChemNamer.analyze(v);
    if (!a.ok) { showError(a.error, a.formula); return; }
    render(a);
    try { history.replaceState(null, '', '?q=' + encodeURIComponent(v)); } catch (e) {}
  }

  // 事件
  $('#search-btn').addEventListener('click', function () { run(); });
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); });
  document.querySelectorAll('.chip').forEach(function (c) {
    c.addEventListener('click', function () { run(c.dataset.f || c.textContent); });
  });

  // 初始：網址帶 ?q= 就查，否則給個範例
  var q = new URLSearchParams(location.search).get('q');
  run(q || 'CuSO4·5H2O');
  input.focus();
  input.select();
})();
