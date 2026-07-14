// Real-time Clock display updater
function updateClock() {
    const now = new Date();
    document.getElementById('live-clock').textContent = now.toTimeString().split(' ')[0];
}
setInterval(updateClock, 1000);
updateClock();

// Slidebar Toggle Mechanics (Handles sliding in/out from the Left)
const slidebar = document.getElementById('slidebar');
const toggleBtn = document.getElementById('sidebar-toggle');
const closeBtn = document.getElementById('sidebar-close');

toggleBtn.addEventListener('click', () => slidebar.classList.add('open'));
closeBtn.addEventListener('click', () => slidebar.classList.remove('open'));

// Map Modal Mechanics (Controls APU MAP.jpeg display)
const mapModal = document.getElementById('map-modal');
const openMapBtn = document.getElementById('open-map-btn');
const closeMapBtn = document.getElementById('close-map-btn');

openMapBtn.addEventListener('click', () => {
    mapModal.classList.add('open');
    slidebar.classList.remove('open'); // Auto-close sidebar on left to prevent overlap
});

closeMapBtn.addEventListener('click', () => {
    mapModal.classList.remove('open');
});

mapModal.addEventListener('click', (e) => {
    if (e.target === mapModal) {
        mapModal.classList.remove('open');
    }
});

// Parse APU room formats (e.g., "B-03-05" -> "B-03-05 @ Block B, Level 3")
function parseLocationDetails(roomString) {
    if (!roomString || roomString === "N/A" || roomString.toLowerCase() === "online") {
        return "Online";
    }

    const trimmedRoom = roomString.trim();
    const dashPattern = /^([A-Ea-eSs])[- ](\d{1,2})[- ](\d{1,2})$/;
    const shortDashPattern = /^([A-Ea-eSs])[- ](\d{1,2})$/;
    
    const blockNames = {
        'A': 'Block A',
        'B': 'Block B',
        'C': 'Block C',
        'D': 'Block D',
        'E': 'Block E',
        'S': 'Block Spine'
    };

    let match = trimmedRoom.match(dashPattern);
    if (match) {
        const blockChar = match[1].toUpperCase();
        const level = parseInt(match[2], 10);
        const blockName = blockNames[blockChar] || `Block ${blockChar}`;
        return `${trimmedRoom} @ ${blockName}, Level ${level}`;
    }

    match = trimmedRoom.match(shortDashPattern);
    if (match) {
        const blockChar = match[1].toUpperCase();
        const level = parseInt(match[2], 10);
        const blockName = blockNames[blockChar] || `Block ${blockChar}`;
        return `${trimmedRoom} @ ${blockName}, Level ${level}`;
    }

    return trimmedRoom;
}

// Helper function to get the YYYY-MM-DD string for a given Sunday
function getSundayDateString(offsetWeeks = 0) {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (offsetWeeks * 7);
    const targetSunday = new Date(d.setDate(diff));
    
    const year = targetSunday.getFullYear();
    const month = String(targetSunday.getMonth() + 1).padStart(2, '0');
    const date = String(targetSunday.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${date}`;
}

// Fetch and display closest assignment deadline
async function loadDeadlines() {
    const container = document.getElementById('assignment-target');
    try {
        const response = await fetch('Data/deadline.json');
        if (!response.ok) return;

        const data = await response.json();
        if (!Array.isArray(data) || data.length === 0) return;

        const now = new Date();
        const assignments = data.map(task => {
            return {
                ...task,
                parsedDate: new Date(`${task.dueDate}T${task.dueTime || '23:59:00'}`)
            };
        });

        const overdueTasks = assignments
            .filter(task => task.parsedDate < now)
            .sort((a, b) => b.parsedDate - a.parsedDate);

        const activeTasks = assignments
            .filter(task => task.parsedDate >= now)
            .sort((a, b) => a.parsedDate - b.parsedDate);

        let selectedTask = null;
        let urgencyState = ""; 
        let urgencyLabel = "";
        let urgencyIcon = "event_busy";

        if (overdueTasks.length > 0) {
            selectedTask = overdueTasks[0];
            urgencyState = "overdue";
            urgencyLabel = "Overdue";
            urgencyIcon = "gavel";
        } else if (activeTasks.length > 0) {
            selectedTask = activeTasks[0];
            
            const isToday = selectedTask.parsedDate.toDateString() === now.toDateString();
            if (isToday) {
                urgencyState = "today";
                urgencyLabel = "Due Today";
                urgencyIcon = "notification_important";
            } else {
                urgencyState = "upcoming";
                const daysLeft = Math.ceil((selectedTask.parsedDate - now) / (1000 * 60 * 60 * 24));
                urgencyLabel = `${daysLeft} Day${daysLeft > 1 ? 's' : ''} Left`;
                urgencyIcon = "event";
            }
        }

        if (!selectedTask) return;

        container.innerHTML = `
            <div class="assignment-card ${urgencyState}">
                <div class="assignment-details">
                    <div class="assignment-urgency">
                        <span class="material-icons" style="font-size: 1rem;">${urgencyIcon}</span>
                        <span>${urgencyLabel}</span>
                    </div>
                    <strong style="margin-top: 6px; font-size: 1.1rem; color: #fff;">${selectedTask.assignmentName}</strong>
                    <span style="font-size: 0.85rem; opacity: 0.8;">${selectedTask.moduleName}</span>
                </div>
                <div style="text-align: right; font-size: 0.85rem; opacity: 0.9;">
                    <div><b>Deadline:</b></div>
                    <div>${selectedTask.dueDate}</div>
                    <div style="color: #a5b4fc; margin-top: 2px;">@ ${selectedTask.dueTime || '23:59'}</div>
                </div>
            </div>
        `;
    } catch (e) {
        console.warn("Could not retrieve or parse Data/deadline.json", e);
    }
}

// Fetch and render APU facilities from JSON configuration
async function loadFacilities() {
    const target = document.getElementById('facilities-target');
    try {
        const response = await fetch('./Data/facilities.json');
        if (!response.ok) throw new Error("Could not load facilities JSON file.");

        const facilities = await response.json();
        if (!Array.isArray(facilities) || facilities.length === 0) {
            target.innerHTML = `<div style="padding:10px;">No facilities loaded.</div>`;
            return;
        }

        target.innerHTML = ''; // Clear loader
        facilities.forEach(item => {
            const blockEl = document.createElement('div');
            blockEl.className = 'directory-block';

            // Set up Toilet & Lift status indicators
            const toiletsIcon = item.hasToilet ? 'check_circle' : 'cancel';
            const toiletsColor = item.hasToilet ? '#10b981' : '#ef4444';
            const liftsIcon = item.hasLift ? 'check_circle' : 'cancel';
            const liftsColor = item.hasLift ? '#10b981' : '#ef4444';

            // Clean formatting for facilities (handling arrays, strings, or false)
            let facilitiesInfo = "";
            if (Array.isArray(item.faclities) && item.faclities.length > 0) {
                facilitiesInfo = `<div><b>Facilities:</b> ${item.faclities.join(', ')}</div>`;
            } else if (typeof item.faclities === "string" && item.faclities.trim() !== "") {
                facilitiesInfo = `<div><b>Facilities:</b> ${item.faclities}</div>`;
            } else {
                facilitiesInfo = `<div><b>Facilities:</b> <span style="opacity: 0.6;">None</span></div>`;
            }

            // Clean formatting for connections (handling arrays or false)
            let connectionsInfo = "";
            if (Array.isArray(item.connectsTo) && item.connectsTo.length > 0) {
                connectionsInfo = `<div><b>Connects to:</b> ${item.connectsTo.join(', ')}</div>`;
            } else {
                connectionsInfo = `<div><b>Connects to:</b> <span style="opacity: 0.6;">None</span></div>`;
            }

            blockEl.innerHTML = `
                <div class="directory-block-title">
                    <span>Block ${item.block}</span>
                </div>
                <div class="directory-features">
                    <span>
                        <span class="material-icons" style="font-size:0.9rem;">wc</span> 
                        Toilets <span class="material-icons" style="font-size:0.85rem; color:${toiletsColor};">${toiletsIcon}</span>
                    </span>
                    <span>
                        <span class="material-icons" style="font-size:0.9rem;">elevator</span> 
                        Lifts <span class="material-icons" style="font-size:0.85rem; color:${liftsColor};">${liftsIcon}</span>
                    </span>
                </div>
                ${facilitiesInfo}
                ${connectionsInfo}
                ${item.notes ? `<div><b>Notes:</b> <span style="color: #f59e0b;">${item.notes}</span></div>` : ''}
            `;
            target.appendChild(blockEl);
        });
    } catch (error) {
        console.warn("Facilities configuration error: ", error);
        target.innerHTML = `<div style="padding: 10px; color: #ef4444; font-size: 0.75rem;">Failed to load Data/facilities.json details.</div>`;
    }
}

// Main logic to fetch, normalize, filter and render weekly timetables
async function loadTimetable() {
    const container = document.getElementById('timetable-target');
    const weekSelector = document.getElementById('week-selector');
    
    const selectedValue = weekSelector.value;
    const offset = selectedValue === 'next' ? 1 : 0;
    const targetSundayStr = getSundayDateString(offset);
    const isExamOnlyMode = selectedValue === 'exams';

    slidebar.classList.remove('open');

    try {
        container.innerHTML = `<div class="message-box success">Loading timetable data...</div>`;
        
        if (isExamOnlyMode) {
            document.getElementById('next-class-text').textContent = `All Scheduled Exams`;
            
            const examWeeksToScan = [
                "2026-07-12", "2026-07-19", "2026-07-26", "2026-08-02",
                "2026-08-09", "2026-08-16", "2026-08-23", "2026-08-30"
            ];

            let allExams = [];

            const fetchPromises = examWeeksToScan.map(async (sundayStr) => {
                try {
                    const res = await fetch(`./timetable/${sundayStr}.json`);
                    if (!res.ok) return;
                    
                    const data = await res.json();
                    
                    let normalizedDays = [];
                    if (data.days && Array.isArray(data.days)) {
                        normalizedDays = data.days;
                    } else {
                        normalizedDays = Object.entries(data).map(([dayName, classesList]) => {
                            return { date: dayName, classes: Array.isArray(classesList) ? classesList : [] };
                        });
                    }

                    normalizedDays.forEach(dayEntry => {
                        const classes = dayEntry.classes || [];
                        const examClasses = classes.filter(cls => 
                            cls.isTest === true ||
                            cls.classType === 'Exam' ||
                            cls.classType === 'Test' ||
                            cls.type === 'Test' ||
                            cls.type === 'Exam'
                        );

                        if (examClasses.length > 0) {
                            allExams.push({
                                rawDateStr: dayEntry.date,
                                weekOf: sundayStr,
                                classes: examClasses
                            });
                        }
                    });
                } catch (e) {
                    console.warn(`Could not load or parse: ${sundayStr}.json`, e);
                }
            });

            await Promise.all(fetchPromises);
            container.innerHTML = '';

            if (allExams.length === 0) {
                container.innerHTML = `
                    <div class="message-box success" style="text-align: center; padding: 30px; animation: fadeInUp 0.4s both;">
                        <span class="material-icons" style="font-size: 3rem; margin-bottom: 10px; color: #4ade80;">task_alt</span>
                        <h3>No Exams Found</h3>
                        <p style="margin: 0; opacity: 0.8;">No tests or exams were detected across your scheduled weeks.</p>
                    </div>`;
                return;
            }

            allExams.sort((a, b) => {
                const dateA = new Date(a.rawDateStr.includes(',') ? a.rawDateStr.split(',')[1] : a.rawDateStr);
                const dateB = new Date(b.rawDateStr.includes(',') ? b.rawDateStr.split(',')[1] : b.rawDateStr);
                return dateA - dateB;
            });

            allExams.forEach((examDay, index) => {
                const rawDateStr = examDay.rawDateStr;
                const dayShortName = rawDateStr.split(',')[0].trim();
                const shortToFullDays = {
                    "Sun": "Sunday", "Mon": "Monday", "Tue": "Tuesday", 
                    "Wed": "Wednesday", "Thu": "Thursday", "Fri": "Friday", "Sat": "Saturday"
                };
                const fullDayName = shortToFullDays[dayShortName] || rawDateStr;
                const dateLabel = rawDateStr.includes(',') ? rawDateStr.split(',')[1].trim() : '';

                const dayHeader = document.createElement('div');
                dayHeader.className = 'day-header';
                dayHeader.style.display = 'flex';
                dayHeader.style.justifyContent = 'space-between';
                dayHeader.style.animation = `fadeInUp 0.3s ease-out ${index * 0.05}s both`;
                dayHeader.innerHTML = `
                    <span>${fullDayName} ${dateLabel ? `(${dateLabel})` : ''}</span>
                    <span style="font-size: 0.8rem; font-weight: normal; opacity: 0.7;">Week: ${examDay.weekOf}</span>
                `;
                container.appendChild(dayHeader);

                examDay.classes.forEach(cls => {
                    const card = document.createElement('div');
                    card.className = `class-card today`;
                    card.style.animation = `fadeInUp 0.3s ease-out ${index * 0.05}s both`;
                    
                    const subject = cls.moduleName || cls.subject || cls.moduleCode || "No Subject Name";
                    const type = cls.classType || cls.type || "Exam";
                    const time = cls.time || "No Time Specified";
                    const room = cls.location || cls.room || "N/A";
                    const instructor = cls.lecturer || cls.instructor || "N/A";
                    const detailedLocation = parseLocationDetails(room);

                    card.innerHTML = `
                        <div class="card-title">
                            <span class="material-icons test-icon">assignment_late</span>
                            <span><b>${subject}</b></span>
                            <span class="pill test-tag">${type}</span>
                        </div>
                        <div class="card-subtitle">${time}</div>
                        <div class="card-details">
                            <span><b>Room:</b> ${detailedLocation}</span>
                            <span><b>Lecturer:</b> ${instructor}</span>
                        </div>
                    `;
                    container.appendChild(card);
                });
            });

        } else {
            // --- STANDARD WEEK RENDERING (CURRENT / NEXT) ---
            const fileName = `./timetable/${targetSundayStr}.json`;
            const response = await fetch(fileName);
            if (!response.ok) throw new Error(`Could not find timetable file: ${targetSundayStr}.json`);
            
            const data = await response.json();
            container.innerHTML = '';

            const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            const currentDayName = daysOfWeek[new Date().getDay()];

            const displayDayContext = offset === 0 ? currentDayName : null;
            document.getElementById('next-class-text').textContent = offset === 0 ? `Active Week (${targetSundayStr})` : `Next Week Preview (${targetSundayStr})`;

            let normalizedDays = [];
            if (data.days && Array.isArray(data.days)) {
                normalizedDays = data.days;
            } else {
                normalizedDays = Object.entries(data).map(([dayName, classesList]) => {
                    return { date: dayName, classes: Array.isArray(classesList) ? classesList : [] };
                });
            }

            normalizedDays.forEach((dayEntry, dayIndex) => {
                const rawDateStr = dayEntry.date || "";
                const dayShortName = rawDateStr.split(',')[0].trim(); 
                const shortToFullDays = {
                    "Sun": "Sunday", "Mon": "Monday", "Tue": "Tuesday", 
                    "Wed": "Wednesday", "Thu": "Thursday", "Fri": "Friday", "Sat": "Saturday"
                };
                const fullDayName = shortToFullDays[dayShortName] || rawDateStr;
                const isToday = fullDayName.toLowerCase() === (displayDayContext ? displayDayContext.toLowerCase() : '');

                const dayHeader = document.createElement('div');
                dayHeader.className = 'day-header';
                dayHeader.textContent = isToday ? `${fullDayName} (Today)` : fullDayName;
                dayHeader.style.animation = `fadeInUp 0.3s ease-out ${dayIndex * 0.05}s both`;
                container.appendChild(dayHeader);

                const classesToRender = dayEntry.classes || [];
                if (classesToRender.length > 0) {
                    classesToRender.forEach(cls => {
                        const card = document.createElement('div');
                        card.className = `class-card ${isToday ? 'today' : ''}`;
                        card.style.animation = `fadeInUp 0.3s ease-out ${dayIndex * 0.05}s both`;
                        
                        const subject = cls.moduleName || cls.subject || cls.moduleCode || "No Subject Name";
                        const type = cls.classType || cls.type || "Class";
                        const time = cls.time || "No Time Specified";
                        const room = cls.location || cls.room || "N/A";
                        const instructor = cls.lecturer || cls.instructor || "N/A";
                        const detailedLocation = parseLocationDetails(room);

                        let displayType = type;
                        let tagClass = 'online-tag';
                        let iconClass = 'online-icon';
                        let iconType = 'computer';

                        // 1. Check if the class is online
                        if (cls.isOnline === true || type.toLowerCase() === 'online') {
                            displayType = 'MS Teams';
                            tagClass = 'online-tag';
                            iconClass = 'online-icon';
                            iconType = 'groups';
                        } 
                        // 2. Check if replacement class
                        else if (cls.isReplacement || type === 'Replacement') {
                            tagClass = 'replacement-tag';
                            iconClass = 'replacement-icon';
                            iconType = 'event_repeat';
                        } 
                        // 3. Check if test/exam
                        else if (type === 'Test' || type === 'Exam' || cls.isTest) {
                            tagClass = 'test-tag';
                            iconClass = 'test-icon';
                            iconType = 'assignment_late';
                        } 
                        // 4. Standard in-person classes
                        else if (cls.isOnline === false || type === 'In-Person') {
                            tagClass = 'open-tag'; 
                            iconClass = 'material-icons';
                            iconType = 'groups';
                        }

                        card.innerHTML = `
                            <div class="card-title">
                                <span class="material-icons ${iconClass}">${iconType}</span>
                                <span><b>${subject}</b></span>
                                <span class="pill ${tagClass}">${displayType}</span>
                            </div>
                            <div class="card-subtitle">${time}</div>
                            <div class="card-details">
                                <span><b>Room:</b> ${detailedLocation}</span>
                                <span><b>Lecturer:</b> ${instructor}</span>
                            </div>
                        `;
                        container.appendChild(card);
                    });
                } else {
                    const emptyCard = document.createElement('div');
                    emptyCard.className = 'class-card';
                    emptyCard.style.animation = `fadeInUp 0.3s ease-out ${dayIndex * 0.05}s both`;
                    emptyCard.innerHTML = `<div class="card-subtitle" style="margin: 0;">No sessions scheduled.</div>`;
                    container.appendChild(emptyCard);
                }
            });
        }

    } catch (error) {
        container.innerHTML = `
            <div class="message-box error">
                <strong>Schedule Missing:</strong> ${error.message}<br>
                <small style="display:block; margin-top:5px;">
                    Make sure a file named <code>${targetSundayStr}.json</code> exists inside your <code>./timetable</code> directory.
                </small>
            </div>`;
    }
}

// Bind Select changes to swap view configurations instantly
document.getElementById('week-selector').addEventListener('change', loadTimetable);

// Initialize everything on page load
window.addEventListener('DOMContentLoaded', () => {
    loadDeadlines();
    loadFacilities();
    loadTimetable();
});