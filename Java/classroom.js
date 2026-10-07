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
  refreshSlotDates();
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

/* ---------- time-slot finder ---------- */
function dateLabel(d) { return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short', day: '2-digit', month: 'short' }).format(Date.parse(d + 'T12:00:00+08:00')); }
function refreshSlotDates() {
  var today = fD.format(Date.now()), keys = Object.keys(DATES);
  if (keys.indexOf(today) < 0) keys.push(today);
  keys.sort();
  var sel = $('slot-date'), cur = sel.value || today;
  sel.innerHTML = keys.map(function (d) { return '<option value="' + d + '">' + (d === today ? 'Today · ' : '') + dateLabel(d) + '</option>'; }).join('');
  sel.value = keys.indexOf(cur) >= 0 ? cur : today;
}
function getSlot() {
  if ($('slot-panel').classList.contains('hidden')) return null;
  var d = $('slot-date').value, f = $('slot-from').value, t = $('slot-to').value;
  var s = Date.parse(d + 'T' + f + ':00+08:00'), e = Date.parse(d + 'T' + t + ':00+08:00');
  return { date: d, s: s, e: e, ok: !!(d && f && t) && !isNaN(s) && !isNaN(e) && e > s };
}
function slotInfo(room, slot) {
  var bl = blocksOf(room, slot.date), free = true, prev = null, next = null;
  bl.forEach(function (b) {
    if (b.s < slot.e && b.e > slot.s) free = false;
    if (b.e <= slot.s) prev = b;
    if (b.s >= slot.e && !next) next = b;
  });
  return { free: free, prev: prev, next: next };
}
function updateSlotMsg(slot, n, total) {
  if (!slot) return;
  var m = $('slot-msg'); m.className = 'slot-msg' + (slot.ok ? '' : ' warn');
  m.textContent = slot.ok ? n + ' of ' + total + ' rooms are free from ' + fT.format(slot.s) + ' to ' + fT.format(slot.e) + ' on ' + dateLabel(slot.date) + '.' : 'End time must be after the start time.';
}

/* ---------- room details popup ---------- */
var OPEN_ROOM = null;
function levelOf(n) {
  var m = /^[A-Z]-(\d+)-/.exec(n) || /(\d+)-\d+/.exec(n) || /level\s*(\d+)/i.exec(n);
  return m ? 'Level ' + parseInt(m[1], 10) : 'Level –';
}
function grp(items) {
  var map = {}, out = [];
  items.forEach(function (c) {
    var k = c.code + '|' + c.s + '|' + c.e;
    if (!map[k]) { map[k] = { code: c.code, mod: c.mod, lect: c.lect, s: c.s, e: c.e, ints: [] }; out.push(map[k]); }
    if (c.intake && map[k].ints.indexOf(c.intake) < 0) map[k].ints.push(c.intake);
  });
  return out.sort(function (a, b) { return a.s - b.s; });
}
function classBox(c) {
  return '<div class="cl"><b>' + fT.format(c.s) + ' – ' + fT.format(c.e) + '</b><div>' + esc(c.code) + (c.mod ? ' · ' + esc(c.mod) : '') + '</div>' +
    (c.lect ? '<div class="m">Lecturer: ' + esc(c.lect) + '</div>' : '') + (c.ints.length ? '<div class="m">Intakes: ' + esc(c.ints.join(', ')) + '</div>' : '') + '</div>';
}
function renderModal() {
  var room = ROOMS.filter(function (r) { return r.name === OPEN_ROOM; })[0];
  if (!room) { closeModal(); return; }
  var now = Date.now(), today = fD.format(now), st = status(room, now, today), bl = blocksOf(room, today), slot = getSlot(), all = [];
  bl.forEach(function (b) { all = all.concat(b.items); });
  var when = st.busy ? 'Free in <span class="cd" data-t="' + st.until + '">' + dur(st.until - now) + '</span>'
    : st.next ? 'Free for <span class="cd" data-t="' + st.next.s + '">' + dur(st.freeFor) + '</span>' : 'Free for the rest of the day';
  var nextBlock = st.busy ? st.after : st.next;
  var h = '<div class="mh ' + (st.busy ? 'busy' : 'free') + '"><div><div class="room" style="font-size:1.4rem">' + esc(room.name) + '</div><div class="meta">' + esc(room.campus) + '</div></div><span class="pill">' + (st.busy ? 'Occupied' : 'Free') + '</span></div>' +
    '<div class="kv"><div><span>Block</span>' + esc(room.block) + '</div><div><span>Level</span>' + esc(levelOf(room.name)) + '</div><div><span>Campus</span>' + esc(room.campus || '–') + '</div><div><span>Right now</span>' + when + '</div></div>';
  if (slot && slot.ok) {
    var sl = slotInfo(room, slot);
    h += '<div class="slotrow ' + (sl.free ? '' : 'no') + '">Selected slot ' + fT.format(slot.s) + ' – ' + fT.format(slot.e) + ' (' + dateLabel(slot.date) + '): <b>' + (sl.free ? 'Free' : 'Occupied') + '</b></div>';
  }
  h += '<h3>Current class</h3>' + (st.busy ? grp(st.b.items).map(classBox).join('') : '<div class="m">No class in this room right now.</div>');
  h += '<h3>Next class</h3>' + (nextBlock ? grp(nextBlock.items).map(classBox).join('') : '<div class="m">No more classes scheduled today.</div>');
  h += '<h3>Today\'s schedule</h3>' + (all.length ? grp(all).map(function (c) {
    return '<div class="srow' + (c.s <= now && now < c.e ? ' now' : '') + '">' + fT.format(c.s) + ' – ' + fT.format(c.e) + ' · ' + esc(c.code) + '</div>';
  }).join('') : '<div class="m">No classes scheduled today.</div>');
  $('m-body').innerHTML = h;
}
function openModal(name) { OPEN_ROOM = name; renderModal(); if (OPEN_ROOM) { $('modal').classList.remove('hidden'); document.body.style.overflow = 'hidden'; } }
function closeModal() { OPEN_ROOM = null; $('modal').classList.add('hidden'); document.body.style.overflow = ''; }

/* ---------- render ---------- */
function render() {
  var now = Date.now(), today = fD.format(now); lastToday = today;
  var all = ROOMS.map(function (r) { return { r: r, st: status(r, now, today) }; });
  var q = $('search').value.trim().toLowerCase(), blk = $('block').value, stf = $('status').value, minf = +$('minfree').value * 60000;

  var slot = getSlot(), slotFree = 0;
  if (slot && slot.ok) all.forEach(function (x) { x.sl = slotInfo(x.r, slot); if (x.sl.free) slotFree++; });
  updateSlotMsg(slot, slotFree, all.length);
  $('status').disabled = $('minfree').disabled = !!slot;

  var free = all.filter(function (x) { return !x.st.busy; });
  $('s-total').textContent = all.length; $('s-free').textContent = free.length; $('s-busy').textContent = all.length - free.length;
  $('s-long').textContent = free.filter(function (x) { return x.st.freeFor >= 3600000; }).length;

  var note = $('note'); note.className = 'note';
  if (!DATES[today]) { note.className = 'note warn'; note.textContent = 'No classes are scheduled for today (' + today + ') in the timetable data, so every room shows as free.'; }
  else note.textContent = 'Based on the weekly class timetable for ' + today + '. Rooms with no scheduled class show as free; ad-hoc bookings and online rooms are not included.';

  if (slot && slot.ok) note.textContent = 'Showing rooms with no class at any point during the selected time slot. Click a room for details.';

  var list = all.filter(function (x) {
    if (slot && !(slot.ok && x.sl.free)) return false;
    if (ONLY && x.r.name.toLowerCase() !== ONLY.toLowerCase()) return false;
    if (q && x.r.name.toLowerCase().indexOf(q) < 0) return false;
    if (blk && x.r.block !== blk) return false;
    if (!slot) {
      if (stf === 'free' && x.st.busy) return false;
      if (stf === 'busy' && !x.st.busy) return false;
      if (minf && (x.st.busy || x.st.freeFor < minf)) return false;
    }
    return true;
  }).sort(function (a, b) {                                           // room-number order (A-05-01, A-05-02, ... A-10-01), not by availability
    return a.r.name.localeCompare(b.r.name, undefined, { numeric: true, sensitivity: 'base' });
  });

  var ob = $('only');
  if (ONLY) { ob.classList.remove('hidden'); ob.innerHTML = 'Showing room <b>' + esc(ONLY) + '</b> only <a href="' + esc(location.pathname) + '">Show all rooms</a>'; }
  var g = $('grid'); g.className = firstRender ? 'anim' : '';
  if (!list.length) { g.innerHTML = '<div class="empty">' + (ONLY ? 'Room “' + esc(ONLY) + '” was not found in the timetable data. Rooms with no scheduled class this week are not listed.' : (slot ? (slot.ok ? 'No rooms are free for the whole of that time slot.' : 'Choose an end time that is after the start time.') : 'No rooms match these filters.')) + '</div>'; firstRender = false; return; }
  var cards = list.map(function (x, i) {
    var r = x.r, s = x.st, cls, pill, lbl, big, pct, sub;
    if (slot && slot.ok) {                                              // time-slot mode: show the free window around the slot
      var sl = x.sl;
      return { b: r.block, h: '<div class="card free" data-room="' + esc(r.name) + '" tabindex="0" style="animation-delay:' + Math.min(i * 18, 450) + 'ms"><div class="row"><div><div class="room">' + esc(r.name) + '</div><div class="meta">' + esc(r.block) + ' · ' + esc(levelOf(r.name)) + (r.campus ? ' · ' + esc(r.campus) : '') + '</div></div><span class="pill">Available</span></div>' +
        '<div class="lbl">Free window</div><div class="big sm">' + (sl.prev ? fT.format(sl.prev.e) : 'Start of day') + ' – ' + (sl.next ? fT.format(sl.next.s) : 'End of day') + '</div><div class="bar"><i style="width:100%"></i></div>' +
        '<div class="sub"><b>Before:</b> ' + (sl.prev ? who(sl.prev.items) : 'No earlier class') + '<br><b>After:</b> ' + (sl.next ? who(sl.next.items) : 'No later class') + '</div></div>' };
    }
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
    return { b: r.block, h: '<div class="card ' + cls + '" data-room="' + esc(r.name) + '" tabindex="0" style="animation-delay:' + Math.min(i * 18, 450) + 'ms"><div class="row"><div><div class="room">' + esc(r.name) + '</div><div class="meta">' + esc(r.block) + ' · ' + esc(levelOf(r.name)) + (r.campus ? ' · ' + esc(r.campus) : '') + '</div></div><span class="pill">' + pill + '</span></div>' +
      '<div class="lbl">' + lbl + '</div><div class="big">' + big + '</div><div class="bar"><i style="width:' + pct.toFixed(0) + '%"></i></div><div class="sub">' + sub + '</div></div>' };
  });
  var groups = {};
  list.forEach(function (x, i) { (groups[x.r.block] = groups[x.r.block] || []).push(i); });
  g.innerHTML = Object.keys(groups).sort(blockSort).map(function (k) {
    var idx = groups[k], f = idx.filter(function (i) { return !list[i].st.busy; }).length;
    return '<h2 class="sec">' + esc(k) + '<small>' + ((slot && slot.ok) ? idx.length + ' available' : f + ' free · ' + (idx.length - f) + ' occupied') + '</small></h2><div class="grid">' +
      idx.map(function (i) { return cards[i].h; }).join('') + '</div>';
  }).join('');
  firstRender = false;
  if (OPEN_ROOM) renderModal();
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
$('slot-toggle').addEventListener('click', function () {
  var p = $('slot-panel'); p.classList.toggle('hidden');
  $('slot-toggle').classList.toggle('on', !p.classList.contains('hidden'));
  if (ROOMS.length) render();
});
$('slot-clear').addEventListener('click', function () { $('slot-panel').classList.add('hidden'); $('slot-toggle').classList.remove('on'); if (ROOMS.length) render(); });
['slot-date', 'slot-from', 'slot-to'].forEach(function (id) { $(id).addEventListener('input', function () { if (ROOMS.length) render(); }); });
$('grid').addEventListener('click', function (e) { var c = e.target.closest('.card'); if (c) openModal(c.getAttribute('data-room')); });
$('grid').addEventListener('keydown', function (e) { var c = e.target.closest && e.target.closest('.card'); if (c && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openModal(c.getAttribute('data-room')); } });
$('m-close').addEventListener('click', closeModal);
$('modal').addEventListener('click', function (e) { if (e.target === $('modal')) closeModal(); });
document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && OPEN_ROOM) closeModal(); });
refreshSlotDates();
tick(); loadData();