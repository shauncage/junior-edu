/* ---------------------------------------------------------------
 * 電腦對手 — Alpha-Beta 搜尋 + 靜態搜尋（只追吃子，避免看漏兌子）。
 * 沒有開局庫，每一步都是現算的。四種難度差在「看幾步」跟「肯不肯挑次好的」。
 * -------------------------------------------------------------*/
(function () {
  'use strict';

  var X = window.Xiangqi;

  /* 子力價值（以「一個兵 = 100」為單位）*/
  var VAL = { K: 12000, R: 900, C: 450, N: 400, A: 200, B: 200, P: 100 };

  /* 縱線價值：中路最要緊，邊線最冷 */
  var CFILE = [0, 2, 4, 6, 7, 6, 4, 2, 0];
  /* 橫線價值（一律換算成紅方視角，row 0 是對方底線）：越靠近對方越有攻擊力 */
  var ADV = [8, 10, 10, 9, 7, 5, 3, 1, 0, 0];
  /* 兵的位置分：過河才開始值錢，逼近對方九宮最凶，走到底線反而沒用 */
  var PAWN = [
    [ 0,  3,  6,  9, 12,  9,  6,  3,  0],
    [18, 36, 56, 80,120, 80, 56, 36, 18],
    [14, 26, 42, 60, 80, 60, 42, 26, 14],
    [10, 20, 30, 34, 40, 34, 30, 20, 10],
    [ 6, 12, 18, 24, 30, 24, 18, 12,  6],
    [ 0,  0,  2,  0,  4,  0,  2,  0,  0],
    [ 0,  0,  0,  0,  0,  0,  0,  0,  0],
    [ 0,  0,  0,  0,  0,  0,  0,  0,  0],
    [ 0,  0,  0,  0,  0,  0,  0,  0,  0],
    [ 0,  0,  0,  0,  0,  0,  0,  0,  0]
  ];

  var MATE = 100000, INF = 1e9;
  var DIR4 = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  /* 車的活動力：四個方向能走幾格 */
  function rookMobility(b, i) {
    var r = X.rowOf(i), c = X.colOf(i), n = 0, d, nr, nc;
    for (d = 0; d < 4; d++) {
      nr = r + DIR4[d][0]; nc = c + DIR4[d][1];
      while (nr >= 0 && nr < 10 && nc >= 0 && nc < 9 && b[nr * 9 + nc] === '.') {
        n++; nr += DIR4[d][0]; nc += DIR4[d][1];
      }
    }
    return n;
  }

  /* 局面分數，一律從紅方的角度看：正的對紅方有利 */
  function evaluate(pos) {
    var b = pos.board, s = 0, i, p, t, red, r, c, rr, v;
    for (i = 0; i < 90; i++) {
      p = b[i];
      if (p === '.') continue;
      red = p < 'a';
      t = p.toUpperCase();
      r = X.rowOf(i); c = X.colOf(i);
      rr = red ? r : 9 - r;
      v = VAL[t];
      if (t === 'P') v += PAWN[rr][c];
      else if (t === 'N') v += CFILE[c] * 3 + ADV[rr] * 2;
      else if (t === 'C') v += CFILE[c] * 3 + ADV[rr];
      else if (t === 'R') v += CFILE[c] * 2 + ADV[rr] * 2 + rookMobility(b, i) * 2;
      s += red ? v : -v;
    }
    return s;
  }

  function leafScore(pos) {
    return evaluate(pos) * (pos.side === 'r' ? 1 : -1);
  }

  /* 先試吃大子、被吃的子又便宜的走法，剪枝效率最好 */
  function scoreMove(mv) {
    if (!mv.captured) return 0;
    return VAL[mv.captured.toUpperCase()] * 10 - VAL[mv.piece.toUpperCase()];
  }
  function order(ms) {
    ms.sort(function (a, b) { return scoreMove(b) - scoreMove(a); });
  }

  /* 靜態搜尋：到達預定深度後，繼續把「吃子」追完再評分，
     否則搜尋剛好停在「我吃了他的車」那一步，會誤以為賺到。 */
  function quiesce(pos, alpha, beta, ply, ctl) {
    ctl.nodes++;
    if ((ctl.nodes & 1023) === 0 && Date.now() > ctl.deadline) ctl.aborted = true;
    if (ctl.aborted || ply > 24) return leafScore(pos);

    var checked = X.inCheck(pos, pos.side), ms, i, cap, sc, list;
    if (!checked) {
      sc = leafScore(pos);
      if (sc >= beta) return sc;
      if (sc > alpha) alpha = sc;
    }
    ms = X.legalMoves(pos);
    if (!ms.length) return -(MATE - ply);
    list = [];
    for (i = 0; i < ms.length; i++) if (checked || ms[i].captured) list.push(ms[i]);
    order(list);
    for (i = 0; i < list.length; i++) {
      cap = X.make(pos, list[i]);
      sc = -quiesce(pos, -beta, -alpha, ply + 1, ctl);
      X.unmake(pos, list[i], cap);
      if (ctl.aborted) return alpha;
      if (sc > alpha) alpha = sc;
      if (alpha >= beta) break;
    }
    return alpha;
  }

  function negamax(pos, depth, alpha, beta, ply, ctl) {
    ctl.nodes++;
    if ((ctl.nodes & 1023) === 0 && Date.now() > ctl.deadline) ctl.aborted = true;
    if (ctl.aborted) return alpha;
    if (depth <= 0) return quiesce(pos, alpha, beta, ply, ctl);

    var ms = X.legalMoves(pos);
    if (!ms.length) return -(MATE - ply);        /* 將死或困斃，都算輸 */
    order(ms);
    var best = -INF, i, cap, sc;
    for (i = 0; i < ms.length; i++) {
      cap = X.make(pos, ms[i]);
      sc = -negamax(pos, depth - 1, -beta, -alpha, ply + 1, ctl);
      X.unmake(pos, ms[i], cap);
      if (ctl.aborted) return best > -INF ? best : alpha;
      if (sc > best) best = sc;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  }

  /* slack：容許挑「比最佳差這麼多分」的走法。數字越大越像初學者。 */
  var LEVELS = {
    1: { name: '新手',   depth: 2, slack: 260, ms: 400 },
    2: { name: '初級',   depth: 3, slack: 90,  ms: 700 },
    3: { name: '中級',   depth: 4, slack: 0,   ms: 1600 },
    4: { name: '高手',   depth: 6, slack: 0,   ms: 2600 }
  };

  /* history：之前出現過的局面（FEN 字串），用來避免電腦原地兜圈子 */
  function think(pos, level, history) {
    var cfg = LEVELS[level] || LEVELS[2];
    var seen = {};
    (history || []).forEach(function (f) { seen[f] = (seen[f] || 0) + 1; });
    var root = X.clone(pos);
    var ms = X.legalMoves(root);
    if (!ms.length) return null;

    var ctl = { nodes: 0, aborted: false, deadline: Date.now() + cfg.ms };
    var t0 = Date.now();
    var scored = ms.map(function (m) { return { mv: m, sc: -INF }; });
    var doneDepth = 0, d, i, cap, sc, alpha, best;

    for (d = 1; d <= cfg.depth; d++) {
      /* 上一層的分數拿來排序，越前面越可能剪枝 */
      scored.sort(function (a, b) { return b.sc - a.sc; });
      var round = scored.map(function (e) { return { mv: e.mv, sc: -INF }; });
      alpha = -INF; best = -INF;
      for (i = 0; i < round.length; i++) {
        cap = X.make(root, round[i].mv);
        /* 要挑次好棋的難度，每一步都要真的分數，所以不在根結點剪枝 */
        sc = -negamax(root, d - 1, -INF, cfg.slack > 0 ? INF : -alpha, 1, ctl);
        X.unmake(root, round[i].mv, cap);
        if (ctl.aborted) break;
        round[i].sc = sc;
        if (sc > best) { best = sc; alpha = sc; }
      }
      if (ctl.aborted) break;
      scored = round;
      doneDepth = d;
      if (best >= MATE - 50) break;              /* 找到殺棋就不用再想了 */
    }

    /* 走回老局面要扣分：不然電腦會兩步一循環，棋局永遠下不完。
       已經看到殺棋的那一步不扣，該將死就將死。 */
    scored.forEach(function (e) {
      if (e.sc >= MATE - 200) return;
      var cap = X.make(root, e.mv);
      var key = X.toFen(root);
      X.unmake(root, e.mv, cap);
      if (seen[key]) e.sc -= 90 * seen[key];
    });

    scored.sort(function (a, b) { return b.sc - a.sc; });
    var pick = scored[0];
    if (cfg.slack > 0) {
      var pool = scored.filter(function (e) { return e.sc >= scored[0].sc - cfg.slack; });
      pick = pool[Math.floor(Math.random() * pool.length)];
    }
    return {
      move: pick.mv, score: pick.sc, best: scored[0].sc,
      depth: doneDepth, nodes: ctl.nodes, ms: Date.now() - t0,
      level: cfg.name
    };
  }

  /* ---------- 殺棋搜尋（練習題在用） ----------
     跟上面的搜尋分開寫：這裡要的不是「哪一步比較好」，
     而是「有沒有一條逼到底、對方怎麼擋都擋不住的路」。 */

  /* 輪走方能不能在 n 步之內（自己走 n 步）把對方將死／困斃。
     找得到就回傳整條主線，找不到回傳 null。 */
  function mateIn(pos, n) {
    if (n <= 0) return null;
    var me = pos.side, ms = X.legalMoves(pos), i, j, cap, st, replies, cap2, sub, longest, ok, line;
    for (i = 0; i < ms.length; i++) {
      cap = X.make(pos, ms[i]);
      st = X.status(pos);
      line = null;
      if (st.over && st.winner === me) {
        line = [ms[i]];
      } else if (n > 1 && !st.over) {
        replies = X.legalMoves(pos);
        ok = true; longest = [];
        for (j = 0; j < replies.length; j++) {
          cap2 = X.make(pos, replies[j]);
          sub = mateIn(pos, n - 1);
          X.unmake(pos, replies[j], cap2);
          if (!sub) { ok = false; break; }
          if (sub.length + 1 > longest.length) longest = [replies[j]].concat(sub);
        }
        if (ok) line = [ms[i]].concat(longest);
      }
      X.unmake(pos, ms[i], cap);
      if (line) return line;
    }
    return null;
  }

  /* 被將死的一方要怎麼撐最久：挑「讓對方最晚才殺得掉」的一步 */
  function defend(pos, n) {
    var ms = X.legalMoves(pos), best = [], bestN = -1, i, cap, k, line;
    for (i = 0; i < ms.length; i++) {
      cap = X.make(pos, ms[i]);
      for (k = 1; k <= n; k++) { line = mateIn(pos, k); if (line) break; }
      X.unmake(pos, ms[i], cap);
      var survive = line ? k : n + 1;
      if (survive > bestN) { bestN = survive; best = [ms[i]]; }
      else if (survive === bestN) best.push(ms[i]);
    }
    if (!best.length) return null;
    return best[Math.floor(Math.random() * best.length)];
  }

  window.XQAI = {
    mateIn: mateIn,
    defend: defend,
    LEVELS: LEVELS,
    evaluate: evaluate,
    think: think,
    /* 提示一律用中級的眼光算，不然新手難度會提示出壞棋 */
    hint: function (pos, history) { return think(pos, 3, history); }
  };
})();
