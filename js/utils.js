// ============================================================
// DAIRY APP - REUSABLE UTILITIES MODULE
// ============================================================

/**
 * Pads a number to 2 digits with a leading zero.
 */
export function pad2(n) {
    return String(n).padStart(2, '0');
}

/**
 * Formats a Date object into DD-MM-YYYY (matching Firebase RTDB key format).
 */
export function formatRTDBDate(date) {
    return `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
}

/**
 * Formats YYYY-MM-DD input value into DD/MM/YY human preview.
 */
export function formatDDMMYY(ymd) {
    if (!ymd) return '--/--/--';
    const parts = ymd.split('-');
    if (parts.length !== 3) return '--/--/--';
    const [y, m, d] = parts;
    return `${pad2(d)}/${pad2(m)}/${String(y).slice(-2)}`;
}

/**
 * Formats 24h HH:MM string into 12h HH:MM AM/PM preview.
 */
export function formatTime12(hm) {
    if (!hm) return '--:--';
    const parts = hm.split(':').map(x => parseInt(x, 10));
    if (parts.length < 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) return '--:--';
    const [H, M] = parts;
    const ampm = H >= 12 ? 'PM' : 'AM';
    const h12 = (H % 12) || 12;
    return `${pad2(h12)}:${pad2(M)} ${ampm}`;
}

/**
 * Determines milk session from 24h hour.
 */
export function getSessionFromHour(hour) {
    if (hour >= 6 && hour < 10) return "সকাল";
    if (hour >= 10 && hour < 15) return "দুপুর";
    return "সন্ধ্যা";
}

/**
 * Sorting order for sessions (Morning -> Noon -> Evening).
 */
export function sessionOrder(session) {
    if (!session) return 4;
    const s = String(session).toLowerCase();
    if (s.includes('সকাল') || s.includes('morn')) return 1;
    if (s.includes('দুপুর') || s.includes('noon')) return 2;
    if (s.includes('সন্ধ্যা') || s.includes('eve')) return 3;
    return 4;
}

/**
 * Debounce helper to throttle rapid user inputs / filter toggles.
 */
export function debounce(fn, wait = 150) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, args), wait);
    };
}

// Expose on window for non-module scripts
window.DairyUtils = {
    pad2,
    formatRTDBDate,
    formatDDMMYY,
    formatTime12,
    getSessionFromHour,
    sessionOrder,
    debounce
};
