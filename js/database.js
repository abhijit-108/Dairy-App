import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getDatabase, ref, set, get } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyAuhNKygw6dv8jqfNY8qnmIrX-TsLy2jvI",
    authDomain: "dairy-app-abhijit.firebaseapp.com",
    databaseURL: "https://dairy-app-abhijit-default-rtdb.firebaseio.com",
    projectId: "dairy-app-abhijit",
    storageBucket: "dairy-app-abhijit.appspot.com",
    messagingSenderId: "196152880143",
    appId: "1:196152880143:web:bec02170e30932a7d5877a"
};
const app = initializeApp(firebaseConfig);
const database = getDatabase();
const auth = getAuth();


function validateInput() {
    var fat = parseFloat(document.getElementById("fat").value);
    var snf = parseFloat(document.getElementById("snf").value);

    // Check if the input values are in the valid range (excluding KG check)
    if (fat < 1.1 || fat > 12.1 || snf < 3.1 || snf > 12.1) {
        showAlert("❌ Invalid Fat or SNF!", "error"); // Show red alert for invalid input
        return false;
    }

    return true;
}

// Function to handle form submission
function formSubmit(e) {
    e.preventDefault();

    if (validateInput()) {
        let name = document.querySelector('#name').value;
        let rate = document.querySelector('#rate').value;
        let total = document.querySelector('#total').value;
        let fat = document.querySelector('#fat').value;
        let snf = document.querySelector('#snf').value;
        let kg = document.querySelector('#kg').value;

        checkAndSendMessage(name, rate, total, fat, snf, kg);

        // Show success alert
        showAlert("✔️ Form Submitted Successfully!", "success");

        // Reset the form after 2 seconds
        setTimeout(() => {
            document.getElementById('registrationform').reset();
        }, 2000);
    }
}

// Function to show animated alerts
function showAlert(message, type) {
    var alertBox = document.createElement("div");
    alertBox.classList.add("alert", type);
    alertBox.innerHTML = `<div class="icon">${type === "success" ? "✔️" : "❌"}</div> ${message}`;

    document.body.appendChild(alertBox);

    // Remove alert after animation
    setTimeout(() => {
        alertBox.classList.add("fadeOut");
        setTimeout(() => {
            alertBox.remove();
        }, 500);
    }, 2000);
}

// Attach event listener to the form
document.getElementById('registrationform').addEventListener('submit', formSubmit);



function formatDateTime(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const meridiem = hours >= 12 ? 'pm' : 'am';
    const formattedHours = hours % 12 || 12;
    return `${day}/${month}/${year} ${formattedHours}:${minutes}${meridiem}`;
}

function getTimePeriod(hours) {
    if (hours >= 1 && hours < 12) {
        return "সকাল";
    } else if (hours >= 12 && hours < 15) {
        return "দুপুর";
    } else {
        return "সন্ধ্যা";
    }
}

async function checkAndSendMessage(name, rate, total, fat, snf, kg) {
    const currentDate = new Date();
    const formattedDate = `${currentDate.getDate()}-${currentDate.getMonth() + 1}-${currentDate.getFullYear()}`;
    const formattedTime = formatDateTime(currentDate);
    const personName = name.toLowerCase().replace(/\s+/g, '-');
    const timePeriod = getTimePeriod(currentDate.getHours());
    const personRef = ref(database, `records/${formattedDate}/${personName}/${timePeriod}`);

    try {
        await set(personRef, {
            name: name,
            rate: rate,
            total: total,
            fat: fat,
            snf: snf,
            kg: kg,
            timestamp: formattedTime
        });
    } catch (error) {
        alert(error);
    }
}


function parseTimestamp(timestamp) {
    // Assuming timestamp format is like '27/05/2024 2:30pm'
    const [datePart, timePart] = timestamp.split(' ');
    const [day, month, year] = datePart.split('/').map(Number);
    const [time, meridiem] = [timePart.slice(0, -2), timePart.slice(-2)];
    let [hours, minutes] = time.split(':').map(Number);

    if (meridiem.toLowerCase() === 'pm' && hours < 12) hours += 12;
    if (meridiem.toLowerCase() === 'am' && hours === 12) hours = 0;

    return new Date(year, month - 1, day, hours, minutes);
}

// Function to fetch and display today's entries in Home page
async function displayTodayEntriesIntable_today() {
    const currentDate = new Date();
    const formattedDate = `${currentDate.getDate()}-${currentDate.getMonth() + 1}-${currentDate.getFullYear()}`;
    const recordsRef = ref(database, `records/${formattedDate}`);

    try {
        const snapshot = await get(recordsRef);
        if (snapshot.exists()) {
            const todayEntries = [];
            const records = snapshot.val();

            // Iterate through the records for today
            for (const personName in records) {
                for (const timePeriod in records[personName]) {
                    const entry = records[personName][timePeriod];
                    if (entry.timestamp) {
                        const timestamp = parseTimestamp(entry.timestamp); // Parse the timestamp correctly
                        const formattedTime = timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                        const timePeriodLabel = getTimePeriod(timestamp.getHours()); // Get the time period label
                        todayEntries.push({ ...entry, timePeriodLabel, timestamp, formattedTime });
                    } else {
                        console.warn("Timestamp missing for entry:", entry);
                    }
                }
            }

            // Sort entries by timestamp in descending order
            todayEntries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            // Clear existing table rows
            const tableBody = document.querySelector('#table_today tbody');
            tableBody.innerHTML = '';

            let totalKG = 0;
            let totalAmount = 0;
            let amTotalKG = 0;
            let amTotalAmount = 0;
            let pmTotalKG = 0;
            let pmTotalAmount = 0;

            // Populate table_today with today's entries
            todayEntries.forEach(entry => {
                // Determine the class based on formattedTime (assuming formattedTime is in "h:mm am/pm" format)
                const timePeriodClass = entry.formattedTime.toLowerCase().indexOf('pm') !== -1 ? 'pm-row' : 'am-row';

                const newRow = `
                    <tr class="${timePeriodClass}">
                        <td>${entry.formattedTime}</td>
                        <td>${entry.name}</td>
                        <td>${entry.fat}</td>
                        <td>${entry.snf}</td>
                        <td>${entry.rate}</td>
                        <td>${entry.kg}</td>
                        <td>${entry.total}</td>
                    </tr>
                `;
                tableBody.insertAdjacentHTML('beforeend', newRow);

                // Accumulate totals
                totalKG += parseFloat(entry.kg);
                totalAmount += parseFloat(entry.total);

                if (timePeriodClass === 'am-row') {
                    amTotalKG += parseFloat(entry.kg);
                    amTotalAmount += parseFloat(entry.total);
                } else {
                    pmTotalKG += parseFloat(entry.kg);
                    pmTotalAmount += parseFloat(entry.total);
                }
            });

            // Populate table footer with AM and PM totals before the overall sum
            const tableFooter = document.querySelector('#table_today tfoot');
            tableFooter.innerHTML = `
                <tr>
                    <td colspan="5">সকালের মোট দুধ</td>
                    <td>${amTotalKG.toFixed(1)}</td>
                    <td>${amTotalAmount.toFixed(0)}</td>
                </tr>
                <tr>
                    <td colspan="5">সন্ধ্যার মোট দুধ</td>
                    <td>${pmTotalKG.toFixed(1)}</td>
                    <td>${pmTotalAmount.toFixed(0)}</td>
                </tr>
                <tr>
                    <td colspan="5">Total</td>
                    <td>${totalKG.toFixed(1)}</td>
                    <td>${totalAmount.toFixed(0)}</td>
                </tr>
            `;
        } else {
            console.log("No records found for today.");
        }
    } catch (error) {
        console.error("Error fetching today's entries:", error);
    }
}
// Call the function to fetch and display today's entries in table_today
displayTodayEntriesIntable_today();


// Event listener for the refresh button
document.getElementById('submit').addEventListener('click', () => {
    setTimeout(displayTodayEntriesIntable_today, 2000); // Fetch data after 4 seconds
});


// Function to handle logout
function logout() {
    signOut(auth).then(() => {
        // Sign-out successful, redirect to login page
        window.location.href = 'login.html';
    }).catch((error) => {
        console.error('Error signing out:', error);
    });
}

// Attach event listener to logout button
document.getElementById('logoutButton').addEventListener('click', logout);
// Check authentication status
onAuthStateChanged(auth, (user) => {
    const userInfoDiv = document.getElementById('logoutButton');
    const guestinfo = document.getElementById('guest-info');

    const fixDatabaseItem = document.getElementById('fixDatabaseItem');
    const headerLogin = document.getElementById('headerLogin');


    // const billvalidate=document.querySelector('.billvalidate')
    const select_container = document.getElementById('select-container');

    if (user) {
        // User is authenticated, show user name
        userInfoDiv.innerText = 'Logout (Abhijit)';
        fixDatabaseItem.classList.remove('disabled');
        headerLogin.classList.remove('headerloginguest');
        select_container.classList.remove('disabled');

    } else {
        // User is not authenticated, show guest
        userInfoDiv.innerText = 'Logout (Guest)';
        guestinfo.innerText = 'Data cannot be modified.';
        fixDatabaseItem.classList.add('disabled');
        headerLogin.classList.add('headerloginguest');
        select_container.classList.add('disabled');
    }
});
