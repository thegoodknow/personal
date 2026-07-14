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

// Target implementation for rendering schedule
async function loadTimetable() {
    const container = document.getElementById('timetable-target');
    const weekSelector = document.getElementById('week-selector');
    
    // Determine target file based on selection (0 for current week, 1 for next week)
    const offset = weekSelector.value === 'next' ? 1 : 0;
    const targetSundayStr = getSundayDateString(offset);
    const fileName = `./timetable/${targetSundayStr}.json`;

    try {
        container.innerHTML = `<div class="message-box success">Loading week of ${targetSundayStr}...</div>`;
        
        const response = await fetch(fileName);
        if (!response.ok) throw new Error(`Could not find timetable file: ${targetSundayStr}.json`);
        
        const data = await response.json();
        container.innerHTML = ''; // Clear loading message

        const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const currentDayName = daysOfWeek[new Date().getDay()];

        // If displaying next week, we aren't highlighting "today"
        const displayDayContext = offset === 0 ? currentDayName : null;
        document.getElementById('next-class-text').textContent = offset === 0 ? `Active Week (${targetSundayStr})` : `Next Week Preview (${targetSundayStr})`;

        // Iterate through days in JSON layout
        for (const [day, classes] of Object.entries(data)) {
            const isToday = day.toLowerCase() === (displayDayContext ? displayDayContext.toLowerCase() : '');

            // Generate Day Banner Section
            const dayHeader = document.createElement('div');
            dayHeader.className = 'day-header';
            dayHeader.textContent = isToday ? `${day} (Today)` : day;
            container.appendChild(dayHeader);

            // Generate Class Rows
            if (classes && classes.length > 0) {
                classes.forEach(cls => {
                    const card = document.createElement('div');
                    card.className = `class-card ${isToday ? 'today' : ''}`;
                    
                    let tagClass = 'online-tag';
                    let iconClass = 'online-icon';
                    let iconType = 'computer';

                    if (cls.type === 'Replacement') {
                        tagClass = 'replacement-tag';
                        iconClass = 'replacement-icon';
                        iconType = 'event_repeat';
                    } else if (cls.type === 'Test' || cls.type === 'Exam') {
                        tagClass = 'test-tag';
                        iconClass = 'test-icon';
                        iconType = 'assignment_late';
                    } else if (cls.type === 'In-Person') {
                        tagClass = 'open-tag'; 
                        iconClass = 'material-icons';
                        iconType = 'groups';
                    }

                    card.innerHTML = `
                        <div class="card-title">
                            <span class="material-icons ${iconClass}">${iconType}</span>
                            <span>${cls.subject}</span>
                            <span class="pill ${tagClass}">${cls.type || 'Class'}</span>
                        </div>
                        <div class="card-subtitle">${cls.time}</div>
                        <div class="card-details">
                            <span><b>Room:</b> ${cls.room || 'N/A'}</span>
                            <span><b>Lecturer:</b> ${cls.instructor || 'N/A'}</span>
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