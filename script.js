
// Update date and time
function updateDateTime() {
    const now = new Date();
    // Bengali weekday names
    const bengaliWeekdays = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
    const weekday = bengaliWeekdays[now.getDay()];
    // English month short name
    const month = now.toLocaleString('en-US', { month: 'short' });
    const day = now.getDate();
    // Format time as 12-hour with AM/PM
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
    // Set as two lines: Bengali weekday, English month day \n time
    document.getElementById('datetime').innerHTML = `${timeStr}<br>${weekday}, ${month} ${day}`;
}

// Initialize datetime on page load and update every minute
document.addEventListener('DOMContentLoaded', function() {
    updateDateTime();
    // Update every minute
    setInterval(updateDateTime, 60000);
});


// Sidebar open/close logic
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const menuBtn = document.querySelector('.menu-btn');
const sidebarClose = document.getElementById('sidebarClose');

function openSidebar() {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('active');
}
function closeSidebar() {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('active');
}
menuBtn.addEventListener('click', openSidebar);
sidebarClose.addEventListener('click', closeSidebar);
sidebarOverlay.addEventListener('click', closeSidebar);


function enforceDecimals(input, maxDecimals, minRange, maxRange) {
    input.addEventListener("input", function () {
        let val = this.value;

        // Range validation
        if (val && !isNaN(val)) {
            const numVal = parseFloat(val);
            if (numVal < minRange || numVal > maxRange) {
                this.value = "";
                return;
            }
        }

        // Decimal enforcement
        if (val.includes(".")) {
            let [intPart, decPart] = val.split(".");
            if (decPart.length > maxDecimals) {
                this.value = intPart + "." + decPart.slice(0, maxDecimals);
            }
        }

        // Auto-focus next field when decimal limit is reached
        if (val.includes(".") && val.split(".")[1].length >= maxDecimals) {
            moveToNextField(input);
        }
    });

    // Also handle Enter key for auto-advance
    input.addEventListener("keypress", function (e) {
        if (e.key === "Enter") {
            e.preventDefault();
            moveToNextField(input);
        }
    });
}

function moveToNextField(currentInput) {
    const inputs = [
        document.getElementById("kg"),
        document.getElementById("fat"),
        document.getElementById("snf")
    ];

    const currentIndex = inputs.indexOf(currentInput);
    const nextIndex = (currentIndex + 1) % inputs.length;

    if (currentIndex === inputs.length - 1) {
        // Last field (SNF) - dismiss keyboard instead of cycling
        currentInput.blur();
    } else if (nextIndex < inputs.length) {
        inputs[nextIndex].focus();
    }
}

// Apply rules with range validation
enforceDecimals(document.getElementById("fat"), 1, 1.0, 10.0);  // FAT: 1.0-10.0 range
enforceDecimals(document.getElementById("snf"), 1, 1.0, 12.0);  // SNF: 1.0-12.0 range
enforceDecimals(document.getElementById("kg"), 2, 0.1, 100.0);  // KG: 0.1-100.0 range 
