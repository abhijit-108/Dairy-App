// ============================================================
// DAIRY STORE - Centralized In-Memory Data Store with Realtime Sync
// ============================================================
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getDatabase, ref, get, child, onValue, set, remove } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js";
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

// Initialize or reuse Firebase app
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const database = getDatabase(app);
const auth = getAuth(app);

class DairyDataStore {
    constructor() {
        this.records = {};          // { "5-11-2026": { "nameKey": { "morning": {...}, "evening": {...} } } }
        this.members = [];          // list of member names
        this.rateFormula = null;    // raw formula line from rate.md
        this.currentRate = 45.00;   // default calculated rate
        this.fatMultiplier = 4.5;
        this.snfMultiplier = 8.5;
        this.currentUser = null;
        this.isLoaded = false;
        this.fetchPromise = null;
        this.listeners = new Set();
        this.database = database;
        this.auth = auth;

        this._initAuth();
    }

    _initAuth() {
        onAuthStateChanged(this.auth, (user) => {
            this.currentUser = user;
            const logoutEl = document.getElementById('logoutButton');
            if (logoutEl) {
                if (user && user.email) {
                    const username = user.email.split('@')[0];
                    logoutEl.textContent = `Logout (${username})`;
                } else {
                    logoutEl.textContent = 'Logout';
                }
            }
        });
    }

    // Subscribe to data updates
    subscribe(fn) {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }

    _notify(type, data) {
        this.listeners.forEach(fn => {
            try { fn(type, data); } catch (e) { console.error('Store listener error:', e); }
        });
    }

    // Load Rate formula from rate.md
    async loadRate() {
        try {
            const res = await fetch('rate.md');
            if (!res.ok) throw new Error('Could not fetch rate.md');
            const text = await res.text();
            const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

            let formula = lines.find(l => /\{\s*latest\s*\}/i.test(l));
            if (!formula) {
                const formulaLines = lines.filter(l => l.includes('var Rate') || (l.includes('fat') && l.includes('snf')));
                if (formulaLines.length > 0) formula = formulaLines[formulaLines.length - 1];
            }

            if (formula) {
                this.rateFormula = formula;
                const fatM = formula.match(/fat\s*\*\s*([\d.]+)/i);
                const snfM = formula.match(/snf\s*\*\s*([\d.]+)/i);
                if (fatM && snfM) {
                    this.fatMultiplier = parseFloat(fatM[1]);
                    this.snfMultiplier = parseFloat(snfM[1]);
                    const raw = (4.5 * this.fatMultiplier) + (8.5 * this.snfMultiplier);
                    this.currentRate = Math.round(raw * 100) / 100;
                }
            }
        } catch (e) {
            console.warn('Error loading rate.md, using defaults:', e);
        }

        // Update sidebar rate pills
        const fixRateEl1 = document.getElementById('fix_rate1');
        if (fixRateEl1) {
            fixRateEl1.innerHTML = `<i class='bx bx-coin-stack'></i> Current Rate : ${this.currentRate.toFixed(2)}`;
        }
        return this.currentRate;
    }

    // Load member names list from name.md
    async loadNames() {
        try {
            const res = await fetch('name.md');
            if (res.ok) {
                const text = await res.text();
                this.members = text.split('\n').map(l => l.trim().replace(/\r/g, '')).filter(Boolean);
            }
        } catch (e) {
            console.warn('Error loading name.md:', e);
        }
        return this.members;
    }

    // Calculate Rate for a given fat and snf
    calculateRate(fat, snf) {
        const f = parseFloat(fat) || 0;
        const s = parseFloat(snf) || 0;
        if (f === 0 && s === 0) return 0;
        const r = (f * this.fatMultiplier) + (s * this.snfMultiplier);
        return Math.round(r * 100) / 100;
    }

    // Fetch all records ONCE from Firebase Realtime Database
    async fetchAllRecords(force = false) {
        if (this.isLoaded && !force) {
            return this.records;
        }

        if (this.fetchPromise && !force) {
            return this.fetchPromise;
        }

        this.fetchPromise = (async () => {
            try {
                const recordsRef = ref(this.database, 'records');
                const snapshot = await get(recordsRef);
                if (snapshot.exists()) {
                    this.records = snapshot.val() || {};
                } else {
                    this.records = {};
                }
                this.isLoaded = true;

                // Attach realtime listener so any external change updates cache immediately
                this.initRealtimeListener();

                this._notify('LOADED', this.records);
                return this.records;
            } catch (err) {
                console.error('Failed to fetch records from Firebase:', err);
                throw err;
            } finally {
                this.fetchPromise = null;
            }
        })();

        return this.fetchPromise;
    }

    // Realtime background listener to keep in-memory cache perfectly synced
    initRealtimeListener() {
        const recordsRef = ref(this.database, 'records');
        onValue(recordsRef, (snapshot) => {
            if (snapshot.exists()) {
                this.records = snapshot.val() || {};
            } else {
                this.records = {};
            }
            this._notify('SYNC', this.records);
        }, (error) => {
            console.warn('Realtime listener error:', error);
        });
    }

    // Get records for a specific date (e.g. "5-11-2026")
    getDateRecords(dateStr) {
        if (!dateStr || !this.records) return {};
        // Match exact or variations (e.g. "05-11-2026" vs "5-11-2026")
        if (this.records[dateStr]) return this.records[dateStr];

        const parts = dateStr.split('-');
        if (parts.length === 3) {
            const normalized = `${parseInt(parts[0], 10)}-${parseInt(parts[1], 10)}-${parts[2]}`;
            if (this.records[normalized]) return this.records[normalized];
            const padded = `${String(parts[0]).padStart(2, '0')}-${String(parts[1]).padStart(2, '0')}-${parts[2]}`;
            if (this.records[padded]) return this.records[padded];
        }

        return {};
    }

    // Get aggregated records across an array of dates (used for Bill Generation)
    getDateRangeAggregates(datesArray) {
        const aggregates = {};
        const allNamesFound = new Set();

        datesArray.forEach(dateStr => {
            const dayData = this.getDateRecords(dateStr);
            Object.keys(dayData).forEach(nameKey => {
                const personData = dayData[nameKey];
                let actualName = nameKey;

                Object.keys(personData).forEach(session => {
                    if (personData[session] && personData[session].name) {
                        actualName = personData[session].name;
                    }
                });

                allNamesFound.add(actualName);

                if (!aggregates[actualName]) {
                    aggregates[actualName] = { kg: 0, takaMain: 0, count: 0 };
                }

                Object.keys(personData).forEach(session => {
                    const sData = personData[session];
                    if (sData && sData.kg !== undefined && sData.total !== undefined) {
                        aggregates[actualName].kg += parseFloat(sData.kg) || 0;
                        aggregates[actualName].takaMain += parseFloat(sData.total) || 0;
                        aggregates[actualName].count++;
                    }
                });
            });
        });

        return { aggregates, names: Array.from(allNamesFound) };
    }

    // Set/Update single entry in DB and cache
    async saveEntry(dateStr, nameKey, session, entryData) {
        const entryRef = ref(this.database, `records/${dateStr}/${nameKey}/${session}`);
        await set(entryRef, entryData);

        // Update local cache
        if (!this.records[dateStr]) this.records[dateStr] = {};
        if (!this.records[dateStr][nameKey]) this.records[dateStr][nameKey] = {};
        this.records[dateStr][nameKey][session] = entryData;

        this._notify('ENTRY_SAVED', { dateStr, nameKey, session, entryData });
    }

    // Delete single entry from DB and cache
    async deleteEntry(dateStr, nameKey, session) {
        const entryRef = ref(this.database, `records/${dateStr}/${nameKey}/${session}`);
        await remove(entryRef);

        if (this.records[dateStr] && this.records[dateStr][nameKey]) {
            delete this.records[dateStr][nameKey][session];
            if (Object.keys(this.records[dateStr][nameKey]).length === 0) {
                delete this.records[dateStr][nameKey];
            }
        }

        this._notify('ENTRY_DELETED', { dateStr, nameKey, session });
    }

    // Initialize all core data
    async init() {
        await Promise.all([this.loadRate(), this.loadNames()]);
        return this.fetchAllRecords();
    }
}

// Global singleton instance
window.DairyStore = new DairyDataStore();
window.DairyStore.init();
export default window.DairyStore;
