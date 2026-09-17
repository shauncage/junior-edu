/* ---------------------------------------------------------------
 * 象棋規則引擎 — 棋盤表示、走法產生、將軍與勝負判斷。
 * 只做資料運算，完全不碰畫面，所以可以單獨拿去跑測試。
 *
 * 棋盤是一個 90 格的陣列，index = row * 9 + col：
 *   row 0 是黑方底線，row 9 是紅方底線（紅方在下，跟實際對局一樣）
 *   col 0 是紅方的左手邊，也就是紅方的「九路」、黑方的「1 路」
 * 格子內容是一個字元：大寫紅方 KABNRCP、小寫黑方 kabnrcp、'.' 是空格。
 *   K將帥 A士仕 B象相 N馬傌 R車俥 C包炮 P卒兵
 * -------------------------------------------------------------*/
(function () {
  'use strict';

  var START_FEN = 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR';

  /* 棋子的中文字（紅黑各一套，跟實體棋子一樣） */
  var NAME = {
    K: '帥', A: '仕', B: '相', N: '傌', R: '俥', C: '炮', P: '兵',
    k: '將', a: '士', b: '象', n: '馬', r: '車', c: '包', p: '卒'
  };

  /* 棋子的通稱，用在說明文字裡 */
  var TITLE = {
    K: '將（帥）', A: '士（仕）', B: '象（相）', N: '馬（傌）',
    R: '車（俥）', C: '包（炮）', P: '卒（兵）'
  };

  var DIR4  = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  var DIRX  = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  var HORSE = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];

  function rowOf(i) { return (i / 9) | 0; }
  function colOf(i) { return i % 9; }
  function sq(r, c) { return r * 9 + c; }
  function onBoard(r, c) { return r >= 0 && r < 10 && c >= 0 && c < 9; }
  function colorOf(p) { return p === '.' ? null : (p < 'a' ? 'r' : 'b'); }
  function other(s) { return s === 'r' ? 'b' : 'r'; }

  /* 九宮：紅方 row 7~9、黑方 row 0~2，col 都是 3~5 */
  function inPalace(r, c, side) {
    if (c < 3 || c > 5) return false;
    return side === 'r' ? (r >= 7 && r <= 9) : (r >= 0 && r <= 2);
  }
  /* 河界：紅方的地盤是 row 5~9，黑方是 row 0~4 */
  function ownSide(r, side) { return side === 'r' ? r >= 5 : r <= 4; }

  /* ---------- 局面的建立與轉換 ---------- */

  function emptyBoard() {
    var b = [], i;
    for (i = 0; i < 90; i++) b.push('.');
    return b;
  }

  function fromFen(fen, side) {
    var parts = String(fen).trim().split(/\s+/);
    var rows = parts[0].split('/');
    var b = emptyBoard(), r, c, i, ch;
    for (r = 0; r < 10 && r < rows.length; r++) {
      c = 0;
      for (i = 0; i < rows[r].length; i++) {
        ch = rows[r].charAt(i);
        if (ch >= '1' && ch <= '9') c += +ch;
        else { if (c < 9) b[sq(r, c)] = ch; c++; }
      }
    }
    return { board: b, side: side || parts[1] || 'r' };
  }

  function toFen(pos) {
    var out = [], r, c, run, p, line;
    for (r = 0; r < 10; r++) {
      line = ''; run = 0;
      for (c = 0; c < 9; c++) {
        p = pos.board[sq(r, c)];
        if (p === '.') run++;
        else { if (run) { line += run; run = 0; } line += p; }
      }
      if (run) line += run;
      out.push(line);
    }
    return out.join('/') + ' ' + pos.side;
  }

  /* 擺子語法：'K e0; R a0; k e9'
     直線用 a~i（紅方由左至右），橫線用 0~9（0 是紅方底線）。
     這是給教材、殘局題目用的，比手寫一長串 FEN 好讀也好檢查。 */
  function setup(str, side) {
    var b = emptyBoard();
    var re = /([KABNRCPkabnrcp])\s*([a-i])\s*([0-9])/g, m;
    while ((m = re.exec(str))) {
      b[sq(9 - (+m[3]), m[2].charCodeAt(0) - 97)] = m[1];
    }
    return { board: b, side: side || 'r' };
  }

  function sqName(i) {
    return String.fromCharCode(97 + colOf(i)) + (9 - rowOf(i));
  }

  function clone(pos) {
    return { board: pos.board.slice(), side: pos.side };
  }

  function pieceAt(pos, i) { return pos.board[i]; }

  /* ---------- 走法產生 ---------- */

  /* 產生「假合法」走法：只管棋子怎麼走，不管走完會不會被將軍。 */
  function pseudoMoves(pos, only) {
    var b = pos.board, side = pos.side, out = [];
    var i, p, t, r, c, d, dr, dc, nr, nc, q, fwd, legR, legC;

    function push(from, to) {
      var tgt = b[to];
      if (tgt !== '.' && colorOf(tgt) === side) return;
      out.push({ from: from, to: to, piece: b[from], captured: tgt === '.' ? null : tgt });
    }

    for (i = 0; i < 90; i++) {
      p = b[i];
      if (p === '.' || colorOf(p) !== side) continue;
      if (only != null && only !== i) continue;
      t = p.toUpperCase();
      r = rowOf(i); c = colOf(i);

      if (t === 'K') {
        for (d = 0; d < 4; d++) {
          nr = r + DIR4[d][0]; nc = c + DIR4[d][1];
          if (inPalace(nr, nc, side)) push(i, sq(nr, nc));
        }
      } else if (t === 'A') {
        for (d = 0; d < 4; d++) {
          nr = r + DIRX[d][0]; nc = c + DIRX[d][1];
          if (inPalace(nr, nc, side)) push(i, sq(nr, nc));
        }
      } else if (t === 'B') {
        for (d = 0; d < 4; d++) {
          nr = r + DIRX[d][0] * 2; nc = c + DIRX[d][1] * 2;
          if (!onBoard(nr, nc) || !ownSide(nr, side)) continue;   /* 象不過河 */
          if (b[sq(r + DIRX[d][0], c + DIRX[d][1])] !== '.') continue; /* 塞象眼 */
          push(i, sq(nr, nc));
        }
      } else if (t === 'N') {
        for (d = 0; d < 8; d++) {
          dr = HORSE[d][0]; dc = HORSE[d][1];
          nr = r + dr; nc = c + dc;
          if (!onBoard(nr, nc)) continue;
          legR = r + (dr === 2 ? 1 : dr === -2 ? -1 : 0);
          legC = c + (dc === 2 ? 1 : dc === -2 ? -1 : 0);
          if (b[sq(legR, legC)] !== '.') continue;                /* 蹩馬腿 */
          push(i, sq(nr, nc));
        }
      } else if (t === 'R') {
        for (d = 0; d < 4; d++) {
          dr = DIR4[d][0]; dc = DIR4[d][1];
          nr = r + dr; nc = c + dc;
          while (onBoard(nr, nc)) {
            q = b[sq(nr, nc)];
            if (q !== '.') { push(i, sq(nr, nc)); break; }
            push(i, sq(nr, nc));
            nr += dr; nc += dc;
          }
        }
      } else if (t === 'C') {
        for (d = 0; d < 4; d++) {
          dr = DIR4[d][0]; dc = DIR4[d][1];
          nr = r + dr; nc = c + dc;
          while (onBoard(nr, nc) && b[sq(nr, nc)] === '.') {      /* 不吃子時跟車一樣 */
            push(i, sq(nr, nc));
            nr += dr; nc += dc;
          }
          if (!onBoard(nr, nc)) continue;
          nr += dr; nc += dc;                                      /* 跳過炮架 */
          while (onBoard(nr, nc)) {
            q = b[sq(nr, nc)];
            if (q !== '.') { if (colorOf(q) !== side) push(i, sq(nr, nc)); break; }
            nr += dr; nc += dc;
          }
        }
      } else if (t === 'P') {
        fwd = side === 'r' ? -1 : 1;
        if (onBoard(r + fwd, c)) push(i, sq(r + fwd, c));
        if (!ownSide(r, side)) {                                   /* 過了河才能橫走 */
          if (onBoard(r, c - 1)) push(i, sq(r, c - 1));
          if (onBoard(r, c + 1)) push(i, sq(r, c + 1));
        }
      }
    }
    return out;
  }

  /* ---------- 將軍判斷 ---------- */

  function kingSq(pos, side) {
    var want = side === 'r' ? 'K' : 'k', i;
    for (i = 0; i < 90; i++) if (pos.board[i] === want) return i;
    return -1;
  }

  /* target 這一格有沒有被 by 方攻擊。
     只用來判斷「將」有沒有被將軍，所以不檢查士和象 ——
     對方的士走不出自己的九宮、象過不了河，永遠碰不到我方的將。 */
  function attacked(b, target, by) {
    var tr = rowOf(target), tc = colOf(target);
    var d, dr, dc, nr, nc, p, first, dist, t;

    for (d = 0; d < 4; d++) {
      dr = DIR4[d][0]; dc = DIR4[d][1];
      nr = tr + dr; nc = tc + dc;
      first = '.'; dist = 1;
      while (onBoard(nr, nc)) {
        p = b[sq(nr, nc)];
        if (p !== '.') { first = p; break; }
        nr += dr; nc += dc; dist++;
      }
      if (first !== '.' && colorOf(first) === by) {
        t = first.toUpperCase();
        if (t === 'R') return true;
        /* 將：貼身一格，或同一直線上兩將對臉（白臉將） */
        if (t === 'K' && (dist === 1 || dc === 0)) return true;
        if (t === 'P' && dist === 1) {
          if (by === 'r' && dr === 1 && dc === 0) return true;      /* 紅兵在下方往上吃 */
          if (by === 'b' && dr === -1 && dc === 0) return true;     /* 黑卒在上方往下吃 */
          if (dr === 0 && !ownSide(nr, by)) return true;            /* 過河後可以橫吃 */
        }
      }
      if (first === '.') continue;
      nr += dr; nc += dc;                                           /* 炮：越過炮架再找 */
      while (onBoard(nr, nc)) {
        p = b[sq(nr, nc)];
        if (p !== '.') {
          if (colorOf(p) === by && p.toUpperCase() === 'C') return true;
          break;
        }
        nr += dr; nc += dc;
      }
    }

    for (d = 0; d < 8; d++) {
      nr = tr + HORSE[d][0]; nc = tc + HORSE[d][1];
      if (!onBoard(nr, nc)) continue;
      p = b[sq(nr, nc)];
      if (p === '.' || colorOf(p) !== by || p.toUpperCase() !== 'N') continue;
      /* 從馬的位置回推，馬腿在牠自己那一邊 */
      var hr = nr - (HORSE[d][0] === 2 ? 1 : HORSE[d][0] === -2 ? -1 : 0);
      var hc = nc - (HORSE[d][1] === 2 ? 1 : HORSE[d][1] === -2 ? -1 : 0);
      if (b[sq(hr, hc)] === '.') return true;
    }
    return false;
  }

  function inCheck(pos, side) {
    var k = kingSq(pos, side);
    if (k < 0) return false;
    return attacked(pos.board, k, other(side));
  }

  /* ---------- 走子 ---------- */

  /* 直接改動 pos，回傳被吃的子（給搜尋用，不配對 undo 會壞掉） */
  function make(pos, mv) {
    var cap = pos.board[mv.to];
    pos.board[mv.to] = pos.board[mv.from];
    pos.board[mv.from] = '.';
    pos.side = other(pos.side);
    return cap;
  }

  function unmake(pos, mv, cap) {
    pos.board[mv.from] = pos.board[mv.to];
    pos.board[mv.to] = cap;
    pos.side = other(pos.side);
  }

  /* 不改動原局面，回傳走完之後的新局面（給畫面用） */
  function doMove(pos, mv) {
    var p = clone(pos);
    make(p, mv);
    return p;
  }

  /* 合法走法 = 假合法走法裡，走完不會讓自己的將被吃的那些 */
  function legalMoves(pos, only) {
    var list = pseudoMoves(pos, only), out = [], i, cap;
    var me = pos.side;
    for (i = 0; i < list.length; i++) {
      cap = make(pos, list[i]);
      if (!inCheck(pos, me)) out.push(list[i]);
      unmake(pos, list[i], cap);
    }
    return out;
  }

  function movesFrom(pos, from) {
    if (pos.board[from] === '.' || colorOf(pos.board[from]) !== pos.side) return [];
    return legalMoves(pos, from);
  }

  function findMove(pos, from, to) {
    var ms = movesFrom(pos, from), i;
    for (i = 0; i < ms.length; i++) if (ms[i].to === to) return ms[i];
    return null;
  }

  /* ---------- 勝負 ---------- */

  function status(pos) {
    var check = inCheck(pos, pos.side);
    var n = legalMoves(pos).length;
    if (n > 0) {
      return { over: false, check: check, moves: n, winner: null, reason: check ? '被將軍' : '' };
    }
    return {
      over: true, check: check, moves: 0,
      winner: other(pos.side),
      reason: check ? '將死' : '困斃（無棋可走）'
    };
  }

  window.Xiangqi = {
    START_FEN: START_FEN,
    NAME: NAME,
    TITLE: TITLE,
    start: function () { return fromFen(START_FEN, 'r'); },
    fromFen: fromFen,
    toFen: toFen,
    setup: setup,
    clone: clone,
    empty: function (side) { return { board: emptyBoard(), side: side || 'r' }; },
    rowOf: rowOf, colOf: colOf, sq: sq, sqName: sqName,
    colorOf: colorOf, other: other,
    inPalace: inPalace, ownSide: ownSide,
    pieceAt: pieceAt,
    pseudoMoves: pseudoMoves,
    legalMoves: legalMoves,
    movesFrom: movesFrom,
    findMove: findMove,
    make: make, unmake: unmake, doMove: doMove,
    kingSq: kingSq, attacked: attacked, inCheck: inCheck,
    status: status
  };
})();
