/* ---------------------------------------------------------------
 * 棋盤元件 — 棋盤線是一張純 SVG，棋子是疊在上面的按鈕，
 * 位置用百分比定位，所以整張棋盤可以隨著容器縮放，手機上也能用。
 * 沒有用任何繪圖或 UI 套件。
 * -------------------------------------------------------------*/
(function () {
  'use strict';

  var X = window.Xiangqi;

  /* SVG 座標：一格 100，棋盤左上角 (50, 100)。
     上下各留一條空白帶放縱線編號 —— 黑方的１～９在上、紅方的一～九在下。 */
  var CELL = 100, OX = 50, OY = 100, VW = 900, VH = 1110;

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function px(col) { return OX + CELL * col; }
  function py(row) { return OY + CELL * row; }

  /* 兵、炮的定位點：角落那四個小「L」 */
  function starMark(row, col) {
    var x = px(col), y = py(row), g = 8, L = 26, out = '';
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (d) {
      if ((col === 0 && d[0] < 0) || (col === 8 && d[0] > 0)) return;
      out += '<path class="xq-star" d="M' + (x + d[0] * g) + ' ' + (y + d[1] * (g + L)) +
             ' L' + (x + d[0] * g) + ' ' + (y + d[1] * g) +
             ' L' + (x + d[0] * (g + L)) + ' ' + (y + d[1] * g) + '"/>';
    });
    return out;
  }

  function boardSVG(flip) {
    var s = '<svg class="xq-lines" viewBox="0 0 ' + VW + ' ' + VH + '" xmlns="http://www.w3.org/2000/svg">';
    var r, c, i;

    s += '<rect class="xq-felt" x="14" y="64" width="' + (VW - 28) + '" height="972" rx="14"/>';

    /* 十條橫線 */
    for (r = 0; r < 10; r++) {
      s += '<line class="xq-line" x1="' + px(0) + '" y1="' + py(r) + '" x2="' + px(8) + '" y2="' + py(r) + '"/>';
    }
    /* 九條直線：中間七條在河界處斷開 */
    for (c = 0; c < 9; c++) {
      if (c === 0 || c === 8) {
        s += '<line class="xq-line" x1="' + px(c) + '" y1="' + py(0) + '" x2="' + px(c) + '" y2="' + py(9) + '"/>';
      } else {
        s += '<line class="xq-line" x1="' + px(c) + '" y1="' + py(0) + '" x2="' + px(c) + '" y2="' + py(4) + '"/>';
        s += '<line class="xq-line" x1="' + px(c) + '" y1="' + py(5) + '" x2="' + px(c) + '" y2="' + py(9) + '"/>';
      }
    }
    /* 兩個九宮的斜線 */
    [0, 7].forEach(function (top) {
      s += '<line class="xq-line" x1="' + px(3) + '" y1="' + py(top) + '" x2="' + px(5) + '" y2="' + py(top + 2) + '"/>';
      s += '<line class="xq-line" x1="' + px(5) + '" y1="' + py(top) + '" x2="' + px(3) + '" y2="' + py(top + 2) + '"/>';
    });
    /* 定位點 */
    [[3, 0], [3, 2], [3, 4], [3, 6], [3, 8], [6, 0], [6, 2], [6, 4], [6, 6], [6, 8],
     [2, 1], [2, 7], [7, 1], [7, 7]].forEach(function (p) { s += starMark(p[0], p[1]); });

    /* 楚河漢界 */
    s += '<text class="xq-river" x="' + px(2) + '" y="' + (py(4) + 68) + '">楚 河</text>';
    s += '<text class="xq-river" x="' + px(6) + '" y="' + (py(4) + 68) + '">漢 界</text>';

    /* 縱線編號：上面是黑方的 1~9，下面是紅方的一~九 */
    var CN = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
    for (i = 0; i < 9; i++) {
      c = flip ? 8 - i : i;
      s += '<text class="xq-file xq-file-b" x="' + px(i) + '" y="' + (py(0) - 52) + '">' +
           String.fromCharCode(0xff10 + c + 1) + '</text>';
      s += '<text class="xq-file xq-file-r" x="' + px(i) + '" y="' + (py(9) + 76) + '">' + CN[8 - c] + '</text>';
    }
    return s + '</svg>';
  }

  function create(el, opts) {
    opts = opts || {};
    var b = {
      el: el,
      flip: !!opts.flip,
      pos: null,
      playable: null,        /* 'r' / 'b' / 'both' / null：哪一方可以用滑鼠走 */
      selected: -1,
      opts: opts,
      extra: null            /* 教學用的固定提示點 */
    };

    el.classList.add('xq-board');
    el.innerHTML = boardSVG(b.flip) + '<div class="xq-layer"></div>';
    var layer = el.querySelector('.xq-layer');

    function viewRow(r) { return b.flip ? 9 - r : r; }
    function viewCol(c) { return b.flip ? 8 - c : c; }
    function styleOf(i) {
      var r = viewRow(X.rowOf(i)), c = viewCol(X.colOf(i));
      return 'left:' + (px(c) / VW * 100).toFixed(4) + '%;top:' + (py(r) / VH * 100).toFixed(4) + '%';
    }

    function draw() {
      if (!b.pos) return;
      var html = '', i, p, cls;
      var o = b.state || {};
      var last = o.last;
      var moves = b.extra || (b.selected >= 0 ? X.movesFrom(b.pos, b.selected) : []);
      var targets = {};
      moves.forEach(function (m) { targets[m.to] = m; });

      /* 上一手的痕跡 */
      if (last) {
        html += '<i class="xq-trace" style="' + styleOf(last.from) + '"></i>';
        html += '<i class="xq-trace" style="' + styleOf(last.to) + '"></i>';
      }
      /* 額外標記（練習題的目標格） */
      (o.marks || []).forEach(function (sq) {
        html += '<i class="xq-mark" style="' + styleOf(sq) + '"></i>';
      });
      /* 棋子 */
      for (i = 0; i < 90; i++) {
        p = b.pos.board[i];
        if (p === '.') continue;
        cls = 'xq-piece ' + (X.colorOf(p) === 'r' ? 'xq-red' : 'xq-black');
        if (i === b.selected) cls += ' is-sel';
        if (targets[i]) cls += ' is-target';
        if (o.checkSq === i) cls += ' is-check';
        html += '<button type="button" class="' + cls + '" data-sq="' + i + '" style="' + styleOf(i) + '">' +
                esc(X.NAME[p]) + '</button>';
      }
      /* 可以走到的空格 */
      moves.forEach(function (m) {
        if (b.pos.board[m.to] !== '.') return;
        html += '<button type="button" class="xq-dot" data-sq="' + m.to + '" style="' + styleOf(m.to) + '"></button>';
      });
      layer.innerHTML = html;
    }

    function onClick(ev) {
      var btn = ev.target.closest('[data-sq]');
      if (!b.pos) return;
      if (!btn) { b.selected = -1; draw(); return; }
      var i = +btn.getAttribute('data-sq');
      var p = b.pos.board[i];

      /* 已經選好子，而且點到的是可以走的格子 → 走棋 */
      if (b.selected >= 0) {
        var mv = X.findMove(b.pos, b.selected, i);
        if (mv) {
          var from = b.selected;
          b.selected = -1;
          if (opts.onMove) opts.onMove(mv, from, i);
          return;
        }
      }
      var mine = b.playable === 'both' ? true : X.colorOf(p) === b.playable;
      if (p !== '.' && mine && X.colorOf(p) === b.pos.side) {
        b.selected = (b.selected === i ? -1 : i);
        if (opts.onSelect) opts.onSelect(b.selected);
      } else {
        b.selected = -1;
      }
      draw();
    }
    layer.addEventListener('click', onClick);

    /* state：{ last, marks, checkSq } */
    b.set = function (pos, state) {
      b.pos = pos;
      b.state = state || {};
      if (b.state.keepSelection !== true) b.selected = -1;
      draw();
      return b;
    };
    b.setPlayable = function (side) { b.playable = side; b.selected = -1; draw(); return b; };
    b.showMoves = function (moves) { b.extra = moves && moves.length ? moves : null; draw(); return b; };
    /* 翻轉棋盤（換邊下的時候用）：棋盤線要重畫，事件也要重新掛上 */
    b.setFlip = function (f) {
      if (!!f === b.flip) return b;
      b.flip = !!f;
      el.innerHTML = boardSVG(b.flip) + '<div class="xq-layer"></div>';
      layer = el.querySelector('.xq-layer');
      layer.addEventListener('click', onClick);
      draw();
      return b;
    };
    b.redraw = draw;
    return b;
  }

  window.XQBoard = { create: create };
})();
