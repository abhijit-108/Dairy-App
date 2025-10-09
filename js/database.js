import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getDatabase, ref, set, get, child } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js";
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

// Initialize app once and share database/auth
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// Global variables for rate calculation
let rateFormula = { fatMultiplier: 3.81, snfMultiplier: 2.689 }; // Default values
let cachedRateFormula = null;

// Thermal Printer Variables
let thermalDevice = null;
let thermalCharacteristic = null;
let currentPrintData = null;

// Audio feedback function using MP3 files
function playAudioMessage(audioType) {
    const audioEnabled = document.getElementById('audioEnabled')?.checked;

    if (!audioEnabled) {
        return;
    }

    let audioElement;

    switch (audioType) {
        case 'success':
            audioElement = document.getElementById('successAudio');
            break;
        case 'exists':
            audioElement = document.getElementById('existsAudio');
            break;
        case 'failed':
            audioElement = document.getElementById('failedAudio');
            break;
        case 'warning':
            audioElement = document.getElementById('warningAudio');
            break;
        default:
            return;
    }

    if (audioElement) {
        audioElement.currentTime = 0;
        audioElement.play().catch(error => {
            console.log('Audio play failed:', error);
        });
    }
}

let cachedNames = null;

async function loadRateFormula() {
    if (cachedRateFormula) return;

    try {
        const response = await fetch('rate.md');
        if (!response.ok) throw new Error('Could not fetch rate.md file');
        const content = await response.text();

        const lines = content.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        let latestFormula = null;

        for (const line of lines) {
            if (line.includes('{Latest}')) {
                latestFormula = line;
                break;
            }
        }

        if (!latestFormula) {
            const formulaLines = lines.filter(line =>
                line.includes('var Rate') ||
                (line.includes('fat') && line.includes('snf'))
            );
            if (formulaLines.length > 0) {
                latestFormula = formulaLines[formulaLines.length - 1];
            }
        }

        if (latestFormula) {
            const fatMatch = latestFormula.match(/fat\s*\*\s*([\d.]+)/);
            const snfMatch = latestFormula.match(/snf\s*\*\s*([\d.]+)/);

            if (fatMatch && snfMatch) {
                const formula = {
                    fatMultiplier: parseFloat(fatMatch[1]),
                    snfMultiplier: parseFloat(snfMatch[1]),
                    display: latestFormula.replace('{Latest}', '').trim()
                };

                cachedRateFormula = formula;
                rateFormula = formula;
            } else {
                throw new Error('Could not parse rate formula');
            }
        } else {
            throw new Error('No rate formula found in rate.md');
        }
    } catch (error) {
        console.error('Error loading rate formula:', error);
    }
}

async function loadNamesFromFile() {
    if (cachedNames) {
        populateNameDropdown(cachedNames);
        return;
    }

    try {
        const response = await fetch('name.md');
        if (!response.ok) throw new Error('Could not fetch name.md file');
        const content = await response.text();

        const names = content.split('\n')
            .map(name => name.trim())
            .filter(name => name.length > 0)
            .map(name => name.replace(/\r/g, ''));

        cachedNames = names;
        populateNameDropdown(names);
    } catch (error) {
        console.error('Error loading names:', error);
        const nameSelect = document.getElementById('nameSelect');
        if (nameSelect) {
            nameSelect.innerHTML = '<option value="">Error loading names - Check if name.md exists</option>';
        }
    }
}

function populateNameDropdown(names) {
    const nameSelect = document.getElementById('nameSelect');
    if (!nameSelect) return;
    nameSelect.innerHTML = '<option value="">Choose a name...</option>';

    names.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        nameSelect.appendChild(option);
    });
}

function calculateRate(fat, snf) {
    return (fat * rateFormula.fatMultiplier + snf * rateFormula.snfMultiplier).toFixed(2);
}

// Example usage to set initial display rate (will use default until rate.md loaded)
let fat = 4.5;
let snf = 8.5;
let rate = calculateRate(fat, snf);

const fixRateEl = document.getElementById("fix_rate");
if (fixRateEl) fixRateEl.textContent = "Current Rate : " + rate;
const fixRateEl1 = document.getElementById("fix_rate1");
if (fixRateEl1) fixRateEl1.textContent = "Current Rate : " + rate;

function generateKey(name) {
    return name.trim().replace(/\s+/g, '-');
}

function getCurrentDateTime() {
    const now = new Date();
    const day = now.getDate().toString().padStart(2, '0');
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const year = now.getFullYear();
    const time = now.toLocaleString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
    return `${day}/${month}/${year} ${time}`;
}

function getCurrentDateKey() {
    const now = new Date();
    return `${now.getDate()}-${now.getMonth() + 1}-${now.getFullYear()}`;
}

function getCurrentSession() {
    const hour = new Date().getHours();
    return hour < 15 ? "সকাল" : "সন্ধ্যা";
}

// NEW: Function to get session in English for printing
function getCurrentSessionEnglish() {
    const hour = new Date().getHours();
    return hour < 15 ? "Morning" : "Evening";
}

// ===== THERMAL PRINTER FUNCTIONS =====

function showPrintStatus(message, type = 'connecting') {
    const statusDiv = document.getElementById('printStatus');
    if (!statusDiv) return;

    statusDiv.className = `print-status ${type} show`;
    
    let icon = '';
    if (type === 'connecting') {
        icon = '<div class="print-spinner"></div>';
    } else if (type === 'success') {
        icon = '<i class="bx bx-check-circle"></i>';
    } else if (type === 'error') {
        icon = '<i class="bx bx-error-circle"></i>';
    }
    
    statusDiv.innerHTML = `${icon}<span>${message}</span>`;
    
    if (type === 'success' || type === 'error') {
        setTimeout(() => {
            statusDiv.classList.remove('show');
        }, 5000);
    }
}

function stringToBytes(str) {
    const encoder = new TextEncoder();
    return encoder.encode(str);
}

function formatReceiptLine(label, value, width = 32) {
    const labelStr = String(label);
    const valueStr = String(value);
    const spaces = width - labelStr.length - valueStr.length;
    return labelStr + ' '.repeat(Math.max(1, spaces)) + valueStr;
}

// center text helper for given width
function centerText(text, width = 32) {
    const t = String(text);
    if (t.length >= width) return t;
    const pad = Math.floor((width - t.length) / 2);
    return ' '.repeat(pad) + t;
}

/**
 * Robust connectToPrinter:
 * - Requests a device (tries filters and acceptAllDevices fallback)
 * - Connects and enumerates all GATT services
 * - Scans characteristics and picks first writable characteristic
 */
async function connectToPrinter() {
    if (!navigator.bluetooth) {
        throw new Error('Bluetooth not supported in this browser');
    }

    try {
        showPrintStatus('Searching for printer...', 'connecting');

        // Try filtered request first (keeps chooser simpler), fallback to acceptAllDevices if user cancels or filter fails.
        let device = null;
        try {
            device = await navigator.bluetooth.requestDevice({
                filters: [
                    { namePrefix: 'Samp' },
                    { namePrefix: 'Blue' },
                    { namePrefix: 'BT' },
                    { name: 'Sampann' },
                    { name: 'BluPrints' }
                ],
                // request common optional services so chooser can see characteristics on some printers
                optionalServices: [
                    '000018f0-0000-1000-8000-00805f9b34fb',
                    '0000ffe0-0000-1000-8000-00805f9b34fb',
                    '0000ffe1-0000-1000-8000-00805f9b34fb',
                    '0000ffe3-0000-1000-8000-00805f9b34fb',
                    '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
                    '49535343-fe7d-4ae5-8fa9-9fafd205e455'
                ]
            });
        } catch (err) {
            // User may cancel filters; try acceptAllDevices (still shows chooser)
            showPrintStatus('No filtered device selected — scanning all devices...', 'connecting');
            device = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: [
                    '000018f0-0000-1000-8000-00805f9b34fb',
                    '0000ffe0-0000-1000-8000-00805f9b34fb',
                    '0000ffe1-0000-1000-8000-00805f9b34fb',
                    '0000ffe3-0000-1000-8000-00805f9b34fb',
                    '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
                    '49535343-fe7d-4ae5-8fa9-9fafd205e455'
                ]
            });
        }

        if (!device) throw new Error('No device selected');

        showPrintStatus('Connecting to printer...', 'connecting');

        // connect
        const server = await device.gatt.connect();

        // store device
        thermalDevice = device;

        // enumerate all primary services
        const services = await server.getPrimaryServices();
        if (!services || services.length === 0) {
            // No GATT services -> likely classic SPP printer (not BLE)
            throw new Error('No GATT services found. Printer may be Classic Bluetooth (SPP) and not BLE.');
        }

        // Scan services/characteristics to find writable characteristic
        let found = false;
        for (const svc of services) {
            try {
                const chars = await svc.getCharacteristics();
                for (const c of chars) {
                    // if characteristic supports write or writeWithoutResponse, use it
                    if (c.properties && (c.properties.write || c.properties.writeWithoutResponse)) {
                        thermalCharacteristic = c;
                        found = true;
                        // remember which service/char connected
                        console.log('Printer service:', svc.uuid, 'characteristic:', c.uuid, 'props:', c.properties);
                        break;
                    }
                }
                if (found) break;
            } catch (e) {
                // ignore and continue to next service
                console.warn('Error reading characteristics for service', svc.uuid, e);
            }
        }

        if (!found) {
            // Could not find writable characteristic
            // Disconnect cleanly
            try { device.gatt.disconnect(); } catch (e) {}
            thermalDevice = null;
            throw new Error('Could not find writable characteristic. Printer may not support BLE GATT writes.');
        }

        // attach disconnect handler
        device.addEventListener('gattserverdisconnected', () => {
            console.log('Printer disconnected (gattserverdisconnected)');
            showPrintStatus('Printer disconnected', 'error');
            thermalDevice = null;
            thermalCharacteristic = null;
        });

        showPrintStatus('✅ Printer connected', 'success');
        return true;
    } catch (error) {
        console.error('❌ Printer connection error:', error);
        // rethrow so callers can handle
        throw error;
    }
}

/**
 * printReceipt(data)
 * - builds ESC/POS bytes and writes them using the discovered characteristic
 * - chooses write method depending on characteristic properties; falls back if necessary
 * - formatted specifically for a 2" (58mm) thermal printer ~32 chars width
 */
async function printReceipt(data) {
    try {
        // Bengali → English name map
        const nameMap = {
            "চন্দনা ঘোষ": "Chandana Ghosh",
            "রাজেন্দ্র প্রসাদ ঘোষ": "Rajendra Prasad Ghosh",
            "সুজাতা ঘোষ": "Sujata Ghosh",
            "রজিনা শেখ": "Rojina Sekh",
            "মামনি চক্রবর্তী": "Mamoni Chakraborty",
            "রাহেলা শেখ": "Rahela Sekh",
            "ঝর্না চচ্চড়ি": "Jharna Charchari",
            "সুলোচনা ঘোষ": "Sulochana Ghosh",
            "বিকাশ কুমার ঘোষ": "Bikash Kumar Ghosh",
            "মধুমিতা মন্ডল": "Madhumita Mondal",
            "সুদর্শন ঘোষ": "Sudarshan Ghosh",
            "মমতা ঘোষ": "Mamta Ghosh",
            "সবুর আলী খাঁ": "Sabur Ali Khan",
            "কল্যাণী চক্রবর্তী": "Kalyani Chakraborty",
            "বিজলা দুলে": "Bijala Dule",
            "কাশেম খা": "Kashem Khan",
            "বুল্টি দুলে": "Bulti Dule",
            "শফিক খা": "Shafik Khan",
            "নেড়া": "Nera",
            "সবরিয়াদ খান": "Sabariad Khan",
            "ফিরোজ খা": "Firoz Khan",
            "বাবলু খা": "Bablu Khan",
            "অমিত চক্রবর্তী": "Amit Chakraborty",
            "কচে": "Kochey",
            "Test Person 1": "Test Person 1",
            "Test Person 5": "Test Person 5",
            "Test Person 7": "Test Person 7",
            "Test Person 9": "Test Person 9",
            "Abhijit": "Abhijit"
        };

        // Convert Bengali name to English (only for printing)
        if (nameMap[data.name]) {
            data.name = nameMap[data.name];
        }

        // Ensure we have a characteristic; if not, try connecting
        if (!thermalCharacteristic || (thermalDevice && !thermalDevice.gatt.connected)) {
            await connectToPrinter();
        }

        if (!thermalCharacteristic) {
            throw new Error('No writable characteristic available');
        }

        showPrintStatus('Preparing receipt...', 'connecting');

        const ESC = 0x1B;
        const GS = 0x1D;
        const INIT = [ESC, 0x40];
        const ALIGN_CENTER = [ESC, 0x61, 0x01];
        const ALIGN_LEFT = [ESC, 0x61, 0x00];
        const SIZE_BIGGER = 0x09; // 2x width/height
        const SIZE_BIGGER_ESC = [ESC, 0x21, SIZE_BIGGER];
        const SIZE_BIGGER_GS = [GS, 0x11, SIZE_BIGGER];
        const SIZE_RESET_ESC = [ESC, 0x21, 0x00];
        const SIZE_RESET_GS = [GS, 0x21, 0x00];
        const FEED_LINE = [0x0A];
        const CUT_PAPER = [GS, 0x56, 0x00];

        let receipt = new Uint8Array([...INIT]);

        function append(dataArr) {
            const newReceipt = new Uint8Array(receipt.length + dataArr.length);
            newReceipt.set(receipt);
            newReceipt.set(dataArr, receipt.length);
            receipt = newReceipt;
        }

        const width = 32;

        append(ALIGN_CENTER);
        append(stringToBytes('KANGSABOTI DAIRY\n'));
        append(stringToBytes('LALGARA , BANKURA\n'));
        append(stringToBytes('='.repeat(width) + '\n'));

        append(ALIGN_LEFT);
        append(stringToBytes(`Customer: ${data.name}\n`));
        append(stringToBytes(`Date: ${data.timestamp}\n`));
        append(stringToBytes(`Session: ${getCurrentSessionEnglish()}\n`));
        append(stringToBytes('-'.repeat(width) + '\n'));

        append(stringToBytes('Weight (KG):      '));
        append(SIZE_BIGGER_ESC);
        append(SIZE_BIGGER_GS);
        append(stringToBytes(Number(data.kg).toFixed(3) + '\n'));
        append(SIZE_RESET_ESC);
        append(SIZE_RESET_GS);

        append(stringToBytes('FAT:              '));
        append(SIZE_BIGGER_ESC);
        append(SIZE_BIGGER_GS);
        append(stringToBytes(data.fat + '\n'));
        append(SIZE_RESET_ESC);
        append(SIZE_RESET_GS);

        append(stringToBytes('SNF:              '));
        append(SIZE_BIGGER_ESC);
        append(SIZE_BIGGER_GS);
        append(stringToBytes(data.snf + '\n'));
        append(SIZE_RESET_ESC);
        append(SIZE_RESET_GS);

        const rateStr = 'Rs. ' + Number(data.rate).toFixed(2);
        append(stringToBytes('Rate:         '));
        append(SIZE_BIGGER_ESC);
        append(SIZE_BIGGER_GS);
        append(stringToBytes(rateStr + '\n'));
        append(SIZE_RESET_ESC);
        append(SIZE_RESET_GS);

        append(stringToBytes('='.repeat(width) + '\n'));

        const totalRounded = Math.round(Number(data.total));
        const totalStr = 'Rs. ' + totalRounded;
        append(ALIGN_CENTER);
        append(SIZE_BIGGER_ESC);
        append(SIZE_BIGGER_GS);
        append(stringToBytes(`TOTAL: ${totalStr}\n`));
        append(SIZE_RESET_ESC);
        append(SIZE_RESET_GS);
        append(stringToBytes('='.repeat(width) + '\n'));
        append(stringToBytes('\nThank You!\n\n'));
        append(FEED_LINE);
        append(CUT_PAPER);

        showPrintStatus('Printing...', 'connecting');

        const supportsWrite = !!thermalCharacteristic.properties.write;
        const supportsWriteNoResp = !!thermalCharacteristic.properties.writeWithoutResponse;
        const chunkSize = 40;

        async function writeChunk(chunk) {
            try {
                if (supportsWrite && typeof thermalCharacteristic.writeValue === 'function') {
                    await thermalCharacteristic.writeValue(chunk);
                    return;
                }
                if (supportsWriteNoResp && typeof thermalCharacteristic.writeValueWithoutResponse === 'function') {
                    await thermalCharacteristic.writeValueWithoutResponse(chunk);
                    return;
                }
                if (typeof thermalCharacteristic.writeValue === 'function') {
                    await thermalCharacteristic.writeValue(chunk);
                    return;
                }
                throw new Error('No write method available');
            } catch (err) {
                if (supportsWriteNoResp && typeof thermalCharacteristic.writeValueWithoutResponse === 'function') {
                    await thermalCharacteristic.writeValueWithoutResponse(chunk);
                    return;
                }
                throw err;
            }
        }

        for (let i = 0; i < receipt.length; i += chunkSize) {
            const chunk = receipt.slice(i, i + chunkSize);
            await writeChunk(chunk);
            await new Promise(res => setTimeout(res, 40));
        }

        console.log('✅ Receipt printed successfully');
        showPrintStatus('✅ Receipt printed successfully!', 'success');
        return true;

    } catch (error) {
        console.error('❌ Print error:', error);
        let errorMessage = 'Failed to print receipt';
        if (error.message?.toLowerCase().includes('bluetooth')) {
            errorMessage = 'Bluetooth not available';
        } else if (error.message?.toLowerCase().includes('gatt')) {
            errorMessage = 'Printer disconnected. Please reconnect.';
            thermalDevice = null;
            thermalCharacteristic = null;
        } else if (error.message?.toLowerCase().includes('spp')) {
            errorMessage = 'Printer appears to be Classic Bluetooth (SPP). Use native app/Cordova for SPP.';
        }
        showPrintStatus(`❌ ${errorMessage}`, 'error');
        throw error;
    }
}


// ===== END THERMAL PRINTER FUNCTIONS =====

function showPopup(type, title, data, statusText, existingData = null) {
    const overlay = document.getElementById('popupOverlay');
    const card = document.getElementById('popupCard');
    const statusMessage = document.getElementById('statusMessage');
    const popupTitle = document.getElementById('popupTitle');
    const popupDetails = document.getElementById('popupDetails');
    const existingEntry = document.getElementById('existingEntry');
    const existingEntryDetails = document.getElementById('existingEntryDetails');
    const updateBtn = document.getElementById('updateBtn');
    const printBtn = document.getElementById('printBtn');

    if (!overlay || !card || !statusMessage || !popupTitle || !popupDetails) return;

    card.className = 'popup-card';
    if (existingEntry) existingEntry.style.display = 'none';
    if (updateBtn) {
        updateBtn.style.display = 'none';
        updateBtn.disabled = false;
    }
    if (printBtn) {
        printBtn.style.display = 'none';
    }

    // Hide print status when opening new popup
    const printStatus = document.getElementById('printStatus');
    if (printStatus) printStatus.classList.remove('show');

    if (type === 'duplicate') {
        card.classList.add('duplicate');
        statusMessage.className = 'status-message status-duplicate';
        if (existingEntry) existingEntry.style.display = 'block';
        if (updateBtn) updateBtn.style.display = 'inline-block';

        if (existingData && existingEntryDetails) {
            existingEntryDetails.innerHTML = `
                <div><strong>Name:</strong> <span>${existingData.name}</span></div>
                <div><strong>Date & Time:</strong> <span>${existingData.timestamp}</span></div>
                <div><strong>KG:</strong> <span>${existingData.kg}</span></div>
                <div><strong>FAT:</strong> <span>${existingData.fat}</span></div>
                <div><strong>SNF:</strong> <span>${existingData.snf}</span></div>
                <div><strong>Rate:</strong> <span>${existingData.rate}</span></div>
                <div><strong>Total:</strong> <span>${existingData.total}</span></div>
            `;
        }
    } else if (type === 'reprint') {
        card.classList.add('reprint');
        statusMessage.className = 'status-message status-reprint';
    } else {
        card.classList.add(type);
        statusMessage.className = `status-message status-${type === 'success' ? 'success' : type === 'failed' ? 'failed' : 'warning'}`;
    }

    statusMessage.textContent = statusText;
    popupTitle.textContent = title;

    if (data) {
        const displayRate = (data.rate === '' || data.rate === undefined) ? '' : data.rate;
        const displayTotal = (data.total === '' || data.total === undefined) ? '' : data.total;

        popupDetails.innerHTML = `
            <div><strong>Name:</strong> <span>${data.name}</span></div>
            <div><strong>Date & Time:</strong> <span>${data.timestamp}</span></div>
            <div><strong>KG:</strong> <span>${data.kg}</span></div>
            <div><strong>FAT:</strong> <span>${data.fat}</span></div>
            <div><strong>SNF:</strong> <span>${data.snf}</span></div>
            <div><strong>Rate:</strong> <span>${displayRate}</span></div>
            <div><strong>Total:</strong> <span>${displayTotal}</span></div>
        `;

        // Store current data for printing and show print button for success/duplicate/reprint with valid data
        if ((type === 'success' || type === 'duplicate' || type === 'reprint') && data.name && data.rate && data.total !== '😒') {
            currentPrintData = data;
            if (printBtn) printBtn.style.display = 'inline-block';
        } else {
            currentPrintData = null;
        }
    } else {
        popupDetails.innerHTML = '';
        currentPrintData = null;
    }

    overlay.style.display = 'flex';

    // Don't play audio for reprint entries from table
    if (type !== 'reprint') {
        setTimeout(() => {
            const audioType = type === 'duplicate' ? 'exists' : type;
            playAudioMessage(audioType);
        }, 300);
    }

    if (type === 'success' || type === 'failed') {
        setTimeout(() => {
            card.classList.remove('success', 'failed');
        }, 10000);
    }
}

function hidePopup() {
    const overlay = document.getElementById('popupOverlay');
    if (overlay) overlay.style.display = 'none';
    currentPrintData = null;
}

// NEW FUNCTION: Show reprint entry from table row click with fresh styling
function showReprintEntryPopup(record) {
    const data = {
        name: record.name,
        kg: record.kg,
        fat: record.fat,
        snf: record.snf,
        rate: record.rate,
        total: record.total,
        timestamp: record.timestamp
    };

    // Fresh behavior for reprint - different styling and messaging
    showPopup('reprint', 'Reprint Receipt', data, 'Ready to print duplicate receipt for this entry', null);
}

async function checkNameExists(name, dateKey, session) {
    try {
        const nameKey = generateKey(name);
        const dbRef = ref(database);
        const snapshot = await get(child(dbRef, `records/${dateKey}/${nameKey}/${session}`));

        if (snapshot.exists()) {
            return {
                exists: true,
                data: snapshot.val()
            };
        }
        return { exists: false, data: null };
    } catch (error) {
        console.error('Error checking name existence:', error);
        return { exists: false, data: null };
    }
}

async function saveToFirebase(data) {
    try {
        const dateKey = getCurrentDateKey();
        const session = getCurrentSession();
        const nameKey = generateKey(data.name);

        const recordPath = `records/${dateKey}/${nameKey}/${session}`;

        await set(ref(database, recordPath), {
            name: data.name,
            kg: data.kg,
            fat: data.fat,
            snf: data.snf,
            rate: data.rate,
            total: data.total,
            timestamp: data.timestamp
        });

        // Local notification after successful save
        if (Notification.permission === "granted") {
            navigator.serviceWorker.getRegistration().then(reg => {
                if (reg) {
                    reg.showNotification(data.name, {
                        body: `Fat: ${data.fat} |Snf: ${data.snf} |Rate: ₹${data.rate} |TOTAL: ₹${data.total}`,
                        icon: "/Dairy-App/logo.png",
                        badge: "/Dairy-App/logo.png",
                        data: { name: data.name, timestamp: data.timestamp }
                    });
                }
            });
        }

        return true;
    } catch (error) {
        console.error('Error saving to Firebase:', error);
        return false;
    }
}

let pendingSaveData = null;

Promise.all([
    loadNamesFromFile(),
    loadRateFormula()
]).then(() => {
    console.log('All data loaded successfully');
    try {
        const fixRateEl = document.getElementById("fix_rate");
        const fixRateEl1 = document.getElementById("fix_rate1");
        const currentRate = calculateRate(fat, snf);
        if (fixRateEl) fixRateEl.textContent = "Current Rate : " + currentRate;
        if (fixRateEl1) fixRateEl1.textContent = "Current Rate : " + currentRate;
    } catch (e) {
        // ignore
    }
}).catch(error => {
    console.error('Error loading initial data:', error);
});

// MAIN FORM SUBMIT (save flow)
document.getElementById('milkForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();

    const name = document.getElementById('nameSelect')?.value;
    const kg = parseFloat(document.getElementById('kg')?.value) || 0;
    const fat = parseFloat(document.getElementById('fat')?.value) || 0;
    const snf = parseFloat(document.getElementById('snf')?.value) || 0;

    if (fat < 2.0 || fat > 8.0) {
        showPopup('warning', 'Invalid FAT', { name, kg, fat, snf }, 'FAT must be between 2.0 and 8.0');
        return;
    }

    if (snf < 2.0 || snf > 12.0) {
        showPopup('warning', 'Invalid SNF', { name, kg, fat, snf }, 'SNF must be between 2.0 and 12.0');
        return;
    }

    if (kg < 0.1 || kg > 100.0) {
        showPopup('warning', 'Invalid KG', { name, kg, fat, snf }, 'KG must be between 0.1 and 100');
        return;
    }

    const rate = calculateRate(fat, snf);

    if (!name) {
        const dataNoName = {
            name: '',
            kg: kg.toFixed(3),
            fat: fat.toFixed(1),
            snf: snf.toFixed(1),
            rate: rate,
            total: '😒',
            timestamp: getCurrentDateTime()
        };

        showPopup('warning', 'Warning: No Name', dataNoName, 'Please select a name');
        return;
    }

    const total = Math.round(kg * parseFloat(rate));

    const data = {
        name: name || 'NA',
        kg: kg.toFixed(3),
        fat: fat.toFixed(1),
        snf: snf.toFixed(1),
        rate: rate,
        total: total.toString(),
        timestamp: getCurrentDateTime()
    };

    const dateKey = getCurrentDateKey();
    const session = getCurrentSession();
    const { exists, data: existingData } = await checkNameExists(name, dateKey, session);

    if (exists) {
        pendingSaveData = data;
        showPopup(
            'duplicate',
            'Entry Already Exists',
            data,
            `${name} ${session === 'সকাল' ? 'সকাল' : 'সন্ধ্যা'} Already Exists`,
            existingData
        );
        return;
    }

    const saveSuccess = await saveToFirebase(data);

    if (saveSuccess) {
        showPopup('success', 'Success', data, 'Data saved successfully!');

        document.getElementById('milkForm')?.reset();
        const nameSelect = document.getElementById('nameSelect');
        if (nameSelect) nameSelect.value = '';
    } else {
        showPopup('failed', 'Save Failed', data, 'Failed to save data to Firebase. Please try again.');
    }
});

// Update button (used when duplicate found and user chooses to update)
document.getElementById('updateBtn')?.addEventListener('click', async function () {
    const updateBtn = document.getElementById('updateBtn');
    if (!pendingSaveData) {
        console.warn('No pending data to update.');
        return;
    }

    updateBtn.disabled = true;
    updateBtn.textContent = 'Updating...';

    pendingSaveData.timestamp = getCurrentDateTime();

    const success = await saveToFirebase(pendingSaveData);

    if (success) {
        showPopup('success', 'Entry Updated Successfully', pendingSaveData, 'Existing entry has been updated with new values.');
        pendingSaveData = null;
        document.getElementById('milkForm')?.reset();
        const nameSelect = document.getElementById('nameSelect');
        if (nameSelect) nameSelect.value = '';
        setTimeout(() => {
            const dateSelector = document.getElementById('milkDateSelector');
            if (dateSelector) fetchMilkDataForDate(dateSelector.value);
        }, 6000);
    } else {
        showPopup('failed', 'Update Failed', pendingSaveData, 'Failed to update the existing entry. Please try again.');
    }

    updateBtn.disabled = false;
    updateBtn.textContent = 'Update Entry';
});

// Print button event listener
document.getElementById('printBtn')?.addEventListener('click', async function () {
    const printBtn = document.getElementById('printBtn');
    
    if (!currentPrintData) {
        showPrintStatus('❌ No data available to print', 'error');
        return;
    }

    printBtn.disabled = true;
    printBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Printing...';

    try {
        await printReceipt(currentPrintData);
    } catch (error) {
        console.error('Print failed:', error);
    } finally {
        printBtn.disabled = false;
        printBtn.innerHTML = '<i class="bx bx-printer"></i> Print Receipt';
    }
});

document.getElementById('closeBtn')?.addEventListener('click', hidePopup);

document.getElementById('popupOverlay')?.addEventListener('click', function (e) {
    if (e.target === this) {
        hidePopup();
    }
});

document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        hidePopup();
    }
});

document.addEventListener('click', function enableAudio() {
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
        audio.load();
    });
    document.removeEventListener('click', enableAudio);
}, { once: true });

// milkDatabase / date helpers & display
const milkDatabase = database;

function formatMilkDate(date) {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

function formatMilkDisplayDate(date) {
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function populateMilkDateDropdown() {
    const dateSelector = document.getElementById('milkDateSelector');
    if (!dateSelector) return;
    const today = new Date();

    dateSelector.innerHTML = '';

    for (let i = 0; i < 14; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);

        const option = document.createElement('option');
        option.value = formatMilkDate(date);
        option.textContent = i === 0 ? `Today (${formatMilkDisplayDate(date)})` : formatMilkDisplayDate(date);

        dateSelector.appendChild(option);
    }
}

function extractMilkTime(timestamp) {
    if (!timestamp) return '';
    const match = timestamp.match(/(\d{1,2}:\d{2})\s*(am|pm)/i);
    if (!match) return '';
    return `${match[1]} ${match[2].toUpperCase()}`;
}

async function fetchMilkDataForDate(selectedDateParam) {
    // note: we renamed the param to selectedDateParam to avoid confusion with global
    const dataContainer = document.getElementById('milkDataContainer');
    if (!dataContainer) return;

    dataContainer.innerHTML = `
        <div class="milk-loading-state">
            <div class="milk-loading-spinner"></div>
            <div>Loading records for ${selectedDateParam}...</div>
        </div>
    `;

    try {
        const dbRef = ref(milkDatabase);
        const snapshot = await get(child(dbRef, `records/${selectedDateParam}`));

        if (snapshot.exists()) {
            dataContainer.innerHTML = displayMilkData(snapshot.val());
            
            // Add click event listeners to table rows after data is loaded
            // pass the selected date so reprint popup uses correct date
            addTableRowClickListeners(selectedDateParam);
        } else {
            dataContainer.innerHTML = `
                <div class="milk-empty-state">
                    📋 No records found for ${selectedDateParam}
                </div>
            `;
        }
    } catch (error) {
        console.error("Error fetching milk data:", error);
        dataContainer.innerHTML = `
            <div class="milk-error-state">
                ❌ Error loading milk records. Please try again.
            </div>
        `;
    }
}

// NEW FUNCTION: Add click event listeners to table rows (now accepts date param)
function addTableRowClickListeners(dateForRows) {
    const tableRows = document.querySelectorAll('.milk-data-row');
    
    tableRows.forEach(row => {
        // remove previous listeners first to avoid duplicates
        row.replaceWith(row.cloneNode(true));
    });

    // re-fetch rows after replacement
    const freshRows = document.querySelectorAll('.milk-data-row');

    freshRows.forEach(row => {
        row.addEventListener('click', function() {
            // Extract data from the row
            const cells = this.querySelectorAll('.milk-data-cell');
            if (cells.length >= 7) {
                const timeCell = cells[0].textContent.trim();
                const nameCell = cells[1].textContent.trim();
                const fatCell = cells[2].querySelector('.milk-metric-badge')?.textContent.trim() || '';
                const snfCell = cells[3].querySelector('.milk-metric-badge')?.textContent.trim() || '';
                const rateCell = cells[4].querySelector('.milk-metric-badge')?.textContent.replace('₹', '').trim() || '';
                const kgCell = cells[5].querySelector('.milk-metric-badge2')?.textContent.replace('kg', '').trim() || '';
                const totalCell = cells[6].querySelector('.milk-metric-badge2')?.textContent.replace('₹', '').trim() || '';
                
                // Determine session based on time (AM/PM)
                const session = timeCell.toUpperCase().includes('AM') ? 'সকাল' : 'সন্ধ্যা';
                
                const selectedDateString = dateForRows || selectedDate || getCurrentDateKey();

                const record = {
                    name: nameCell,
                    fat: fatCell,
                    snf: snfCell,
                    rate: rateCell,
                    kg: kgCell,
                    total: totalCell,
                    timestamp: `${selectedDateString} ${timeCell}`,
                    session: session
                };
                
                showReprintEntryPopup(record);
            }
        });
    });
}

function timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return 0;

    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3].toUpperCase();

    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;

    return hours * 60 + minutes;
}

let selectedDate = ''; // Global variable to track current selected date

function displayMilkData(data) {
    let totalKg = 0, totalAmount = 0, totalFat = 0, totalSnf = 0, totalRate = 0;

    let amKg = 0, amAmount = 0, amFat = 0, amSnf = 0, amRate = 0;
    let pmKg = 0, pmAmount = 0, pmFat = 0, pmSnf = 0, pmRate = 0;

    let recordsArray = [];
    for (const personKey in data) {
        for (const timeSlot in data[personKey]) {
            const record = data[personKey][timeSlot];
            recordsArray.push(record);
        }
    }

    recordsArray.sort((a, b) => {
        return timeToMinutes(extractMilkTime(b.timestamp)) -
            timeToMinutes(extractMilkTime(a.timestamp));
    });

    let rows = '';
    for (const record of recordsArray) {
        const kg = parseFloat(record.kg) || 0;
        const fat = parseFloat(record.fat) || 0;
        const snf = parseFloat(record.snf) || 0;
        const rate = parseFloat(record.rate) || 0;
        const total = parseFloat(record.total) || 0;

        rows += `
        <tr class="milk-data-row">
            <td class="milk-data-cell milk-time-cell">${extractMilkTime(record.timestamp)}</td>
            <td class="milk-data-cell milk-name-cell">${record.name}</td>
            <td class="milk-data-cell"><span class="milk-metric-badge">${record.fat}</span></td>
            <td class="milk-data-cell"><span class="milk-metric-badge">${record.snf}</span></td>
            <td class="milk-data-cell milk-rate-cell"><span class="milk-metric-badge">${record.rate ? '₹' + record.rate : ''}</span></td>
            <td class="milk-data-cell"><span class="milk-metric-badge2">${Number(record.kg).toFixed(2)} kg</span></td>
            <td class="milk-data-cell milk-amount-cell"><span class="milk-metric-badge2">${record.total ? '₹' + record.total : ''}</span></td>
        </tr>`;

        totalKg += kg;
        totalAmount += total;
        totalFat += fat * kg;
        totalSnf += snf * kg;
        totalRate += rate * kg;

        const timeStr = extractMilkTime(record.timestamp);
        if (timeStr && timeStr.toUpperCase().includes("AM")) {
            amKg += kg;
            amAmount += total;
            amFat += fat * kg;
            amSnf += snf * kg;
            amRate += rate * kg;
        } else if (timeStr && timeStr.toUpperCase().includes("PM")) {
            pmKg += kg;
            pmAmount += total;
            pmFat += fat * kg;
            pmSnf += snf * kg;
            pmRate += rate * kg;
        }
    }

    const avgFat = totalKg ? (totalFat / totalKg).toFixed(1) : '0';
    const avgSnf = totalKg ? (totalSnf / totalKg).toFixed(1) : '0';
    const avgRate = totalKg ? (totalRate / totalKg).toFixed(2) : '0';

    const avgFatAm = amKg ? (amFat / amKg).toFixed(1) : '0';
    const avgSnfAm = amKg ? (amSnf / amKg).toFixed(1) : '0';
    const avgRateAm = amKg ? (amRate / amKg).toFixed(2) : '0';

    const avgFatPm = pmKg ? (pmFat / pmKg).toFixed(1) : '0';
    const avgSnfPm = pmKg ? (pmSnf / pmKg).toFixed(1) : '0';
    const avgRatePm = pmKg ? (pmRate / pmKg).toFixed(2) : '0';

    return `
    <table class="milk-records-table">
        <thead class="milk-table-header">
            <tr>
                <th class="milk-header-cell">⏰ Time</th>
                <th class="milk-header-cell">👤 Name</th>
                <th class="milk-header-cell">🧈 FAT</th>
                <th class="milk-header-cell">🥛 SNF</th>
                <th class="milk-header-cell">💰 Rate</th>
                <th class="milk-header-cell">⚖️ Weight</th>
                <th class="milk-header-cell">💵 Total</th>
            </tr>
        </thead>
        <tbody>
            ${rows}
           
            <tr class="milk-summary-row">
                <td class="milk-data-cell" colspan="2"><strong>🌅 সকাল (AM)</strong></td>
                <td class="milk-data-cell"><strong>${avgFatAm}</strong></td>
                <td class="milk-data-cell"><strong>${avgSnfAm}</strong></td>
                <td class="milk-data-cell"><strong>₹${avgRateAm}</strong></td>
                <td class="milk-data-cell"><strong>${amKg.toFixed(2)} kg</strong></td>
                <td class="milk-data-cell"><strong>₹${amAmount.toFixed(0)}</strong></td>
            </tr>
            <tr class="milk-summary-row">
                <td class="milk-data-cell" colspan="2"><strong>🌇 সন্ধ্যা (PM)</strong></td>
                <td class="milk-data-cell"><strong>${avgFatPm}</strong></td>
                <td class="milk-data-cell"><strong>${avgSnfPm}</strong></td>
                <td class="milk-data-cell"><strong>₹${avgRatePm}</strong></td>
                <td class="milk-data-cell"><strong>${pmKg.toFixed(2)} kg</strong></td>
                <td class="milk-data-cell"><strong>₹${pmAmount.toFixed(0)}</strong></td>
            </tr>
            <tr class="milk-summary-row">
                <td class="milk-data-cell" colspan="2"><strong>📊 Total(All)</strong></td>
                <td class="milk-data-cell"><strong>${avgFat}</strong></td>
                <td class="milk-data-cell"><strong>${avgSnf}</strong></td>
                <td class="milk-data-cell"><strong>₹${avgRate}</strong></td>
                <td class="milk-data-cell"><strong>${totalKg.toFixed(2)} kg</strong></td>
                <td class="milk-data-cell"><strong>₹${totalAmount.toFixed(0)}</strong></td>
            </tr>
        </tbody>
    </table>`;
}

document.addEventListener('DOMContentLoaded', function () {
    populateMilkDateDropdown();

    const dateSelector = document.getElementById('milkDateSelector');
    if (dateSelector) {
        selectedDate = dateSelector.value; // Set initial selected date
        fetchMilkDataForDate(dateSelector.value);

        dateSelector.addEventListener('change', function () {
            selectedDate = this.value; // Update selected date when changed
            fetchMilkDataForDate(this.value);
        });
    }
});

document.getElementById('milkForm')?.addEventListener('submit', function (e) {
    e.preventDefault();
    const dateSelector = document.getElementById('milkDateSelector');
    setTimeout(() => {
        if (dateSelector) {
            selectedDate = dateSelector.value;
            fetchMilkDataForDate(dateSelector.value);
        }
    }, 6000);
});

function logout() {
    signOut(auth).then(() => {
        window.location.href = 'login.html';
    }).catch((error) => {
        console.error('Error signing out:', error);
    });
}

document.getElementById('logoutButton')?.addEventListener('click', logout);

onAuthStateChanged(auth, (user) => {
    const userInfoDiv = document.getElementById('logoutButton');
    const hide_names = document.getElementById('hide_names');
    const hide_names1 = document.getElementById('hide_names1');
    const hide_names2 = document.getElementById('loginBtn2');
    const hide_names3 = document.getElementById('audio');

    if (user) {
        if (userInfoDiv) userInfoDiv.innerText = 'Logout (Abhijit)';
        if (hide_names) hide_names.classList.remove('disabled');
        if (hide_names1) hide_names1.classList.remove('disabled');
        if (hide_names3) hide_names3.style.display = 'block';
        if (hide_names2) hide_names2.style.display = 'none';
    } else {
        if (userInfoDiv) userInfoDiv.innerText = 'Logout (Guest)';
        if (hide_names) hide_names.classList.add('disabled');
        if (hide_names1) hide_names1.classList.add('disabled');
        if (hide_names3) hide_names3.style.display = 'none';
        if (hide_names2) hide_names2.style.display = 'block';
    }
});
