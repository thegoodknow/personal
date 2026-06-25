/**
 * Core Automation Script Modules for Workspace Hub
 */

const REPO_OWNER = 'thegoodknow';
const REPO_NAME = 'personal';
const BASE_PAGES_URL = `https://${REPO_OWNER}.github.io/${REPO_NAME}/pages/`;

// Real-Time System Navigation Clock Trigger
function updateClock() {
    const now = new Date();
    document.getElementById('live-clock').textContent = now.toTimeString().split(' ')[0];
}
setInterval(updateClock, 1000);
updateClock();

// Smart Greetings Engine
function initGreetingMessage() {
    const hours = new Date().getHours();
    const banner = document.getElementById('greeting-banner');
    let dynamicText = "";

    if (hours >= 5 && hours < 12) {
        dynamicText = "🌅 Good Morning! Ready for today's programming labs?";
    } else if (hours >= 12 && hours < 17) {
        dynamicText = "☀️ Good Afternoon! Don't forget your upcoming lectures.";
    } else {
        dynamicText = "🌌 Good Evening! Great time for coding or reviewing modules.";
    }
    banner.textContent = dynamicText;
}

// Compute Sunday-Bound File Names
function getCurrentWeeklyFileName() {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sun, 1 = Mon, etc.
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - dayOfWeek);
    
    return `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}.json`;
}

// Render Local Repos Workspace Pages (Rate Limit Deflected)
function loadRepositoryPages() {
    const container = document.getElementById('pages-container');
    const myPages = [
        "CA_Quiz.html",
        "convert.html",
        "DBM LAB7.html",
        "department.html",
        "gdp.html",
        "record.html",
        "timetable test.html",
        "timetable.html"
    ];

    container.innerHTML = '';
    myPages.forEach(fileName => {
        const cleanTitle = fileName.replace('.html', '').replace(/[-_]/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
        const linkElement = document.createElement('a');
        linkElement.className = 'page-item-link';
        linkElement.href = `${BASE_PAGES_URL}${fileName}`;
        linkElement.innerHTML = `
            <div class="page-title-group">
                <span class="material-icons">construction</span>
                <span>${cleanTitle}</span>
            </div>
            <span class="material-icons" style="font-size: 1.1rem; color: var(--text-subtle);">arrow_forward</span>
        `;
        container.appendChild(linkElement);
    });
}

// Fetch Weekly Academic Timetable Files from CDN Target Pipelines
async function loadTimetable() {
    const container = document.getElementById('timetable-container');
    const headerNextDisplay = document.getElementById('header-next-class');
    const targetFileName = getCurrentWeeklyFileName(); 
    
    try {
        const response = await fetch(`https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/timetable/${targetFileName}`);
        if (!response.ok) {
            container.innerHTML = `<div class="empty-state">No timetable file found for this week (${targetFileName}).</div>`;
            headerNextDisplay.textContent = 'No schedule found';
            return;
        }

        const data = await response.json();
        if (!data || !data.days || data.days.length === 0) {
            container.innerHTML = `<div class="empty-state">No classes scheduled for this week.</div>`;
            headerNextDisplay.textContent = 'Free Week';
            return;
        }

        container.innerHTML = '';
        
        const now = new Date();
        const daysMap = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
        const currentDayIndex = now.getDay();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        
        let activeClassText = '<span class="highlight-countdown">NO ACTIVE CLASS NOW</span>';
        let customCardsInjected = false;

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

                        // Chronological sorting algorithms comparing system timestamps
                        if (currentDayIndex > jsonDayIndex) {
                            isConducted = true; 
                        } else if (currentDayIndex === jsonDayIndex) {
                            if (currentMinutes > endTotalMinutes) {
                                isConducted = true; 
                            } else if (currentMinutes >= startTotalMinutes && currentMinutes <= endTotalMinutes) {
                                isCurrent = true; 
                            }
                        }
                    }

                    if (isCurrent) {
                        activeClassText = `<span class="highlight-countdown">CURRENT CLASS: ${classItem.moduleName}</span> in ${classItem.location}`;
                    }

                    const card = document.createElement('div');
                    
                    if (isConducted) {
                        card.className = 'class-card conducted';
                    } else if (isCurrent) {
                        card.className = 'class-card current-class';
                    } else {
                        card.className = 'class-card today';
                    }

                    let badgeMarkup = `<span class="pill open-tag">In-Person</span>`;
                    let iconType = 'school';

                    if (isConducted) {
                        badgeMarkup = `<span class="pill conducted-tag">Conducted</span>`;
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

                    card.innerHTML = `
                        <div class="card-title">
                            <span class="material-icons ${classItem.isOnline && !isConducted ? 'online-icon' : ''}">${iconType}</span>
                            <span>${classItem.moduleName}</span>
                        </div>
                        <div class="card-subtitle">
                            ${classItem.location} (${classItem.campus})${labelType}
                        </div>
                        <div class="card-details">
                            <span>${dayGroup.date.split(',')[0]} (${dayGroup.date.split(',')[1]?.trim() || ''})</span>
                            <span class="clock-display" style="font-size: 0.85rem;">${classItem.time}</span>
                            <div class="status-wrapper">${badgeMarkup}</div>
                        </div>
                    `;
                    container.appendChild(card);
                    customCardsInjected = true;
                });
            }
        });

        headerNextDisplay.innerHTML = activeClassText;

        if (!customCardsInjected) {
            container.innerHTML = `<div class="empty-state">No structured classes found in this week's records.</div>`;
        }

    } catch (err) {
        console.error(err);
        container.innerHTML = `<div class="message-box error">Error loading tracking documents.</div>`;
        headerNextDisplay.textContent = 'Offline status';
    }
}

// Initialize Active Subsystems
initGreetingMessage();
loadRepositoryPages();
loadTimetable();