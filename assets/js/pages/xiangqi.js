/* ---------------------------------------------------------------
 * 象棋單元 — 畫面組裝。五個分頁各自獨立，共用同一組規則與棋盤元件。
 * -------------------------------------------------------------*/
(function () {
  'use strict';

  var X = window.Xiangqi, N = window.XQNotation, AI = window.XQAI;
  var L = window.XQ_LESSONS, GAMES = window.XQ_GAMES.slice();

  var $ = function (s) { return document.querySelector(s); };
  function esc(s) {
    return String(s).replace(/[&<>]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c];
    });
  }
  function sqOf(name) { return X.sq(9 - (+name.charAt(1)), name.charCodeAt(0) - 97); }

  /* 每次重畫棋盤都要算的東西：上一手的痕跡、被將軍的將要標紅 */
  function boardState(pos, last, marks) {
    var st = { last: last || null, marks: marks || [] };
    if (X.inCheck(pos, pos.side)) st.checkSq = X.kingSq(pos, pos.side);
    return st;
  }

  /* 走法清單：紅黑分兩欄，可以點 */
  function moveListHTML(texts, cur, clickable) {
    if (!texts.length) return '<div class="xq-empty">還沒有走任何一步。</div>';
    var html = '<table class="xq-mv"><tbody>', i, t;
    for (i = 0; i < texts.length; i += 2) {
      html += '<tr><th>' + (i / 2 + 1) + '</th>';
      for (t = 0; t < 2; t++) {
        var k = i + t;
        html += '<td>' + (texts[k]
          ? '<span class="mv' + (k === cur - 1 ? ' is-cur' : '') + (clickable ? ' is-click' : '') +
            '" data-ply="' + (k + 1) + '">' + esc(texts[k]) + '</span>'
          : '') + '</td>';
      }
      html += '</tr>';
    }
    return html + '</tbody></table>';
  }

  /* ============================================================
     分頁切換
     ============================================================ */
  var tabsEl = $('#tabs');
  function showTab(name) {
    [].forEach.call(tabsEl.querySelectorAll('.tab'), function (b) {
      b.classList.toggle('is-on', b.getAttribute('data-tab') === name);
    });
    [].forEach.call(document.querySelectorAll('.panel'), function (p) {
      p.classList.toggle('is-on', p.id === 'panel-' + name);
    });
    if (name !== 'replay') stopAuto();
  }
  tabsEl.addEventListener('click', function (e) {
    var b = e.target.closest('.tab');
    if (b) showTab(b.getAttribute('data-tab'));
  });

  /* ============================================================
     ① 認識棋子
     ============================================================ */
  var learnBoard = window.XQBoard.create($('#learn-board'), {});

  function lessonChips() {
    $('#learn-pieces').innerHTML = L.pieces.map(function (p, i) {
      return '<button class="chip' + (i === 0 ? ' is-on' : '') + '" data-kind="piece" data-key="' +
             p.key + '">' + esc(p.name) + '</button>';
    }).join('');
    $('#learn-rules').innerHTML = L.rules.map(function (r) {
      return '<button class="chip" data-kind="rule" data-key="' + r.key + '">' + esc(r.title) + '</button>';
    }).join('');
  }

  function showLesson(kind, key) {
    var item = kind === 'piece'
      ? L.pieces.filter(function (p) { return p.key === key; })[0]
      : L.rules.filter(function (r) { return r.key === key; })[0];
    if (!item) return;

    [].forEach.call(document.querySelectorAll('#learn-pieces .chip, #learn-rules .chip'), function (c) {
      c.classList.toggle('is-on', c.getAttribute('data-kind') === kind && c.getAttribute('data-key') === key);
    });

    var side = item.side || 'r';
    var pos = X.setup(item.setup, side);
    var focus = item.focus;
    var want = focus && focus !== '*' ? (side === 'r' ? focus.toUpperCase() : focus.toLowerCase()) : null;
    var moves = X.legalMoves(pos).filter(function (m) { return !want || m.piece === want; });

    learnBoard.set(pos, boardState(pos, null));
    learnBoard.showMoves(moves);

    var html;
    if (kind === 'piece') {
      html = '<h2>' + esc(item.name) + '</h2>' +
        '<div class="xq-motto">「' + esc(item.motto) + '」</div>' +
        '<p class="xq-p">' + esc(item.how) + '</p>' +
        '<ul class="explain">' + item.tips.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul>' +
        '<div class="xq-count">這個局面裡牠有 <b>' + moves.length + '</b> 種走法：' +
        moves.map(function (m) { return '<code>' + esc(N.text(pos, m)) + '</code>'; }).join(' ') + '</div>';
    } else {
      html = '<h2>' + esc(item.title) + '</h2><p class="xq-p">' + item.text + '</p>' +
        '<div class="xq-count">輪到' + (side === 'r' ? '紅' : '黑') + '方，標出來的走法共 <b>' +
        moves.length + '</b> 種：' +
        moves.map(function (m) { return '<code>' + esc(N.text(pos, m)) + '</code>'; }).join(' ') + '</div>';
    }
    $('#learn-info').innerHTML = html;
  }

  $('#learn-pieces').addEventListener('click', onLessonChip);
  $('#learn-rules').addEventListener('click', onLessonChip);
  function onLessonChip(e) {
    var c = e.target.closest('.chip');
    if (c) showLesson(c.getAttribute('data-kind'), c.getAttribute('data-key'));
  }

  /* ============================================================
     ② 學會記譜
     ============================================================ */
  var NT = { pos: X.start(), texts: [], quiz: null };
  var notaBoard = window.XQBoard.create($('#nota-board'), { onMove: notaMove });
  notaBoard.setPlayable('both');

  function notaRender(last) {
    notaBoard.set(NT.pos, boardState(NT.pos, last));
    notaBoard.setPlayable('both');
    $('#nota-moves').innerHTML = moveListHTML(NT.texts, NT.texts.length, false);
  }

  function notaMove(mv) {
    if (NT.quiz) {
      if (mv.from !== NT.quiz.move.from || mv.to !== NT.quiz.move.to) {
        $('#quiz-msg').innerHTML = '<span class="bad">不對喔</span>　你走的是 <code>' +
          esc(N.text(NT.pos, mv)) + '</code>，題目要的是 <code>' + esc(NT.quiz.text) + '</code>。再看一次四個字的意思。';
        notaRender();
        return;
      }
      $('#quiz-msg').innerHTML = '<span class="good">答對了！</span> <code>' + esc(NT.quiz.text) + '</code> 就是這一步。';
      NT.quiz = null;
    }
    NT.texts.push(N.text(NT.pos, mv));
    NT.pos = X.doMove(NT.pos, mv);
    notaRender(mv);
  }

  $('#nota-reset').addEventListener('click', function () {
    NT.pos = X.start(); NT.texts = []; NT.quiz = null;
    $('#quiz-target').textContent = '—';
    $('#quiz-msg').textContent = '棋子擺回原位了。';
    notaRender();
  });
  $('#quiz-new').addEventListener('click', function () {
    var ms = X.legalMoves(NT.pos);
    if (!ms.length) { $('#quiz-msg').textContent = '這個局面已經沒有棋可走了。'; return; }
    var mv = ms[Math.floor(Math.random() * ms.length)];
    NT.quiz = { move: mv, text: N.text(NT.pos, mv) };
    $('#quiz-target').textContent = NT.quiz.text;
    $('#quiz-msg').innerHTML = '輪到<b>' + (NT.pos.side === 'r' ? '紅' : '黑') + '方</b>。在棋盤上走出這一步。';
  });
  $('#quiz-show').addEventListener('click', function () {
    if (!NT.quiz) { $('#quiz-msg').textContent = '先按「出題」。'; return; }
    notaBoard.showMoves([NT.quiz.move]);
    $('#quiz-msg').innerHTML = '答案是把 <b>' + esc(X.NAME[NT.quiz.move.piece]) + '</b> 從 ' +
      X.sqName(NT.quiz.move.from) + ' 走到 ' + X.sqName(NT.quiz.move.to) + '（棋盤上已標出來）。';
  });

  /* ============================================================
     ③ 殺法練習
     ============================================================ */
  var DR = { drill: null, pos: null, used: 0, done: false, last: null };
  var drillBoard = window.XQBoard.create($('#drill-board'), { onMove: drillMove });

  function drillChips() {
    var group = '', html = '';
    L.drills.forEach(function (d, i) {
      if (d.group !== group) {
        group = d.group;
        html += '<span class="xq-group">' + esc(group) + '</span>';
      }
      html += '<button class="chip" data-i="' + i + '">' + esc(d.title) + '</button>';
    });
    $('#drill-list').innerHTML = html;
  }

  function loadDrill(i) {
    var d = L.drills[i];
    DR = { drill: d, idx: i, pos: X.setup(d.setup, d.side), used: 0, done: false, last: null };
    [].forEach.call($('#drill-list').querySelectorAll('.chip'), function (c) {
      c.classList.toggle('is-on', +c.getAttribute('data-i') === i);
    });
    $('#drill-info').innerHTML = '<h2>' + esc(d.title) + '</h2>' +
      '<div class="xq-badge-row"><span class="badge badge-accent">' + esc(d.group) + '</span>' +
      '<span class="badge">限 ' + d.steps + ' 步</span></div>' +
      '<p class="xq-p">' + esc(d.brief) + '</p>';
    $('#drill-note').innerHTML = '';
    drillRender('輪到你走（紅方）。');
  }

  function drillMarks() {
    var d = DR.drill, m = [];
    if (!d) return m;
    if (d.type === 'reach') m.push(sqOf(d.goal));
    if (d.type === 'capture') m.push(sqOf(d.target));
    return m;
  }

  function drillRender(msg) {
    drillBoard.set(DR.pos, boardState(DR.pos, DR.last, drillMarks()));
    drillBoard.setPlayable(DR.done ? null : 'r');
    if (msg) $('#drill-status').innerHTML = msg;
  }

  function drillWin(msg) {
    DR.done = true;
    drillRender('<span class="good">✓ ' + msg + '</span>');
  }
  function drillLose(msg) {
    DR.done = true;
    drillRender('<span class="bad">✗ ' + msg + '</span>　按「重做這一題」再試一次。');
  }

  function drillMove(mv) {
    var d = DR.drill;
    if (!d || DR.done) return;
    DR.last = mv;

    if (d.type === 'mate') {
      var left = d.steps - DR.used - 1;
      DR.pos = X.doMove(DR.pos, mv);
      DR.used++;
      var st = X.status(DR.pos);
      if (st.over && st.winner === 'r') {
        drillWin('將死！' + (DR.used === 1 ? '一步就解決了。' : '總共 ' + DR.used + ' 步。'));
        return;
      }
      if (left <= 0) { drillLose('步數用完了，黑方還活著。'); return; }

      /* 先找出黑方最強的抵抗，再看紅方在那之後還能不能如期將死 ——
         算的是「黑方走完之後」，因為此時輪到黑方，不是紅方。 */
      var reply = AI.defend(X.clone(DR.pos), left);
      if (!reply) { drillWin('黑方無棋可走，困斃！'); return; }
      if (!AI.mateIn(X.doMove(DR.pos, reply), left)) {
        DR.pos = X.setup(d.setup, d.side); DR.used = 0; DR.last = null;
        drillRender('<span class="bad">這一步之後就殺不掉了。</span>　棋子已經擺回去，再想想。');
        return;
      }
      var rtext = N.text(DR.pos, reply);
      DR.pos = X.doMove(DR.pos, reply);
      DR.last = reply;
      drillRender('黑方應以 <code>' + esc(rtext) + '</code>，還有 <b>' + left + '</b> 步。');
      return;
    }

    /* 走法練習：黑方不動，走完把輪走權還給紅方 */
    DR.pos = X.doMove(DR.pos, mv);
    DR.pos.side = 'r';
    DR.used++;
    var ok = d.type === 'reach'
      ? (DR.pos.board[sqOf(d.goal)] !== '.' && X.colorOf(DR.pos.board[sqOf(d.goal)]) === 'r')
      : (X.colorOf(DR.pos.board[sqOf(d.target)]) === 'r');
    if (ok) { drillWin('到了！用了 ' + DR.used + ' 步。'); return; }
    if (DR.used >= d.steps) { drillLose('步數用完了。'); return; }
    drillRender('已經走了 ' + DR.used + ' 步，還剩 ' + (d.steps - DR.used) + ' 步。');
  }

  $('#drill-list').addEventListener('click', function (e) {
    var c = e.target.closest('.chip');
    if (c) loadDrill(+c.getAttribute('data-i'));
  });
  $('#drill-retry').addEventListener('click', function () { if (DR.drill) loadDrill(DR.idx); });
  $('#drill-next').addEventListener('click', function () {
    loadDrill(DR.drill ? (DR.idx + 1) % L.drills.length : 0);
  });
  $('#drill-idea').addEventListener('click', function () {
    if (DR.drill) $('#drill-note').innerHTML = '<b>提示：</b>' + esc(DR.drill.idea);
  });
  $('#drill-answer').addEventListener('click', function () {
    var d = DR.drill;
    if (!d) return;
    var pos = X.setup(d.setup, d.side), line, txt;
    if (d.type === 'mate') {
      line = AI.mateIn(X.clone(pos), d.steps);
      txt = line ? line.map(function (m) { var t = N.text(pos, m); X.make(pos, m); return t; }).join('　') : '算不出來';
      $('#drill-note').innerHTML = '<b>答案：</b><code>' + esc(txt) + '</code>　（黑方走的那幾手是最強的抵抗）';
    } else {
      $('#drill-note').innerHTML = '<b>答案：</b>' + esc(d.idea);
    }
  });

  /* ============================================================
     ④ 打譜猜棋
     ============================================================ */
  var RP = { game: null, moves: [], texts: [], positions: [], idx: 0, timer: null, guess: false };
  var replayBoard = window.XQBoard.create($('#replay-board'), { onMove: replayGuess });

  function replayChips() {
    $('#replay-list').innerHTML = GAMES.map(function (g, i) {
      return '<button class="chip" data-i="' + i + '">' + esc(g.title) + '</button>';
    }).join('');
  }

  function loadGame(i) {
    var g = GAMES[i];
    var r = N.parseGame(X.start(), g.moves);
    RP.game = g; RP.idx = 0; RP.gi = i;
    RP.moves = r.moves; RP.texts = r.texts; RP.positions = r.positions;
    [].forEach.call($('#replay-list').querySelectorAll('.chip'), function (c) {
      c.classList.toggle('is-on', +c.getAttribute('data-i') === i);
    });
    $('#replay-intro').innerHTML = '<b>' + esc(g.title) + '</b>　' + esc(g.intro || '') +
      (r.error ? '<div class="xq-err">這份棋譜第 ' + r.at + ' 手「' + esc(r.error) +
                 '」讀不出來，後面的就先不放了。</div>' : '');
    $('#rp-note').textContent = '按「下一手」開始。';
    replayRender();
  }

  function replayRender() {
    var pos = RP.positions[RP.idx];
    if (!pos) return;
    var last = RP.idx > 0 ? RP.moves[RP.idx - 1] : null;
    replayBoard.set(pos, boardState(pos, last));
    replayBoard.setPlayable(RP.guess && RP.idx < RP.moves.length ? pos.side : null);
    $('#rp-moves').innerHTML = moveListHTML(RP.texts, RP.idx, true);
    var cur = $('#rp-moves').querySelector('.is-cur');
    if (cur) cur.scrollIntoView({ block: 'nearest' });

    var note = RP.game && RP.game.notes ? RP.game.notes[RP.idx] : null;
    $('#rp-note').innerHTML = RP.idx === 0
      ? '開局前的原始局面。紅方先走。'
      : '<b>第 ' + RP.idx + ' 手　' + esc(RP.texts[RP.idx - 1]) + '</b>' +
        (note ? '<br>' + esc(note) : '<br><span class="xq-muted">這一手沒有特別註解。</span>');

    var st = X.status(pos);
    var s = '第 ' + RP.idx + ' / ' + RP.moves.length + ' 手';
    if (st.over) s += '　<b>' + (st.winner === 'r' ? '紅方' : '黑方') + '勝（' + st.reason + '）</b>';
    else if (st.check) s += '　<b class="bad">將軍！</b>';
    if (RP.guess && RP.idx < RP.moves.length) {
      s += '　輪到<b>' + (pos.side === 'r' ? '紅' : '黑') + '方</b>，換你猜這一手。';
    }
    $('#rp-status').innerHTML = s;
  }

  function replayGuess(mv) {
    if (!RP.guess || RP.idx >= RP.moves.length) return;
    var want = RP.moves[RP.idx];
    var pos = RP.positions[RP.idx];
    if (mv.from === want.from && mv.to === want.to) {
      RP.idx++;
      replayRender();
      $('#rp-status').innerHTML = '<span class="good">猜對了！</span>　' + $('#rp-status').innerHTML;
    } else {
      replayRender();
      $('#rp-status').innerHTML = '<span class="bad">不是這一步。</span>　你走的是 <code>' +
        esc(N.text(pos, mv)) + '</code>，再想想棋譜裡的那一手。';
    }
  }

  function go(i) {
    RP.idx = Math.max(0, Math.min(RP.moves.length, i));
    replayRender();
  }
  function stopAuto() {
    if (RP.timer) { clearInterval(RP.timer); RP.timer = null; $('#rp-auto').textContent = '自動'; }
  }
  $('#rp-first').addEventListener('click', function () { stopAuto(); go(0); });
  $('#rp-prev').addEventListener('click', function () { stopAuto(); go(RP.idx - 1); });
  $('#rp-next').addEventListener('click', function () { stopAuto(); go(RP.idx + 1); });
  $('#rp-last').addEventListener('click', function () { stopAuto(); go(RP.moves.length); });
  $('#rp-auto').addEventListener('click', function () {
    if (RP.timer) { stopAuto(); return; }
    if (RP.idx >= RP.moves.length) go(0);
    $('#rp-auto').textContent = '暫停';
    RP.timer = setInterval(function () {
      if (RP.idx >= RP.moves.length) { stopAuto(); return; }
      go(RP.idx + 1);
    }, 1300);
  });
  $('#rp-guess').addEventListener('change', function () {
    RP.guess = this.checked;
    stopAuto();
    replayRender();
  });
  $('#rp-moves').addEventListener('click', function (e) {
    var m = e.target.closest('.mv');
    if (m) { stopAuto(); go(+m.getAttribute('data-ply')); }
  });
  $('#rp-load').addEventListener('click', function () {
    var src = $('#rp-import').value.trim();
    if (!src) { $('#rp-import-msg').textContent = '先把棋譜貼進來。'; return; }
    var r = N.parseGame(X.start(), src);
    if (!r.moves.length) {
      $('#rp-import-msg').innerHTML = '<span class="bad">一手都讀不出來</span>　卡在「' + esc(r.error || src.slice(0, 6)) + '」。';
      return;
    }
    GAMES.push({
      id: 'import' + GAMES.length, title: '自己貼上的（' + r.moves.length + ' 手）',
      tag: '自訂', intro: '從輸入框讀進來的棋譜。', moves: src, notes: {}
    });
    replayChips();
    loadGame(GAMES.length - 1);
    $('#rp-import-msg').innerHTML = r.error
      ? '<span class="bad">讀到第 ' + r.at + ' 手停住</span>　「' + esc(r.error) + '」不合規則或寫法看不懂，前面 ' + r.moves.length + ' 手已經載入。'
      : '<span class="good">' + r.moves.length + ' 手全部讀通</span>，已經加到上面的清單。';
  });
  $('#rp-takeover').addEventListener('click', function () {
    var pos = RP.positions[RP.idx];
    if (!pos) return;
    stopAuto();
    startPlay(X.clone(pos), pos.side);
    showTab('play');
  });

  /* ============================================================
     ⑤ 跟電腦對戰
     ============================================================ */
  var PL = { pos: null, me: 'r', level: 2, texts: [], stack: [], taken: [], over: false, busy: false, last: null, hist: [], noCap: 0 };
  var playBoard = window.XQBoard.create($('#play-board'), { onMove: playMove });

  function startPlay(pos, side) {
    /* 從打譜接手的時候，接的是棋譜停在那裡時輪到走的那一方 */
    if (side) $('#pl-side').value = side;
    PL.me = $('#pl-side').value;
    PL.level = +$('#pl-level').value;
    PL.pos = pos || X.start();
    PL.texts = []; PL.stack = []; PL.taken = []; PL.hist = [];
    PL.over = false; PL.busy = false; PL.last = null; PL.noCap = 0;
    playBoard.setFlip(PL.me === 'b');
    playRender();
    if (PL.pos.side !== PL.me) aiTurn();
  }

  function playRender(msg) {
    playBoard.set(PL.pos, boardState(PL.pos, PL.last));
    playBoard.setPlayable(PL.over || PL.busy || PL.pos.side !== PL.me ? null : PL.me);
    $('#pl-moves').innerHTML = moveListHTML(PL.texts, PL.texts.length, false);
    var box = $('#pl-moves');
    box.scrollTop = box.scrollHeight;
    $('#pl-taken').innerHTML = PL.taken.length
      ? PL.taken.map(function (p) {
          return '<span class="xq-chip-piece ' + (X.colorOf(p) === 'r' ? 'xq-red' : 'xq-black') + '">' +
                 esc(X.NAME[p]) + '</span>';
        }).join('')
      : '<span class="xq-muted">還沒有吃子。</span>';

    if (msg) { $('#pl-status').innerHTML = msg; return; }
    /* 自然限著：連續六十個回合（一百二十步）沒有任何一方吃子就算和棋 */
    if (PL.noCap >= 120) {
      PL.over = true;
      $('#pl-status').innerHTML = '<b>和局</b>　連續六十回合沒有吃子（自然限著）。';
      playBoard.setPlayable(null);
      return;
    }
    var st = X.status(PL.pos);
    if (st.over) {
      PL.over = true;
      var win = st.winner === PL.me;
      $('#pl-status').innerHTML = '<b class="' + (win ? 'good' : 'bad') + '">' +
        (win ? '你贏了！' : '電腦贏了') + '</b>　' + (st.winner === 'r' ? '紅方' : '黑方') + '勝（' + st.reason + '）。';
      playBoard.setPlayable(null);
      return;
    }
    var s = PL.pos.side === PL.me ? '輪到你走' : '電腦思考中…';
    if (st.check) s += '　<b class="bad">將軍！</b>';
    $('#pl-status').innerHTML = s;
  }

  function pushMove(mv) {
    PL.stack.push({ pos: X.clone(PL.pos), taken: PL.taken.length, noCap: PL.noCap });
    PL.noCap = mv.captured ? 0 : PL.noCap + 1;
    PL.texts.push(N.text(PL.pos, mv));
    if (mv.captured) PL.taken.push(mv.captured);
    PL.pos = X.doMove(PL.pos, mv);
    PL.hist.push(X.toFen(PL.pos));
    PL.last = mv;
  }

  function playMove(mv) {
    if (PL.over || PL.busy || PL.pos.side !== PL.me) return;
    pushMove(mv);
    playRender();
    if (!X.status(PL.pos).over) aiTurn();
  }

  function aiTurn() {
    if (PL.over) return;
    PL.busy = true;
    playRender('電腦思考中…');
    /* 讓瀏覽器先把「思考中」畫出來，再開始算 */
    setTimeout(function () {
      var res = AI.think(PL.pos, PL.level, PL.hist);
      PL.busy = false;
      if (!res) { playRender(); return; }
      pushMove(res.move);
      playRender();
    }, 40);
  }

  $('#pl-new').addEventListener('click', function () { startPlay(null); });
  $('#pl-level').addEventListener('change', function () { PL.level = +this.value; });
  $('#pl-side').addEventListener('change', function () { startPlay(null); });
  $('#pl-undo').addEventListener('click', function () {
    if (PL.busy || !PL.stack.length) return;
    /* 一次退回到自己上一次要走的時候 */
    var guard = 0;
    while (PL.stack.length && guard++ < 4) {
      var s = PL.stack.pop();
      PL.pos = s.pos;
      PL.texts.pop();
      PL.taken.length = s.taken;
      PL.noCap = s.noCap;
      PL.hist.pop();
      if (PL.pos.side === PL.me) break;
    }
    PL.over = false;
    PL.last = null;
    /* 退到底時可能又輪到電腦（自己執黑的第一手就是這種情況），要讓牠重走 */
    if (PL.pos.side !== PL.me) { aiTurn(); return; }
    playRender('已經退回上一手。');
  });
  $('#pl-hint').addEventListener('click', function () {
    if (PL.over || PL.busy || PL.pos.side !== PL.me) return;
    $('#pl-status').innerHTML = '想一下…';
    setTimeout(function () {
      var res = AI.hint(PL.pos, PL.hist);
      if (!res) return;
      playBoard.showMoves([res.move]);
      setTimeout(function () { playBoard.showMoves(null); }, 2600);
      $('#pl-status').innerHTML = '提示：試試 <code>' + esc(N.text(PL.pos, res.move)) +
        '</code>（棋盤上標出來了）';
    }, 30);
  });
  $('#pl-resign').addEventListener('click', function () {
    if (PL.over) return;
    PL.over = true;
    playRender('<b class="bad">你認輸了。</b>　按「開新局」再來一盤。');
  });

  /* ============================================================
     開場
     ============================================================ */
  lessonChips();
  showLesson('piece', L.pieces[0].key);
  notaRender();
  drillChips();
  loadDrill(0);
  replayChips();
  loadGame(0);
  startPlay(null);
})();
