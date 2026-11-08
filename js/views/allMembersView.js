// ============================================================
// ALL MEMBERS VIEW CONTROLLER (SPA)
// Complete restoration of original All_Member Record features:
// - Dropdown filtering for Month, Year, Date Range, and Member Names
// - Realtime reactive multi-select with "All" toggle logic
// - Daily Records table with chronological session sorting
// - Summary by Name breakdown table with sum formulas
// - Synchronized summary statistics (Avg Fat, SNF, Rate, Totals)
// ============================================================
import { sessionOrder, debounce } from '../utils.js';

let allMembersInitialized = false;
let filtersPopulated = false;
let filterDate = new Date();

export async function initAllMembersView() {
    setupDropdownTrigger('monthTrigger', 'monthFilterDropdown');
    setupDropdownTrigger('yearTrigger', 'yearFilterDropdown');
    setupDropdownTrigger('dateRangeTrigger', 'dateRangeFilterDropdown');
    setupDropdownTrigger('nameTrigger', 'nameFilterDropdown');

    // Prevent clicks inside any dropdown from bubbling to document
    document.querySelectorAll('#view-all-members .custom-select-options').forEach(dropdown => {
        dropdown.addEventListener('click', (e) => e.stopPropagation());
    });

    // Close dropdowns on clicking outside
    document.addEventListener('click', function (e) {
        if (!e.target.closest('#view-all-members .custom-select-container')) {
            closeAllDropdowns();
        }
    });

    // ESC key resets filters to default (same as original all_member.html)
    document.addEventListener('keydown', (e) => {
        const view = document.getElementById('view-all-members');
        if (e.key === 'Escape' && view && view.classList.contains('active')) {
            resetFiltersToDefault();
        }
    });

    // Default reference date: today minus 5 days
    filterDate = new Date();
    filterDate.setDate(filterDate.getDate() - 5);

    // Initial load from store
    await renderFromStore(false);

    // Subscribe to realtime store updates
    if (window.DairyStore) {
        window.DairyStore.subscribe((event) => {
            if (event === 'LOADED' || event === 'SYNC' || event === 'ENTRY_SAVED' || event === 'ENTRY_DELETED') {
                renderFromStore(true);
            }
        });
    }

    allMembersInitialized = true;
}

export function activateAllMembersView() {
    if (!allMembersInitialized) {
        initAllMembersView();
    } else {
        renderFromStore(true);
    }
}

function closeAllDropdowns() {
    document.querySelectorAll('#view-all-members .custom-select-options').forEach(d => d.classList.remove('open'));
    document.querySelectorAll('#view-all-members .custom-select-trigger').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('#view-all-members .custom-select-container').forEach(c => c.classList.remove('open'));
}

async function renderFromStore(isUpdate = false) {
    if (!window.DairyStore) return;

    if (!window.DairyStore.isLoaded) {
        try {
            await window.DairyStore.fetchAllRecords();
        } catch (err) {
            console.warn('Could not fetch records for All Members:', err);
        }
    }

    const records = window.DairyStore.records || {};

    if (!filtersPopulated || !isUpdate) {
        populateFilters(records);
        filtersPopulated = true;
    }

    updateTable(records);
}

function setupDropdownTrigger(triggerId, dropdownId) {
    const trigger = document.getElementById(triggerId);
    const dropdown = document.getElementById(dropdownId);
    if (!trigger || !dropdown) return;

    trigger.addEventListener('click', function (e) {
        e.stopPropagation();
        const isOpen = dropdown.classList.contains('open');

        // Close all dropdowns
        document.querySelectorAll('#view-all-members .custom-select-options').forEach(d => {
            if (d !== dropdown) d.classList.remove('open');
        });
        document.querySelectorAll('#view-all-members .custom-select-trigger').forEach(t => {
            if (t !== trigger) t.classList.remove('active');
        });
        document.querySelectorAll('#view-all-members .custom-select-container').forEach(c => {
            c.classList.remove('open');
        });

        // Toggle this dropdown
        if (!isOpen) {
            dropdown.classList.add('open');
            trigger.classList.add('active');
            const container = trigger.closest('.custom-select-container');
            if (container) container.classList.add('open');
        } else {
            dropdown.classList.remove('open');
            trigger.classList.remove('active');
            const container = trigger.closest('.custom-select-container');
            if (container) container.classList.remove('open');
        }
    });
}

function populateCustomFilter(dropdownId, items, defaultText, valuePrefix, preservedValues = null) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;

    let html = `
        <div class="custom-select-option">
            <input type="checkbox" id="${valuePrefix}_all" value="all">
            <label for="${valuePrefix}_all">${defaultText}</label>
        </div>
    `;

    items.forEach((item, index) => {
        const id = `${valuePrefix}_${index}`;
        const val = item.value;
        const label = item.label;
        html += `
            <div class="custom-select-option">
                <input type="checkbox" id="${id}" value="${val}">
                <label for="${id}">${label}</label>
            </div>
        `;
    });

    dropdown.innerHTML = html;

    // Restore preserved values or default to 'all'
    if (preservedValues && preservedValues.length > 0 && !preservedValues.includes('all')) {
        dropdown.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            if (preservedValues.includes(cb.value)) {
                cb.checked = true;
            }
        });
        const allCb = dropdown.querySelector(`#${valuePrefix}_all`);
        if (allCb) allCb.checked = false;
    } else {
        const allCb = dropdown.querySelector(`#${valuePrefix}_all`);
        if (allCb) allCb.checked = true;
    }

    setupCheckboxListeners(dropdownId, valuePrefix, defaultText);
    updateTriggerLabel(dropdownId, valuePrefix, defaultText);
}

function setupCheckboxListeners(dropdownId, valuePrefix, defaultText) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;

    const checkboxes = dropdown.querySelectorAll('input[type="checkbox"]');
    const allCheckbox = dropdown.querySelector(`#${valuePrefix}_all`);

    checkboxes.forEach(cb => {
        cb.addEventListener('change', function (e) {
            e.stopPropagation();

            if (cb === allCheckbox) {
                if (allCheckbox.checked) {
                    checkboxes.forEach(c => {
                        if (c !== allCheckbox) c.checked = false;
                    });
                } else {
                    const anyChecked = Array.from(checkboxes).some(c => c !== allCheckbox && c.checked);
                    if (!anyChecked) allCheckbox.checked = true;
                }
            } else {
                if (cb.checked) {
                    if (allCheckbox) allCheckbox.checked = false;
                } else {
                    const anyChecked = Array.from(checkboxes).some(c => c !== allCheckbox && c.checked);
                    if (!anyChecked && allCheckbox) allCheckbox.checked = true;
                }
            }

            updateTriggerLabel(dropdownId, valuePrefix, defaultText);
            debouncedUpdateTable();
        });

        // Click on row toggles checkbox
        if (cb.parentElement) {
            cb.parentElement.addEventListener('click', function (e) {
                if (e.target !== cb && e.target.tagName !== 'LABEL') {
                    e.stopPropagation();
                    cb.checked = !cb.checked;
                    cb.dispatchEvent(new Event('change'));
                }
            });
        }
    });
}

function updateTriggerLabel(dropdownId, valuePrefix, defaultText) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;

    const checkboxes = dropdown.querySelectorAll('input[type="checkbox"]');
    const allCheckbox = dropdown.querySelector(`#${valuePrefix}_all`);
    const trigger = dropdown.previousElementSibling;
    if (!trigger) return;
    const triggerLabel = trigger.querySelector('span');
    if (!triggerLabel) return;

    if (allCheckbox && allCheckbox.checked) {
        triggerLabel.textContent = defaultText;
        return;
    }

    const checkedLabels = [];
    checkboxes.forEach(cb => {
        if (cb !== allCheckbox && cb.checked) {
            const lbl = cb.nextElementSibling;
            if (lbl) checkedLabels.push(lbl.textContent.trim());
        }
    });

    if (checkedLabels.length === 0) {
        if (allCheckbox) allCheckbox.checked = true;
        triggerLabel.textContent = defaultText;
    } else if (checkedLabels.length <= 2) {
        triggerLabel.textContent = checkedLabels.join(', ');
    } else {
        triggerLabel.textContent = `${checkedLabels.length} Selected`;
    }
}

function getSelectedValues(dropdownId, valuePrefix) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return ['all'];

    const checkboxes = dropdown.querySelectorAll('input[type="checkbox"]');
    const allCheckbox = dropdown.querySelector(`#${valuePrefix}_all`);

    if (!allCheckbox || allCheckbox.checked) {
        return ['all'];
    }

    const values = [];
    checkboxes.forEach(cb => {
        if (cb !== allCheckbox && cb.checked) {
            values.push(cb.value);
        }
    });

    return values.length > 0 ? values : ['all'];
}

function checkFilterOption(dropdownId, valuePrefix, value, defaultText) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;

    const checkboxes = dropdown.querySelectorAll('input[type="checkbox"]');
    let matched = null;
    checkboxes.forEach(cb => {
        if (cb.value === value) matched = cb;
    });

    if (matched) {
        matched.checked = true;
        const allCb = dropdown.querySelector(`#${valuePrefix}_all`);
        if (allCb) allCb.checked = false;
        updateTriggerLabel(dropdownId, valuePrefix, defaultText);
    }
}

function populateFilters(data) {
    const months = new Set();
    const years = new Set();
    const names = new Set();

    // 1. Gather distinct months, years, and names from DB records
    Object.keys(data).forEach(dateKey => {
        const parts = dateKey.split('-').map(Number);
        if (parts.length !== 3) return;
        const [day, month, year] = parts;

        if (!isNaN(month) && !isNaN(year)) {
            months.add(`${month}-${year}`);
            years.add(year);
        }

        if (data[dateKey] && typeof data[dateKey] === 'object') {
            Object.values(data[dateKey]).forEach(user => {
                if (user && typeof user === 'object') {
                    Object.values(user).forEach(entry => {
                        if (entry && entry.name) names.add(entry.name);
                    });
                }
            });
        }
    });

    // 2. Also populate all members from name.md/DairyStore so they are always selectable
    if (window.DairyStore && window.DairyStore.members && window.DairyStore.members.length > 0) {
        window.DairyStore.members.forEach(n => {
            if (n && n.trim()) names.add(n.trim());
        });
    }

    // 3. Fallback to current date if DB is empty
    const now = new Date();
    months.add(`${now.getMonth() + 1}-${now.getFullYear()}`);
    years.add(now.getFullYear());

    // Sort Month Objects chronologically descending
    const sortedMonths = Array.from(months)
        .map(m => {
            const [month, year] = m.split('-').map(Number);
            return {
                month,
                year,
                label: `${new Date(year, month - 1).toLocaleString('en-US', { month: 'long' })} ${year}`
            };
        })
        .sort((a, b) => b.year - a.year || b.month - a.month);

    // Save any currently checked values before rebuilding
    const currentMonths = getSelectedValues('monthFilterDropdown', 'month');
    const currentYears = getSelectedValues('yearFilterDropdown', 'year');
    const currentRanges = getSelectedValues('dateRangeFilterDropdown', 'range');
    const currentNames = getSelectedValues('nameFilterDropdown', 'name');

    // 1. Populate Month Filter
    const monthItems = sortedMonths.map(m => ({ value: m.month.toString(), label: m.label }));
    populateCustomFilter('monthFilterDropdown', monthItems, 'All Months', 'month', currentMonths);

    // 2. Populate Year Filter
    const yearItems = Array.from(years)
        .sort((a, b) => b - a)
        .map(year => ({ value: year.toString(), label: year.toString() }));
    populateCustomFilter('yearFilterDropdown', yearItems, 'All Years', 'year', currentYears);

    // 3. Populate Name Filter
    const nameItems = Array.from(names)
        .sort((a, b) => a.localeCompare(b, 'bn'))
        .map(name => ({ value: name, label: name }));
    populateCustomFilter('nameFilterDropdown', nameItems, 'All Names', 'name', currentNames);

    // 4. Populate Date Range Filter
    const dateRangeItems = [
        { value: '1-7', label: '1-7' },
        { value: '8-15', label: '8-15' },
        { value: '16-23', label: '16-23' },
        { value: '24-end', label: '24-end' }
    ];
    populateCustomFilter('dateRangeFilterDropdown', dateRangeItems, 'All Dates', 'range', currentRanges);

    // If initial load with no custom selections, apply defaults
    if (currentMonths.includes('all')) {
        const initialMonth = (filterDate.getMonth() + 1).toString();
        checkFilterOption('monthFilterDropdown', 'month', initialMonth, 'All Months');
    }
    if (currentYears.includes('all')) {
        const initialYear = filterDate.getFullYear().toString();
        checkFilterOption('yearFilterDropdown', 'year', initialYear, 'All Years');
    }
    if (currentRanges.includes('all')) {
        const day = filterDate.getDate();
        let rangeVal = "24-end";
        if (day >= 1 && day <= 7) rangeVal = "1-7";
        else if (day >= 8 && day <= 15) rangeVal = "8-15";
        else if (day >= 16 && day <= 23) rangeVal = "16-23";
        checkFilterOption('dateRangeFilterDropdown', 'range', rangeVal, 'All Dates');
    }
}

function resetFiltersToDefault() {
    ['monthFilterDropdown', 'yearFilterDropdown', 'dateRangeFilterDropdown', 'nameFilterDropdown'].forEach(dropdownId => {
        const dropdown = document.getElementById(dropdownId);
        if (!dropdown) return;
        const valuePrefix = dropdownId.includes('month') ? 'month' :
            dropdownId.includes('year') ? 'year' :
                dropdownId.includes('range') ? 'range' : 'name';
        const defaultText = dropdownId.includes('month') ? 'All Months' :
            dropdownId.includes('year') ? 'All Years' :
                dropdownId.includes('range') ? 'All Dates' : 'All Names';

        const checkboxes = dropdown.querySelectorAll('input[type="checkbox"]');
        const allCb = dropdown.querySelector(`#${valuePrefix}_all`);
        checkboxes.forEach(cb => {
            cb.checked = (cb === allCb);
        });
        updateTriggerLabel(dropdownId, valuePrefix, defaultText);
    });

    closeAllDropdowns();
    updateTable();
}

function updateTable(allDataParam) {
    const allData = allDataParam || (window.DairyStore ? window.DairyStore.records : {});
    const tbody = document.getElementById('allMemberTableBody') || document.getElementById('tableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    let sumKg = 0, sumTotal = 0;
    let sumFat = 0, sumSnf = 0, sumRate = 0, countEntries = 0;
    const rows = [];
    const nameAggregates = {};

    // Read selected filters
    const selectedMonths = getSelectedValues('monthFilterDropdown', 'month');
    const selectedYears = getSelectedValues('yearFilterDropdown', 'year');
    const selectedDateRanges = getSelectedValues('dateRangeFilterDropdown', 'range');
    const selectedNames = getSelectedValues('nameFilterDropdown', 'name');

    // Hide "Summary by Name" section if a specific member is selected instead of "All Names"
    const summarySection = document.getElementById('summaryByNameSection');
    if (summarySection) {
        const isAllNames = selectedNames.includes('all');
        summarySection.style.display = isAllNames ? '' : 'none';
    }

    // Sort date keys chronologically
    const sortedDateKeys = Object.keys(allData).sort((a, b) => {
        const [d1, m1, y1] = a.split('-').map(Number);
        const [d2, m2, y2] = b.split('-').map(Number);
        const date1 = new Date(y1, m1 - 1, d1);
        const date2 = new Date(y2, m2 - 1, d2);
        return date1 - date2;
    });

    sortedDateKeys.forEach(dateKey => {
        const parts = dateKey.split('-');
        if (parts.length !== 3) return;
        const [dayStr, monthStr, yearStr] = parts;
        const day = parseInt(dayStr, 10);
        const month = parseInt(monthStr, 10);
        const year = parseInt(yearStr, 10);

        // Apply month filter
        if (!selectedMonths.includes('all') && !selectedMonths.includes(month.toString())) return;

        // Apply year filter
        if (!selectedYears.includes('all') && !selectedYears.includes(year.toString())) return;

        // Apply date range filter
        if (!selectedDateRanges.includes('all')) {
            const dayMatchesAnyRange = selectedDateRanges.some(range => {
                const [start, end] = range.split('-');
                if (end === 'end' && day >= 24) return true;
                if (end !== 'end' && day >= parseInt(start, 10) && day <= parseInt(end, 10)) return true;
                return false;
            });
            if (!dayMatchesAnyRange) return;
        }

        // Collect and sort session entries chronologically (morning -> noon -> evening)
        const userEntries = [];
        const dayRecord = allData[dateKey];
        if (!dayRecord || typeof dayRecord !== 'object') return;

        Object.values(dayRecord).forEach(user => {
            if (user && typeof user === 'object') {
                Object.entries(user).forEach(([session, entry]) => {
                    userEntries.push({ session, entry });
                });
            }
        });

        userEntries.sort((a, b) => sessionOrder(a.session) - sessionOrder(b.session));

        userEntries.forEach(({ session, entry }) => {
            if (!entry) return;

            // Apply name filter
            if (!selectedNames.includes('all') && !selectedNames.includes(entry.name)) return;

            const fatVal = parseFloat(entry.fat) || 0;
            const snfVal = parseFloat(entry.snf) || 0;
            const rateVal = parseFloat(entry.rate) || 0;
            const kgVal = parseFloat(entry.kg) || 0;
            const totalVal = parseFloat(entry.total) || 0;

            sumFat += fatVal;
            sumSnf += snfVal;
            sumRate += rateVal;
            sumKg += kgVal;
            sumTotal += totalVal;
            countEntries++;

            rows.push({
                day: day,
                month: month,
                year: year,
                dayStr: dayStr.padStart(2, '0'),
                session: session,
                fat: entry.fat || '0',
                snf: entry.snf || '0',
                rate: entry.rate || '0',
                kg: entry.kg || '0',
                total: entry.total || '0'
            });

            // Aggregate by name for the second table
            const name = entry.name || 'Unknown';
            if (!nameAggregates[name]) {
                nameAggregates[name] = { totalKg: 0, totalTotal: 0, entries: [] };
            }
            nameAggregates[name].totalKg += kgVal;
            nameAggregates[name].totalTotal += totalVal;
            nameAggregates[name].entries.push({
                day: day,
                month: month,
                year: year,
                session: session,
                rawKg: entry.kg,
                rawTotal: entry.total
            });
        });
    });

    // Sort rows by full date and session for the main table
    rows.sort((a, b) => {
        const dateA = new Date(a.year, a.month - 1, a.day);
        const dateB = new Date(b.year, b.month - 1, b.day);
        if (dateA.getTime() !== dateB.getTime()) {
            return dateA.getTime() - dateB.getTime();
        }
        return sessionOrder(a.session) - sessionOrder(b.session);
    });

    // Append rows to the main table body
    if (rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem; color: #94a3b8;">No records found for selected filters</td></tr>';
    } else {
        rows.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${row.dayStr}</strong></td>
                <td><span class="session-badge session-${sessionOrder(row.session)}">${row.session}</span></td>
                <td class="numeric">${row.fat}</td>
                <td class="numeric">${row.snf}</td>
                <td class="numeric">₹${row.rate}</td>
                <td class="numeric">${row.kg}</td>
                <td class="numeric">₹${row.total}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Calculate averages for Fat, SNF, and Rate for the main table
    const avgFat = countEntries > 0 ? (sumFat / countEntries) : 0;
    const avgSnf = countEntries > 0 ? (sumSnf / countEntries) : 0;
    const avgRate = countEntries > 0 ? (sumRate / countEntries) : 0;

    // Update main table footer
    const avgFatEl = document.getElementById('allMemberAvgFat') || document.getElementById('avgFat');
    const avgSnfEl = document.getElementById('allMemberAvgSnf') || document.getElementById('avgSnf');
    const avgRateEl = document.getElementById('allMemberAvgRate') || document.getElementById('avgRate');
    const totalKgEl = document.getElementById('allMemberTotalKg') || document.getElementById('totalKg');
    const totalAmountEl = document.getElementById('allMemberTotalAmount') || document.getElementById('totalAmount');

    if (avgFatEl) avgFatEl.textContent = avgFat.toFixed(1);
    if (avgSnfEl) avgSnfEl.textContent = avgSnf.toFixed(1);
    if (avgRateEl) avgRateEl.textContent = avgRate.toFixed(1);
    if (totalKgEl) totalKgEl.textContent = sumKg.toFixed(1);
    if (totalAmountEl) totalAmountEl.textContent = '₹' + sumTotal.toFixed(0);

    // --- Update the second (aggregated) table by name ---
    const nameAggregateTbody = document.getElementById('nameAggregateTableBody');
    if (nameAggregateTbody) {
        nameAggregateTbody.innerHTML = '';

        let aggregateSumKg = 0;
        let aggregateSumTotal = 0;

        const aggNames = Object.keys(nameAggregates);
        if (aggNames.length === 0) {
            nameAggregateTbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem; color: #94a3b8;">No summary data available</td></tr>';
        } else {
            aggNames.forEach(name => {
                const aggregate = nameAggregates[name];
                const aggregatedRate = aggregate.totalKg > 0 ? (aggregate.totalTotal / aggregate.totalKg) : 0;

                // Sort individual entries chronologically
                aggregate.entries.sort((a, b) => {
                    const dateA = new Date(a.year, a.month - 1, a.day);
                    const dateB = new Date(b.year, b.month - 1, b.day);
                    if (dateA.getTime() !== dateB.getTime()) {
                        return dateA.getTime() - dateB.getTime();
                    }
                    return sessionOrder(a.session) - sessionOrder(b.session);
                });

                const kgsList = aggregate.entries.map(e => e.rawKg);
                const totalsList = aggregate.entries.map(e => e.rawTotal);

                const kgSteps = kgsList.join(' + ');
                const kgSum = aggregate.totalKg.toFixed(1);
                const kgDisplay = `<span class="agg-calc-steps">${kgSteps} = </span><strong class="agg-calc-sum">(${kgSum})</strong>`;

                const totalSteps = totalsList.join(' + ');
                const totalSum = aggregate.totalTotal.toFixed(0);
                const totalDisplay = `<span class="agg-calc-steps">₹${totalSteps} = </span><strong class="agg-calc-sum">(${totalSum})</strong>`;

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="agg-col-name"><strong>${name}</strong></td>
                    <td class="agg-col-rate numeric"><span class="agg-rate-badge">₹${aggregatedRate.toFixed(2)}</span></td>
                    <td class="agg-col-kg">${kgDisplay}</td>
                    <td class="agg-col-total numeric">${totalDisplay}</td>
                `;
                nameAggregateTbody.appendChild(tr);

                aggregateSumKg += aggregate.totalKg;
                aggregateSumTotal += aggregate.totalTotal;
            });
        }

        const aggTotalKgEl = document.getElementById('aggregateTotalKg');
        const aggTotalTotalEl = document.getElementById('aggregateTotalTotal');
        if (aggTotalKgEl) aggTotalKgEl.textContent = aggregateSumKg.toFixed(1);
        if (aggTotalTotalEl) aggTotalTotalEl.textContent = '₹' + aggregateSumTotal.toFixed(0);
    }
}

const debouncedUpdateTable = debounce(() => updateTable(), 150);

// Expose on window
window.allMembersView = {
    init: initAllMembersView,
    activate: activateAllMembersView,
    updateTable: () => updateTable(),
    resetFilters: resetFiltersToDefault
};
