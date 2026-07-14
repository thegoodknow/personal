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
const BASE_PAGES_URL = `https://${REPO_OWNER}.github.io/${REPO_NAME}/pages/`;

// --- DATA REGISTRY: LOCAL PAGES WITH ACADEMIC TAGS ---
const MY_WORKSPACE_PAGES = [
    { fileName: "CA_Quiz.html", tags: ["Academic", "Quiz"] },
    { fileName: "convert.html", tags: ["Utility"] },
    { fileName: "DBM LAB7.html", tags: ["Academic", "Quiz"] },
    { fileName: "department.html", tags: ["Academic"] },
    { fileName: "gdp.html", tags: ["Economics", "Data"] },
    { fileName: "timetable test.html", tags: ["System Testing"] },
    { fileName: "timetable.html", tags: ["Utility"] }
];

// --- DATA REGISTRY: ASSIGNMENTS & LAB DEADLINES ---
const ACADEMIC_DEADLINES = [
    { title: "Part 1 Assignment", module: "AICT015-4-1-DBM", dueDate: "2026-07-06", type: "Assignment" },
    { title: "Report Assignment", module: "AICT021-4-1-OPS", dueDate: "2026-07-27", type: "Assignment" },
    { title: "Install Assignment", module: "AICT021-4-1-OPS", dueDate: "2026-07-27", type: "Assignment" },
    { title: "Python Assignment", module: "AAPP015-4-1-PWP", dueDate: "2026-08-14", type: "Assignment" },
    { title: "Part 2 Assignment", module: "AICT015-4-1-DBM", dueDate: "2026-08-02", type: "Assignment" },
    { title: "Part 2 Assignment", module: "AICT022-4-1-ISCC", dueDate: "2026-07-27", type: "Assignment" },
    { title: "Final Exam", module: "AICT015-4-1-DBM", dueDate: "2026-08-24", type: "Exam" },
    { title: "Final Exam", module: "AICT021-4-1-OPS", dueDate: "2026-08-26", type: "Exam" },
    { title: "Final Exam", module: "AICT022-4-1-ISCC", dueDate: "2026-08-28", type: "Exam" },
    { title: "Final Exam", module: "AAPP015-4-1-PWP", dueDate: "2026-09-02", type: "Exam" }
];

let selectedModuleCode = null;

// Turnitin Framework API Link Handler Integration
function redirectToTurnitin() {
    const reportId = document.getElementById('turnitin-id-field').value.trim();
    if (!reportId) {
        alert("Please enter a valid Turnitin Report ID first!");
        return;
    }
    const turnitinApiUrl = `https://ev.turnitin.com/app/carta/en_us/?lang=en_us&o=${reportId}&u=1192157007&ro=103&s=1&student_user=1`;
    window.open(turnitinApiUrl, '_blank');
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
function loadRepositoryPages() {
    const container = document.getElementById('pages-container');
    if (!container) return;
    container.innerHTML = '';
    
    MY_WORKSPACE_PAGES.forEach(pageObj => {
        const cleanTitle = pageObj.fileName.replace('.html', '').replace(/[-_]/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
        
        let tagsMarkup = '';
        pageObj.tags.forEach(tag => {
            let colorClass = 'open-tag'; 
            if (tag === 'Academic' || tag === 'DBM LAB7' || tag === 'DMS-ClassTest') colorClass = 'test-tag'; 
            if (tag === 'System') colorClass = 'online-tag'; 
            if (tag === 'Utility') colorClass = 'replacement-tag'; 
            
            tagsMarkup += `<span class="pill ${colorClass}" style="font-size: 0.65rem; padding: 2px 6px; margin-left: 5px; font-weight:600;">${tag}</span>`;
        });

        const linkElement = document.createElement('a');
        linkElement.className = 'page-item-link';
        linkElement.href = `${BASE_PAGES_URL}${pageObj.fileName}`;
        linkElement.innerHTML = `
            <div class="page-title-group">
                <span class="material-icons">construction</span>
                <div style="display: flex; flex-direction: column; gap: 2px;">
                    <span>${cleanTitle}</span>
                    <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 2px;">${tagsMarkup}</div>
                </div>
            </div>
            <span class="material-icons" style="font-size: 1.1rem; color: var(--text-subtle);">arrow_forward</span>
        `;
        container.appendChild(linkElement);
    });
}

// --- INTERACTIVE ASSIGNMENTS PANEL ---
function buildModuleDeadlinesSelector() {
    const tabsRow = document.getElementById('module-tabs-row');
    if (!tabsRow) return;
    tabsRow.innerHTML = '';

    if (ACADEMIC_DEADLINES.length === 0) {
        document.getElementById('deadlines-container').innerHTML = `<div class="empty-state">No upcoming tasks listed!</div>`;
        return;
    }

    const uniqueModules = [...new Set(ACADEMIC_DEADLINES.map(t => t.module))];

    uniqueModules.forEach(moduleCode => {
        const tabBtn = document.createElement('button');
        tabBtn.className = 'module-tab-btn';
        tabBtn.textContent = moduleCode;
        
        tabBtn.addEventListener('click', () => {
            selectedModuleCode = moduleCode;
            document.querySelectorAll('.module-tab-btn').forEach(b => b.classList.remove('active-tab'));
            tabBtn.classList.add('active-tab');
            renderSelectedModuleTasks();
        });
        
        tabsRow.appendChild(tabBtn);
    });

    // NOTE: Auto-execution logic for `renderSelectedModuleTasks()` is completely removed on initialization
    // to preserve the instruction text until a module button is actively selected.
}

function renderSelectedModuleTasks() {
    const container = document.getElementById('deadlines-container');
    if (!container) return;

    // Remove the descriptive placeholder prompt layout safely
    const initialPrompt = document.getElementById('initial-assignment-state');
    if (initialPrompt) {
        initialPrompt.remove();
    }

    container.innerHTML = '';
    if (!selectedModuleCode) return;

    const filteredTasks = ACADEMIC_DEADLINES.filter(t => t.module === selectedModuleCode);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    filteredTasks.forEach(task => {
        const taskDate = new Date(task.dueDate);
        taskDate.setHours(0, 0, 0, 0);
        
        const diffTime = taskDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let pillClass = "open-tag"; 
        let countdownLabel = `${diffDays} days left`;
        let leftBorderColor = "rgba(255, 255, 255, 0.15)";

        if (diffDays < 0) {
            pillClass = "conducted-tag";
            countdownLabel = "Overdue";
        } else if (diffDays === 0) {
            pillClass = "test-tag";
            countdownLabel = "TODAY";
            leftBorderColor = "var(--color-test)";
        } else if (diffDays <= 3) {
            pillClass = "replacement-tag";
            countdownLabel = "Urgent";
            leftBorderColor = "var(--color-replacement)";
        }

        const taskItem = document.createElement('div');
        taskItem.className = 'deadline-task-item'; 
        taskItem.style.borderLeftColor = leftBorderColor;
        taskItem.innerHTML = `
            <div class="task-info-side">
                <span class="deadline-title">${task.title}</span>
                <span class="deadline-date-sub">Due Date: ${task.dueDate}</span>
            </div>
            <span class="pill ${pillClass}" style="font-size:0.7rem; padding:2px 6px;">${countdownLabel}</span>
        `;
        container.appendChild(taskItem);
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

    let configData = { announcements: { isExamWeek: false }, exams: [], holidays: [] };

    try {
        const configRes = await fetch(`config.json`);
        if (configRes.ok) {
            configData = await configRes.json();
        }
    } catch (e) {
        console.warn("Global config parameters offline, running standard cycle configurations.", e);
    }

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
                            <span>${classItem.moduleName}</span>
                        </div>
                        <div class="card-subtitle">
                            ${classItem.location} (${classItem.campus})${labelType}
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
document.addEventListener("DOMContentLoaded", () => {
    loadRepositoryPages();
    buildModuleDeadlinesSelector();
    loadTimetable();

    // Re-scan timetable metrics configuration parameters every 30 seconds
    setInterval(loadTimetable, 30000);
});