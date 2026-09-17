/* ---------------------------------------------------------------
 * 中文記譜法 — 把一步棋寫成「炮二平五」，也把「炮二平五」讀回一步棋。
 *
 * 四個字的意思：[棋子][起點縱線][進退平][目標縱線或步數]
 *   紅方的縱線由右往左數，寫成一二三四五六七八九
 *   黑方的縱線由右往左數（也就是紅方的左邊），寫成 1 2 3 … 9
 *   進＝走向對方、退＝走向自己、平＝左右移動
 *   車炮兵將直線走，進退後面寫「走幾步」；馬相士斜著走，寫「走到哪一條線」
 *   同一條線上有兩個一樣的子，就不寫起點縱線，改寫前／後
 *
 * 讀譜是用「把每一步合法棋都寫成中文，再比對字串」的方式做的，
 * 所以永遠不會產生規則上走不出來的一步，也不必另外寫一套解析器。
 * -------------------------------------------------------------*/
(function () {
  'use strict';

  var X = window.Xiangqi;
  var CN = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

  /* 各種寫法一律收斂成同一個字，讀別人的棋譜才不會因為用字不同而失敗 */
  var NORM = {};
  (function () {
    var groups = [
      ['将', '帥', '帅', '將', '将'],
      ['士', '仕', '士'],
      ['相', '相', '象'],
      ['马', '傌', '馬', '马'],
      ['车', '俥', '車', '车'],
      ['炮', '炮', '砲', '包'],
      ['兵', '兵', '卒'],
      ['进', '進', '进', '上'],
      ['退', '退', '下'],
      ['平', '平'],
      ['前', '前'],
      ['后', '後', '后'],
      ['中', '中']
    ];
    groups.forEach(function (g) {
      for (var i = 1; i < g.length; i++) NORM[g[i]] = g[0];
    });
    for (var n = 1; n <= 9; n++) {
      NORM[CN[n]] = CN[n];
      NORM[String(n)] = CN[n];                              /* 半形 8 */
      NORM[String.fromCharCode(0xff10 + n)] = CN[n];         /* 全形 ８ */
    }
  })();

  function normalize(s) {
    var out = '', i, ch;
    for (i = 0; i < s.length; i++) {
      ch = s.charAt(i);
      if (/\s/.test(ch)) continue;
      out += (NORM[ch] || ch);
    }
    return out;
  }

  /* 紅方的縱線由右往左數，黑方相反 */
  function fileNum(col, side) { return side === 'r' ? 9 - col : col + 1; }
  /* 黑方用全形數字（１２３），跟棋譜書上的排版一致，也跟紅方的國字一眼分得開 */
  function numText(n, side) { return side === 'r' ? CN[n] : String.fromCharCode(0xff10 + n); }

  /* withFile：兵卒特別多的時候，前／後還不夠分，再把縱線補上去 */
  function baseText(pos, mv, withFile) {
    var b = pos.board, p = mv.piece;
    var side = X.colorOf(p), type = p.toUpperCase();
    var fr = X.rowOf(mv.from), fc = X.colOf(mv.from);
    var tr = X.rowOf(mv.to), tc = X.colOf(mv.to);
    var name = X.NAME[p], head, r;

    var sameCol = [];
    for (r = 0; r < 10; r++) if (b[X.sq(r, fc)] === p) sameCol.push(r);

    if (sameCol.length >= 2) {
      /* 由「前」排到「後」：紅方在下，列號小的比較前面 */
      sameCol.sort(function (a, c) { return side === 'r' ? a - c : c - a; });
      var k = sameCol.indexOf(fr);
      var tag = sameCol.length === 2 ? ['前', '後'][k]
              : sameCol.length === 3 ? ['前', '中', '後'][k]
              : numText(k + 1, side);                        /* 四個以上用數字，前面算起 */
      head = tag + name + (withFile ? numText(fileNum(fc, side), side) : '');
    } else {
      head = name + numText(fileNum(fc, side), side);
    }

    if (fr === tr) return head + '平' + numText(fileNum(tc, side), side);

    var fwd = side === 'r' ? -1 : 1;
    var act = (tr - fr) * fwd > 0 ? '進' : '退';
    /* 馬、相、士是斜著走的，進退後面寫目標縱線；其餘直線走，寫步數 */
    var diagonal = (type === 'N' || type === 'B' || type === 'A');
    return head + act + (diagonal ? numText(fileNum(tc, side), side)
                                  : numText(Math.abs(tr - fr), side));
  }

  /* 一步棋的正式寫法：先用一般寫法，會跟別的棋撞字才補縱線 */
  function text(pos, mv) {
    var t = baseText(pos, mv, false);
    var all = X.legalMoves(pos), i;
    for (i = 0; i < all.length; i++) {
      if (all[i].from === mv.from && all[i].to === mv.to) continue;
      if (baseText(pos, all[i], false) === t) return baseText(pos, mv, true);
    }
    return t;
  }

  /* 把一段中文讀成一步棋；讀不出來回傳 null */
  function parse(pos, str) {
    var want = normalize(str), all = X.legalMoves(pos), i, m;
    for (i = 0; i < all.length; i++) {
      m = all[i];
      if (normalize(baseText(pos, m, false)) === want) return m;
    }
    for (i = 0; i < all.length; i++) {
      m = all[i];
      if (normalize(baseText(pos, m, true)) === want) return m;
    }
    return null;
  }

  /* 一整份棋譜。可以有回合編號、可以有空白、也可以整串不斷行黏在一起。
     回傳 { moves, texts, positions, error, at } ── error 是第一個讀不出來的地方。 */
  function parseGame(startPos, source) {
    var text0 = Array.isArray(source) ? source.join(' ') : String(source);
    text0 = text0.replace(/[（(][^）)]*[）)]/g, ' ')          /* 去掉註解 */
                 .replace(/[0-9０-９]+\s*[.．、:：]/g, ' ')    /* 去掉「12.」這種回合編號 */
                 .replace(/[\r\n\t,，;；]+/g, ' ');
    var s = text0.replace(/\s+/g, '');

    var pos = X.clone(startPos);
    var moves = [], texts = [], positions = [X.clone(startPos)];
    var i = 0, mv, len;

    while (i < s.length) {
      mv = null;
      for (len = 4; len <= 5 && !mv; len++) {                 /* 一步通常四個字，補了縱線是五個 */
        if (i + len > s.length) break;
        mv = parse(pos, s.substr(i, len));
        if (mv) { texts.push(text(pos, mv)); i += len; }
      }
      if (!mv) {
        return { moves: moves, texts: texts, positions: positions,
                 error: s.substr(i, 6), at: moves.length + 1 };
      }
      moves.push(mv);
      X.make(pos, mv);
      positions.push(X.clone(pos));
    }
    return { moves: moves, texts: texts, positions: positions, error: null, at: -1 };
  }

  window.XQNotation = {
    text: text,
    parse: parse,
    parseGame: parseGame,
    normalize: normalize,
    fileNum: fileNum,
    numText: numText
  };
})();
