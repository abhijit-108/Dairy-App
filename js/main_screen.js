
document.addEventListener('DOMContentLoaded', () => {
    const headerLogin = document.getElementById('headerLogin');

    // Redirect to login.html when the "Dairy App" header is clicked
    headerLogin.addEventListener('click', () => {
        window.location.href = 'login.html';
    });
});

const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const main = document.getElementById('mainContent');

function openSidebar() {
    sidebar.classList.add('open');
    overlay.classList.add('show');
    main.classList.add('shift');
    menuToggle.setAttribute('aria-expanded', 'true');
}
function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
    main.classList.remove('shift');
    menuToggle.setAttribute('aria-expanded', 'false');
}

menuToggle.addEventListener('click', () => {
    if (sidebar.classList.contains('open')) closeSidebar(); else openSidebar();
});
overlay.addEventListener('click', closeSidebar);

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSidebar(); });

// Time & date updater
function updateTime() {
    const now = new Date();

    // Time
    const opts = { hour: 'numeric', minute: '2-digit', hour12: true };
    const timeStr = now.toLocaleTimeString(undefined, opts);

    // Bengali weekday
    const weekdayBn = now.toLocaleDateString("bn-BD", { weekday: "long" });

    // English month + day
    const monthDayEn = now.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    // Final format: "সোমবার, Aug 17"
    const dateStr = `${weekdayBn}, ${monthDayEn}`;

    // Update DOM
    document.getElementById('timeNow').textContent = timeStr;
    document.getElementById('dateNow').textContent = dateStr;
    document.getElementById('currentYear').textContent = now.getFullYear();
}

updateTime();
setInterval(updateTime, 60_000);


Array.from(document.querySelectorAll('.nav-item')).forEach(item => {
    item.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); item.click(); } });
});




document.addEventListener("DOMContentLoaded", () => {
    const navItems = document.querySelectorAll(".nav-item");

    navItems.forEach(item => {
        const label = item.innerText.trim();

        item.addEventListener("click", () => {
            switch (label) {
                case "All Members":
                    window.location.href = "all_member.html";
                    break;
                case "Generate New Bills":
                    window.location.href = "generate_bill.html";
                    break;
                case "Old Bills Photos":
                    window.location.href = "storage_page.html";
                    break;
                case "Fix Data":
                    window.location.href = "fix_data.html";
                    break;
                case "Wifi Usage":
                    window.open("https://abhijit-delsgade.vercel.app/internet_usage_page.html", "_blank");
                    break;
                case "All Guide Website":
                    window.open("https://abhijit-delsgade.vercel.app/", "_blank");
                    break;
                // Logout button already has its own click event if you add one
            }
        });
    });
});
