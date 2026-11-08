// ============================================================
// GENERATE BILL VIEW CONTROLLER (SPA)
// Complete restoration of original Bill Auto Genarated features:
// - Dynamic Rate Formula & Rate Pill Badges (per-member & total)
// - Full Edit Mode (Add/Delete Member, Inline Inputs, Manual Overrides)
// - 55%/45% Split for Fixed Members (চন্দনা ঘোষ. & রাজেন্দ্র ঘোষ)
// - Realtime calculation on input with warning banners
// - High-resolution screenshot download
// ============================================================
import { pad2 } from '../utils.js';

let billInitialized = false;
let currentDateRange = '';
let currentBaseDate = new Date();
let adjustedBaseDate = null;
let allNames = new Set();
let databaseData = {};

let isEditMode = false;
let manualOverrides = {};
let addedMembers = [];
let namesFromFile = [];

let mainRate = 45;
let conversionFactor_ToMake_original = 45 / 29;
let conversionFactor_ToMake_original_Less = 29 / 45;

const fixedNames = ['চন্দনা ঘোষ.', 'রাজেন্দ্র ঘোষ'];
const preselectedNames = [
    'মধুমিতা মন্ডল',
    'ঝর্না চচ্চড়ি',
    'বুল্টি দুলে',
    'রজিনা শেখ',
    'সুজাতা ঘোষ',
    'রহিত মল্লিক',
    'সুলোচনা ঘোষ'
];

export async function initGenerateBillView() {
    setupEventListeners();
    setDefaultDateRange();

    // Load formula rate and member names
    await Promise.all([loadRateFromRateMd(), loadNamesFromFile()]);

    // Listen to store updates
    if (window.DairyStore) {
        window.DairyStore.subscribe((event) => {
            if (event === 'LOADED' || event === 'SYNC' || event === 'ENTRY_SAVED' || event === 'ENTRY_DELETED') {
                loadBillData(false);
            }
        });
    }

    await loadBillData(false);
    billInitialized = true;
}

export function activateGenerateBillView() {
    if (!billInitialized) {
        initGenerateBillView();
    } else {
        loadBillData(false);
    }
}

// --- Rate Calculation from rate.md ---
async function loadRateFromRateMd() {
    try {
        if (window.DairyStore && window.DairyStore.currentRate) {
            updateMainRateHeader(window.DairyStore.currentRate);
            return;
        }

        const response = await fetch('rate.md');
        if (!response.ok) throw new Error('Could not fetch rate.md');
        const content = await response.text();

        const lines = content.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        let latestFormula = null;
        for (const line of lines) {
            if (/\{\s*latest\s*\}/i.test(line)) {
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
            const fatMatch = latestFormula.match(/fat\s*\*\s*([\d.]+)/i);
            const snfMatch = latestFormula.match(/snf\s*\*\s*([\d.]+)/i);

            if (fatMatch && snfMatch) {
                const fatMultiplier = parseFloat(fatMatch[1]);
                const snfMultiplier = parseFloat(snfMatch[1]);

                const defaultFat = 4.5;
                const defaultSnf = 8.5;
                const rawRate = (defaultFat * fatMultiplier) + (defaultSnf * snfMultiplier);
                const rate = Math.round(rawRate * 100) / 100;
                updateMainRateHeader(rate);
            }
        }
    } catch (error) {
        console.warn('Error loading rate for generate bill:', error);
    }
}

function updateMainRateHeader(rate) {
    mainRate = rate;
    conversionFactor_ToMake_original = mainRate / 29;
    conversionFactor_ToMake_original_Less = 29 / mainRate;

    const headerEl = document.getElementById('mainRateHeader');
    if (headerEl) {
        const formatted = (rate % 1 !== 0) ? rate.toFixed(2) : rate.toFixed(0);
        headerEl.textContent = `${formatted} টাকা`;
    }
}

async function loadNamesFromFile() {
    try {
        if (window.DairyStore && window.DairyStore.members && window.DairyStore.members.length > 0) {
            namesFromFile = window.DairyStore.members;
            return;
        }

        const response = await fetch('name.md');
        if (!response.ok) throw new Error('Could not fetch name.md');
        const content = await response.text();
        namesFromFile = content.split('\n')
            .map(name => name.trim().replace(/\r/g, ''))
            .filter(name => name.length > 0);
    } catch (error) {
        console.warn('Error loading names from file:', error);
    }
}

// --- Date Range Calculation ---
function setDefaultDateRange() {
    const today = new Date();
    const currentDay = today.getDate();

    const adjustedDate = new Date(today);
    adjustedDate.setDate(currentDay - 5);
    adjustedBaseDate = new Date(adjustedDate);

    const adjDay = adjustedDate.getDate();
    let selectedRange = '';
    if (adjDay >= 1 && adjDay <= 7) selectedRange = '1-7';
    else if (adjDay >= 8 && adjDay <= 15) selectedRange = '8-15';
    else if (adjDay >= 16 && adjDay <= 23) selectedRange = '16-23';
    else selectedRange = '24-rest';

    currentDateRange = selectedRange;
    currentBaseDate = new Date(adjustedBaseDate);
    updateDateRangeButtons();
    updateDatedBillDisplay();
}

function setupEventListeners() {
    document.querySelectorAll('#view-generate-bill .date-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const range = this.dataset.range;
            if (range === 'last-bill') {
                const now = new Date();
                currentBaseDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                currentDateRange = 'last-bill';
            } else {
                const now = new Date();
                if (now.getDate() <= 5 && adjustedBaseDate) {
                    currentBaseDate = new Date(adjustedBaseDate);
                } else {
                    currentBaseDate = new Date();
                }
                currentDateRange = range;
            }

            updateDateRangeButtons();
            updateDatedBillDisplay();
            loadBillData(false);
        });
    });

    const editBtn = document.getElementById('editModeBtn');
    if (editBtn) {
        editBtn.addEventListener('click', toggleEditMode);
    }

    const refreshBtn = document.getElementById('billRefreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Refreshing...";
            await loadBillData(true);
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = "<i class='bx bx-refresh'></i> Refresh Data";
        });
    }

    const dlBtn = document.getElementById('downloadBtn');
    if (dlBtn) {
        dlBtn.addEventListener('click', downloadTableScreenshot);
    }

    const billKg = document.getElementById('billKg');
    const billTotalRupee = document.getElementById('billTotalRupee');
    if (billKg) {
        billKg.addEventListener('input', () => updateCalculationsOnly());
    }
    if (billTotalRupee) {
        billTotalRupee.addEventListener('input', () => updateCalculationsOnly());
    }
}

function updateDateRangeButtons() {
    document.querySelectorAll('#view-generate-bill .date-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.range === currentDateRange);
    });
}

function updateDatedBillDisplay() {
    const base = new Date(currentBaseDate);
    const year = base.getFullYear();
    const month = base.getMonth();
    let startDay, endDay;

    switch (currentDateRange) {
        case 'last-bill':
        case '24-rest':
            startDay = 24;
            endDay = new Date(year, month + 1, 0).getDate();
            break;
        case '1-7':
            startDay = 1;
            endDay = 7;
            break;
        case '8-15':
            startDay = 8;
            endDay = 15;
            break;
        case '16-23':
            startDay = 16;
            endDay = 23;
            break;
        default:
            return;
    }

    const formatDate = (d) => `${pad2(d)}/${pad2(month + 1)}/${String(year).slice(-2)}`;
    const el = document.querySelector('#view-generate-bill .dated_bill');
    if (el) el.textContent = `${formatDate(startDay)} - ${formatDate(endDay)}`;
}

function getDatesInRange(range) {
    const base = new Date(currentBaseDate);
    const year = base.getFullYear();
    const month = base.getMonth();
    const dates = [];

    let startDay, endDay;
    switch (range) {
        case 'last-bill':
        case '24-rest':
            startDay = 24;
            endDay = new Date(year, month + 1, 0).getDate();
            break;
        case '1-7':
            startDay = 1;
            endDay = 7;
            break;
        case '8-15':
            startDay = 8;
            endDay = 15;
            break;
        case '16-23':
            startDay = 16;
            endDay = 23;
            break;
        default:
            return dates;
    }

    for (let day = startDay; day <= endDay; day++) {
        dates.push(`${day}-${month + 1}-${year}`);
    }
    return dates;
}

function showLoading() {
    const tableBody = document.getElementById('billTableBody') || document.getElementById('tableBody');
    if (tableBody) {
        tableBody.innerHTML = '<tr class="loading"><td colspan="4" style="text-align:center; padding:1.5rem; color:#94a3b8;">Loading data...</td></tr>';
    }
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.innerHTML = `<div class="error">${message}</div>`;
    }
}

function clearError() {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.innerHTML = '';
    }
}

// --- Data Loader ---
export async function loadBillData(forceRefresh = false) {
    showLoading();
    clearError();

    // Ensure DairyStore is loaded
    if (window.DairyStore) {
        if (!window.DairyStore.isLoaded || forceRefresh) {
            try {
                await window.DairyStore.fetchAllRecords(forceRefresh);
            } catch (e) {
                console.warn('Failed to fetch records in loadBillData:', e);
            }
        }
        if (window.DairyStore.currentRate) {
            updateMainRateHeader(window.DairyStore.currentRate);
        }
        if (window.DairyStore.members && window.DairyStore.members.length > 0) {
            namesFromFile = window.DairyStore.members;
        }
    }

    const dates = getDatesInRange(currentDateRange);
    databaseData = {};
    allNames.clear();
    fixedNames.forEach(name => allNames.add(name));

    if (window.DairyStore) {
        const { aggregates, names } = window.DairyStore.getDateRangeAggregates(dates);
        databaseData = aggregates || {};
        (names || []).forEach(name => allNames.add(name));
    }

    createNameCheckboxes();
    renderTable();
}

// --- Checkbox UI Builder ---
function createNameCheckboxes() {
    const checkboxContainer = document.getElementById('nameCheckboxes');
    if (!checkboxContainer) return;

    // Capture current checked states before clearing
    const currentStates = {};
    checkboxContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        currentStates[cb.value] = cb.checked;
    });

    checkboxContainer.innerHTML = '';

    const displayNamesSet = new Set(allNames);
    if (isEditMode) {
        namesFromFile.forEach(name => displayNamesSet.add(name));
    }
    // Keep currently checked names visible
    Object.keys(currentStates).forEach(name => {
        if (currentStates[name]) {
            displayNamesSet.add(name);
        }
    });

    const sortedNames = Array.from(displayNamesSet).sort();
    const fixedNamesList = sortedNames.filter(name => fixedNames.includes(name));
    const otherNamesList = sortedNames.filter(name =>
        !fixedNames.includes(name) && !preselectedNames.includes(name)
    );

    let counter = 1;

    fixedNamesList.forEach(name => {
        const item = createCheckboxItem(
            name,
            `${counter}. ${name}`,
            currentStates.hasOwnProperty(name) ? currentStates[name] : true
        );
        checkboxContainer.appendChild(item);
        counter++;
    });

    preselectedNames.forEach(name => {
        if (displayNamesSet.has(name)) {
            const item = createCheckboxItem(
                name,
                `${counter}. ${name}`,
                currentStates.hasOwnProperty(name) ? currentStates[name] : true
            );
            checkboxContainer.appendChild(item);
            counter++;
        }
    });

    otherNamesList.forEach(name => {
        const item = createCheckboxItem(
            name,
            `${counter}. ${name}`,
            currentStates.hasOwnProperty(name) ? currentStates[name] : false
        );
        checkboxContainer.appendChild(item);
        counter++;
    });
}

function createCheckboxItem(value, label, checked) {
    const div = document.createElement('div');
    div.className = 'checkbox-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `checkbox_${value.replace(/\s+/g, '_')}`;
    checkbox.value = value;
    checkbox.checked = checked;
    checkbox.addEventListener('change', renderTable);

    const lbl = document.createElement('label');
    lbl.htmlFor = checkbox.id;
    lbl.textContent = ` ${label}`;

    div.appendChild(checkbox);
    div.appendChild(lbl);
    return div;
}

function getSelectedNames() {
    const checkboxes = document.querySelectorAll('#nameCheckboxes input[type="checkbox"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

// --- Table Rendering & Dynamic Calculations ---
function renderTable() {
    const tableBody = document.getElementById('billTableBody') || document.getElementById('tableBody');
    if (!tableBody) return;

    const selectedNames = getSelectedNames();
    tableBody.innerHTML = '';

    const databaseRows = [];

    // 1. Process Database Members
    selectedNames.forEach(name => {
        if (!fixedNames.includes(name)) {
            if (manualOverrides[name] && manualOverrides[name].deleted) return;

            const data = databaseData[name] || { kg: 0, takaMain: 0 };
            const rawKg = (manualOverrides[name] && manualOverrides[name].kg !== undefined)
                ? manualOverrides[name].kg
                : (data.kg || 0);
            const kg = Math.round(rawKg * 10) / 10;
            const takaMain = (manualOverrides[name] && manualOverrides[name].takaMain !== undefined)
                ? manualOverrides[name].takaMain
                : (data.takaMain || 0);
            const displayName = (manualOverrides[name] && manualOverrides[name].name !== undefined)
                ? manualOverrides[name].name
                : name;
            const takaLessInt = Math.ceil(takaMain * conversionFactor_ToMake_original_Less);

            databaseRows.push({ id: name, name: displayName, kg, takaMain, takaLess: takaLessInt });
        }
    });

    // 2. Process Manually Added Members
    addedMembers.forEach(member => {
        if (manualOverrides[member.id] && manualOverrides[member.id].deleted) return;

        const rawKg = (manualOverrides[member.id] && manualOverrides[member.id].kg !== undefined)
            ? manualOverrides[member.id].kg
            : member.kg;
        const kg = Math.round(rawKg * 10) / 10;
        const takaMain = (manualOverrides[member.id] && manualOverrides[member.id].takaMain !== undefined)
            ? manualOverrides[member.id].takaMain
            : member.takaMain;
        const name = (manualOverrides[member.id] && manualOverrides[member.id].name !== undefined)
            ? manualOverrides[member.id].name
            : member.name;
        const takaLessInt = Math.ceil(takaMain * conversionFactor_ToMake_original_Less);

        databaseRows.push({ id: member.id, name, kg, takaMain, takaLess: takaLessInt });
    });

    const selectedFixed = fixedNames.filter(n => selectedNames.includes(n));

    // Render fixed rows at top
    selectedFixed.forEach(name => {
        const row = createTableRow(name, name, 0, 0, true, 0);
        tableBody.appendChild(row);
    });

    // Render database and added members
    databaseRows.forEach(item => {
        const row = createTableRow(item.id, item.name, item.kg, item.takaMain, false, item.takaLess);
        tableBody.appendChild(row);
    });

    // In Edit Mode, append "+ Add Member" row
    if (isEditMode) {
        const addRow = document.createElement('tr');
        addRow.className = 'add-member-row';
        addRow.innerHTML = `
            <td colspan="4" style="padding: 8px; text-align: center;">
                <button type="button" class="add-member-btn" id="addMemberBtn">+ Add Member</button>
            </td>
        `;
        tableBody.appendChild(addRow);

        const addBtn = addRow.querySelector('#addMemberBtn');
        if (addBtn) {
            addBtn.addEventListener('click', handleAddMember);
        }
    }

    updateCalculationsOnly();
}

function createTableRow(id, name, kg, takaMain, isFixed, providedTakaLess = null) {
    const row = document.createElement('tr');
    const sanitizedId = id.replace(/\s+/g, '_');
    row.id = `row-${sanitizedId}`;
    row.className = isFixed ? 'fixed-row' : 'database-row';

    if (!isFixed && isEditMode) {
        row.classList.add('editing-row');
    }

    const takaLess = (providedTakaLess !== null)
        ? providedTakaLess
        : Math.ceil((takaMain || 0) * conversionFactor_ToMake_original_Less);

    if (!isFixed && isEditMode) {
        const kgDisplay = (manualOverrides[id] && manualOverrides[id].rawKg !== undefined)
            ? manualOverrides[id].rawKg
            : ((kg !== undefined && kg !== null) ? (kg === 0 ? '0' : (Number.isInteger(kg) ? kg.toString() : kg.toFixed(1))) : '');

        const takaMainDisplay = (manualOverrides[id] && manualOverrides[id].rawTakaMain !== undefined)
            ? manualOverrides[id].rawTakaMain
            : ((takaMain !== undefined && takaMain !== null) ? Math.round(takaMain).toString() : '');

        const effectiveKg = (manualOverrides[id] && manualOverrides[id].kg !== undefined)
            ? manualOverrides[id].kg
            : (kg || 0);
        const effectiveTakaMain = (manualOverrides[id] && manualOverrides[id].takaMain !== undefined)
            ? manualOverrides[id].takaMain
            : (takaMain || 0);
        const rateVal = (effectiveKg > 0) ? (effectiveTakaMain / effectiveKg).toFixed(2) : '';

        row.innerHTML = `
            <td style="display:flex; align-items:center;">
                <button type="button" class="delete-btn" title="Delete row">×</button>
                <input type="text" class="name-input" id="input-${sanitizedId}-name" value="${name}">
            </td>
            <td class="numeric">
                <input type="text" inputmode="decimal" class="edit-input" id="input-${sanitizedId}-kg" value="${kgDisplay}">
            </td>
            <td class="numeric" id="cell-${sanitizedId}-takaLess">${Number(takaLess).toFixed(0)}</td>
            <td class="numeric">
                <input type="text" inputmode="decimal" class="edit-input" id="input-${sanitizedId}-takaMain" value="${takaMainDisplay}">
                <span class="rate-tag" id="cell-${sanitizedId}-rate" style="display: ${effectiveKg > 0 ? 'inline-block' : 'none'};">${rateVal}</span>
            </td>
        `;

        // Wire event listeners on inputs
        const delBtn = row.querySelector('.delete-btn');
        if (delBtn) delBtn.addEventListener('click', () => handleDeleteMember(id));

        const nameInput = row.querySelector(`#input-${sanitizedId}-name`);
        if (nameInput) {
            nameInput.addEventListener('input', (e) => handleManualEdit(id, 'name', e.target.value));
            nameInput.addEventListener('focus', function () { this.select(); });
        }

        const kgInput = row.querySelector(`#input-${sanitizedId}-kg`);
        if (kgInput) {
            kgInput.addEventListener('input', (e) => handleManualEdit(id, 'kg', e.target.value));
            kgInput.addEventListener('focus', function () { this.select(); });
        }

        const takaInput = row.querySelector(`#input-${sanitizedId}-takaMain`);
        if (takaInput) {
            takaInput.addEventListener('input', (e) => handleManualEdit(id, 'takaMain', e.target.value));
            takaInput.addEventListener('focus', function () { this.select(); });
        }
    } else {
        const rateText = (kg > 0) ? ` <span class="rate-tag">${((takaMain || 0) / kg).toFixed(2)}</span>` : '';
        row.innerHTML = `
            <td class="cell-name">${name}</td>
            <td class="numeric cell-kg">${(kg || 0).toFixed(1)}</td>
            <td class="numeric cell-taka-less">${Number(takaLess).toFixed(0)}</td>
            <td class="numeric cell-taka-main"><span class="taka-main-val">${(takaMain || 0).toFixed(0)}</span>${rateText}</td>
        `;
    }
    return row;
}

// --- Dynamic Calculations ---
function updateCalculationsOnly() {
    const selectedNames = getSelectedNames();
    const billKg = parseFloat(document.getElementById('billKg')?.value) || 0;
    const billTotalRupee = parseFloat(document.getElementById('billTotalRupee')?.value) || 0;

    let databasePeopleTotalKg = 0;
    let databasePeopleTotalTakaLess = 0;
    let databasePeopleTotalTakaMain = 0;

    // 1. Process Database Members
    selectedNames.forEach(name => {
        if (!fixedNames.includes(name)) {
            if (manualOverrides[name] && manualOverrides[name].deleted) return;

            const data = databaseData[name] || { kg: 0, takaMain: 0 };
            const rawKg = (manualOverrides[name] && manualOverrides[name].kg !== undefined)
                ? manualOverrides[name].kg
                : (data.kg || 0);
            const kg = Math.round(rawKg * 10) / 10;
            const takaMain = (manualOverrides[name] && manualOverrides[name].takaMain !== undefined)
                ? manualOverrides[name].takaMain
                : (data.takaMain || 0);
            const takaLessInt = Math.ceil(takaMain * conversionFactor_ToMake_original_Less);

            databasePeopleTotalKg += kg;
            databasePeopleTotalTakaLess += takaLessInt;
            databasePeopleTotalTakaMain += takaMain;

            const sanitizedId = name.replace(/\s+/g, '_');
            const cellTakaLess = document.getElementById(`cell-${sanitizedId}-takaLess`);
            if (cellTakaLess) {
                cellTakaLess.textContent = Number(takaLessInt).toFixed(0);
            }
            const rateSpan = document.getElementById(`cell-${sanitizedId}-rate`);
            if (rateSpan) {
                if (kg > 0) {
                    rateSpan.textContent = ((takaMain || 0) / kg).toFixed(2);
                    rateSpan.style.display = 'inline-block';
                } else {
                    rateSpan.textContent = '';
                    rateSpan.style.display = 'none';
                }
            }
        }
    });

    // 2. Process Manually Added Members
    addedMembers.forEach(member => {
        if (manualOverrides[member.id] && manualOverrides[member.id].deleted) return;

        const rawKg = (manualOverrides[member.id] && manualOverrides[member.id].kg !== undefined)
            ? manualOverrides[member.id].kg
            : member.kg;
        const kg = Math.round(rawKg * 10) / 10;
        const takaMain = (manualOverrides[member.id] && manualOverrides[member.id].takaMain !== undefined)
            ? manualOverrides[member.id].takaMain
            : member.takaMain;
        const takaLessInt = Math.ceil(takaMain * conversionFactor_ToMake_original_Less);

        databasePeopleTotalKg += kg;
        databasePeopleTotalTakaLess += takaLessInt;
        databasePeopleTotalTakaMain += takaMain;

        const sanitizedId = member.id.replace(/\s+/g, '_');
        const cellTakaLess = document.getElementById(`cell-${sanitizedId}-takaLess`);
        if (cellTakaLess) {
            cellTakaLess.textContent = Number(takaLessInt).toFixed(0);
        }
        const rateSpan = document.getElementById(`cell-${sanitizedId}-rate`);
        if (rateSpan) {
            if (kg > 0) {
                rateSpan.textContent = ((takaMain || 0) / kg).toFixed(2);
                rateSpan.style.display = 'inline-block';
            } else {
                rateSpan.textContent = '';
                rateSpan.style.display = 'none';
            }
        }
    });

    databasePeopleTotalKg = Math.round(databasePeopleTotalKg * 10) / 10;

    let remainingKg = billKg > 0 ? Math.round((billKg - databasePeopleTotalKg) * 10) / 10 : 0;
    if (remainingKg < 0) remainingKg = 0;

    let remainingTakaLess = billTotalRupee > 0 ? Math.round(billTotalRupee - databasePeopleTotalTakaLess) : 0;
    if (remainingTakaLess < 0) remainingTakaLess = 0;

    const selectedFixed = fixedNames.filter(n => selectedNames.includes(n));
    const nFixed = selectedFixed.length;

    if (billKg <= 0 || billTotalRupee <= 0 || (billTotalRupee - databasePeopleTotalTakaLess < 0)) {
        showError('Warning: Please input the bill KG & TOTAL.');
    } else {
        clearError();
    }

    // --- Fixed allocation logic (55% / 45% split for 2 fixed members, exact 0.1 KG balance) ---
    const fixedAlloc = {};
    if (nFixed > 0) {
        const remainingTenths = Math.round(remainingKg * 10);

        if (nFixed === 1) {
            const share = remainingTakaLess;
            fixedAlloc[selectedFixed[0]] = {
                takaLess: share,
                takaMain: share * conversionFactor_ToMake_original,
                kg: remainingKg
            };
        } else if (nFixed === 2) {
            const perc = [0.55, 0.45];
            const firstShare = Math.round(remainingTakaLess * perc[0]);
            const secondShare = remainingTakaLess - firstShare;

            const firstTenths = Math.round(remainingTenths * perc[0]);
            const secondTenths = remainingTenths - firstTenths;

            fixedAlloc[selectedFixed[0]] = {
                takaLess: firstShare,
                takaMain: firstShare * conversionFactor_ToMake_original,
                kg: firstTenths / 10
            };
            fixedAlloc[selectedFixed[1]] = {
                takaLess: secondShare,
                takaMain: secondShare * conversionFactor_ToMake_original,
                kg: secondTenths / 10
            };
        } else {
            const baseShare = Math.floor(remainingTakaLess / nFixed);
            let remainder = remainingTakaLess % nFixed;

            const baseTenths = Math.floor(remainingTenths / nFixed);
            let remainderTenths = remainingTenths % nFixed;

            selectedFixed.forEach(name => {
                let share = baseShare + (remainder > 0 ? 1 : 0);
                if (remainder > 0) remainder--;

                let tenths = baseTenths + (remainderTenths > 0 ? 1 : 0);
                if (remainderTenths > 0) remainderTenths--;

                fixedAlloc[name] = {
                    takaLess: share,
                    takaMain: share * conversionFactor_ToMake_original,
                    kg: tenths / 10
                };
            });
        }
    }

    let totalKg = 0, totalTakaLess = 0, totalTakaMain = 0;

    selectedFixed.forEach(name => {
        const alloc = fixedAlloc[name] || { takaLess: 0, takaMain: 0, kg: 0 };
        totalKg += alloc.kg;
        totalTakaLess += alloc.takaLess;
        totalTakaMain += alloc.takaMain;

        const sanitizedId = name.replace(/\s+/g, '_');
        const row = document.getElementById(`row-${sanitizedId}`);
        if (row) {
            const cells = row.children;
            if (cells.length >= 4) {
                cells[1].textContent = (alloc.kg || 0).toFixed(1);
                cells[2].textContent = Number(alloc.takaLess || 0).toFixed(0);
                const rateText = (alloc.kg > 0) ? ` <span class="rate-tag">${((alloc.takaMain || 0) / alloc.kg).toFixed(2)}</span>` : '';
                cells[3].innerHTML = `<span class="taka-main-val">${(alloc.takaMain || 0).toFixed(0)}</span>${rateText}`;
            }
        }
    });

    totalKg += databasePeopleTotalKg;
    totalKg = Math.round(totalKg * 10) / 10;
    totalTakaLess += databasePeopleTotalTakaLess;
    totalTakaMain += databasePeopleTotalTakaMain;

    const elTotalKg = document.getElementById('billTotalKg') || document.getElementById('totalKg');
    const elTotalTakaLess = document.getElementById('billTotalTakaLess') || document.getElementById('totalTakaLess');
    const elTotalTakaMain = document.getElementById('billTotalTakaMain') || document.getElementById('totalTakaMain');

    if (elTotalKg) elTotalKg.textContent = totalKg.toFixed(1);
    if (elTotalTakaLess) elTotalTakaLess.textContent = Number(totalTakaLess).toFixed(0);
    if (elTotalTakaMain) {
        const totalRateText = (totalKg > 0) ? ` <span class="rate-tag">${(totalTakaMain / totalKg).toFixed(2)}</span>` : '';
        elTotalTakaMain.innerHTML = `<span class="taka-main-val">${totalTakaMain.toFixed(0)}</span>${totalRateText}`;
    }
}

// --- Edit Mode Handlers ---
export function toggleEditMode() {
    isEditMode = !isEditMode;
    const btn = document.getElementById('editModeBtn');
    if (btn) {
        btn.textContent = `Edit Mode: ${isEditMode ? 'ON' : 'OFF'}`;
        btn.classList.toggle('active', isEditMode);
    }
    createNameCheckboxes();
    renderTable();
}

export function handleManualEdit(id, field, value) {
    if (!manualOverrides[id]) {
        manualOverrides[id] = {};
    }

    if (field === 'name') {
        manualOverrides[id].name = value;
    } else if (field === 'kg') {
        manualOverrides[id].rawKg = value;
        const num = parseFloat(value);
        manualOverrides[id].kg = isNaN(num) ? 0 : num;
    } else if (field === 'takaMain') {
        manualOverrides[id].rawTakaMain = value;
        const num = parseFloat(value);
        manualOverrides[id].takaMain = isNaN(num) ? 0 : num;
    }
    updateCalculationsOnly();
}

export function handleAddMember() {
    const newId = 'added-' + Date.now();
    addedMembers.push({ id: newId, name: 'New Member', kg: 0, takaMain: 0 });
    renderTable();

    // Focus the new name input
    setTimeout(() => {
        const sanitizedId = newId.replace(/\s+/g, '_');
        const input = document.getElementById(`input-${sanitizedId}-name`);
        if (input) {
            input.focus();
            input.select();
        }
    }, 10);
}

export function handleDeleteMember(id) {
    if (!manualOverrides[id]) manualOverrides[id] = {};
    manualOverrides[id].deleted = true;
    renderTable();
}

// --- Screenshot Download ---
export async function downloadTableScreenshot() {
    const downloadBtn = document.getElementById('downloadBtn');
    const tableContainer = document.getElementById('tableContainer');

    if (!tableContainer || typeof window.html2canvas === 'undefined') {
        alert('Screenshot library is not loaded yet. Please try again.');
        return;
    }

    if (downloadBtn) {
        downloadBtn.disabled = true;
        downloadBtn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Capturing Screenshot...";
    }

    try {
        const currentThemeSolidBg = getComputedStyle(document.body).getPropertyValue('--app-bg-solid')?.trim() || '#040e1c';
        const canvas = await window.html2canvas(tableContainer, {
            backgroundColor: currentThemeSolidBg,
            scale: 2,
            useCORS: true,
            allowTaint: true,
            logging: false,
            height: tableContainer.scrollHeight,
            width: tableContainer.scrollWidth
        });

        canvas.toBlob(function (blob) {
            if (!blob) {
                alert('Screenshot generation failed (empty blob).');
                if (downloadBtn) {
                    downloadBtn.disabled = false;
                    downloadBtn.innerHTML = "<i class='bx bx-camera'></i> Download Table Screenshot";
                }
                return;
            }

            const datedBillElement = document.querySelector('#view-generate-bill .dated_bill');
            let filename = 'milk_report.jpg';

            if (datedBillElement) {
                const dateText = datedBillElement.textContent.trim();
                const parts = dateText.split('-').map(p => p.trim());
                if (parts.length === 2) {
                    const [start, end] = parts;
                    const sanitize = str => str.replace(/\//g, '.');
                    filename = `${sanitize(start)} To ${sanitize(end)} all members milk record.jpg`;
                }
            }

            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            link.click();

            setTimeout(() => URL.revokeObjectURL(link.href), 1000);

            if (downloadBtn) {
                downloadBtn.disabled = false;
                downloadBtn.innerHTML = "<i class='bx bx-camera'></i> Download Table Screenshot";
            }
        }, 'image/jpeg', 0.95);

    } catch (error) {
        console.error('Error capturing screenshot:', error);
        alert('Failed to capture screenshot. Please try again.');
        if (downloadBtn) {
            downloadBtn.disabled = false;
            downloadBtn.innerHTML = "<i class='bx bx-camera'></i> Download Table Screenshot";
        }
    }
}

// Expose on window for easy debugging and interop
window.generateBillView = {
    init: initGenerateBillView,
    activate: activateGenerateBillView,
    loadData: loadBillData,
    updateCalculationsOnly,
    toggleEditMode,
    handleAddMember,
    handleDeleteMember,
    handleManualEdit,
    downloadScreenshot: downloadTableScreenshot
};
