/**
 * Core Automation Script Modules for Workspace Hub
 * - Class progress bar engine
 * - Assignment & Lab tracking dashboard arrays
 * - Smart blending greetings and 12-hour clock transformations
 */

const REPO_OWNER = 'thegoodknow';
const REPO_NAME = 'personal';
const BASE_PAGES_URL = `https://${REPO_OWNER}.github.io/${REPO_NAME}/pages/`;

// --- DATA SOURCE CONFIG: FEATURE 2 (Edit this array anytime to update tasks) ---
const ACADEMIC_DEADLINES = [
    { title: "Python Programming Lab 3", module: "AAPP015-4-1-PWP", dueDate: "2026-06-28", type: "Lab" },
    { title: "Database Systems Core Class Test", module: "DMS-ClassTest", dueDate: "2026-07-02", type: "Test" },
    { title: "Web UI Personal Portfolio Project", module: "HTML-CSS-Git", dueDate: "2026-07-15", type: "Assignment" }
];

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

// Real-Time Clock Trigger (12-Hour Format)
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

// FEATURE 2: Render Deadlines Component with Urgency Evaluation
function loadDeadlinesWidget() {
    const container = document.getElementById('deadlines-container');
    container.innerHTML = '';
    
    if (ACADEMIC_DEADLINES.length === 0) {
        container.innerHTML = `<div class="empty-state">No upcoming tasks listed! Clean slate. 😎</div>`;
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    ACADEMIC_DEADLINES.forEach(task => {
        const taskDate = new Date(task.dueDate);
        taskDate.setHours(0, 0, 0, 0);
        
        // Calculate dynamic day offset gap
        const diffTime = taskDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let pillClass = "open-tag"; 
        let countdownLabel = `${diffDays} days left`;
        let borderOverride = "rgba(255, 255, 255, 0.02)";

        if (diffDays < 0) {
            pillClass = "conducted-tag";
            countdownLabel = "Overdue";
        } else if (diffDays === 0) {
            pillClass = "test-tag"; // Turns red using variables
            countdownLabel = "DUE TODAY";
            borderOverride = "rgba(255, 82, 82, 0.3)";
        } else if (diffDays <= 3) {
            pillClass = "replacement-tag"; // Turns amber warning color
            countdownLabel = "Urgent: Due Soon";
            borderOverride = "rgba(255, 140, 0, 0.3)";
        }

        // Pick specific icons depending on what type of academic track item it matches
        let iconType = "assignment";
        if (task.type === "Test") iconType = "assignment_late";
        if (task.type === "Lab") iconType = "biotech";

        const card = document.createElement('div');
        card.className = 'deadline-card';
        card.style.borderColor = borderOverride;
        card.innerHTML = `
            <div class="deadline-header-row">
                <div class="page-title-group">
                    <span class="material-icons" style="color: var(--color-primary); font-size: 1.2rem;">${iconType}</span>
                    <span class="deadline-title">${task.title}</span>
                </div>
                <span class="pill ${pillClass}">${countdownLabel}</span>
            </div>
            <div class="deadline-header-row">
                <span class="deadline-module">${task.module} • Due: ${task.dueDate}</span>
            </div>
        `;
        container.appendChild(card);
    });
}

// Fetch Weekly Academic Timetable Files and execute filtering pipelines
async function loadTimetable() {
    const container = document.getElementById('timetable-container');
    const headerNextDisplay = document.getElementById('header-next-class');
    const greetingBanner = document.getElementById('greeting-banner');
    
    // Progress element variables
    const progressBarContainer = document.getElementById('daily-progress-container');
    const progressBarFill = document.getElementById('daily-progress-fill');
    
    const targetFileName = getCurrentWeeklyFileName(); 
    
    try {
        const response = await fetch(`https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/timetable/${targetFileName}`);
        if (!response.ok) {
            container.innerHTML = `<div class="empty-state">No timetable file found for this week (${targetFileName}).</div>`;
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
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        
        let activeClassText = '<span class="highlight-countdown">NO ACTIVE CLASS NOW</span>';
        let activeClassObj = null;
        let visibleCardsInjected = false;

        // Progress Tracking variables
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

                        // Identify Chronology status properties
                        if (currentDayIndex > jsonDayIndex) {
                            isConducted = true; 
                        } else if (currentDayIndex === jsonDayIndex) {
                            totalClassesToday++; // Class belongs to today!
                            if (currentMinutes > endTotalMinutes) {
                                isConducted = true; 
                                conductedClassesToday++;
                            } else if (currentMinutes >= startTotalMinutes && currentMinutes <= endTotalMinutes) {
                                isCurrent = true; 
                            }
                        }
                    }

                    // CRITICAL FILTER: Skip rendering completely if past/conducted
                    if (isConducted) return; 

                    if (isCurrent) {
                        activeClassObj = classItem;
                        activeClassText = `<span class="highlight-countdown">CURRENT CLASS: ${classItem.moduleName}</span> in ${classItem.location}`;
                    }

                    const card = document.createElement('div');
                    card.className = isCurrent ? 'class-card current-class' : 'class-card today';

                    let badgeMarkup = `<span class="pill open-tag">In-Person</span>`;
                    let iconType = 'school';

                    if (classItem.isOnline) {
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
                            <span class="material-icons ${classItem.isOnline ? 'online-icon' : ''}">${iconType}</span>
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

        // --- FEATURE 1: Compute and trigger progress bar animations ---
        if (totalClassesToday > 0) {
            progressBarContainer.style.display = 'block';
            const calculatedPercentage = Math.round((conductedClassesToday / totalClassesToday) * 100);
            progressBarFill.style.width = `${calculatedPercentage}%`;
        } else {
            progressBarContainer.style.display = 'none';
        }

        // Update Header Displays
        headerNextDisplay.innerHTML = activeClassText;

        // Construct Blended Class-Aware Greetings
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
loadDeadlinesWidget();
loadTimetable();