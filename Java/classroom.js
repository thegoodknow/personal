var API = 'https://s3-ap-southeast-1.amazonaws.com/open-ws/weektimetable';
var PROXY = function (u) { return 'https://corsproxy.io/?url=' + encodeURIComponent(u); };
var TZ = 'Asia/Kuala_Lumpur';
var fT = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: true });
var fD = new Intl.DateTimeFormat('en-CA', { timeZone: TZ });
var fC = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
var $ = function (id) { return document.getElementById(id); };
var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

var ROOMS = [], DATES = {}, firstRender = true, lastToday = '';
var ONLY = (function () {                                              // ?classroom=D-08-02  (or #classroom=D-08-02)
  var v = new URLSearchParams(location.search).get('classroom');
  if (!v) { var m = /classroom=([^&]+)/.exec(location.hash); v = m ? decodeURIComponent(m[1]) : ''; }
  return v.replace(/^['"\s]+|['"\s]+$/g, '');
})();

/* ---------- data ---------- */
function getJson(url) { return fetch(url, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }); }
function loadData() {
  $('updated').textContent = 'refreshing…';
  return getJson(API).catch(function () { return getJson(PROXY(API)); }).then(setData).catch(function () {
    $('updated').textContent = ROOMS.length ? 'refresh failed, showing last data' : 'could not load data';
    if (!ROOMS.length) { $('manual').classList.remove('hidden'); $('manual').open = true; }
  });
}
function blockOf(n) {
  var m = /^([A-Z])-\d+/.exec(n);
  if (m) return 'Block ' + m[1];
  if (/^tech lab/i.test(n)) return 'Tech Labs';
  if (/auditorium/i.test(n)) return 'Auditoriums';
  return 'Other';
}
function blockRank(b) {                                              // Block A-E, then Tech Labs, then Auditoriums, then the rest
  var m = /^Block ([A-E])$/.exec(b);
  if (m) return m[1].charCodeAt(0) - 65;
  if (b === 'Tech Labs') return 5;
  if (b === 'Auditoriums') return 6;
  return b === 'Other' ? 99 : 7;
}
function blockSort(a, b) { return blockRank(a) - blockRank(b) || a.localeCompare(b); }
function setData(json) {
  if (!Array.isArray(json)) throw new Error('bad format');
  var map = {}; DATES = {};
  json.forEach(function (r) {
    var name = (r.ROOM || '').trim();
    if (!name || /^onl/i.test(name)) return;                       // skip online/virtual rooms
    var s = Date.parse(r.TIME_FROM_ISO), e = Date.parse(r.TIME_TO_ISO);
    if (isNaN(s) || isNaN(e)) return;
    DATES[r.DATESTAMP_ISO] = 1;
    var o = map[name] || (map[name] = { name: name, campus: r.LOCATION || '', block: blockOf(name), cls: [] });
    o.cls.push({ s: s, e: e, date: r.DATESTAMP_ISO, code: (r.MODID || '').replace(/\s*\(online\)/i, ''), mod: r.MODULE_NAME || '', lect: r.NAME || '', intake: r.INTAKE || '' });
  });
  ROOMS = Object.keys(map).map(function (k) { return map[k]; });
  var blocks = ROOMS.map(function (r) { return r.block; }).filter(function (b, i, a) { return a.indexOf(b) === i; }).sort(blockSort);
  var cur = $('block').value;
  $('block').innerHTML = '<option value="">All blocks</option>' + blocks.map(function (b) { return '<option>' + esc(b) + '</option>'; }).join('');
  $('block').value = blocks.indexOf(cur) >= 0 ? cur : '';
  $('updated').textContent = 'data refreshed ' + fT.format(Date.now());
  render();
}

/* ---------- availability maths ---------- */
function dur(ms) {
  var s = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
  return h ? h + 'h ' + m + 'm' : m + 'm ' + (x < 10 ? '0' : '') + x + 's';
}
function blocksOf(room, today) {
  var it = room.cls.filter(function (c) { return c.date === today; }).sort(function (a, b) { return a.s - b.s; });
  var out = [];
  it.forEach(function (c) {
    var last = out[out.length - 1];
    if (last && c.s <= last.e) { last.e = Math.max(last.e, c.e); last.items.push(c); }
    else out.push({ s: c.s, e: c.e, items: [c] });
  });
  return out;
}
function status(room, now, today) {
  var bl = blocksOf(room, today), i, cur = -1;
  for (i = 0; i < bl.length; i++) if (bl[i].s <= now && now < bl[i].e) { cur = i; break; }
  if (cur >= 0) return { busy: true, b: bl[cur], after: bl[cur + 1] || null, until: bl[cur].e };
  var next = null;
  for (i = 0; i < bl.length; i++) if (bl[i].s > now) { next = bl[i]; break; }
  return { busy: false, next: next, freeFor: next ? next.s - now : Infinity };
}
function who(items) {
  var codes = [], ints = [];
  items.forEach(function (c) { if (codes.indexOf(c.code) < 0) codes.push(c.code); if (c.intake && ints.indexOf(c.intake) < 0) ints.push(c.intake); });
  var t = esc(codes.slice(0, 2).join(', ')) + (codes.length > 2 ? ' +' + (codes.length - 2) : '');
  if (items[0].mod) t += ' · ' + esc(items[0].mod);
  if (ints.length) t += '<br>' + esc(ints.slice(0, 3).join(', ')) + (ints.length > 3 ? ' +' + (ints.length - 3) + ' more' : '');
  return t;
}

/* ---------- render ---------- */
function render() {
  var now = Date.now(), today = fD.format(now); lastToday = today;
  var all = ROOMS.map(function (r) { return { r: r, st: status(r, now, today) }; });
  var q = $('search').value.trim().toLowerCase(), blk = $('block').value, stf = $('status').value, minf = +$('minfree').value * 60000;

  var free = all.filter(function (x) { return !x.st.busy; });
  $('s-total').textContent = all.length; $('s-free').textContent = free.length; $('s-busy').textContent = all.length - free.length;
  $('s-long').textContent = free.filter(function (x) { return x.st.freeFor >= 3600000; }).length;

  var note = $('note'); note.className = 'note';
  if (!DATES[today]) { note.className = 'note warn'; note.textContent = 'No classes are scheduled for today (' + today + ') in the timetable data, so every room shows as free.'; }
  else note.textContent = 'Based on the weekly class timetable for ' + today + '. Rooms with no scheduled class show as free; ad-hoc bookings and online rooms are not included.';

  var list = all.filter(function (x) {
    if (ONLY && x.r.name.toLowerCase() !== ONLY.toLowerCase()) return false;
    if (q && x.r.name.toLowerCase().indexOf(q) < 0) return false;
    if (blk && x.r.block !== blk) return false;
    if (stf === 'free' && x.st.busy) return false;
    if (stf === 'busy' && !x.st.busy) return false;
    if (minf && (x.st.busy || x.st.freeFor < minf)) return false;
    return true;
  }).sort(function (a, b) {                                           // room-number order (A-05-01, A-05-02, ... A-10-01), not by availability
    return a.r.name.localeCompare(b.r.name, undefined, { numeric: true, sensitivity: 'base' });
  });

  var ob = $('only');
  if (ONLY) { ob.classList.remove('hidden'); ob.innerHTML = 'Showing room <b>' + esc(ONLY) + '</b> only <a href="' + esc(location.pathname) + '">Show all rooms</a>'; }
  var g = $('grid'); g.className = firstRender ? 'anim' : '';
  if (!list.length) { g.innerHTML = '<div class="empty">' + (ONLY ? 'Room “' + esc(ONLY) + '” was not found in the timetable data. Rooms with no scheduled class this week are not listed.' : 'No rooms match these filters.') + '</div>'; firstRender = false; return; }
  var cards = list.map(function (x, i) {
    var r = x.r, s = x.st, cls, pill, lbl, big, pct, sub;
    if (s.busy) {
      cls = 'busy'; pill = 'Occupied'; lbl = 'Free in'; big = '<span class="cd" data-t="' + s.until + '">' + dur(s.until - now) + '</span>';
      pct = 100 * (now - s.b.s) / (s.b.e - s.b.s);
      sub = '<b>Now:</b> ' + who(s.b.items) + '<br>Until ' + fT.format(s.until) + (s.after ? ' · then free for ' + dur(s.after.s - s.until).replace(/ \d+s$/, '') : ' · then free for the rest of the day');
    } else if (s.next) {
      cls = s.freeFor < 900000 ? 'soon' : 'free'; pill = 'Free'; lbl = 'Free for'; big = '<span class="cd" data-t="' + s.next.s + '">' + dur(s.freeFor) + '</span>';
      pct = Math.min(100, 100 * s.freeFor / 14400000);
      sub = 'Until ' + fT.format(s.next.s) + '<br><b>Next:</b> ' + who(s.next.items);
    } else {
      cls = 'free'; pill = 'Free'; lbl = 'Free for'; big = 'Rest of the day'; pct = 100; sub = 'No more classes scheduled today';
    }
    return { b: r.block, h: '<div class="card ' + cls + '" style="animation-delay:' + Math.min(i * 18, 450) + 'ms"><div class="row"><div><div class="room">' + esc(r.name) + '</div><div class="meta">' + esc(r.block) + (r.campus ? ' · ' + esc(r.campus) : '') + '</div></div><span class="pill">' + pill + '</span></div>' +
      '<div class="lbl">' + lbl + '</div><div class="big">' + big + '</div><div class="bar"><i style="width:' + pct.toFixed(0) + '%"></i></div><div class="sub">' + sub + '</div></div>' };
  });
  var groups = {};
  list.forEach(function (x, i) { (groups[x.r.block] = groups[x.r.block] || []).push(i); });
  g.innerHTML = Object.keys(groups).sort(blockSort).map(function (k) {
    var idx = groups[k], f = idx.filter(function (i) { return !list[i].st.busy; }).length;
    return '<h2 class="sec">' + esc(k) + '<small>' + f + ' free · ' + (idx.length - f) + ' occupied</small></h2><div class="grid">' +
      idx.map(function (i) { return cards[i].h; }).join('') + '</div>';
  }).join('');
  firstRender = false;
}

/* ---------- live tick (every second) ---------- */
function tick() {
  var now = Date.now(), redo = fD.format(now) !== lastToday;
  $('clock').textContent = fC.format(now).replace(',', '');
  var cds = document.querySelectorAll('.cd');
  for (var i = 0; i < cds.length; i++) {
    var t = +cds[i].getAttribute('data-t');
    if (t <= now) redo = true; else cds[i].textContent = dur(t - now);
  }
  if (redo && ROOMS.length) render();
}
setInterval(tick, 1000);
setInterval(loadData, 5 * 60 * 1000);                                   // re-pull the timetable every 5 minutes
document.addEventListener('visibilitychange', function () { if (!document.hidden && ROOMS.length) render(); });

['search', 'block', 'status', 'minfree'].forEach(function (id) { $(id).addEventListener(id === 'search' ? 'input' : 'change', function () { if (ROOMS.length) render(); }); });
$('refresh').addEventListener('click', loadData);
$('manual-load').addEventListener('click', function () {
  try { setData(JSON.parse($('manual-text').value)); $('manual').classList.add('hidden'); } catch (e) { $('updated').textContent = 'invalid JSON'; }
});
tick(); loadData();