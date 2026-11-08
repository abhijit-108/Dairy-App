// ============================================================
// FIX DATA VIEW CONTROLLER (SPA)
// Reads past records from DairyStore and writes fixes directly
// ============================================================
import { pad2, formatDDMMYY, formatTime12, getSessionFromHour } from '../utils.js';

let fixDataInitialized = false;

export function initFixDataView() {
    setDefaultDateTime();
    populateNameDropdown();

    const dateInput = document.getElementById('fix_customDate');
    const timeInput = document.getElementById('fix_customTime');
    const nameSelect = document.getElementById('fix_name');

    if (dateInput) {
        dateInput.addEventListener('input', updateDatePreview);
        dateInput.addEventListener('change', updateDatePreview);
    }
    if (timeInput) {
        timeInput.addEventListener('input', updateTimePreview);
        timeInput.addEventListener('change', updateTimePreview);
    }
    if (nameSelect) {
        nameSelect.addEventListener('change', renderMemberRecentRecords);
    }

    const kgInput = document.getElementById('fix_kg');
    const fatInput = document.getElementById('fix_fat');
    const snfInput = document.getElementById('fix_snf');

    if (kgInput) kgInput.addEventListener('input', calculateRateAndTotal);
    if (fatInput) fatInput.addEventListener('input', calculateRateAndTotal);
    if (snfInput) snfInput.addEventListener('input', calculateRateAndTotal);

    const form = document.getElementById('fixDataForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }

    if (window.DairyStore) {
        window.DairyStore.subscribe((event) => {
            if (event === 'LOADED' || event === 'SYNC' || event === 'ENTRY_SAVED' || event === 'ENTRY_DELETED') {
                populateNameDropdown();
                renderMemberRecentRecords();
            }
        });
    }

    fixDataInitialized = true;
}

export function activateFixDataView() {
    if (!fixDataInitialized) {
        initFixDataView();
    } else {
        setDefaultDateTime();
        populateNameDropdown();
        renderMemberRecentRecords();
    }
}

function setDefaultDateTime() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = pad2(now.getMonth() + 1);
    const dd = pad2(now.getDate());
    const HH = pad2(now.getHours());
    const MM = pad2(now.getMinutes());

    const dateInput = document.getElementById('fix_customDate');
    const timeInput = document.getElementById('fix_customTime');

    if (dateInput) dateInput.value = `${yyyy}-${mm}-${dd}`;
    if (timeInput) timeInput.value = `${HH}:${MM}`;

    updateDatePreview();
    updateTimePreview();
}

function updateDatePreview() {
    const dateInput = document.getElementById('fix_customDate');
    const datePreview = document.getElementById('fix_datePreview');
    if (dateInput && datePreview) {
        datePreview.textContent = formatDDMMYY(dateInput.value);
    }
}

function updateTimePreview() {
    const timeInput = document.getElementById('fix_customTime');
    const timePreview = document.getElementById('fix_timePreview');
    if (timeInput && timePreview) {
        timePreview.textContent = formatTime12(timeInput.value);
    }
}

function populateNameDropdown() {
    const nameSelect = document.getElementById('fix_name');
    if (!nameSelect || !window.DairyStore) return;

    const currentVal = nameSelect.value;
    const members = window.DairyStore.members || [];

    nameSelect.innerHTML = '<option value="">Choose a name...</option>';
    members.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        nameSelect.appendChild(option);
    });

    if (currentVal && members.includes(currentVal)) {
        nameSelect.value = currentVal;
    }
}

function calculateRateAndTotal() {
    const kg = parseFloat(document.getElementById('fix_kg')?.value) || 0;
    const fat = parseFloat(document.getElementById('fix_fat')?.value) || 0;
    const snf = parseFloat(document.getElementById('fix_snf')?.value) || 0;

    const rateInput = document.getElementById('fix_rate');
    const totalInput = document.getElementById('fix_total');

    if (!window.DairyStore || (!fat && !snf)) {
        if (rateInput) rateInput.value = '';
        if (totalInput) totalInput.value = '';
        return;
    }

    const rate = window.DairyStore.calculateRate(fat, snf);
    const total = Math.round(kg * rate);

    if (rateInput) rateInput.value = rate.toFixed(2);
    if (totalInput) totalInput.value = total;
}

function renderMemberRecentRecords() {
    const nameSelect = document.getElementById('fix_name');
    const selectedName = nameSelect ? nameSelect.value.trim() : '';
    const recordsBox = document.getElementById('fix_recentRecordsBox');
    const recordsBody = document.getElementById('fix_recentRecordsBody');
    const countBadge = document.getElementById('fix_recordsCountBadge');
    const titleText = document.getElementById('fix_recordsTitleText');

    if (!recordsBox || !recordsBody) return;

    if (!selectedName) {
        recordsBox.style.display = 'none';
        return;
    }

    recordsBox.style.display = 'block';
    if (titleText) {
        titleText.textContent = `📋 ${selectedName} - গত ১৫ দিনের রেকর্ড`;
    }

    const now = new Date();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const fifteenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 15, 0, 0, 0, 0);

    const allRecords = (window.DairyStore && window.DairyStore.records) ? window.DairyStore.records : {};
    const matchedRecords = [];

    for (const dateKey in allRecords) {
        const parts = dateKey.split('-');
        if (parts.length !== 3) continue;
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const y = parseInt(parts[2], 10);
        const recordDate = new Date(y, m, d);

        if (recordDate >= fifteenDaysAgo && recordDate <= todayEnd) {
            const dayData = allRecords[dateKey];
            for (const memberKey in dayData) {
                const sessions = dayData[memberKey];
                for (const sessionName in sessions) {
                    const entry = sessions[sessionName];
                    if (entry && entry.name && entry.name.trim() === selectedName) {
                        matchedRecords.push({
                            dateKey: dateKey,
                            dateObj: recordDate,
                            session: sessionName,
                            entry: entry
                        });
                    }
                }
            }
        }
    }

    matchedRecords.sort((a, b) => b.dateObj - a.dateObj);

    if (countBadge) {
        countBadge.textContent = `${matchedRecords.length} টি এন্ট্রি`;
    }

    if (matchedRecords.length === 0) {
        recordsBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:18px; color:#94a3b8;">গত ১৫ দিনে কোনো রেকর্ড পাওয়া যায়নি</td></tr>`;
        return;
    }

    let html = '';
    matchedRecords.forEach(item => {
        const e = item.entry;
        const timeStr = e.timestamp ? e.timestamp.replace(/^\S+\s+/, '') : '--';

        let sessionClass = 'session-morning';
        if (item.session === 'দুপুর') sessionClass = 'session-noon';
        else if (item.session === 'সন্ধ্যা') sessionClass = 'session-evening';

        const rowData = encodeURIComponent(JSON.stringify({
            dateKey: item.dateKey,
            time: timeStr,
            session: item.session,
            kg: e.kg,
            fat: e.fat,
            snf: e.snf,
            rate: e.rate,
            total: e.total,
            name: e.name
        }));

        const displayKg = !isNaN(parseFloat(e.kg)) ? Number(e.kg).toFixed(2) : (e.kg || 0);

        html += `
            <tr onclick="window.fixDataView.loadRecordIntoForm('${rowData}')">
                <td><strong class="record-date">${item.dateKey}</strong></td>
                <td>
                    <span class="session-badge ${sessionClass}">${item.session}</span>
                    <small class="record-time-text">${timeStr}</small>
                </td>
                <td><strong class="record-kg">${displayKg}</strong></td>
                <td><span class="record-metric-badge badge-fat">${e.fat || 0}</span></td>
                <td><span class="record-metric-badge badge-snf">${e.snf || 0}</span></td>
                <td><strong class="record-rate">₹${e.rate || 0}</strong></td>
                <td><strong class="record-badge-total">₹${e.total || 0}</strong></td>
                <td>
                    <button type="button" class="load-row-btn" title="এই ডাটা ফর্মে লোড করুন">
                        <i class='bx bx-edit-alt'></i> Fix
                    </button>
                </td>
            </tr>
        `;
    });

    recordsBody.innerHTML = html;
}

export function loadRecordIntoForm(encodedData) {
    try {
        const data = JSON.parse(decodeURIComponent(encodedData));

        if (data.dateKey) {
            const parts = data.dateKey.split('-');
            if (parts.length === 3) {
                const dd = String(parts[0]).padStart(2, '0');
                const mm = String(parts[1]).padStart(2, '0');
                const yyyy = parts[2];
                const dateInput = document.getElementById('fix_customDate');
                if (dateInput) {
                    dateInput.value = `${yyyy}-${mm}-${dd}`;
                    updateDatePreview();
                }
            }
        }

        if (data.time) {
            const timeInput = document.getElementById('fix_customTime');
            const timeMatch = data.time.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
            if (timeMatch && timeInput) {
                let h = parseInt(timeMatch[1], 10);
                const m = timeMatch[2];
                const ampm = timeMatch[3] ? timeMatch[3].toLowerCase() : '';
                if (ampm === 'pm' && h < 12) h += 12;
                if (ampm === 'am' && h === 12) h = 0;
                timeInput.value = `${String(h).padStart(2, '0')}:${m}`;
                updateTimePreview();
            }
        }

        if (data.kg !== undefined) document.getElementById('fix_kg').value = data.kg;
        if (data.fat !== undefined) document.getElementById('fix_fat').value = data.fat;
        if (data.snf !== undefined) document.getElementById('fix_snf').value = data.snf;
        if (data.rate !== undefined) document.getElementById('fix_rate').value = data.rate;
        if (data.total !== undefined) document.getElementById('fix_total').value = data.total;

        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
        console.error('Error loading record into form:', err);
    }
}

async function handleFormSubmit(event) {
    event.preventDefault();

    const submitBtn = document.getElementById('fix_submit');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Submitting...";
    }

    const customDate = document.getElementById('fix_customDate').value;
    const customTime = document.getElementById('fix_customTime').value;
    const name = document.getElementById('fix_name').value;
    const kg = document.getElementById('fix_kg').value;
    const fat = document.getElementById('fix_fat').value;
    const snf = document.getElementById('fix_snf').value;
    const rate = document.getElementById('fix_rate').value;
    const total = document.getElementById('fix_total').value;

    const nameKey = name.trim().replace(/\s+/g, '-');
    const [year, month, day] = customDate.split('-');
    const formattedDate = `${parseInt(day, 10)}-${parseInt(month, 10)}-${year}`;

    const [hours, minutes] = customTime.split(':');
    const hour = parseInt(hours, 10);
    const period = hour >= 12 ? 'PM' : 'AM';
    const formattedHours = hour % 12 || 12;
    const formattedTime = `${String(formattedHours).padStart(2, '0')}:${minutes} ${period}`;

    const session = getSessionFromHour(hour);

    const timestamp = `${formattedDate} ${formattedTime}`;
    const entryData = {
        name: name,
        kg: kg,
        fat: fat,
        snf: snf,
        rate: rate,
        total: total,
        timestamp: timestamp
    };

    try {
        if (window.DairyStore) {
            await window.DairyStore.saveEntry(formattedDate, nameKey, session, entryData);
        }

        const alertEl = document.getElementById('fix_alert');
        if (alertEl) {
            alertEl.classList.add('show');
            setTimeout(() => alertEl.classList.remove('show'), 3000);
        }

        renderMemberRecentRecords();
    } catch (err) {
        console.error('Error submitting fix data:', err);
        alert('Error saving record: ' + err.message);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = "<i class='bx bx-calculator'></i> Calculate";
        }
    }
}

window.fixDataView = {
    init: initFixDataView,
    activate: activateFixDataView,
    calculateRateAndTotal,
    loadRecordIntoForm,
    renderRecentRecords: renderMemberRecentRecords
};
