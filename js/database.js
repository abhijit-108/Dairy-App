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

            // Sort entries by date, and within the same date and person, sort by timePeriod with the custom order
            entries.sort((a, b) => {
                const dateComparison = new Date(b.date.split('-').reverse().join('-')) - new Date(a.date.split('-').reverse().join('-'));
                if (dateComparison !== 0) return dateComparison;

                const timeOrder = { "সন্ধ্যা": 0, "সকাল": 1, "দুপুর": 2 };
                return timeOrder[a.timePeriod] - timeOrder[b.timePeriod];
            });

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
        const kgCell = row.insertCell(4);
        const totalCell = row.insertCell(5);
        const actionCell = row.insertCell(6); // Add a new cell for action buttons

        dateCell.textContent = entry.date;
        timePeriodCell.textContent = entry.timePeriod;
        nameCell.textContent = entry.name;
        fatCell.textContent = entry.fat + '\n' + entry.snf + '\n' + entry.rate;
        kgCell.textContent = entry.kg;
        totalCell.textContent = entry.total;
        fatCell.style.whiteSpace = 'pre';


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
function populateTable3() {
    const tableBody = document.getElementById('table').getElementsByTagName('tbody')[0];
    const rows = tableBody.getElementsByTagName('tr');

    const table3Body = document.getElementById('table3').getElementsByTagName('tbody')[0];
    table3Body.innerHTML = ''; // Clear previous data

    const nameOrder = [
        "রাজেন্দ্র প্রসাদ ঘোষ",
        "সুজাতা ঘোষ",
        "রজিনা শেখ",
        "মামনি চক্রবর্তী",
        "ঝর্না চচ্চড়ি",
        "বিকাশ কুমার ঘোষ",
        "সুলোচনা ঘোষ"
    ];

    const dataMap = new Map();
    const ratio_rate_29 = window.convertion_ratio_29taka = (29 / 40.5);
    let totalKGSum = 0;
    let totalTakaSum = 0;

    for (const row of rows) {
        const nameCell = row.cells[2];
        const kgCell = row.cells[4];
        const totalCell = row.cells[5];

        const name = nameCell.textContent.trim();
        const kg = parseFloat(kgCell.textContent) || 0;
        const total = parseFloat(totalCell.textContent) || 0;

        if (row.style.display !== 'none') {
            if (dataMap.has(name)) {
                const existingData = dataMap.get(name);
                existingData.totalKG += kg;
                existingData.totalTaka += total;
            } else {
                dataMap.set(name, { totalKG: kg, totalTaka: total });
            }
        }
    }

    const orderedNames = nameOrder.filter(name => dataMap.has(name));
    const otherNames = [...dataMap.keys()].filter(name => !nameOrder.includes(name) && !orderedNames.includes(name));

    const allNames = [...orderedNames, ...otherNames];

    allNames.forEach(name => {
        if (dataMap.has(name)) {
            const data = dataMap.get(name);
            const row = table3Body.insertRow();
            const nameCell = row.insertCell(0);
            const totalKGCell = row.insertCell(1);
            const totalTakaCell = row.insertCell(2);
            const avgRateCell = row.insertCell(3);

            const avgRate = data.totalTaka / data.totalKG;

            // Calculate the modified total

            nameCell.textContent = name;
            totalKGCell.textContent = data.totalKG.toFixed(1);
            totalTakaCell.textContent = data.totalTaka.toFixed(0);
            avgRateCell.textContent = avgRate.toFixed(2);


            totalKGSum += data.totalKG;
            totalTakaSum += data.totalTaka;
        }
    });
    const avgRateSum = totalTakaSum / totalKGSum;

    // Update the footer with the totals
    document.getElementById('totalKGFooter').textContent = totalKGSum.toFixed(1);
    document.getElementById('totalTakaFooter').textContent = totalTakaSum.toFixed(0);
    document.getElementById('avgRateFooter').textContent = avgRateSum.toFixed(2);

}




function populateTable4() {
    const tableBody = document.getElementById('table').getElementsByTagName('tbody')[0];
    const rows = tableBody.getElementsByTagName('tr');

    const table4Body = document.getElementById('table4').getElementsByTagName('tbody')[0];
    table4Body.innerHTML = ''; // Clear previous data

    const nameOrder = [
        "চন্দনা-ঘোষ",
        "রাজেন্দ্র ঘোষ",
        "সুজাতা ঘোষ",
        "রজিনা শেখ",
        "মামনি চক্রবর্তী",
        "ঝর্না চচ্চড়ি",
        "বিকাশ কুমার ঘোষ",
        "সুলোচনা ঘোষ",
    ];

    const dataMap = new Map();
    const ratio_rate_29 = window.convertion_ratio_29taka = (29 / 40.5);
    let totalKGSum = 0;
    let totalModifiedSum = 0;
    let totalTakaSum = 0;

    // Input values
    const inputTotalKG = parseFloat(document.getElementById('inputTotalKG').value) || 0;
    const inputTotalTaka = parseFloat(document.getElementById('inputTotalTaka').value) || 0;

    for (const row of rows) {
        const nameCell = row.cells[2];
        const kgCell = row.cells[4];
        const totalCell = row.cells[5];

        const name = nameCell.textContent.trim();
        let kg = 0;
        let totalModified = 0;
        let total = 0;

        if (name === "চন্দনা-ঘোষ") {
            kg = (inputTotalKG - parseFloat(document.getElementById('totalKGFooter4').textContent)) * 0.4;
            totalModified = (inputTotalTaka - parseFloat(document.getElementById('totalModifiedFooter4').textContent)) * 0.4;
            total = totalModified * 1.396;
        } else if (name === "রাজেন্দ্র ঘোষ") {
            kg = (inputTotalKG - parseFloat(document.getElementById('totalKGFooter4').textContent)) * 0.6;
            totalModified = (inputTotalTaka - parseFloat(document.getElementById('totalModifiedFooter4').textContent)) * 0.6;
            total = totalModified * 1.396;
        } else {
            kg = parseFloat(kgCell.textContent) || 0;
            totalModified = parseFloat(totalCell.textContent) || 0;
            total = parseFloat(totalCell.textContent) || 0;
        }

        if (nameOrder.includes(name) && row.style.display !== 'none') {
            if (dataMap.has(name)) {
                const existingData = dataMap.get(name);
                existingData.totalKG += kg;
                existingData.totalTaka += total;
                existingData.totalModified += totalModified;  // Add totalModified to dataMap
            } else {
                dataMap.set(name, { totalKG: kg, totalTaka: total, totalModified: totalModified });
            }
        }
    }

    nameOrder.forEach(name => {
        const row = table4Body.insertRow();
        const nameCell = row.insertCell(0);
        const totalKGCell = row.insertCell(1);
        const totalModifiedCell = row.insertCell(2);
        const totalTakaCell = row.insertCell(3);

        nameCell.textContent = name;

        if (name === "চন্দনা-ঘোষ" || name === "রাজেন্দ্র ঘোষ") {
            // Set non-editable values based on calculation
            if (name === "চন্দনা-ঘোষ") {
                const totalKGFooter4 = parseFloat(document.getElementById('totalKGFooter4').textContent) || 0;
                const totalModifiedFooter4 = parseFloat(document.getElementById('totalModifiedFooter4').textContent) || 0;

                totalKGCell.textContent = ((inputTotalKG - totalKGFooter4) * 0.4).toFixed(1);
                totalModifiedCell.textContent = ((inputTotalTaka - totalModifiedFooter4) * 0.4).toFixed(0);
                totalTakaCell.textContent = (((inputTotalTaka - totalModifiedFooter4) * 0.4) * 1.396).toFixed(0);
            } else if (name === "রাজেন্দ্র ঘোষ") {
                const totalKGFooter4 = parseFloat(document.getElementById('totalKGFooter4').textContent) || 0;
                const totalModifiedFooter4 = parseFloat(document.getElementById('totalModifiedFooter4').textContent) || 0;

                totalKGCell.textContent = ((inputTotalKG - totalKGFooter4) * 0.6).toFixed(1);
                totalModifiedCell.textContent = ((inputTotalTaka - totalModifiedFooter4) * 0.6).toFixed(0);
                totalTakaCell.textContent = (((inputTotalTaka - totalModifiedFooter4) * 0.6) * 1.396).toFixed(0);
            }
        } else {
            if (dataMap.has(name)) {
                const data = dataMap.get(name);

                totalKGCell.textContent = data.totalKG.toFixed(1);
                totalModifiedCell.textContent = (data.totalModified * ratio_rate_29).toFixed(0);
                totalTakaCell.textContent = (data.totalTaka).toFixed(0);

                totalKGSum += data.totalKG;
                totalModifiedSum += (data.totalModified * ratio_rate_29);
                totalTakaSum += data.totalTaka * 1.396;
            } else {
                totalKGCell.textContent = '0';
                totalModifiedCell.textContent = '0';
                totalTakaCell.textContent = '0';
            }
        }
    });

    // Update the footer with the totals
    document.getElementById('totalKGFooter4').textContent = totalKGSum.toFixed(1);
    document.getElementById('totalModifiedFooter4').textContent = totalModifiedSum.toFixed(0);
    document.getElementById('totalTakaFooter4').textContent = totalTakaSum.toFixed(0);
}

function validateBill() {
    const table4Body = document.getElementById('table4').getElementsByTagName('tbody')[0];
    const rows = table4Body.getElementsByTagName('tr');

    let totalKGSum = 0;
    let totalModifiedSum = 0;
    let totalTakaSum = 0;

    // Input value
    const inputTotalTaka = parseFloat(document.getElementById('inputTotalTaka').value) || 0;

    // Sum modified values for চন্দনা-ঘোষ and রাজেন্দ্র ঘোষ
    let specialModifiedSum = 0;

    for (const row of rows) {
        const nameCell = row.cells[0].textContent.trim();
        const totalKGCell = row.cells[1];
        const totalModifiedCell = row.cells[2];
        const totalTakaCell = row.cells[3];

        const kg = parseFloat(totalKGCell.textContent) || 0;
        let totalModified = parseFloat(totalModifiedCell.textContent) || 0;
        const total = parseFloat(totalTakaCell.textContent) || 0;

        totalKGSum += kg;
        totalTakaSum += total;

        if (nameCell === "চন্দনা-ঘোষ" || nameCell === "রাজেন্দ্র ঘোষ") {
            if (nameCell === "চন্দনা-ঘোষ") {
                totalModified = (inputTotalTaka * 0.4);
            } else if (nameCell === "রাজেন্দ্র ঘোষ") {
                totalModified = (inputTotalTaka * 0.6);
            }
            specialModifiedSum += totalModified;
        } else {
            totalModifiedSum += totalModified;
        }
    }

    // Ensure totalModifiedSum matches inputTotalTaka
    totalModifiedSum = specialModifiedSum + (inputTotalTaka - specialModifiedSum);

    // Update the validated totals in the footer
    document.getElementById('validatedTotalKGFooter4').textContent = totalKGSum.toFixed(1);
    document.getElementById('validatedTotalModifiedFooter4').textContent = totalModifiedSum.toFixed(0);
    document.getElementById('validatedTotalTakaFooter4').textContent = totalTakaSum.toFixed(0);
}


// Function to toggle editability of table4 cells and footer cells
function toggleTable4Editable() {
    const table4Body = document.getElementById('table4').getElementsByTagName('tbody')[0];
    const footerCells = document.getElementById('table4').getElementsByTagName('tfoot')[0].getElementsByTagName('td');
    const rows = table4Body.getElementsByTagName('tr');

    // Toggle cells in tbody
    for (const row of rows) {
        const cells = row.cells;
        for (const cell of cells) {
            // Toggle contentEditable attribute
            cell.contentEditable = !cell.isContentEditable;
        }
    }

    // Toggle footer cells
    for (const cell of footerCells) {
        // Toggle contentEditable attribute
        cell.contentEditable = !cell.isContentEditable;
    }
}

// Attach event listener for Toggle Editable button
document.getElementById('toggleEditButton').addEventListener('click', () => {
    toggleTable4Editable();
});

// Validate button click event handler (assuming this function exists)
document.getElementById('bill_validate').addEventListener('click', () => {
    populateTable4();
    validateBill();

    // After validation, ensure cells remain editable if they were before
    const table4Body = document.getElementById('table4').getElementsByTagName('tbody')[0];
    const footerCells = document.getElementById('table4').getElementsByTagName('tfoot')[0].getElementsByTagName('td');
    const rows = table4Body.getElementsByTagName('tr');

    // Toggle cells in tbody
    for (const row of rows) {
        const cells = row.cells;
        for (const cell of cells) {
            // Check if cell was previously editable
            if (cell.getAttribute('data-editable') === 'true') {
                cell.contentEditable = true;
            } else {
                cell.contentEditable = false;
            }
        }
    }

    // Toggle footer cells
    for (const cell of footerCells) {
        // Check if cell was previously editable
        if (cell.getAttribute('data-editable') === 'true') {
            cell.contentEditable = true;
        } else {
            cell.contentEditable = false;
        }
    }
});

// Initial load - populate table and set initial cell editability
window.addEventListener('load', () => {
    displayEntries().then(() => {
        populateTable3();
        populateTable4();

        // Set initial editability state for cells in tbody
        const table4Body = document.getElementById('table4').getElementsByTagName('tbody')[0];
        const rows = table4Body.getElementsByTagName('tr');

        for (const row of rows) {
            const cells = row.cells;
            for (const cell of cells) {
                cell.setAttribute('data-editable', cell.contentEditable); // Store initial editability state
            }
        }

        // Set initial editability state for footer cells
        const footerCells = document.getElementById('table4').getElementsByTagName('tfoot')[0].getElementsByTagName('td');
        for (const cell of footerCells) {
            cell.setAttribute('data-editable', cell.contentEditable); // Store initial editability state
        }
    });
});

// Other event listeners (filters, refresh) - populate table on change
document.getElementById('nameFilter').addEventListener('change', () => {
    filterEntries();
    populateTable3();
    populateTable4();
});

document.getElementById('monthFilter').addEventListener('change', () => {
    filterEntries();
    populateTable3();
    populateTable4();
});

document.getElementById('dateRangeFilter').addEventListener('change', () => {
    filterEntries();
    populateTable3();
    populateTable4();
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

        if (nameFilter !== 'all' && nameCell.textContent.trim() !== nameFilter) {
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
    
    populateDateSelectForBill(monthFilter, dateRangeFilter); // Call the function to populate the select menu

    calculateSums();
    populateTable3();
    populateTable4(); // Update table3 after filtering entries
}
function populateDateSelectForBill(monthFilter, dateRangeFilter) {
    const dateSelectForBill = document.getElementById('dateselectforbill');
    dateSelectForBill.innerHTML = ''; // Clear existing options

    if (monthFilter === 'all' || dateRangeFilter === 'all') {
        return;
    }

    const [monthName, year] = monthFilter.split(' ');
    const monthIndex = monthNames.indexOf(monthName);
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    let startDay, endDay;

    switch (dateRangeFilter) {
        case '01-07':
            startDay = 1;
            endDay = 7;
            break;
        case '08-15':
            startDay = 8;
            endDay = 15;
            break;
        case '16-23':
            startDay = 16;
            endDay = 23;
            break;
        case '24-end':
            startDay = 24;
            endDay = daysInMonth;
            break;
    }

    const optionText = `${String(startDay).padStart(2, '0')}/${String(monthIndex + 1).padStart(2, '0')}/${year} - ${String(endDay).padStart(2, '0')}/${String(monthIndex + 1).padStart(2, '0')}/${year}`;
    const option = document.createElement('option');
    option.value = optionText;
    option.textContent = optionText;
    dateSelectForBill.appendChild(option);

    // Preselect the option
    dateSelectForBill.value = option.value;
}


function calculateSums() {
    const tableBody = document.getElementById('table').getElementsByTagName('tbody')[0];
    const rows = tableBody.getElementsByTagName('tr');

    let totalKg = 0;
    let ultimateTotal = 0;

    for (const row of rows) {
        if (row.style.display !== 'none') {
            const kgCell = row.cells[4];
            const totalCell = row.cells[5];
            totalKg += parseFloat(kgCell.textContent) || 0;
            ultimateTotal += parseFloat(totalCell.textContent) || 0;
        }
    }

    document.getElementById('total-Kg').textContent = "Quantity Kg =  " + totalKg.toFixed(1);
    document.getElementById('ultimate-total').textContent = "Taka =  " + ultimateTotal.toFixed(0);
}
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

// Function to fetch and display today's entries in Home page
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
            const tableBody = document.querySelector('#table2 tbody');
            tableBody.innerHTML = '';

            let totalKG = 0;
            let totalAmount = 0;
            let amTotalKG = 0;
            let amTotalAmount = 0;
            let pmTotalKG = 0;
            let pmTotalAmount = 0;

            // Populate table2 with today's entries
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
            const tableFooter = document.querySelector('#table2 tfoot');
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


// Call the function to fetch and display today's entries in table2
displayTodayEntriesInTable2();
// Event listener for the refresh button
document.getElementById('submit').addEventListener('click', () => {
    setTimeout(displayTodayEntriesInTable2, 4000); // Fetch data after 4 seconds
});
document.getElementById('submit').addEventListener('click', () => {
    setTimeout(displayEntries, 4000); // Fetch data after 4 seconds
});




//logout

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
    const billvalidate=document.querySelector('.billvalidate')
    const h3names = document.getElementById('h3names');

    if (user) {
        // User is authenticated, show user name
        userInfoDiv.innerText = 'Logout (Abhijit)';
        fixDatabaseItem.classList.remove('disabled');
        billvalidate.classList.remove('disabled');
        h3names.classList.remove('disabled');

    } else {
        // User is not authenticated, show guest
        userInfoDiv.innerText = 'Logout (Guest)';
        guestinfo.innerText = 'This is guest mode.You can only See the data cannot modify it. ';
        fixDatabaseItem.classList.add('disabled');
        billvalidate.classList.add('disabled');
        h3names.classList.add('disabled');
    }
});