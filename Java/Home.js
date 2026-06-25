/**
 * Core Automation Script Modules for Workspace Hub
 * - Immediate class condition checks (accurate to the second)
 * - Blends greetings with live class-aware details completely in real time
 * - Standard 12-hour AM/PM time formatting engines
 * - Filtered module select system with step stagger layout entry animations
 */

const REPO_OWNER = 'thegoodknow';
const REPO_NAME = 'personal';
const BASE_PAGES_URL = `https://${REPO_OWNER}.github.io/${REPO_NAME}/pages/`;

// --- DATA REGISTRY: ASSIGNMENTS & LAB DEADLINES ---
const ACADEMIC_DEADLINES = [
    { title: "Python Programming Lab 3", module: "AAPP015-4-1-PWP", dueDate: "2026-06-28", type: "Lab" },
    { title: "Final Assignment Documentation", module: "AAPP015-4-1-PWP", dueDate: "2026-07-10", type: "Assignment" },
    { title: "Database Systems Core Class Test", module: "DMS-ClassTest", dueDate: "2026-07-02", type: "Test" },
    { title: "Web UI Personal Portfolio Project", module: "HTML-CSS-Git", dueDate: "2026-07-15", type: "Assignment" }
];

// Globally tracks which module code is currently clicked/highlighted
let selectedModuleCode = null;

// Utility: Convert 24-hour time string ("HH:MM") to 12-hour string ("H:MM AM/PM")
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

// Utility: Convert a time range string ("13:30 - 15:30") to 12-hour format
function formatRange12Hour(rangeStr) {
    const parts = rangeStr.split('-');
    if (parts.length !== 2) return rangeStr;
    return `${format12Hour(parts[0])} - ${format12Hour(parts[1])}`;
}

// Real-Time System Navigation Clock Trigger (12-Hour Format)
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

// Smart Time-of-Day Base Greeting Generator
function getTimeOfDayGreeting() {
    const hours = new Date().getHours();
    if (hours >= 5 && hours < 12) return "🌅 Good Morning!";
    if (hours >= 12 && hours < 17) return "☀️ Good Afternoon!";
    return "🌌 Good Evening!";
}

// Compute Sunday-Bound File Names
function getCurrentWeeklyFileName() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - dayOfWeek);
    return `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}.json`;
}

// Render Local Repos Workspace Pages Links
function loadRepositoryPages() {
    const container = document.getElementById('pages-container');
    const myPages = ["CA_Quiz.html", "convert.html", "DBM LAB7.html", "department.html", "gdp.html", "record.html", "timetable test.html", "timetable.html"];
    container.innerHTML = '';
    myPages.forEach(fileName => {
        const cleanTitle = fileName.replace('.html', '').replace(/[-_]/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
        const linkElement = document.createElement('a');
        linkElement.className = 'page-item-link';
        linkElement.href = `${BASE_PAGES_URL}${fileName}`;
        linkElement.innerHTML = `
            <div class="page-title-group"><span class="material-icons">construction</span><span>${cleanTitle}</span></div>
            <span class="material-icons" style="font-size: 1.1rem; color: var(--text-subtle);">arrow_forward</span>
        `;
        container.appendChild(linkElement);
    });
}

// INTERACTIVE ASSIGNMENTS PANEL: Generates selection buttons first
function buildModuleDeadlinesSelector() {
    const tabsRow = document.getElementById('module-tabs-row');
    tabsRow.innerHTML = '';

    if (ACADEMIC_DEADLINES.length === 0) {
        document.getElementById('deadlines-container').innerHTML = `<div class="empty-state">No upcoming tasks listed!</div>`;
        return;
    }

    // Isolate unique module lists
    const uniqueModules = [...new Set(ACADEMIC_DEADLINES.map(t => t.module))];

    // Auto-select the first module if nothing is actively selected yet
    if (!selectedModuleCode && uniqueModules.length > 0) {
        selectedModuleCode = uniqueModules[0];
    }

    uniqueModules.forEach(moduleCode => {
        const tabBtn = document.createElement('button');
        tabBtn.className = (moduleCode === selectedModuleCode) ? 'module-tab-btn active-tab' : 'module-tab-btn';
        tabBtn.textContent = moduleCode;
        
        tabBtn.addEventListener('click', () => {
            selectedModuleCode = moduleCode;
            // Toggle active visual states on button rows
            document.querySelectorAll('.module-tab-btn').forEach(b => b.classList.remove('active-tab'));
            tabBtn.classList.add('active-tab');
            // Refresh content view to run CSS keyframe slide transitions
            renderSelectedModuleTasks();
        });
        
        tabsRow.appendChild(tabBtn);
    });

    renderSelectedModuleTasks();
}

// Injects tasks matching only the selected button choice
function renderSelectedModuleTasks() {
    const container = document.getElementById('deadlines-container');
    
    // Clear elements completely to force keyframe animations to recalculate
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

// Fetch Weekly Academic Timetable Files and handle immediate runtime evaluations
async function loadTimetable() {
    const container = document.getElementById('timetable-container');
    const headerNextDisplay = document.getElementById('header-next-class');
    const greetingBanner = document.getElementById('greeting-banner');
    
    const progressBarContainer = document.getElementById('daily-progress-container');
    const progressBarFill = document.getElementById('daily-progress-fill');
    
    const targetFileName = getCurrentWeeklyFileName(); 
    
    try {
        const response = await fetch(`https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/timetable/${targetFileName}`);
        if (!response.ok) {
            container.innerHTML = `<div class="empty-state">No timetable found for this week.</div>`;
            headerNextDisplay.textContent = 'No schedule found';
            greetingBanner.textContent = `${getTimeOfDayGreeting()} Ready for today's programming labs?`;
            return;
        }

        const data = await response.json();
        if (!data || !data.days || data.days.length === 0) {
            container.innerHTML = `<div class="empty-state">No classes scheduled for this week.</div>`;
            headerNextDisplay.textContent = 'Free Week';
            greetingBanner.textContent = `${getTimeOfDayGreeting()} Looks like a free week!`;
            return;
        }

        container.innerHTML = '';
        
        const now = new Date();
        const daysMap = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
        const currentDayIndex = now.getDay();
        
        // Exact real-time minutes positioning including fractional seconds parameters
        const currentMinutes = now.getHours() * 60 + now.getMinutes() + (now.getSeconds() / 60);
        
        let activeClassText = '<span class="highlight-countdown">NO ACTIVE CLASS NOW</span>';
        let activeClassObj = null;
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
                            // Inclusive time boundaries change states the exact second lectures cross thresholds
                            if (currentMinutes >= endTotalMinutes) {
                                isConducted = true; 
                                conductedClassesToday++;
                            } else if (currentMinutes >= startTotalMinutes && currentMinutes < endTotalMinutes) {
                                isCurrent = true; 
                            }
                        }
                    }

                    // Skip past items
                    if (isConducted) return; 

                    if (isCurrent) {
                        activeClassObj = classItem;
                        activeClassText = `<span class="highlight-countdown">CURRENT CLASS: ${classItem.moduleName}</span> in ${classItem.location}`;
                    }

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
                    } else if (classItem.isTest) {
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

        // Compute progress bar tracking width fills
        if (totalClassesToday > 0) {
            progressBarContainer.style.display = 'block';
            const calculatedPercentage = Math.round((conductedClassesToday / totalClassesToday) * 100);
            progressBarFill.style.width = `${calculatedPercentage}%`;
        } else {
            progressBarContainer.style.display = 'none';
        }

        // Apply metadata updates directly into header layout nodes
        headerNextDisplay.innerHTML = activeClassText;

        // Dynamic Greeting Engine Transitions
        const baseGreetingPrefix = getTimeOfDayGreeting(); 
        if (activeClassObj) {
            const formattedRange = formatRange12Hour(activeClassObj.time);
            greetingBanner.textContent = `${baseGreetingPrefix} You are currently attending ${activeClassObj.moduleName} (${activeClassObj.classType || 'Class'}) in ${activeClassObj.location} [${formattedRange}].`;
        } else {
            const hours = new Date().getHours();
            if (hours >= 5 && hours < 12) {
                greetingBanner.textContent = `${baseGreetingPrefix} Ready for today's programming labs?`;
            } else if (hours >= 12 && hours < 17) {
                greetingBanner.textContent = `${baseGreetingPrefix} Hope your lectures are going well!`;
            } else {
                greetingBanner.textContent = `${baseGreetingPrefix} Great time for working on github repository tools.`;
            }
        }

        if (!visibleCardsInjected) {
            container.innerHTML = `<div class="empty-state">No upcoming classes left for this week! 🎉</div>`;
        }

    } catch (err) {
        console.error(err);
        container.innerHTML = `<div class="message-box error">Error loading tracking documents.</div>`;
        headerNextDisplay.textContent = 'Offline status';
        greetingBanner.textContent = `${getTimeOfDayGreeting()} Workspace is running locally.`;
    }
}

// Initialize Active Subsystems
loadRepositoryPages();
buildModuleDeadlinesSelector();
loadTimetable();

// SECONDARY AUTOMATION SPEED: Scans schedule matrix boundaries every 1 second 
// to transition headings/greetings live without delays
setInterval(() => {
    loadTimetable();
}, 1000);