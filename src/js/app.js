(function () {
  'use strict';

  const SAMPLE = [
    ['A', 'Requirement analysis & scope', '', 1, 2, 3],
    ['B', 'Feasibility & risk planning', 'A', 1, 2, 3],
    ['C', 'System architecture design', 'A', 2, 3, 4],
    ['D', 'Database design', 'C', 1, 2, 3],
    ['E', 'UI/UX design', 'C', 1, 2, 3],
    ['F', 'Traffic data module', 'D', 2, 4, 6],
    ['G', 'Signal control logic', 'D', 3, 5, 7],
    ['H', 'Route suggestion module', 'D', 2, 3, 4],
    ['I', 'Frontend dashboard', 'E', 2, 3, 4],
    ['J', 'Integration', 'B,F,G,H,I', 1, 2, 3],
    ['K', 'Testing', 'J', 2, 3, 6],
    ['L', 'Deployment & documentation', 'K', 1, 2, 3],
  ];
  const NUMERIC = new Set(['o', 'm', 'p']);
  const CELLS = ['te', 'v', 'es', 'ef', 'ls', 'lf', 'slack'];
  let rows = [];

  const $ = (id) => document.getElementById(id);
  const r2 = (x) => Math.round(x * 100) / 100;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) { e.className = cls; }
    if (text !== undefined) { e.textContent = text; }
    return e;
  }

  function renderTable() {
    $('rows').innerHTML = rows.map((r, i) =>
      '<tr data-row="' + i + '">' +
      '<td><input class="n" data-k="id" aria-label="Activity ID" value="' + esc(r.id) + '"></td>' +
      '<td><input class="t" data-k="name" aria-label="Activity name" value="' + esc(r.name) + '"></td>' +
      '<td><input class="p" data-k="pre" aria-label="Predecessors" value="' + esc(r.pre) + '"></td>' +
      '<td><input class="n" type="number" data-k="o" aria-label="Optimistic" value="' + r.o + '"></td>' +
      '<td><input class="n" type="number" data-k="m" aria-label="Most likely" value="' + r.m + '"></td>' +
      '<td><input class="n" type="number" data-k="p" aria-label="Pessimistic" value="' + r.p + '"></td>' +
      CELLS.map((c) => '<td data-c="' + c + '"></td>').join('') +
      '<td><button type="button" class="g" data-del="' + i + '" aria-label="Delete activity">&#10005;</button></td></tr>'
    ).join('');
  }

  function clearOutputs() {
    $('rows').querySelectorAll('tr').forEach((tr) => {
      tr.className = '';
      tr.querySelectorAll('[data-c]').forEach((td) => { td.textContent = ''; });
    });
    ['dur', 'sd', 'cp', 'pr'].forEach((id) => { $(id).textContent = '-'; });
    $('zt').textContent = '';
    $('gantt').textContent = '';
    $('pert').textContent = '';
  }

  function renderGantt(acts, total) {
    const g = $('gantt');
    g.textContent = '';
    [...acts].sort((a, b) => a.es - b.es).forEach((a) => {
      const row = el('div', 'gr');
      row.appendChild(el('div', 'gl', a.id + ' - ' + a.name));
      const track = el('div', 'gt');
      const bar = el('div', 'gb' + (a.critical ? ' cr' : ''), String(r2(a.te)));
      bar.style.left = (total > 0 ? (a.es / total) * 100 : 0) + '%';
      bar.style.width = (total > 0 ? (a.te / total) * 100 : 0) + '%';
      track.appendChild(bar);
      row.appendChild(track);
      g.appendChild(row);
    });
    const axis = el('div', 'gr');
    axis.appendChild(el('div', 'gl'));
    const ticks = el('div', 'axis lg');
    ticks.appendChild(el('span', '', '0'));
    ticks.appendChild(el('span', '', String(r2(total / 2))));
    ticks.appendChild(el('span', '', r2(total) + ' weeks'));
    axis.appendChild(ticks);
    g.appendChild(axis);
  }

  function renderPert(acts) {
    const W = 170, H = 64, GX = 50, GY = 18;
    const cols = {};
    acts.forEach((a) => { (cols[a.depth] = cols[a.depth] || []).push(a); });
    const nCols = Object.keys(cols).length;
    const maxRows = Math.max(...Object.values(cols).map((c) => c.length));
    const pos = {};
    Object.keys(cols).forEach((d) => {
      cols[d].forEach((a, j) => {
        pos[a.id] = { x: 10 + d * (W + GX), y: 10 + j * (H + GY) + ((maxRows - cols[d].length) * (H + GY)) / 2 };
      });
    });
    const byId = new Map(acts.map((a) => [a.id, a]));
    let s = '<svg width="' + (nCols * (W + GX) + 20) + '" height="' + (maxRows * (H + GY) + 20) +
      '" font-family="system-ui,sans-serif" font-size="11"><defs><marker id="ar" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0L8,4L0,8z" fill="context-stroke"/></marker></defs>';
    acts.forEach((a) => {
      a.preds.forEach((p) => {
        const from = pos[p], to = pos[a.id];
        const crit = byId.get(p).critical && a.critical;
        s += '<line x1="' + (from.x + W) + '" y1="' + (from.y + H / 2) + '" x2="' + to.x + '" y2="' + (to.y + H / 2) +
          '" stroke="' + (crit ? 'var(--cr)' : 'var(--mu)') + '" stroke-width="' + (crit ? 2.2 : 1) + '" marker-end="url(#ar)"/>';
      });
    });
    acts.forEach((a) => {
      const q = pos[a.id];
      s += '<rect x="' + q.x + '" y="' + q.y + '" width="' + W + '" height="' + H + '" rx="8" fill="var(--card)" stroke="' +
        (a.critical ? 'var(--cr)' : 'var(--bd)') + '" stroke-width="' + (a.critical ? 2.2 : 1) + '"/>' +
        '<text x="' + (q.x + 8) + '" y="' + (q.y + 16) + '" fill="var(--tx)" font-weight="700">' + esc(a.id + ': ' + a.name.slice(0, 22)) + '</text>' +
        '<text x="' + (q.x + 8) + '" y="' + (q.y + 33) + '" fill="var(--mu)">te=' + r2(a.te) + '  slack=' + r2(a.slack) + '</text>' +
        '<text x="' + (q.x + 8) + '" y="' + (q.y + 50) + '" fill="var(--mu)">ES ' + r2(a.es) + ' | EF ' + r2(a.ef) + '</text>';
    });
    $('pert').innerHTML = s + '</svg>';
  }

  function update() {
    const target = parseFloat($('tg').value) || 0;
    const res = PertCore.compute(rows, target);
    $('er').textContent = res.error || '';
    if (res.error) {
      clearOutputs();
      return;
    }
    const trs = $('rows').querySelectorAll('tr');
    res.activities.forEach((a, i) => {
      trs[i].className = a.critical ? 'cr' : '';
      CELLS.forEach((c) => { trs[i].querySelector('[data-c="' + c + '"]').textContent = r2(a[c]); });
    });
    $('dur').textContent = r2(res.duration);
    $('sd').textContent = r2(res.sigma);
    $('cp').textContent = res.criticalPath.join(' \u2192 ');
    $('pr').textContent = (res.probability * 100).toFixed(1) + '%';
    const z = Number.isFinite(res.z) ? r2(res.z) : (res.z > 0 ? '+inf' : '-inf');
    $('zt').textContent = 'Critical-path variance = ' + r2(res.variance) + ', sigma = ' + r2(res.sigma) +
      ', Z = ' + z + ' \u2192 about ' + (res.probability * 100).toFixed(1) + '% chance of finishing within ' + target + ' weeks.';
    renderGantt(res.activities, res.duration);
    renderPert(res.activities);
  }

  function reset() {
    rows = SAMPLE.map(([id, name, pre, o, m, p]) => ({ id, name, pre, o, m, p }));
    renderTable();
    update();
  }

  function addRow() {
    const used = new Set(rows.map((r) => r.id));
    let id = '';
    for (let c = 65; c <= 90 && !id; c++) {
      const letter = String.fromCharCode(c);
      if (!used.has(letter)) { id = letter; }
    }
    rows.push({ id: id || 'N' + (rows.length + 1), name: 'New activity', pre: '', o: 1, m: 2, p: 3 });
    renderTable();
    update();
  }

  $('rows').addEventListener('change', (e) => {
    const input = e.target;
    const tr = input.closest('tr');
    if (!tr || !input.dataset.k) { return; }
    const k = input.dataset.k;
    const row = rows[Number(tr.dataset.row)];
    if (NUMERIC.has(k)) {
      row[k] = parseFloat(input.value) || 0;
    } else if (k === 'id' || k === 'pre') {
      row[k] = input.value.trim().toUpperCase();
    } else {
      row[k] = input.value;
    }
    update();
  });
  $('rows').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-del]');
    if (!btn) { return; }
    rows.splice(Number(btn.dataset.del), 1);
    renderTable();
    update();
  });
  $('addBtn').addEventListener('click', addRow);
  $('resetBtn').addEventListener('click', reset);
  $('tg').addEventListener('input', update);

  reset();
})();
