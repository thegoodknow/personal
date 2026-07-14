// Real-time Clock display updater
function updateClock() {
    const now = new Date();
    document.getElementById('live-clock').textContent = now.toTimeString().split(' ')[0];
}
setInterval(updateClock, 1000);
updateClock();

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

// Main logic to fetch and render dynamic timetable states
async function loadTimetable() {
    const container = document.getElementById('timetable-target');
    const weekSelector = document.getElementById('week-selector');
    
    const selectedValue = weekSelector.value;
    const offset = selectedValue === 'next' ? 1 : 0;
    const targetSundayStr = getSundayDateString(offset);
    
    const isExamOnlyMode = selectedValue === 'exams';

    try {
        container.innerHTML = `<div class="message-box success">Loading timetable data...</div>`;
        
        if (isExamOnlyMode) {
            document.getElementById('next-class-text').textContent = `All Scheduled Exams`;
            
            // 1. DEFINE ALL YOUR SEMESTER/EXAM WEEKS HERE
            // Add the Sunday dates of any weeks you want the system to scan for exams.
            const examWeeksToScan = [
                "2026-08-23",
                "2026-08-30"
            ];

            let allExams = [];

            // 2. Fetch from all JSON files in parallel
            const fetchPromises = examWeeksToScan.map(async (sundayStr) => {
                try {
                    const res = await fetch(`./timetable/${sundayStr}.json`);
                    if (!res.ok) return null; // Skip files that don't exist yet
                    
                    const data = await res.json();
                    
                    // Normalize the data format dynamically
                    let normalizedDays = [];
                    if (data.days && Array.isArray(data.days)) {
                        normalizedDays = data.days; // New format[cite: 3]
                    } else {
                        normalizedDays = Object.entries(data).map(([dayName, classesList]) => {
                            return {
                                date: dayName,
                                classes: Array.isArray(classesList) ? classesList : []
                            };
                        }); // Old format
                    }

                    // Extract exams from this week
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
                                rawDateStr: dayEntry.date, // e.g., "Mon, 24-Aug-2026"[cite: 3]
                                weekOf: sundayStr,
                                classes: examClasses
                            });
                        }
                    });
                } catch (e) {
                    // Fail silently on individual network/format issues so other files still load
                    console.warn(`Could not parse or find file: ${sundayStr}.json`, e);
                }
            });

            await Promise.all(fetchPromises);
            container.innerHTML = ''; // Clear loading message

            if (allExams.length === 0) {
                container.innerHTML = `
                    <div class="message-box success" style="text-align: center; padding: 30px;">
                        <span class="material-icons" style="font-size: 3rem; margin-bottom: 10px; color: #4ade80;">task_alt</span>
                        <h3>No Exams Found</h3>
                        <p style="margin: 0; opacity: 0.8;">No tests or exams were detected across your scheduled weeks.</p>
                    </div>`;
                return;
            }

            // 3. Sort chronologically by date if possible
            allExams.sort((a, b) => {
                const dateA = new Date(a.rawDateStr.includes(',') ? a.rawDateStr.split(',')[1] : a.rawDateStr);
                const dateB = new Date(b.rawDateStr.includes(',') ? b.rawDateStr.split(',')[1] : b.rawDateStr);
                return dateA - dateB;
            });

            // 4. Render all discovered exams
            allExams.forEach(examDay => {
                const rawDateStr = examDay.rawDateStr;
                const dayShortName = rawDateStr.split(',')[0].trim();
                const shortToFullDays = {
                    "Sun": "Sunday", "Mon": "Monday", "Tue": "Tuesday", 
                    "Wed": "Wednesday", "Thu": "Thursday", "Fri": "Friday", "Sat": "Saturday"
                };
                const fullDayName = shortToFullDays[dayShortName] || rawDateStr;
                const dateLabel = rawDateStr.includes(',') ? rawDateStr.split(',')[1].trim() : '';

                // Header showing day, date, and which JSON file it came from
                const dayHeader = document.createElement('div');
                dayHeader.className = 'day-header';
                dayHeader.style.display = 'flex';
                dayHeader.style.justifyContent = 'space-between';
                dayHeader.innerHTML = `
                    <span>${fullDayName} ${dateLabel ? `(${dateLabel})` : ''}</span>
                    <span style="font-size: 0.8rem; font-weight: normal; opacity: 0.7;">Week: ${examDay.weekOf}</span>
                `;
                container.appendChild(dayHeader);

                examDay.classes.forEach(cls => {
                    const card = document.createElement('div');
                    card.className = `class-card today`; // Highlight exam cards beautifully
                    
                    const subject = cls.moduleName || cls.subject || cls.moduleCode || "No Subject Name";
                    const type = cls.classType || cls.type || "Exam";
                    const time = cls.time || "No Time Specified";
                    const room = cls.location || cls.room || "N/A";
                    const instructor = cls.lecturer || cls.instructor || "N/A";

                    card.innerHTML = `
                        <div class="card-title">
                            <span class="material-icons test-icon">assignment_late</span>
                            <span><b>${subject}</b></span>
                            <span class="pill test-tag">${type}</span>
                        </div>
                        <div class="card-subtitle">${time}</div>
                        <div class="card-details">
                            <span><b>Room:</b> ${room}</span>
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
            container.innerHTML = ''; // Clear loading message

            const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            const currentDayName = daysOfWeek[new Date().getDay()];

            const displayDayContext = offset === 0 ? currentDayName : null;
            document.getElementById('next-class-text').textContent = offset === 0 ? `Active Week (${targetSundayStr})` : `Next Week Preview (${targetSundayStr})`;

            let normalizedDays = [];
            if (data.days && Array.isArray(data.days)) {
                normalizedDays = data.days; // New format[cite: 3]
            } else {
                normalizedDays = Object.entries(data).map(([dayName, classesList]) => {
                    return {
                        date: dayName,
                        classes: Array.isArray(classesList) ? classesList : []
                    };
                }); // Old format[cite: 1]
            }

            normalizedDays.forEach(dayEntry => {
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
                container.appendChild(dayHeader);

                const classesToRender = dayEntry.classes || [];
                if (classesToRender.length > 0) {
                    classesToRender.forEach(cls => {
                        const card = document.createElement('div');
                        card.className = `class-card ${isToday ? 'today' : ''}`;
                        
                        const subject = cls.moduleName || cls.subject || cls.moduleCode || "No Subject Name";
                        const type = cls.classType || cls.type || "Class";
                        const time = cls.time || "No Time Specified";
                        const room = cls.location || cls.room || "N/A";
                        const instructor = cls.lecturer || cls.instructor || "N/A";

                        let tagClass = 'online-tag';
                        let iconClass = 'online-icon';
                        let iconType = 'computer';

                        if (cls.isReplacement || type === 'Replacement') {
                            tagClass = 'replacement-tag';
                            iconClass = 'replacement-icon';
                            iconType = 'event_repeat';
                        } else if (type === 'Test' || type === 'Exam' || cls.isTest) {
                            tagClass = 'test-tag';
                            iconClass = 'test-icon';
                            iconType = 'assignment_late';
                        } else if (cls.isOnline === false || type === 'In-Person') {
                            tagClass = 'open-tag'; 
                            iconClass = 'material-icons';
                            iconType = 'groups';
                        }

                        card.innerHTML = `
                            <div class="card-title">
                                <span class="material-icons ${iconClass}">${iconType}</span>
                                <span><b>${subject}</b></span>
                                <span class="pill ${tagClass}">${type}</span>
                            </div>
                            <div class="card-subtitle">${time}</div>
                            <div class="card-details">
                                <span><b>Room:</b> ${room}</span>
                                <span><b>Lecturer:</b> ${instructor}</span>
                            </div>
                        `;
                        container.appendChild(card);
                    });
                } else {
                    const emptyCard = document.createElement('div');
                    emptyCard.className = 'class-card';
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

// Listen for dropdown changes to swap between weeks instantly
document.getElementById('week-selector').addEventListener('change', loadTimetable);

// Initialize on page load
window.addEventListener('DOMContentLoaded', loadTimetable);