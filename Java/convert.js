window.onerror = function (m) { var e = document.getElementById('login-message'); if (e) { e.textContent = 'Script error: ' + m; e.className = 'p-3 text-sm rounded-lg text-center bg-red-900 text-red-200 mb-4'; } };
const DEFAULT_INTAKE = 'UCDF2511ICT(SE)';
const API = 'https://s3-ap-southeast-1.amazonaws.com/open-ws/weektimetable';
const PROXY = u => 'https://corsproxy.io/?url=' + encodeURIComponent(u);
const USER = 'admin', PASS = 'admin123';
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

let DATA = [];       // raw rows from the link
let WEEKS = [];      // converted weeks currently displayed
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ---------- login ---------- */
$('login-form').addEventListener('submit', e => {
  e.preventDefault();
  if ($('username').value.trim().toLowerCase() === USER && $('password').value.trim() === PASS) {
    $('login-container').classList.add('hidden');
    $('app').classList.remove('hidden');
    init();
  } else {
    const m = $('login-message');
    m.textContent = 'Invalid username or password.'; m.classList.remove('hidden');
    $('password').value = '';
  }
});

/* ---------- data loading ---------- */
async function fetchJson(url) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}
async function loadData() {
  $('status').textContent = 'Loading timetable data…'; $('status').classList.add('loading');
  $('manual').classList.add('hidden');
  let json;
  try { json = await fetchJson(API); }
  catch (e1) {
    try { json = await fetchJson(PROXY(API)); }   // fallback if the bucket blocks cross-origin requests
    catch (e2) {
      $('status').classList.remove('loading');
      $('status').textContent = 'Could not load the data from the link.';
      $('manual').classList.remove('hidden'); $('manual').open = true;
      return;
    }
  }
  $('status').classList.remove('loading');
  setData(json);
}
function setData(json) {
  if (!Array.isArray(json)) { $('status').textContent = 'Unexpected data format (expected a JSON list).'; return; }
  DATA = json;
  const intakes = [...new Set(DATA.map(r => r.INTAKE).filter(Boolean))].sort();
  $('intake-list').innerHTML = intakes.map(i => `<option value="${esc(i)}">`).join('');
  $('status').textContent = `Loaded ${DATA.length} classes across ${intakes.length} intakes. Enter an intake code to see its timetable.`;
  render();
}

/* ---------- conversion (same output format as the original converter) ---------- */
function parseISO(iso) { const [y,m,d] = iso.split('-').map(Number); return new Date(y, m-1, d); }
function toISO(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function weekStartOf(iso) { const d = parseISO(iso); d.setDate(d.getDate() - d.getDay()); return toISO(d); } // preceding Sunday
function dayLabel(iso) { const d = parseISO(iso); return `${DAYS[d.getDay()]}, ${String(d.getDate()).padStart(2,'0')}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`; }

function classTypeOf(code, room) {
  const c = code.toUpperCase();
  if (/[-\s]LAB[-\s\d]/.test(c)) return 'Lab';
  if (/-L\s?T-|-L-/.test(c)) return 'Lecture';
  if (/-T-/.test(c)) return 'Tutorial';
  if (/-P-/.test(c)) return 'Practical';
  return /lab/i.test(room) ? 'Lab' : 'Lecture';
}
function to24(t) {                                   // "06:45 PM" -> "18:45"
  const m = /^\s*(\d{1,2}):(\d{2})\s*(AM|PM)\s*$/i.exec(t || '');
  if (!m) return t || '';
  let h = parseInt(m[1], 10) % 12;
  if (m[3].toUpperCase() === 'PM') h += 12;
  return String(h).padStart(2, '0') + ':' + m[2];
}
function toClass(r) {
  const code = (r.MODID || '').replace(/\s*\(online\)/i, '').trim();
  return {
    moduleCode: code,
    moduleName: r.MODULE_NAME || 'UNKNOWN MODULE NAME',
    time: `${to24(r.TIME_FROM)} - ${to24(r.TIME_TO)}`,
    location: r.ROOM || '',
    campus: r.LOCATION || '',
    lecturer: r.NAME || '',
    isOnline: /\(online\)/i.test(r.MODID || '') || /^onl/i.test(r.ROOM || ''),
    classType: classTypeOf(code, r.ROOM || ''),
    isReplacement: false, replacementType: '', isTest: false, testType: ''
  };
}
function buildWeeks(rows) {
  // drop duplicates that only differ by group
  const seen = new Set();
  rows = rows.filter(r => { const k = [r.MODID, r.DATESTAMP_ISO, r.TIME_FROM, r.ROOM].join('|'); if (seen.has(k)) return false; seen.add(k); return true; });
  const byWeek = {};
  rows.forEach(r => { const k = weekStartOf(r.DATESTAMP_ISO); if (!byWeek[k]) byWeek[k] = []; byWeek[k].push(r); });
  return Object.keys(byWeek).sort().map(ws => {
    const byDate = {};
    byWeek[ws].forEach(r => { if (!byDate[r.DATESTAMP_ISO]) byDate[r.DATESTAMP_ISO] = []; byDate[r.DATESTAMP_ISO].push(r); });
    const days = Object.keys(byDate).sort().map(iso => ({
      date: dayLabel(iso),
      classes: byDate[iso].sort((a,b) => (a.TIME_FROM_ISO||'').localeCompare(b.TIME_FROM_ISO||'')).map(toClass)
    }));
    return { weekStartDate: ws, days };
  });
}

/* ---------- rendering ---------- */
function render() {
  const q = $('intake').value.trim().toUpperCase();
  const box = $('weeks'), sug = $('suggest');
  box.innerHTML = ''; sug.innerHTML = ''; WEEKS = []; updateDlAll();
  if (!DATA.length) return;
  if (!q) { fillGroups([]); return; }

  let rows = DATA.filter(r => (r.INTAKE||'').toUpperCase() === q);
  if (!rows.length) {
    fillGroups([]);
    const near = [...new Set(DATA.map(r => r.INTAKE))].filter(i => i && i.toUpperCase().includes(q)).sort().slice(0, 30);
    $('status').textContent = near.length ? `No exact match for "${q}". Did you mean:` : `No timetable found for "${q}".`;
    near.forEach(i => { const b = document.createElement('span'); b.className = 'chip'; b.textContent = i; b.onclick = () => { $('intake').value = i; $('group').value = ''; render(); }; sug.appendChild(b); });
    return;
  }
  fillGroups([...new Set(rows.map(r => r.GROUPING).filter(Boolean))].sort());
  const g = $('group').value;
  if (g) rows = rows.filter(r => r.GROUPING === g);

  WEEKS = buildWeeks(rows);
  updateDlAll();
  const total = WEEKS.reduce((n, w) => n + w.days.reduce((m, d) => m + d.classes.length, 0), 0);
  $('status').textContent = `${q}${g ? ' · ' + g : ''}: ${total} classes in ${WEEKS.length} week${WEEKS.length === 1 ? '' : 's'}.`;

  WEEKS.forEach((w, i) => {
    const count = w.days.reduce((n, d) => n + d.classes.length, 0);
    const card = document.createElement('div');
    card.className = 'week-card bg-gray-800 p-5 rounded-2xl border border-gray-700 shadow-xl';
    card.style.animationDelay = (i * 90) + 'ms';
    card.innerHTML = `
      <div class="flex flex-wrap justify-between items-center gap-2 mb-3">
        <div>
          <h3 class="text-lg font-bold text-white">Week of ${esc(w.weekStartDate)}</h3>
          <p class="text-xs text-gray-400">${w.days.length} day(s) · ${count} class(es)</p>
        </div>
        <div class="flex gap-1">
          <button class="tab active" data-i="${i}" data-t="view">Schedule</button>
          <button class="tab" data-i="${i}" data-t="json">JSON</button>
        </div>
      </div>
      <div id="view-${i}">${scheduleHtml(w)}</div>
      <div id="json-${i}" class="hidden">
        <pre class="json">${esc(JSON.stringify(w, null, 2))}</pre>
        <div class="flex gap-2 mt-3">
          <button class="btn btn-sec" data-i="${i}" data-a="copy">Copy JSON</button>
          <button class="btn" data-i="${i}" data-a="download">Download ${esc(w.weekStartDate)}.json</button>
        </div>
      </div>`;
    box.appendChild(card);
  });
}
function scheduleHtml(w) {
  return w.days.map(d => `
    <div class="mb-3">
      <div class="text-sm font-semibold text-blue-400 mb-1">${esc(d.date)}</div>
      ${d.classes.map((c, n) => `
        <div class="cls bg-gray-700 rounded-lg p-3 mb-2 text-sm" style="animation-delay:${150 + n * 45}ms">
          <div class="flex justify-between gap-2">
            <span class="font-semibold text-white">${esc(c.moduleName)}</span>
            <span class="text-gray-300 whitespace-nowrap">${esc(c.time)}</span>
          </div>
          <div class="text-gray-400 text-xs mt-1">${esc(c.moduleCode)} · ${esc(c.classType)}${c.isOnline ? ' · Online' : ''}</div>
          <div class="text-gray-300 text-xs mt-1">${esc(c.location)} · ${esc(c.campus)} · ${esc(c.lecturer)}</div>
        </div>`).join('')}
    </div>`).join('');
}
function fillGroups(groups) {
  const sel = $('group'), cur = sel.value;
  sel.innerHTML = '<option value="">All groups</option>' + groups.map(g => `<option>${esc(g)}</option>`).join('');
  if (groups.includes(cur)) sel.value = cur;
}

/* ---------- downloads ---------- */
function downloadWeek(i) {
  const blob = new Blob([JSON.stringify(WEEKS[i], null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = WEEKS[i].weekStartDate + '.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function downloadAll() {
  const btn = $('dl-all'), n = WEEKS.length;
  btn.disabled = true;
  WEEKS.forEach((w, i) => setTimeout(() => {          // staggered so browsers don't drop the extra downloads
    downloadWeek(i);
    btn.textContent = 'Downloading ' + (i + 1) + '/' + n + '…';
    if (i === n - 1) setTimeout(() => { btn.disabled = false; updateDlAll(); }, 600);
  }, i * 350));
}
function updateDlAll() {
  const b = $('dl-all');
  b.classList.toggle('hidden', !WEEKS.length);
  b.textContent = 'Download all ' + WEEKS.length + ' week' + (WEEKS.length === 1 ? '' : 's') + ' (separate files)';
}
$('dl-all').addEventListener('click', downloadAll);

/* ---------- events ---------- */
$('weeks').addEventListener('click', e => {
  const t = e.target.closest('button'); if (!t) return;
  const i = t.dataset.i;
  if (t.dataset.t) {
    const json = t.dataset.t === 'json';
    $('view-' + i).classList.toggle('hidden', json);
    $('json-' + i).classList.toggle('hidden', !json);
    var pane = $(json ? 'json-' + i : 'view-' + i); pane.classList.remove('pane-in'); void pane.offsetWidth; pane.classList.add('pane-in');
    t.parentElement.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b === t));
  } else if (t.dataset.a === 'copy') {
    navigator.clipboard.writeText(JSON.stringify(WEEKS[i], null, 2)).then(() => { t.textContent = 'Copied!'; setTimeout(() => t.textContent = 'Copy JSON', 1500); });
  } else if (t.dataset.a === 'download') {
    downloadWeek(i);
  }
});
$('intake').addEventListener('input', () => { $('group').value = ''; render(); });
$('group').addEventListener('change', render);
$('reload').addEventListener('click', loadData);
$('manual-load').addEventListener('click', () => {
  try { setData(JSON.parse($('manual-text').value)); $('manual').classList.add('hidden'); }
  catch (e) { $('status').textContent = 'That is not valid JSON.'; }
});

function init() {
  const p = new URLSearchParams(location.search).get('intake');
  $('intake').value = p || DEFAULT_INTAKE;
  loadData();
}