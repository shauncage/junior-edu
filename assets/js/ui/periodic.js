/* ---------------------------------------------------------------
 * 週期表元件：畫出 18 欄的週期表，並標示指定元素
 * -------------------------------------------------------------*/
(function (global) {
  'use strict';

  function render(container, opts) {
    opts = opts || {};
    var highlight = opts.highlight || {};   // { Fe: 2, O: 3 }
    var onSelect = opts.onSelect || null;

    container.innerHTML = '';
    var grid = document.createElement('div');
    grid.className = 'pt-grid';

    // 欄號（族）
    for (var g = 1; g <= 18; g++) {
      var h = document.createElement('div');
      h.className = 'pt-axis pt-axis-col';
      h.textContent = g;
      h.style.gridColumn = g + 1;
      h.style.gridRow = 1;
      grid.appendChild(h);
    }
    // 列號（週期）
    for (var p = 1; p <= 7; p++) {
      var r = document.createElement('div');
      r.className = 'pt-axis pt-axis-row';
      r.textContent = p;
      r.style.gridColumn = 1;
      r.style.gridRow = p + 1;
      grid.appendChild(r);
    }

    global.Elements.list.forEach(function (el) {
      var cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'pt-cell cat-' + el.cat;
      cell.style.gridColumn = el.col + 1;
      cell.style.gridRow = el.row + 1;
      var n = highlight[el.sym];
      if (n) cell.classList.add('is-on');
      cell.innerHTML =
        '<span class="pt-z">' + el.z + '</span>' +
        '<span class="pt-sym">' + el.sym + '</span>' +
        '<span class="pt-zh">' + el.zh + '</span>' +
        (n ? '<span class="pt-badge">×' + n + '</span>' : '');
      cell.title = el.z + ' ' + el.sym + ' ' + el.zh + '\n第 ' + el.period +
                   ' 週期・第 ' + el.group + ' 族・' + el.catZh +
                   '\n原子量 ' + el.mass + (el.ox.length ? '\n常見價數 ' + el.ox.join('、') : '');
      if (onSelect) cell.addEventListener('click', function () { onSelect(el); });
      grid.appendChild(cell);
    });

    // 鑭系 / 錒系的佔位提示
    [[3, 6, '57-71'], [3, 7, '89-103']].forEach(function (m) {
      var ph = document.createElement('div');
      ph.className = 'pt-cell pt-placeholder';
      ph.style.gridColumn = m[0] + 1;
      ph.style.gridRow = m[1] + 1;
      ph.innerHTML = '<span class="pt-sym">' + m[2] + '</span>';
      grid.appendChild(ph);
    });

    container.appendChild(grid);

    var legend = document.createElement('div');
    legend.className = 'pt-legend';
    Object.keys(global.Elements.categories).forEach(function (key) {
      var item = document.createElement('span');
      item.className = 'pt-legend-item cat-' + key;
      item.textContent = global.Elements.categories[key].zh;
      legend.appendChild(item);
    });
    container.appendChild(legend);
  }

  global.PeriodicTable = { render: render };
})(window);
