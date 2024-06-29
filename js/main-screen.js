//Clock On header 

function updateClock() {

    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12 || 12;

    const clock = document.getElementById('clock');
    clock.textContent = `${hours}:${minutes}:${seconds} ${ampm}`;
}
setInterval(updateClock, 1000);
updateClock();

function updateDate() {
    const now = new Date();
    
    // Define an array to map English day names to Bangla day names
    const banglaDays = ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"];
    
    // Get the English day index (0 for Sunday, 1 for Monday, etc.)
    const dayIndex = now.getDay();
    
    // Get the Bangla day name
    const banglaDayName = banglaDays[dayIndex];
    
    // Format the date string
    const options = { month: 'long', day: 'numeric' };
    const dateString = now.toLocaleDateString('en-US', options);
    
    // Combine the Bangla day name with the formatted date string
    const banglaDateString = `${banglaDayName}, ${dateString}`;
    
    // Update the date element with the Bangla date string
    document.getElementById('date').innerText = banglaDateString;
}
updateDate();



//Trigger Sidebar 
document.addEventListener('DOMContentLoaded', function () {
    const menuButton = document.querySelector('.menu-button');
    const sidebar = document.querySelector('.sidebar');

    menuButton.addEventListener('click', function (event) {
        event.stopPropagation(); // Prevent event bubbling
        sidebar.style.left = sidebar.style.left === '0px' ? '-250px' : '0px';
    });

    document.addEventListener('click', function (event) {
        const target = event.target;
        const isMenuButton = target.closest('.menu-button');
        const isSidebar = target.closest('.sidebar');

        if (!isMenuButton && !isSidebar) {
            sidebar.style.left = '-250px';
        }
    });
});

function playSound() {
    var audio = document.getElementById("myAudio");
    audio.play();
}

function showSplashScreen() {
    var splashScreen = document.getElementById('splash-screen');
    splashScreen.style.display = 'flex';

    var progressBarInner = document.getElementById('progress-bar-inner');
    var percentageText = document.getElementById('percentage-text');

    var width = 1;
    var interval = setInterval(function () {
        if (width >= 100) {
            clearInterval(interval);
            reloadWebView();
        } else {
            width++;
            progressBarInner.style.width = width + '%';
            percentageText.innerText = width + '%';
        }
    }, 50);
}

function reloadWebView() {
    var splashScreen = document.getElementById('splash-screen');
    splashScreen.style.display = 'none';

    // Reload the page after hiding the splash screen
    window.location.reload(true);
}

document.getElementById('openPopup').addEventListener('click', function () {
    document.getElementById('popupWrapper').style.display = 'block';
});

document.getElementById('closePopup').addEventListener('click', function () {
    document.getElementById('popupWrapper').style.display = 'none';
});

function validateInput() {
    var fat = parseFloat(document.getElementById("fat").value);
    var snf = parseFloat(document.getElementById("snf").value);
    var kg = parseFloat(document.getElementById("kg").value);
    var errorBoxFat = document.getElementById("errorFat");
    var errorBoxSnf = document.getElementById("errorSnf");
    var errorBoxKg = document.getElementById("errorKg");
    var error = "";

    if (fat < 1.1 || fat > 12.1) {
        errorBoxFat.innerText = "Fat Wrong (1.1-12.1)";
    } else {
        errorBoxFat.innerText = "";
    }

    if (snf < 3.1 || snf > 12.1) {
        errorBoxSnf.innerText = "SNF Wrong (3.1 - 12.1)";
    } else {
        errorBoxSnf.innerText = "";
    }

    if (kg < 0.1 || kg > 500) {
        errorBoxKg.innerText = "KG Wrong (0.1 -500)";
    } else {
        errorBoxKg.innerText = "";
    }

    if (errorBoxFat.innerText !== "" || errorBoxSnf.innerText !== "" || errorBoxKg.innerText !== "") {
        return false; // There are errors, prevent form submission
    }

    // Calculate rate and total here if there are no errors
    rateandtotal();
    return true; // No errors, allow form submission
}


// Show Popup when internet off.
window.addEventListener('load', function () {
    checkConnectivity();

    window.addEventListener('online', function () {
        checkConnectivity();
    });

    window.addEventListener('offline', function () {
        checkConnectivity();
    });
});

function checkConnectivity(callback) {
    fetch('https://httpbin.org/get', { method: 'GET' })
        .then(response => {
            if (response.ok) {
                hideOfflinePopup();
                if (callback) callback(true);
            } else {
                showOfflinePopup();
                if (callback) callback(false);
            }
        })
        .catch(error => {
            showOfflinePopup();
            if (callback) callback(false);
        });
}

function showOfflinePopup() {
    document.getElementById('offlinePopup').style.display = 'flex';
}

function hideOfflinePopup() {
    document.getElementById('offlinePopup').style.display = 'none';
}



document.getElementById('submit').addEventListener('click', function () {
    if (validateInput()) {
        checkConnectivity(function (isOnline) {
            if (isOnline) {
                sendEmail();
                playSound();
                multiplyNumbers();
            } else {
                alert('ইন্টারনেট বন্ধ!');
            }
        });
    }
});

