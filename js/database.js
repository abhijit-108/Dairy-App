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


document.getElementById('registrationform').addEventListener('submit', formSubmit);

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

        setTimeout(() => {
            document.getElementById('registrationform').reset();
        }, 100000);
    } else {
        console.log("Form validation failed. Please correct errors.");
    }
}

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
        document.querySelector('.alert').classList.add('show');
        setTimeout(function () {
            document.querySelector('.alert').classList.remove('show');
        }, 3000);
    } catch (error) {
        alert(error);
    }
}

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function getMonthName(monthNumber) {
    return monthNames[monthNumber - 1];
}

async function displayEntries() {
    const recordsRef = ref(database, 'records');

    try {
        const snapshot = await get(recordsRef);
        if (snapshot.exists()) {
            const records = snapshot.val();
            const entries = [];
            const namesSet = new Set();
            const monthsSet = new Set();

            for (const date in records) {
                for (const personName in records[date]) {
                    for (const timePeriod in records[date][personName]) {
                        const entry = records[date][personName][timePeriod];
                        entries.push({ date, timePeriod, ...entry });
                        namesSet.add(entry.name);
                        const [day, month, year] = date.split('-');
                        monthsSet.add(`${getMonthName(parseInt(month))} ${year}`);
                    }
                }
            }

            entries.sort((a, b) => new Date(b.date.split('-').reverse().join('-')) - new Date(a.date.split('-').reverse().join('-')));

            const nameFilterMenu = document.getElementById('nameFilter');
            nameFilterMenu.innerHTML = '<option value="all">All Names</option>';
            namesSet.forEach(name => {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                nameFilterMenu.appendChild(option);
            });

            const monthFilterMenu = document.getElementById('monthFilter');
            monthFilterMenu.innerHTML = '<option value="all">All Months</option>';
            Array.from(monthsSet).forEach(month => {
                const option = document.createElement('option');
                option.value = month;
                option.textContent = month;
                monthFilterMenu.appendChild(option);
            });

            const currentDate = new Date();
            const currentMonthName = getMonthName(currentDate.getMonth() + 1);
            const currentYear = currentDate.getFullYear();
            const currentMonth = `${currentMonthName} ${currentYear}`;
            monthFilterMenu.value = currentMonth;

            populateTable(entries);
            preselectDateRange();
            const selectedDateRange = getCurrentDateRange();
            filterEntries();
            calculateSums();
        } else {
            console.log("No records found.");
        }
    } catch (error) {
        console.error("Error fetching entries:", error);
    }
}

function populateTable(entries) {
    const tableBody = document.getElementById('table').getElementsByTagName('tbody')[0];
    tableBody.innerHTML = '';

    for (const entry of entries) {
        const row = tableBody.insertRow();
        const dateCell = row.insertCell(0);
        const timePeriodCell = row.insertCell(1);
        const nameCell = row.insertCell(2);
        const fatCell = row.insertCell(3);
        const snfCell = row.insertCell(4);
        const rateCell = row.insertCell(5);
        const kgCell = row.insertCell(6);
        const totalCell = row.insertCell(7);
        const actionCell = row.insertCell(8); // Add a new cell for action buttons

        dateCell.textContent = entry.date;
        timePeriodCell.textContent = entry.timePeriod;
        nameCell.textContent = entry.name;
        fatCell.textContent = entry.fat;
        snfCell.textContent = entry.snf;
        rateCell.textContent = entry.rate;
        kgCell.textContent = entry.kg;
        totalCell.textContent = entry.total;

        // Create Delete button
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.classList.add('delete-button');
        deleteButton.addEventListener('click', () => confirmDeleteEntry(entry.date, entry.name, entry.timePeriod));

        // Create Update button
        const updateButton = document.createElement('button');
        updateButton.textContent = 'Update';
        updateButton.classList.add('update-button');
        updateButton.addEventListener('click', () => updateEntry(entry));

        // Append buttons to the action cell
        actionCell.appendChild(deleteButton);
        actionCell.appendChild(updateButton);
    }
}

function confirmDeleteEntry(date, name, timePeriod) {
    const confirmation = confirm(`Are you sure you want to delete the entry for ${name} on ${date} during ${timePeriod}?`);
    if (confirmation) {
        deleteEntry(date, name, timePeriod);
    }
}

async function deleteEntry(date, name, timePeriod) {
    const personName = name.toLowerCase().replace(/\s+/g, '-');
    const entryRef = ref(database, `records/${date}/${personName}/${timePeriod}`);

    try {
        await set(entryRef, null);
        alert('Entry deleted successfully');
        displayEntries(); // Refresh the table after deletion
    } catch (error) {
        console.error('Error deleting entry:', error);
        alert('Failed to delete entry. Please try again.');
    }
}

function updateEntry(entry) {
    const name = prompt('Enter new name:', entry.name);
    const rate = prompt('Enter new rate:', entry.rate);
    const total = prompt('Enter new total:', entry.total);
    const fat = prompt('Enter new fat:', entry.fat);
    const snf = prompt('Enter new snf:', entry.snf);
    const kg = prompt('Enter new kg:', entry.kg);

    if (name && rate && total && fat && snf && kg) {
        const updatedEntry = {
            ...entry,
            name,
            rate,
            total,
            fat,
            snf,
            kg,
        };
        saveUpdatedEntry(updatedEntry);
    } else {
        alert('All fields are required to update the entry.');
    }
}

async function saveUpdatedEntry(entry) {
    const personName = entry.name.toLowerCase().replace(/\s+/g, '-');
    const entryRef = ref(database, `records/${entry.date}/${personName}/${entry.timePeriod}`);

    try {
        await set(entryRef, {
            name: entry.name,
            rate: entry.rate,
            total: entry.total,
            fat: entry.fat,
            snf: entry.snf,
            kg: entry.kg,
            timestamp: entry.timestamp
        });
        alert('Entry updated successfully');
        displayEntries(); // Refresh the table after updating
    } catch (error) {
        console.error('Error updating entry:', error);
        alert('Failed to update entry. Please try again.');
    }
}

// Ensure to call displayEntries on window load
window.addEventListener('load', () => {
    displayEntries();
});


function preselectDateRange() {
    const currentDate = new Date();
    const currentDateMinusFive = new Date(currentDate);
    currentDateMinusFive.setDate(currentDateMinusFive.getDate() - 5);

    const startDateOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endDateOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    let selectedRange = "";
    if (currentDateMinusFive >= startDateOfMonth && currentDateMinusFive <= endDateOfMonth) {
        const day = currentDateMinusFive.getDate();
        if (day >= 1 && day <= 7) {
            selectedRange = "01-07";
        } else if (day >= 8 && day <= 15) {
            selectedRange = "08-15";
        } else if (day >= 16 && day <= 23) {
            selectedRange = "16-23";
        } else {
            selectedRange = "24-end";
        }
    } else {
        selectedRange = "all";
    }

    const dateRangeFilterMenu = document.getElementById('dateRangeFilter');
    dateRangeFilterMenu.value = selectedRange;
}

preselectDateRange();

function getCurrentDateRange() {
    const currentDate = new Date();
    const currentDateMinusFive = new Date(currentDate);
    currentDateMinusFive.setDate(currentDateMinusFive.getDate() - 5);

    const startDateOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endDateOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    if (currentDateMinusFive >= startDateOfMonth && currentDateMinusFive <= endDateOfMonth) {
        const day = currentDateMinusFive.getDate();
        if (day >= 1 && day <= 7) {
            return "01-07";
        } else if (day >= 8 && day <= 15) {
            return "08-15";
        } else if (day >= 16 && day <= 23) {
            return "16-23";
        } else {
            return "24-end";
        }
    }
    return "all";
}

window.addEventListener('load', () => {
    displayEntries();
});

document.getElementById('nameFilter').addEventListener('change', (e) => {
    filterEntries();
});

document.getElementById('monthFilter').addEventListener('change', (e) => {
    filterEntries();
});

document.getElementById('dateRangeFilter').addEventListener('change', (e) => {
    filterEntries();
});

function filterEntries() {
    const nameFilter = document.getElementById('nameFilter').value;
    const monthFilter = document.getElementById('monthFilter').value;
    const dateRangeFilter = document.getElementById('dateRangeFilter').value;

    const tableBody = document.getElementById('table').getElementsByTagName('tbody')[0];
    const rows = tableBody.getElementsByTagName('tr');

    for (const row of rows) {
        const nameCell = row.cells[2];
        const dateCell = row.cells[0];
        const [day, monthNum, year] = dateCell.textContent.split('-');
        const rowMonth = `${getMonthName(parseInt(monthNum))} ${year}`;
        const dayInt = parseInt(day);

        let showRow = true;

        if (nameFilter !== 'all' && nameCell.textContent !== nameFilter) {
            showRow = false;
        }

        if (monthFilter !== 'all' && rowMonth !== monthFilter) {
            showRow = false;
        }

        if (dateRangeFilter !== 'all') {
            if (dateRangeFilter === '01-07' && !(dayInt >= 1 && dayInt <= 7)) {
                showRow = false;
            } else if (dateRangeFilter === '08-15' && !(dayInt >= 8 && dayInt <= 15)) {
                showRow = false;
            } else if (dateRangeFilter === '16-23' && !(dayInt >= 16 && dayInt <= 23)) {
                showRow = false;
            } else if (dateRangeFilter === '24-end' && !(dayInt >= 24)) {
                showRow = false;
            }
        }

        row.style.display = showRow ? '' : 'none';
    }
    calculateSums();
}

function calculateSums() {
    const tableBody = document.getElementById('table').getElementsByTagName('tbody')[0];
    const rows = tableBody.getElementsByTagName('tr');

    let totalKg = 0;
    let ultimateTotal = 0;

    for (const row of rows) {
        if (row.style.display !== 'none') {
            const kgCell = row.cells[6];
            const totalCell = row.cells[7];
            totalKg += parseFloat(kgCell.textContent) || 0;
            ultimateTotal += parseFloat(totalCell.textContent) || 0;
        }
    }

    document.getElementById('total-Kg').textContent = "Quantity Kg =  " + totalKg.toFixed(1);
    document.getElementById('ultimate-total').textContent = "Taka =  " + ultimateTotal.toFixed(0);
}

document.getElementById('refreshdatabase').addEventListener('click', () => {
    // Save current filter selections
    const currentNameFilter = document.getElementById('nameFilter').value;
    const currentMonthFilter = document.getElementById('monthFilter').value;
    const currentDateRangeFilter = document.getElementById('dateRangeFilter').value;

    // Refresh and reapply filters
    displayEntries().then(() => {
        document.getElementById('nameFilter').value = currentNameFilter;
        document.getElementById('monthFilter').value = currentMonthFilter;
        document.getElementById('dateRangeFilter').value = currentDateRangeFilter;
        filterEntries();
    });
});


// Function to fetch and display today's entries in table2

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


async function displayTodayEntriesInTable2() {
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
                        const timePeriodLabel = getTimePeriod(timestamp.getHours()); // Get the time period label
                        todayEntries.push({ ...entry, timePeriodLabel, timestamp });
                    } else {
                        console.warn("Timestamp missing for entry:", entry);
                    }
                }
            }

            // Sort entries by timestamp in descending order
            todayEntries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            // Clear existing table rows
            const tableBody = document.querySelector('#table2 tbody');
            tableBody.innerHTML = '';
            let totalKG = 0;
            let totalAmount = 0;

            // Populate table2 with today's entries
            todayEntries.forEach(entry => {
                const newRow = `
                    <tr>
                        <td>${entry.timePeriodLabel}</td>
                        <td>${entry.name}</td>
                        <td>${entry.fat}</td>
                        <td>${entry.snf}</td>
                        <td>${entry.rate}</td>
                        <td>${entry.kg}</td>
                        <td>${entry.total}</td>
                    </tr>
                `;
                tableBody.insertAdjacentHTML('beforeend', newRow);

                // Accumulate total KG and total Amount
                totalKG += parseFloat(entry.kg);
                totalAmount += parseFloat(entry.total);
            });

            // Populate table footer with sum
            const tableFooter = document.querySelector('#table2 tfoot');
            tableFooter.innerHTML = `
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

// Call the function to fetch and display today's entries in table2
displayTodayEntriesInTable2();
// Event listener for the refresh button
document.getElementById('submit').addEventListener('click', () => {
    setTimeout(displayTodayEntriesInTable2, 4000); // Fetch data after 4 seconds
});




//logout

// Function to handle logout
function logout() {
    signOut(auth).then(() => {
        // Sign-out successful, redirect to login page
        window.location.href = 'index.html';
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
    const h3names = document.getElementById('h3names');



    if (user) {
        // User is authenticated, show user name
        userInfoDiv.innerText = 'Logout (Abhijit)';
        fixDatabaseItem.classList.remove('disabled');
        h3names.classList.remove('disabled');

    } else {
        // User is not authenticated, show guest
        userInfoDiv.innerText = 'Logout (Guest)';
        guestinfo.innerText = 'This is guest mode.You can only See the data cannot modify it. ';
        fixDatabaseItem.classList.add('disabled');
        h3names.classList.add('disabled');
    }
});