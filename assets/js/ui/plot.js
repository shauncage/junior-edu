/* ---------------------------------------------------------------
 * 拋物線繪圖 — 產生一張純 SVG 的圖，沒有用任何繪圖套件。
 * 顏色一律走 CSS 變數，深色模式自動跟著變。
 * -------------------------------------------------------------*/
(function () {
  'use strict';

  var W = 720, H = 460, PAD = 34;

  /* 座標軸刻度取 1、2、5、10、20、50… 這種好讀的間距 */
  function niceStep(span, target) {
    var raw = span / (target || 8);
    var mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    var norm = raw / mag;
    var step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
    return step * mag;
  }

  function fmt(v) {
    var r = Math.round(v * 1000) / 1000;
    if (Object.is(r, -0)) r = 0;
    return (r < 0 ? '−' : '') + Math.abs(r);
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* 決定要畫的 x、y 範圍：把頂點、兩根、y 軸交點都包進來還要留白 */
  function pickWindow(a, b, c, vx, vy, roots) {
    var xs = [vx, 0].concat(roots);
    var xmin = Math.min.apply(null, xs), xmax = Math.max.apply(null, xs);
    var xspan = Math.max(xmax - xmin, 2) * 1.9;
    var xc = (xmin + xmax) / 2;
    var x0 = xc - xspan / 2, x1 = xc + xspan / 2;

    var ys = [vy, c];
    for (var i = 0; i <= 40; i++) {
      var x = x0 + (x1 - x0) * i / 40;
      ys.push(a * x * x + b * x + c);
    }
    var ymin = Math.min.apply(null, ys), ymax = Math.max.apply(null, ys);
    // 靠近頂點那側留少一點，另一側不要無限拉長
    var yspan = Math.max(ymax - ymin, 2);
    ymax = Math.min(ymax, vy + yspan * (a > 0 ? 1 : 0.25)) ;
    ymin = Math.max(ymin, vy - yspan * (a > 0 ? 0.25 : 1));
    var pad = Math.max((ymax - ymin) * 0.15, 0.5);
    return { x0: x0, x1: x1, y0: ymin - pad, y1: ymax + pad };
  }

  function render(box, q) {
    var a = q.a, b = q.b, c = q.c;
    var vx = window.MathNum.fVal(q.vertex.h), vy = window.MathNum.fVal(q.vertex.k);
    var roots = q.rootsNum;
    var win = pickWindow(a, b, c, vx, vy, roots);

    var sx = function (x) { return PAD + (x - win.x0) / (win.x1 - win.x0) * (W - 2 * PAD); };
    var sy = function (y) { return H - PAD - (y - win.y0) / (win.y1 - win.y0) * (H - 2 * PAD); };
    var clampY = function (y) { return Math.max(win.y0, Math.min(win.y1, y)); };

    var g = [];
    var rootPx = roots.map(sx);

    /* 格線與刻度 */
    var stepX = niceStep(win.x1 - win.x0, 9);
    var stepY = niceStep(win.y1 - win.y0, 7);
    var t;
    for (t = Math.ceil(win.x0 / stepX) * stepX; t <= win.x1; t += stepX) {
      g.push('<line class="pl-grid" x1="' + sx(t) + '" y1="' + sy(win.y0) + '" x2="' + sx(t) +
             '" y2="' + sy(win.y1) + '"/>');
      var near = rootPx.some(function (px) { return Math.abs(px - sx(t)) < 24; });
      if (Math.abs(t) > stepX / 2 && !near) {
        g.push('<text class="pl-tick" x="' + sx(t) + '" y="' +
               (Math.min(Math.max(sy(0) + 15, PAD + 12), H - PAD + 14)) + '">' + fmt(t) + '</text>');
      }
    }
    for (t = Math.ceil(win.y0 / stepY) * stepY; t <= win.y1; t += stepY) {
      g.push('<line class="pl-grid" x1="' + sx(win.x0) + '" y1="' + sy(t) + '" x2="' + sx(win.x1) +
             '" y2="' + sy(t) + '"/>');
      if (Math.abs(t) > stepY / 2) {
        g.push('<text class="pl-tick pl-tick-y" x="' +
               (Math.min(Math.max(sx(0) - 7, PAD - 4), W - PAD)) + '" y="' + (sy(t) + 4) + '">' + fmt(t) + '</text>');
      }
    }

    /* 座標軸 */
    if (win.y0 <= 0 && win.y1 >= 0) {
      g.push('<line class="pl-axis" x1="' + sx(win.x0) + '" y1="' + sy(0) + '" x2="' + sx(win.x1) + '" y2="' + sy(0) + '"/>');
      g.push('<text class="pl-axis-label" x="' + (W - PAD + 4) + '" y="' + (sy(0) - 6) + '">x</text>');
    }
    if (win.x0 <= 0 && win.x1 >= 0) {
      g.push('<line class="pl-axis" x1="' + sx(0) + '" y1="' + sy(win.y0) + '" x2="' + sx(0) + '" y2="' + sy(win.y1) + '"/>');
      g.push('<text class="pl-axis-label" x="' + (sx(0) + 6) + '" y="' + (PAD - 8) + '">y</text>');
    }

    /* 對稱軸 */
    g.push('<line class="pl-sym" x1="' + sx(vx) + '" y1="' + sy(win.y0) + '" x2="' + sx(vx) + '" y2="' + sy(win.y1) + '"/>');

    /* 拋物線本體 */
    var pts = [], N = 260;
    for (var i = 0; i <= N; i++) {
      var x = win.x0 + (win.x1 - win.x0) * i / N;
      var y = a * x * x + b * x + c;
      if (y < win.y0 - 1e-9 || y > win.y1 + 1e-9) { pts.push(null); continue; }
      pts.push(sx(x).toFixed(1) + ',' + sy(clampY(y)).toFixed(1));
    }
    var seg = [], cur = [];
    pts.forEach(function (p) {
      if (p === null) { if (cur.length > 1) seg.push(cur); cur = []; }
      else cur.push(p);
    });
    if (cur.length > 1) seg.push(cur);
    seg.forEach(function (s) { g.push('<polyline class="pl-curve" points="' + s.join(' ') + '"/>'); });

    /* 標記點 */
    function dot(x, y, cls, label, dy) {
      if (x < win.x0 || x > win.x1 || y < win.y0 || y > win.y1) return;
      g.push('<circle class="' + cls + '" cx="' + sx(x) + '" cy="' + sy(y) + '" r="5.5"/>');
      if (!label) return;
      // 標籤別被畫布邊緣切掉
      var tx = Math.min(Math.max(sx(x), PAD + 34), W - PAD - 34);
      g.push('<text class="pl-label ' + cls + '-t" x="' + tx + '" y="' + (sy(y) + dy) + '">' +
             esc(label) + '</text>');
    }
    roots.forEach(function (x) { dot(x, 0, 'pl-root', 'x = ' + fmt(x), 21); });

    // 頂點很靠近 x 軸時，跟根的標籤會撞在一起 —— 那就再往外挪一行
    var nearAxis = Math.abs(sy(vy) - sy(0)) < 30 && roots.length > 0;
    dot(vx, vy, 'pl-vertex', '頂點 (' + fmt(vx) + ', ' + fmt(vy) + ')',
        a > 0 ? (nearAxis ? 41 : 22) : (nearAxis ? -33 : -14));
    // y 軸交點如果跟某個根或頂點是同一點，就別再標一次（標籤會疊死）
    var dup = (c === 0) || Math.abs(vx) < 1e-9 ||
              roots.some(function (x) { return Math.abs(x) < 1e-9; });
    if (!dup) dot(0, c, 'pl-yint', 'y 軸交點 ' + fmt(c), c >= 0 ? -14 : 21);
    else dot(0, c, 'pl-yint', '', 0);

    box.innerHTML =
      '<svg class="plot" viewBox="0 0 ' + W + ' ' + H + '" role="img" ' +
      'aria-label="y = ' + esc((a === 1 ? '' : a) + 'x² + ' + b + 'x + ' + c) + ' 的圖形">' +
      g.join('') + '</svg>';
  }

  window.Plot = { parabola: render };
})();
