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
    // Get the current day of the week (0 = Sunday, 1 = Monday, etc.)
    const day = d.getDay();
    
    // Calculate the distance to the Sunday of this week
    const diff = d.getDate() - day + (offsetWeeks * 7);
    const targetSunday = new Date(d.setDate(diff));
    
    // Format to YYYY-MM-DD
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
    
    // Determine target file based on selection (0 for current/exam weeks, 1 for next week)
    const offset = selectedValue === 'next' ? 1 : 0;
    const targetSundayStr = getSundayDateString(offset);
    const fileName = `./timetable/${targetSundayStr}.json`;

    // Flag to determine whether to filter ONLY exams (istest === true)
    const isExamOnlyMode = selectedValue === 'exams';

    try {
        container.innerHTML = `<div class="message-box success">Loading week of ${targetSundayStr}...</div>`;
        
        const response = await fetch(fileName);
        if (!response.ok) throw new Error(`Could not find timetable file: ${targetSundayStr}.json`);
        
        const data = await response.json();
        container.innerHTML = ''; // Clear loading message

        const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const currentDayName = daysOfWeek[new Date().getDay()];

        // Configure UI sub-header details
        const displayDayContext = offset === 0 ? currentDayName : null;
        if (isExamOnlyMode) {
            document.getElementById('next-class-text').textContent = `Exam Week Timetable (${targetSundayStr})`;
        } else {
            document.getElementById('next-class-text').textContent = offset === 0 ? `Active Week (${targetSundayStr})` : `Next Week Preview (${targetSundayStr})`;
        }

        // Validate API/JSON array structural health
        if (!data.days || !Array.isArray(data.days)) {
            throw new Error("JSON payload is missing standard 'days' entry array.");
        }

        let displayedAnyClassAtAll = false;

        // Iterate through days dynamically
        data.days.forEach(dayEntry => {
            const rawDateStr = dayEntry.date || "";
            const dayShortName = rawDateStr.split(',')[0].trim(); // "Mon", "Tue" etc
            
            const shortToFullDays = {
                "Sun": "Sunday", "Mon": "Monday", "Tue": "Tuesday", 
                "Wed": "Wednesday", "Thu": "Thursday", "Fri": "Friday", "Sat": "Saturday"
            };
            const fullDayName = shortToFullDays[dayShortName] || rawDateStr;
            const isToday = fullDayName.toLowerCase() === (displayDayContext ? displayDayContext.toLowerCase() : '');

            // Filter classes depending on whether Exam Mode is requested (isTest === true)
            let classesToRender = dayEntry.classes || [];
            if (isExamOnlyMode) {
                classesToRender = classesToRender.filter(cls => cls.isTest === true);
            }

            // Generate Day Banner Section (only if we are rendering all classes OR if there are exams to show on this day)
            if (!isExamOnlyMode || classesToRender.length > 0) {
                const dayHeader = document.createElement('div');
                dayHeader.className = 'day-header';
                dayHeader.textContent = isToday ? `${fullDayName} (Today)` : fullDayName;
                container.appendChild(dayHeader);
            }

            // Generate Class Cards
            if (classesToRender.length > 0) {
                displayedAnyClassAtAll = true;
                classesToRender.forEach(cls => {
                    const card = document.createElement('div');
                    card.className = `class-card ${isToday ? 'today' : ''}`;
                    
                    // JSON Property Fallbacks 
                    const subject = cls.moduleName || cls.moduleCode || "No Subject Name";
                    const type = cls.classType || "Class";
                    const time = cls.time || "No Time Specified";
                    const room = cls.location || "N/A";
                    const instructor = cls.lecturer || "N/A";

                    let tagClass = 'online-tag';
                    let iconClass = 'online-icon';
                    let iconType = 'computer';

                    if (cls.isReplacement) {
                        tagClass = 'replacement-tag';
                        iconClass = 'replacement-icon';
                        iconType = 'event_repeat';
                    } else if (type === 'Test' || type === 'Exam' || cls.isTest) {
                        tagClass = 'test-tag';
                        iconClass = 'test-icon';
                        iconType = 'assignment_late';
                    } else if (!cls.isOnline) {
                        tagClass = 'open-tag'; 
                        iconClass = 'material-icons';
                        iconType = 'groups';
                    }

                    card.innerHTML = `
                        <div class="card-title">
                            <span class="material-icons ${iconClass}">${iconType}</span>
                            <span>${subject}</span>
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
            } else if (!isExamOnlyMode) {
                // In standard week views, explicitly declare days with empty schedules
                const emptyCard = document.createElement('div');
                emptyCard.className = 'class-card';
                emptyCard.innerHTML = `<div class="card-subtitle" style="margin: 0;">No sessions scheduled.</div>`;
                container.appendChild(emptyCard);
            }
        });

        // If in Exam mode and there are absolutely no exams all week, display clean fallback notice
        if (isExamOnlyMode && !displayedAnyClassAtAll) {
            container.innerHTML = `
                <div class="message-box success" style="text-align: center; padding: 30px;">
                    <span class="material-icons" style="font-size: 3rem; margin-bottom: 10px; color: #4ade80;">task_alt</span>
                    <h3>No Exams Scheduled</h3>
                    <p style="margin: 0; opacity: 0.8;">You have no scheduled tests or exams on file for this week.</p>
                </div>`;
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