        /**
 * Core Automation Script Modules for Workspace Hub
 * - Immediate class condition checks (accurate to the second)
 * - Feature: Separate global configuration fetching for holidays and exam modes
 * - Feature: Live countdown timer tracking remaining minutes for active/upcoming classes
 * - Feature: Picks a completely randomized greeting based on time of day on every page visit
 * - Feature: Categorized academic & subject tags for local hosted pages
 */

const REPO_OWNER = 'thegoodknow';
const REPO_NAME = 'personal';
let BASE_PAGES_URL = 'https://thegoodknow.nx.kg/pages/';   // can be overridden with "siteBase" in config.json
const CLASSROOM_PAGE = 'classroom';                          // classroom.html, opened WITHOUT ".html"
const REDIRECT_DELAY_MS = 1500;

// --- DATA REGISTRY: LOCAL PAGES WITH ACADEMIC TAGS ---
const MY_WORKSPACE_PAGES = [
    { fileName: "ISCC.html", tags: ["Academic"] },
    { fileName: "convert.html", tags: ["Utility"] },
    { fileName: "DBM LAB7.html", tags: ["Academic", "Quiz"] },
    { fileName: "department.html", tags: ["Academic"] },
    { fileName: "classroom.html", tags: ["Academic"] },
    { fileName: "timetable test.html", tags: ["System Testing"] },
    { fileName: "timetable.html", tags: ["Utility"] }
];

// --- CONFIG (config.json): assignments, exams, holidays, optional siteBase ---
const DEFAULT_CONFIG = { siteBase: '', announcements: { isExamWeek: false }, exams: [], holidays: [], assignments: [] };
let CONFIG = DEFAULT_CONFIG;
let configSignature = '';
let configError = '';
let selectedModuleCode = null;

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Returns true when config.json changed (or loaded for the first time)
async function loadConfig() {
    try {
        const res = await fetch('config.json', { cache: 'no-store' });
        if (!res.ok) throw new Error('config.json not found (HTTP ' + res.status + ')');
        const text = await res.text();
        if (text === configSignature) return false;
        const parsed = JSON.parse(text);
        configSignature = text;
        configError = '';
        CONFIG = Object.assign({}, DEFAULT_CONFIG, parsed);
        if (CONFIG.siteBase) BASE_PAGES_URL = String(CONFIG.siteBase).replace(/\/?$/, '/');
        return true;
    } catch (e) {
        configError = e.message;
        console.warn('Config unavailable, keeping previous settings.', e);
        return false;
    }
}

// --- LINK HELPERS: every link opens in a NEW tab through a redirecting screen ---
function pageHref(fileName) {                       // "DBM LAB7.html" -> BASE/DBM%20LAB7  (no .html)
    return BASE_PAGES_URL + fileName.replace(/\.html?$/i, '').split('/').map(encodeURIComponent).join('/');
}

function roomLinkHtml(c) {
    const room = (c.location || '').trim();
    if (!room) return '';
    if (c.isOnline || /^onl/i.test(room)) return esc(room);          // online rooms are not on the availability page
    const href = `${BASE_PAGES_URL}${CLASSROOM_PAGE}?classroom=${encodeURIComponent(room)}`;
    return `<a class="room-link" href="${esc(href)}" target="_blank" rel="noopener noreferrer" data-redirect data-label="${esc('Room ' + room + ' availability')}" title="View ${esc(room)} availability">${esc(room)}</a>`;
}

function buildRedirectPage(url, label, delay) {
    const host = new URL(url).hostname;
    const urlJson = JSON.stringify(url).replace(/</g, '\\u003c');
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Redirecting…</title><style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#121212;color:#f2f2f7;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}
.box{width:min(420px,90vw);text-align:center;background:rgba(30,30,30,.65);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:32px 28px;box-shadow:0 8px 32px rgba(0,0,0,.5);animation:in .5s cubic-bezier(.16,1,.3,1) both}
.ring{width:54px;height:54px;margin:0 auto 18px;border-radius:50%;border:4px solid rgba(255,255,255,.1);border-top-color:#007BFF;animation:spin .9s linear infinite}
h1{font-size:1.15rem;margin:0 0 6px}.host{color:#98989f;font-size:.85rem;margin:0 0 20px;word-break:break-all}
.track{height:6px;border-radius:6px;background:rgba(255,255,255,.1);overflow:hidden}#bar{height:100%;width:0;background:linear-gradient(90deg,#007BFF,#00D2FF)}
.sub{color:#98989f;font-size:.8rem;margin:12px 0 20px}.row{display:flex;gap:10px;justify-content:center}
a.go,button{font:inherit;font-size:.85rem;font-weight:600;border-radius:8px;padding:9px 18px;cursor:pointer;text-decoration:none;border:1px solid rgba(255,255,255,.12)}
a.go{background:#007BFF;border-color:#007BFF;color:#fff}button{background:rgba(255,255,255,.06);color:#f2f2f7}
@keyframes spin{to{transform:rotate(360deg)}}@keyframes in{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
</style></head><body><div class="box"><div class="ring"></div><h1>Redirecting you to ${esc(label)}</h1><p class="host">${esc(host)}</p><div class="track"><div id="bar"></div></div><p class="sub">Opening in <span id="n">${Math.ceil(delay / 1000)}</span>s…</p><div class="row"><a class="go" href="${esc(url)}">Go now</a><button id="x" type="button">Cancel</button></div></div><script>
(function(){var u=${urlJson},d=${delay},t0=Date.now(),bar=document.getElementById('bar'),n=document.getElementById('n');
var iv=setInterval(function(){var e=Date.now()-t0;bar.style.width=Math.min(100,e/d*100)+'%';n.textContent=Math.max(0,Math.ceil((d-e)/1000));},50);
var tm=setTimeout(function(){location.replace(u);},d);
document.getElementById('x').onclick=function(){clearTimeout(tm);clearInterval(iv);window.close();};
document.querySelector('a.go').onclick=function(e){e.preventDefault();clearTimeout(tm);location.replace(u);};
})();
<\/script></body></html>`;
}

// Opens the tab immediately (so pop-up blockers allow it), shows the redirect screen there, then forwards.
function openWithRedirect(url, label) {
    let target;
    try { target = new URL(url, location.href); } catch (e) { return; }
    if (!/^https?:$/.test(target.protocol)) return;
    const win = window.open('', '_blank');
    if (!win) { alert('Your browser blocked the new tab. Please allow pop-ups for this site and try again.'); return; }
    try { win.opener = null; } catch (e) {}
    win.document.open();
    win.document.write(buildRedirectPage(target.href, label || target.hostname, REDIRECT_DELAY_MS));
    win.document.close();
}

document.addEventListener('click', (e) => {
    const a = e.target.closest ? e.target.closest('a[data-redirect]') : null;
    if (!a || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;   // let modified clicks behave normally
    e.preventDefault();
    openWithRedirect(a.href, a.dataset.label || a.textContent.trim());
});

// Turnitin Framework API Link Handler Integration
function redirectToTurnitin() {
    const reportId = document.getElementById('turnitin-id-field').value.trim();
    if (!reportId) {
        alert("Please enter a valid Turnitin Report ID first!");
        return;
    }
    openWithRedirect(`https://ev.turnitin.com/app/carta/en_us/?lang=en_us&o=${encodeURIComponent(reportId)}&u=1192157007&ro=103&s=1&student_user=1`, 'Turnitin report');
}

// Utility Time Conversions
function format12Hour(timeStr) {
    if (!timeStr) return '';
    const [hoursStr, minutesStr] = timeStr.trim().split(':');
    let hours = parseInt(hoursStr, 10);
    const minutes = minutesStr.trim();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes} ${ampm}`;
}

// Format time range string safely
function formatRange12Hour(rangeStr) {
    const parts = rangeStr.split('-');
    if (parts.length !== 2) return rangeStr;
    return `${format12Hour(parts[0])} - ${format12Hour(parts[1])}`;
}

// Live Digital System Navigation Clock Trigger
function updateClock() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    document.getElementById('live-clock').textContent = `${hours}:${minutes}:${seconds} ${ampm}`;
}
setInterval(updateClock, 1000);
updateClock();

// --- RANDOMIZED GREETING ENGINE ---
function getRandomizedGreeting() {
    const hours = new Date().getHours();
    const morningPhrases = [
        "🌅 Good Morning! Ready to crush today's cloud architecture labs?",
        "☕ Morning! Grab a coffee and let's push some code updates.",
        "🌤️ Wake up and debug! Your workspace is fully primed for today."
    ];
    const afternoonPhrases = [
        "☀️ Good Afternoon! Hope your lectures are moving smoothly.",
        "⚡ Focus mode activated. What are we building this afternoon?",
        "🚀 Halfway through the day! Let's check those repository pages."
    ];
    const eveningPhrases = [
        "🌌 Good Evening! Perfect time to work on side projects.",
        "🌙 Coding late? Remember to test your API queries before pushing.",
        "🖥️ Evening workspace active. Let's review the academic timeline metrics."
    ];

    const randomIndex = Math.floor(Math.random() * 3);

    if (hours >= 5 && hours < 12) return morningPhrases[randomIndex];
    if (hours >= 12 && hours < 18) return afternoonPhrases[randomIndex];
    return eveningPhrases[randomIndex];
}

// Compute Sunday-Bound File Names
function getCurrentWeeklyFileName() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - dayOfWeek);
    return `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}.json`;
}

// Render Workspace Pages Links with Subject Category Tags
const TAG_CLASS = { 'Academic': 'test-tag', 'Utility': 'replacement-tag', 'System': 'online-tag', 'System Testing': 'online-tag' };

function loadRepositoryPages() {
    const container = document.getElementById('pages-container');
    if (!container) return;
    container.innerHTML = '';

    MY_WORKSPACE_PAGES.forEach(pageObj => {
        const cleanTitle = pageObj.fileName.replace(/\.html?$/i, '').replace(/[-_]/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
        const tagsMarkup = pageObj.tags.map(tag =>
            `<span class="pill ${TAG_CLASS[tag] || 'open-tag'}" style="font-size: 0.65rem; padding: 2px 6px; margin-left: 5px; font-weight:600;">${esc(tag)}</span>`).join('');

        const linkElement = document.createElement('a');
        linkElement.className = 'page-item-link';
        linkElement.href = pageHref(pageObj.fileName);          // no ".html" in the opened URL
        linkElement.target = '_blank';
        linkElement.rel = 'noopener noreferrer';
        linkElement.dataset.redirect = '';
        linkElement.dataset.label = cleanTitle;
        linkElement.innerHTML = `
            <div class="page-title-group">
                <span class="material-icons">construction</span>
                <div style="display: flex; flex-direction: column; gap: 2px;">
                    <span>${esc(cleanTitle)}</span>
                    <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 2px;">${tagsMarkup}</div>
                </div>
            </div>
            <span class="material-icons" style="font-size: 1.1rem; color: var(--text-subtle);">open_in_new</span>
        `;
        container.appendChild(linkElement);
    });
}

// --- INTERACTIVE ASSIGNMENTS PANEL (data comes from config.json -> "assignments") ---
function getAssignmentGroups() {
    return Array.isArray(CONFIG.assignments) ? CONFIG.assignments.filter(g => g && g.moduleCode && Array.isArray(g.items)) : [];
}

function dueDateOf(task) {
    return new Date(`${task.dueDate}T${task.dueTime || '23:59'}:00`);
}

function buildModuleDeadlinesSelector() {
    const tabsRow = document.getElementById('module-tabs-row');
    const box = document.getElementById('deadlines-container');
    if (!tabsRow || !box) return;
    tabsRow.innerHTML = '';

    const groups = getAssignmentGroups();
    if (!groups.length) {
        box.innerHTML = `<div class="empty-state">${configError ? 'Could not read config.json: ' + esc(configError) : 'No upcoming tasks listed!'}</div>`;
        return;
    }
    if (selectedModuleCode && !groups.some(g => g.moduleCode === selectedModuleCode)) selectedModuleCode = null;

    groups.forEach(group => {
        const pending = group.items.filter(t => !t.done).length;
        const tabBtn = document.createElement('button');
        tabBtn.className = 'module-tab-btn' + (group.moduleCode === selectedModuleCode ? ' active-tab' : '');
        tabBtn.title = group.moduleName || group.moduleCode;
        tabBtn.innerHTML = `${esc(group.moduleCode)}<span class="count">(${pending})</span>`;
        tabBtn.addEventListener('click', () => {
            selectedModuleCode = group.moduleCode;
            tabsRow.querySelectorAll('.module-tab-btn').forEach(b => b.classList.remove('active-tab'));
            tabBtn.classList.add('active-tab');
            renderSelectedModuleTasks();
        });
        tabsRow.appendChild(tabBtn);
    });

    if (selectedModuleCode) renderSelectedModuleTasks();
    else box.innerHTML = `<div class="empty-state" id="initial-assignment-state">Please select a specific module framework above to see active deadlines.</div>`;
}

function renderSelectedModuleTasks() {
    const container = document.getElementById('deadlines-container');
    if (!container) return;
    container.innerHTML = '';
    const group = getAssignmentGroups().find(g => g.moduleCode === selectedModuleCode);
    if (!group) return;

    if (group.moduleName) container.insertAdjacentHTML('beforeend', `<div class="deadline-date-sub" style="margin-bottom:8px;">${esc(group.moduleName)}</div>`);
    if (!group.items.length) { container.insertAdjacentHTML('beforeend', `<div class="empty-state">No tasks for this module.</div>`); return; }

    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const items = group.items.slice().sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0) || dueDateOf(a) - dueDateOf(b));

    items.forEach(task => {
        const due = dueDateOf(task);
        let pillClass = 'open-tag', label = '', border = 'rgba(255, 255, 255, 0.15)';

        if (task.done) { pillClass = 'online-tag'; label = 'Done'; border = '#28a745'; }
        else if (isNaN(due)) { label = 'No date'; }
        else if (due < now) { pillClass = 'conducted-tag'; label = 'Overdue'; }
        else {
            const dueDay = new Date(due); dueDay.setHours(0, 0, 0, 0);
            const diffDays = Math.round((dueDay - todayStart) / 86400000);
            if (diffDays === 0) { pillClass = 'test-tag'; label = 'TODAY'; border = 'var(--color-test)'; }
            else if (diffDays <= 3) { pillClass = 'replacement-tag'; label = 'Urgent'; border = 'var(--color-replacement)'; }
            else label = `${diffDays} days left`;
        }

        const titleHtml = task.link
            ? `<a class="deadline-title deadline-link" href="${esc(task.link)}" target="_blank" rel="noopener noreferrer" data-redirect data-label="${esc(task.title)}">${esc(task.title)}</a>`
            : `<span class="deadline-title">${esc(task.title)}</span>`;
        const dueText = task.dueDate ? `Due: ${esc(task.dueDate)}${task.dueTime ? ' ' + esc(task.dueTime) : ''}` : 'No due date';

        const item = document.createElement('div');
        item.className = 'deadline-task-item' + (task.done ? ' deadline-done' : '');
        item.style.borderLeftColor = border;
        item.innerHTML = `
            <div class="task-info-side">
                ${titleHtml}
                <span class="deadline-date-sub">${dueText}${task.type ? ' · ' + esc(task.type) : ''}${task.notes ? ' · ' + esc(task.notes) : ''}</span>
            </div>
            <span class="pill ${pillClass}" style="font-size:0.7rem; padding:2px 6px;">${label}</span>
        `;
        container.appendChild(item);
    });
}

// --- CORE ENGINE: TIMETABLE LOAD, COUNTDOWN TICKERS & HOLIDAY MATRIX RULES ---
async function loadTimetable() {
    const container = document.getElementById('timetable-container');
    const headerNextDisplay = document.getElementById('header-next-class');
    const greetingBanner = document.getElementById('greeting-banner');
    const progressBarContainer = document.getElementById('daily-progress-container');
    const progressBarFill = document.getElementById('daily-progress-fill');
    
    if (!container) return;
    
    const now = new Date();
    const currentFormattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const currentMinutes = now.getHours() * 60 + now.getMinutes() + (now.getSeconds() / 60);

    const configData = CONFIG;

    const currentHoliday = configData.holidays ? configData.holidays.find(h => h.date === currentFormattedDate) : null;

    // --- INTERACTIVE EXAM PERIOD RENDERING MODULE ---
    if (configData.announcements && configData.announcements.isExamWeek && configData.exams && configData.exams.length > 0) {
        container.innerHTML = '';
        if (progressBarContainer) progressBarContainer.style.display = 'none';

        let nextExam = null;
        let minDiffDays = Infinity;
        const todayClear = new Date();
        todayClear.setHours(0,0,0,0);

        configData.exams.forEach(exam => {
            const examDate = new Date(exam.date);
            examDate.setHours(0,0,0,0);
            const diffTime = examDate - todayClear;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays >= 0 && diffDays < minDiffDays) {
                minDiffDays = diffDays;
                nextExam = exam;
            }

            const card = document.createElement('div');
            card.className = (diffDays === 0) ? 'class-card current-class' : 'class-card today';
            if (diffDays === 0) card.style.borderLeftColor = "var(--color-test)";

            const examDayShort = exam.date.split('-')[2] || '';
            const examMonthShort = new Date(exam.date).toLocaleString('default', { month: 'short' });

            card.innerHTML = `
                <div style="display: flex; gap: 20px; align-items: center;">
                    <div style="text-align: center; min-width: 60px; border-right: 1px solid rgba(255,255,255,0.1); padding-right: 15px;">
                        <span style="font-size: 1.8rem; font-weight: bold; display: block; color: var(--text-main);">${examDayShort}</span>
                        <span style="font-size: 0.8rem; text-transform: uppercase; color: var(--text-subtle);">${examMonthShort}</span>
                    </div>
                    <div style="flex-grow: 1;">
                        <div class="card-title" style="margin-bottom: 4px;">
                            <span class="material-icons" style="color: var(--color-test);">assignment_late</span>
                            <span style="font-weight: 600;">${exam.module}</span>
                        </div>
                        <div class="card-subtitle" style="font-size: 0.8rem; margin-bottom: 6px; color: var(--text-subtle); margin-left:0;">
                            <span class="material-icons" style="font-size:0.9rem; vertical-align:middle; margin-right:4px; color: var(--accent-primary);">place</span>${exam.location}
                        </div>
                        <div style="display: flex; gap: 15px; font-size: 0.75rem; color: #fff; opacity: 0.85; margin-top:4px;">
                            <span>🕒 ${exam.time}</span>
                            <span>⏳ ${exam.duration}</span>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

        if (nextExam) {
            if (minDiffDays === 0) {
                if (headerNextDisplay) headerNextDisplay.innerHTML = `<span class="highlight-countdown" style="background: var(--color-test); color:#fff; border-color:transparent;">📝 EXAM TODAY</span>`;
                if (greetingBanner) greetingBanner.textContent = `⚡ Attention: Your examination paper for ${nextExam.module} takes place today at ${nextExam.time}! Bring your student card and laptop cable.`;
            } else {
                if (headerNextDisplay) headerNextDisplay.innerHTML = `<span class="highlight-countdown">⏳ EXAM IN ${minDiffDays} DAYS</span>`;
                if (greetingBanner) greetingBanner.textContent = `Focus Mode Active! Your next paper [${nextExam.module.split(' (')[0]}] comes up in ${minDiffDays} days on ${nextExam.date}.`;
            }
        } else {
            if (headerNextDisplay) headerNextDisplay.innerHTML = `<span class="highlight-countdown">🎉 EXAMS COMPLETED</span>`;
            if (greetingBanner) greetingBanner.textContent = "All examinations are concluded! Enjoy your break and your side tools repository coding.";
        }
        return;
    }

    // --- PUBLIC HOLIDAY BANNER INTERCEPT MODES ---
    if (currentHoliday) {
        container.innerHTML = `
            <div class="class-card" style="text-align: center; padding: 30px 15px; border-left-color: var(--color-replacement);">
                <span class="material-icons" style="font-size: 3rem; color: #FFC107; margin-bottom: 10px;">celebration</span>
                <div class="card-title" style="justify-content: center;">Campus Closed: ${currentHoliday.name}</div>
                <div class="card-subtitle" style="margin-top: 5px; margin-left:0;">No academic classes scheduled today. Enjoy your break!</div>
            </div>`;
        if (headerNextDisplay) headerNextDisplay.innerHTML = `<span class="highlight-countdown">🎉 HOLIDAY: ${currentHoliday.name.toUpperCase()}</span>`;
        if (greetingBanner) greetingBanner.textContent = `Happy ${currentHoliday.name}! Beautiful day to take a break or work on side tools.`;
        if (progressBarContainer) progressBarContainer.style.display = 'none';
        return;
    }

    // --- STANDARD LECTURE ROUTINE PROCESSING ---
    const targetFileName = getCurrentWeeklyFileName(); 
    try {
        const response = await fetch(`https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/timetable/${targetFileName}`);
        if (!response.ok) {
            container.innerHTML = `<div class="empty-state">No timetable found for this week.</div>`;
            if (headerNextDisplay) headerNextDisplay.textContent = 'No schedule found';
            if (greetingBanner) greetingBanner.textContent = getRandomizedGreeting();
            return;
        }

        const data = await response.json();
        if (!data || !data.days || data.days.length === 0) {
            container.innerHTML = `<div class="empty-state">No classes scheduled for this week.</div>`;
            if (headerNextDisplay) headerNextDisplay.textContent = 'Free Week';
            if (greetingBanner) greetingBanner.textContent = getRandomizedGreeting();
            return;
        }

        container.innerHTML = '';
        const daysMap = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
        const currentDayIndex = now.getDay();
        
        let activeClassObj = null;
        let nextUpcomingClassObj = null;
        let minUpcomingTimeDiff = Infinity;
        let visibleCardsInjected = false;

        let totalClassesToday = 0;
        let conductedClassesToday = 0;

        data.days.forEach((dayGroup) => {
            if (dayGroup.classes && dayGroup.classes.length > 0) {
                const targetDayPrefix = dayGroup.date.split(',')[0].trim();
                const jsonDayIndex = daysMap[targetDayPrefix];

                dayGroup.classes.forEach((classItem) => {
                    let isConducted = false;
                    let isCurrent = false;

                    const [startStr, endStr] = classItem.time.split('-');
                    if (startStr && endStr) {
                        const [startH, startM] = startStr.trim().split(':').map(Number);
                        const [endH, endM] = endStr.trim().split(':').map(Number);
                        
                        const startTotalMinutes = startH * 60 + startM;
                        const endTotalMinutes = endH * 60 + endM;

                        if (currentDayIndex > jsonDayIndex) {
                            isConducted = true; 
                        } else if (currentDayIndex === jsonDayIndex) {
                            totalClassesToday++; 
                            if (currentMinutes >= endTotalMinutes) {
                                isConducted = true; 
                                conductedClassesToday++;
                            } else if (currentMinutes >= startTotalMinutes && currentMinutes < endTotalMinutes) {
                                isCurrent = true; 
                            } else if (currentMinutes < startTotalMinutes) {
                                const timeUntilStart = startTotalMinutes - currentMinutes;
                                if (timeUntilStart < minUpcomingTimeDiff) {
                                    minUpcomingTimeDiff = timeUntilStart;
                                    nextUpcomingClassObj = classItem;
                                }
                            }
                        }
                    }

                    if (isConducted) return; 

                    if (isCurrent) activeClassObj = classItem;

                    const card = document.createElement('div');
                    card.className = isCurrent ? 'class-card current-class' : 'class-card today';

                    let badgeMarkup = `<span class="pill open-tag">In-Person</span>`;
                    let iconType = 'school';

                    if (isCurrent) {
                        badgeMarkup = `<span class="pill active-now-tag">⚡ Happening Now</span>`;
                        iconType = classItem.isOnline ? 'computer' : 'school';
                    } else if (classItem.isOnline) {
                        badgeMarkup = `<span class="pill online-tag">Online</span>`;
                        iconType = 'computer';
                    } else if (classItem.isReplacement) {
                        badgeMarkup = `<span class="pill replacement-tag">Replacement</span>`;
                        iconType = 'swap_calls';
                    } else if (classItem.isTest || classItem.classType === 'Test' || classItem.classType === 'Exam') {
                        badgeMarkup = `<span class="pill test-tag">Exam/Test</span>`;
                        iconType = 'assignment_late';
                    }

                    const labelType = classItem.classType ? ` • ${classItem.classType}` : '';
                    const timeDisplay12Hr = formatRange12Hour(classItem.time);

                    card.innerHTML = `
                        <div class="card-title">
                            <span class="material-icons ${classItem.isOnline && !isCurrent ? 'online-icon' : ''}">${iconType}</span>
                            <span>${esc(classItem.moduleName)}</span>
                        </div>
                        <div class="card-subtitle">
                            ${roomLinkHtml(classItem)} (${esc(classItem.campus)})${esc(labelType)}
                        </div>
                        <div class="card-details">
                            <span>${dayGroup.date.split(',')[0]} (${dayGroup.date.split(',')[1]?.trim() || ''})</span>
                            <span class="clock-display" style="font-size: 0.85rem;">${timeDisplay12Hr}</span>
                            <div class="status-wrapper">${badgeMarkup}</div>
                        </div>
                    `;
                    container.appendChild(card);
                    visibleCardsInjected = true;
                });
            }
        });

        if (totalClassesToday > 0 && progressBarContainer && progressBarFill) {
            progressBarContainer.style.display = 'block';
            const calculatedPercentage = Math.round((conductedClassesToday / totalClassesToday) * 100);
            progressBarFill.style.width = `${calculatedPercentage}%`;
        } else if (progressBarContainer) {
            progressBarContainer.style.display = 'none';
        }

        // Ticker Countdown Render Logic
        if (activeClassObj) {
            const [, endStr] = activeClassObj.time.split('-');
            const [endH, endM] = endStr.trim().split(':').map(Number);
            const remainingMinutes = Math.ceil((endH * 60 + endM) - currentMinutes);
            if (headerNextDisplay) headerNextDisplay.innerHTML = `<span class="highlight-countdown">⚡ CURRENT CLASS</span> (${remainingMinutes}m left)`;
            if (greetingBanner) greetingBanner.textContent = `You are currently in ${activeClassObj.moduleName} (${activeClassObj.classType || 'Class'}). Ends in ${remainingMinutes} minutes.`;
        } else if (nextUpcomingClassObj) {
            const minutesLeft = Math.ceil(minUpcomingTimeDiff);
            const timeLabel = minutesLeft > 60 ? `${Math.floor(minutesLeft/60)}h ${minutesLeft%60}m` : `${minutesLeft}m`;
            if (headerNextDisplay) headerNextDisplay.innerHTML = `<span class="highlight-countdown">⏰ NEXT CLASS in ${timeLabel}</span>`;
            if (greetingBanner) greetingBanner.textContent = getRandomizedGreeting();
        } else {
            if (headerNextDisplay) headerNextDisplay.innerHTML = '<span class="highlight-countdown">✨ NO MORE CLASSES TODAY</span>';
            if (greetingBanner) greetingBanner.textContent = getRandomizedGreeting();
        }

        if (!visibleCardsInjected) {
            container.innerHTML = `<div class="empty-state">No upcoming classes left for this week! 🎉</div>`;
        }

    } catch (err) {
        console.error(err);
        container.innerHTML = `<div class="message-box error">Error loading tracking documents.</div>`;
        if (headerNextDisplay) headerNextDisplay.textContent = 'Offline status';
        if (greetingBanner) greetingBanner.textContent = 'Workspace running locally.';
    }
}

// --- INITIALIZE SUBSYSTEMS ON WEB CONTENT LOAD ---
async function refreshAll() {
    if (await loadConfig()) {            // config.json changed -> redraw the config-driven panels
        loadRepositoryPages();
        buildModuleDeadlinesSelector();
    }
    await loadTimetable();
}

document.addEventListener("DOMContentLoaded", async () => {
    await loadConfig();
    loadRepositoryPages();
    buildModuleDeadlinesSelector();
    loadTimetable();

    // Re-scan config + timetable every 30 seconds
    setInterval(refreshAll, 30000);
});