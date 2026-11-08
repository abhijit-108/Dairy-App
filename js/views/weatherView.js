// ============================================================
// WEATHER VIEW CONTROLLER (SPA)
// OpenWeatherMap API with Modern Responsive Dashboard Architecture
// Hero Showcase, Hourly Timeline, 2x2 Bento Metrics, 5-Day Outlook
// ============================================================

let weatherInitialized = false;

const API_KEY = "593f4ef9191064d8ed02a7374a33132d";
const GEO = q => `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(q)}&limit=1&appid=${API_KEY}`;
const CURR = (lat, lon) => `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
const FORE = (lat, lon) => `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
const ICON = c => `https://openweathermap.org/img/wn/${c}@2x.png`;

let tzOffsetSec = 19800; // India default UTC+5:30
let clockTimer = null;

export function initWeatherView() {
    setupWeatherEventListeners();
    startLiveClock();
    // Default location: Baliarpur
    loadWeatherCoords(23.74, 86.53, "Baliarpur");
    weatherInitialized = true;
}

export function activateWeatherView() {
    if (!weatherInitialized) {
        initWeatherView();
    } else {
        updateLiveClock();
    }
}

function setupWeatherEventListeners() {
    const searchBtn = document.getElementById('weatherSearchBtn');
    const geoBtn = document.getElementById('weatherGeoBtn');
    const input = document.getElementById('weatherCityInput');
    const quickChips = document.getElementById('weatherQuickChips');

    if (searchBtn) searchBtn.addEventListener('click', searchWeatherCity);
    if (input) {
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter') searchWeatherCity();
        });
    }
    if (geoBtn) geoBtn.addEventListener('click', getCurrentLocationWeather);

    if (quickChips) {
        quickChips.addEventListener('click', e => {
            const chip = e.target.closest('.weather-chip');
            if (!chip) return;
            quickChips.querySelectorAll('.weather-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            const city = chip.dataset.city;
            if (city) {
                if (input) input.value = city;
                searchWeatherCityWithQuery(city);
            }
        });
    }
}

function startLiveClock() {
    if (clockTimer) clearInterval(clockTimer);
    updateLiveClock();
    clockTimer = setInterval(updateLiveClock, 1000);
}

function updateLiveClock() {
    const nowUtc = Date.now() + new Date().getTimezoneOffset() * 60000;
    const loc = new Date(nowUtc + tzOffsetSec * 1000);

    const timeEl = document.getElementById('weatherLiveTime');
    const dateEl = document.getElementById('weatherLiveDate');

    if (timeEl) {
        timeEl.textContent = loc.toLocaleTimeString('en-US', { hour12: false });
    }
    if (dateEl) {
        dateEl.textContent = loc.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    }
}

async function searchWeatherCity() {
    const input = document.getElementById('weatherCityInput');
    const q = input?.value?.trim();
    if (!q) return;
    searchWeatherCityWithQuery(q);
}

export async function searchWeatherCityWithQuery(q) {
    if (!q) return;
    setStatus('Searching ' + q + '...');
    try {
        const res = await fetch(GEO(q));
        const data = await res.json();
        if (!data || !data.length) {
            setStatus('City not found. Try another location.');
            setTimeout(() => setStatus(''), 4000);
            return;
        }
        const { lat, lon, name, country } = data[0];
        loadWeatherCoords(lat, lon, `${name}, ${country}`);
    } catch (e) {
        console.error('Weather search error:', e);
        setStatus('Error searching city');
        setTimeout(() => setStatus(''), 4000);
    }
}

function getCurrentLocationWeather() {
    if (!navigator.geolocation) {
        setStatus('Geolocation not supported');
        setTimeout(() => setStatus(''), 3000);
        return;
    }
    setStatus('Detecting location...');
    navigator.geolocation.getCurrentPosition(
        pos => {
            loadWeatherCoords(pos.coords.latitude, pos.coords.longitude, 'My Location');
        },
        err => {
            console.warn('Geolocation error:', err);
            setStatus('Location access denied');
            setTimeout(() => setStatus(''), 3000);
        }
    );
}

async function loadWeatherCoords(lat, lon, label) {
    setStatus('Fetching live weather...');
    try {
        const [cRes, fRes] = await Promise.all([
            fetch(CURR(lat, lon)),
            fetch(FORE(lat, lon))
        ]);

        const cData = await cRes.json();
        const fData = await fRes.json();

        tzOffsetSec = cData.timezone ?? 19800;

        const nameEl = document.getElementById('weatherCityName');
        if (nameEl) nameEl.textContent = label || cData.name;

        renderCurrentWeather(cData, fData);
        renderHourlyForecast(fData);
        renderDailyForecast(fData);

        // Keep topbar widget synced with latest weather data
        updateTopbarWeatherWidget(cData.main?.temp, cData.weather?.[0]?.icon, cData.weather?.[0]);

        setStatus('');
        const updatedTimeEl = document.getElementById('weatherUpdatedTime');
        if (updatedTimeEl) {
            updatedTimeEl.textContent = 'Updated: ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        }
    } catch (e) {
        console.error('Weather fetch error:', e);
        setStatus('Failed to load weather data');
        setTimeout(() => setStatus(''), 4000);
    }
}

function renderCurrentWeather(cData, fData) {
    // 1. Hero Temperature & Condition
    const heroTempEl = document.getElementById('weatherHeroTemp');
    const heroDescEl = document.getElementById('weatherHeroDesc');
    const heroIconEl = document.getElementById('weatherHeroIcon');

    const currTemp = Math.round(cData.main?.temp ?? 0);
    const condText = formatWeatherCondition(cData.weather?.[0]);
    const iconCode = cData.weather?.[0]?.icon || '01d';

    if (heroTempEl) heroTempEl.textContent = currTemp;
    if (heroDescEl) heroDescEl.textContent = condText;
    if (heroIconEl) {
        heroIconEl.src = ICON(iconCode);
        heroIconEl.alt = condText;
    }

    // 2. High & Low Range for Today
    let todayMax = cData.main?.temp_max ?? currTemp;
    let todayMin = cData.main?.temp_min ?? currTemp;

    if (fData && fData.list && fData.list.length > 0) {
        const todayKey = new Date((fData.list[0].dt + tzOffsetSec) * 1000).toISOString().split('T')[0];
        const todayItems = fData.list.filter(item => {
            const k = new Date((item.dt + tzOffsetSec) * 1000).toISOString().split('T')[0];
            return k === todayKey;
        });
        if (todayItems.length > 0) {
            const allTemps = [currTemp, ...todayItems.map(i => i.main.temp)];
            todayMax = Math.max(...allTemps);
            todayMin = Math.min(...allTemps);
        }
    }

    const maxEl = document.getElementById('weatherTempMax');
    const minEl = document.getElementById('weatherTempMin');
    if (maxEl) maxEl.textContent = `${Math.round(todayMax)}°`;
    if (minEl) minEl.textContent = `${Math.round(todayMin)}°`;

    // 3. Bento Metric Tiles
    const feelEl = document.getElementById('weatherFeel');
    const feelDescEl = document.getElementById('weatherFeelDesc');
    const humEl = document.getElementById('weatherHum');
    const humDescEl = document.getElementById('weatherHumDesc');
    const windEl = document.getElementById('weatherWind');
    const windDescEl = document.getElementById('weatherWindDesc');
    const popEl = document.getElementById('weatherPop');
    const popDescEl = document.getElementById('weatherPopDesc');

    // Feels Like
    const feelsLike = Math.round(cData.main?.feels_like ?? currTemp);
    if (feelEl) feelEl.textContent = `${feelsLike}°C`;
    if (feelDescEl) {
        const diff = feelsLike - currTemp;
        if (Math.abs(diff) <= 1) feelDescEl.textContent = "Similar to actual temp";
        else if (diff > 1) feelDescEl.textContent = `Feels +${diff}°C warmer`;
        else feelDescEl.textContent = `Feels ${Math.abs(diff)}°C cooler`;
    }

    // Humidity
    const hum = cData.main?.humidity ?? 50;
    if (humEl) humEl.textContent = `${hum}%`;
    if (humDescEl) {
        if (hum < 35) humDescEl.textContent = "Dry air conditions";
        else if (hum <= 65) humDescEl.textContent = "Comfortable humidity";
        else humDescEl.textContent = "High air moisture";
    }

    // Wind Speed
    const windKmh = Math.round((cData.wind?.speed ?? 0) * 3.6);
    if (windEl) windEl.textContent = `${windKmh} km/h`;
    if (windDescEl) {
        if (windKmh < 10) windDescEl.textContent = "Calm gentle breeze";
        else if (windKmh <= 25) windDescEl.textContent = "Moderate airflow";
        else windDescEl.textContent = "Brisk gusty wind";
    }

    // Precipitation Chance
    const pop = fData && fData.list && fData.list[0] && fData.list[0].pop ? Math.round(fData.list[0].pop * 100) : 0;
    if (popEl) popEl.textContent = `${pop}%`;
    if (popDescEl) {
        if (pop === 0) popDescEl.textContent = "No rain expected";
        else if (pop < 30) popDescEl.textContent = "Slight shower risk";
        else if (pop < 70) popDescEl.textContent = "Scattered showers";
        else popDescEl.textContent = "High rain probability";
    }
}

function renderHourlyForecast(fData) {
    const cardsEl = document.getElementById('weatherHourCards');
    if (!cardsEl || !fData || !fData.list) return;

    cardsEl.innerHTML = '';
    const nextHours = fData.list.slice(0, 8); // next 24 hours

    nextHours.forEach((item, index) => {
        const dt = new Date((item.dt + tzOffsetSec) * 1000);
        let timeStr;
        if (index === 0) {
            timeStr = "Now";
        } else {
            let h = dt.getUTCHours();
            const ampm = h >= 12 ? 'PM' : 'AM';
            h = h % 12 || 12;
            timeStr = `${h} ${ampm}`;
        }

        const temp = Math.round(item.main.temp);
        const iconCode = item.weather[0]?.icon || '01d';
        const pop = item.pop ? Math.round(item.pop * 100) : 0;
        const isCurrent = index === 0;

        const pill = document.createElement('div');
        pill.className = `hourly-pill ${isCurrent ? 'current-hour' : ''}`;
        pill.innerHTML = `
            <span class="hourly-time">${timeStr}</span>
            <div class="hourly-icon-wrap">
                <img src="${ICON(iconCode)}" alt="${item.weather[0]?.main || 'Weather'}" class="hourly-icon">
            </div>
            <span class="hourly-temp">${temp}°</span>
            ${pop > 15 ? `<span class="hourly-pop"><i class='bx bx-droplet'></i>${pop}%</span>` : ''}
        `;
        cardsEl.appendChild(pill);
    });
}

function renderDailyForecast(fData) {
    const futureEl = document.getElementById('weatherFutureCards');
    if (!futureEl || !fData || !fData.list) return;

    futureEl.innerHTML = '';
    const dailyMap = {};

    fData.list.forEach(item => {
        const dt = new Date((item.dt + tzOffsetSec) * 1000);
        const dateKey = dt.toISOString().split('T')[0];
        if (!dailyMap[dateKey]) {
            dailyMap[dateKey] = [];
        }
        dailyMap[dateKey].push(item);
    });

    const days = Object.keys(dailyMap).slice(0, 5); // 5 distinct days
    if (days.length === 0) return;

    // Find weekly global min and max to proportionally scale the temperature range bar
    let allMin = Infinity;
    let allMax = -Infinity;
    days.forEach(k => {
        dailyMap[k].forEach(i => {
            if (i.main.temp < allMin) allMin = i.main.temp;
            if (i.main.temp > allMax) allMax = i.main.temp;
        });
    });
    allMin = Math.round(allMin);
    allMax = Math.round(allMax);
    const overallSpan = Math.max(allMax - allMin, 1);

    days.forEach((dayKey, index) => {
        const items = dailyMap[dayKey];
        const midItem = items[Math.floor(items.length / 2)] || items[0];
        const dayDate = new Date(dayKey + 'T00:00:00');
        const isToday = index === 0;
        const dayName = isToday ? 'Today' : dayDate.toLocaleDateString('en-US', { weekday: 'short' });
        const dateStr = dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        const temps = items.map(i => i.main.temp);
        const maxTemp = Math.round(Math.max(...temps));
        const minTemp = Math.round(Math.min(...temps));
        const iconCode = midItem.weather[0]?.icon || '01d';
        const condText = formatWeatherCondition(midItem.weather[0]);

        // Calculate bar fill position
        const leftPct = Math.max(0, Math.min(100, Math.round(((minTemp - allMin) / overallSpan) * 100)));
        const rightPct = Math.max(0, Math.min(100, Math.round(((maxTemp - allMin) / overallSpan) * 100)));
        const widthPct = Math.max(rightPct - leftPct, 14);

        const row = document.createElement('div');
        row.className = `daily-row ${isToday ? 'daily-row-today' : ''}`;
        row.innerHTML = `
            <div class="daily-col-day">
                <span class="daily-day-title">${dayName}</span>
                <span class="daily-date-sub">${dateStr}</span>
            </div>
            <div class="daily-col-condition">
                <img src="${ICON(iconCode)}" class="daily-icon" alt="${condText}">
                <span class="daily-desc">${condText}</span>
            </div>
            <div class="daily-col-range">
                <span class="daily-min-temp">${minTemp}°</span>
                <div class="daily-range-bar">
                    <div class="daily-range-fill" style="left: ${leftPct}%; width: ${widthPct}%;"></div>
                </div>
                <span class="daily-max-temp">${maxTemp}°</span>
            </div>
        `;
        futureEl.appendChild(row);
    });
}

function setStatus(msg) {
    const statusEl = document.getElementById('weatherStatus');
    if (!statusEl) return;
    if (!msg) {
        statusEl.style.display = 'none';
        statusEl.textContent = '';
    } else {
        statusEl.style.display = 'flex';
        statusEl.innerHTML = `<i class='bx bx-loader-alt bx-spin'></i> <span>${msg}</span>`;
    }
}

// --- Weather Helpers for Topbar Widget ---
export function getWeatherIconMarkup(iconCode) {
    switch (iconCode) {
        case '01d':
            return '<i class="fa-solid fa-sun" style="color: #f59e0b; filter: drop-shadow(0 0 3px rgba(245, 158, 11, 0.6));"></i>';
        case '01n':
            return '<i class="fa-solid fa-moon" style="color: #38bdf8; filter: drop-shadow(0 0 3px rgba(56, 189, 248, 0.6));"></i>';
        case '02d':
            return '<i class="fa-solid fa-cloud-sun" style="color: #facc15; filter: drop-shadow(0 0 3px rgba(250, 204, 21, 0.5));"></i>';
        case '02n':
            return '<i class="fa-solid fa-cloud-moon" style="color: #7dd3fc; filter: drop-shadow(0 0 3px rgba(125, 211, 252, 0.5));"></i>';
        case '03d':
        case '03n':
        case '04d':
        case '04n':
            return '<i class="fa-solid fa-cloud" style="color: #cbd5e1; filter: drop-shadow(0 0 3px rgba(203, 213, 225, 0.4));"></i>';
        case '09d':
        case '09n':
            return '<i class="fa-solid fa-cloud-rain" style="color: #60a5fa; filter: drop-shadow(0 0 3px rgba(96, 165, 250, 0.5));"></i>';
        case '10d':
        case '10n':
            return '<i class="fa-solid fa-cloud-showers-heavy" style="color: #38bdf8; filter: drop-shadow(0 0 3px rgba(56, 189, 248, 0.5));"></i>';
        case '11d':
        case '11n':
            return '<i class="fa-solid fa-bolt" style="color: #fbbf24; filter: drop-shadow(0 0 4px rgba(251, 191, 36, 0.7));"></i>';
        case '13d':
        case '13n':
            return '<i class="fa-solid fa-snowflake" style="color: #e0f2fe; filter: drop-shadow(0 0 3px rgba(224, 242, 254, 0.6));"></i>';
        case '50d':
        case '50n':
            return '<i class="fa-solid fa-smog" style="color: #c084fc; filter: drop-shadow(0 0 3px rgba(192, 132, 252, 0.5));"></i>';
        default:
            return '<i class="fa-solid fa-cloud" style="color: #38bdf8;"></i>';
    }
}

export function formatWeatherCondition(weather) {
    if (!weather) return 'Clear';
    if (typeof weather === 'string') {
        const lower = weather.toLowerCase().trim();
        if (lower === 'clear sky' || lower === 'clear') return 'Clear Sky';
        if (lower === 'scattered clouds' || lower === 'broken clouds') return 'Cloudy';
        if (lower === 'overcast clouds') return 'Overcast';
        if (lower === 'few clouds') return 'Few Clouds';
        if (lower.includes('thunderstorm')) return 'Thunderstorm';
        if (lower.includes('drizzle')) return 'Drizzle';
        if (lower.includes('rain')) {
            if (lower.includes('light')) return 'Light Rain';
            if (lower.includes('heavy')) return 'Heavy Rain';
            return 'Rain';
        }
        if (lower === 'haze') return 'Haze';
        if (lower === 'mist') return 'Mist';
        if (lower === 'fog') return 'Fog';
        if (lower === 'baliarpur' || lower === 'gobindpur') return 'Clear Sky';
        return lower.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }

    const desc = (weather.description || '').toLowerCase().trim();
    const main = (weather.main || '').trim();

    if (desc === 'clear sky') return 'Clear Sky';
    if (desc === 'scattered clouds' || desc === 'broken clouds') return 'Cloudy';
    if (desc === 'overcast clouds') return 'Overcast';
    if (desc === 'few clouds') return 'Few Clouds';
    if (desc.includes('thunderstorm')) return 'Thunderstorm';
    if (desc.includes('drizzle')) return 'Drizzle';
    if (desc.includes('rain')) {
        if (desc.includes('light')) return 'Light Rain';
        if (desc.includes('heavy')) return 'Heavy Rain';
        return 'Rain';
    }
    if (desc === 'haze') return 'Haze';
    if (desc === 'mist') return 'Mist';
    if (desc === 'fog') return 'Fog';

    if (desc) {
        return desc.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
    return main || 'Clear';
}

// --- Topbar Weather Widget Controller ---
export function updateTopbarWeatherWidget(temp, iconCode, conditionOrWeather, cityName) {
    const tempEl = document.getElementById('topbarWeatherTemp');
    const iconEl = document.getElementById('topbarWeatherIcon');
    const descEl = document.getElementById('topbarWeatherDesc');
    const cityEl = document.getElementById('topbarWeatherCity');
    const widgetEl = document.getElementById('topbarWeatherWidget');

    const conditionText = formatWeatherCondition(conditionOrWeather);

    if (tempEl && temp !== undefined && temp !== null) {
        tempEl.textContent = `${Math.round(temp)}°C`;
    }
    if (iconEl && iconCode) {
        if (iconEl.tagName === 'IMG') {
            iconEl.src = `https://openweathermap.org/img/wn/${iconCode}.png`;
        } else {
            iconEl.innerHTML = getWeatherIconMarkup(iconCode);
        }
    }
    if (descEl) {
        descEl.textContent = conditionText;
    }
    if (cityEl) {
        cityEl.textContent = conditionText;
    }
    if (widgetEl && temp !== undefined) {
        widgetEl.title = `Baliarpur: ${Math.round(temp)}°C, ${conditionText}`;
    }

    try {
        localStorage.setItem('topbar_weather_cache', JSON.stringify({
            temp: Math.round(temp),
            icon: iconCode,
            condition: conditionText,
            time: Date.now()
        }));
    } catch (e) {}
}

export async function fetchTopbarWeather() {
    try {
        const lat = 23.74, lon = 86.53; // Baliarpur default
        const res = await fetch(CURR(lat, lon));
        if (!res.ok) return;
        const data = await res.json();
        const temp = data.main?.temp;
        const icon = data.weather?.[0]?.icon || '01d';
        const weatherObj = data.weather?.[0] || { main: 'Clear', description: 'clear sky' };
        updateTopbarWeatherWidget(temp, icon, weatherObj);
    } catch (err) {
        console.warn('Topbar weather fetch error:', err);
    }
}

export async function initTopbarWeather() {
    // 1. Restore from cache immediately so there's zero delay on reload
    try {
        const cached = JSON.parse(localStorage.getItem('topbar_weather_cache') || 'null');
        if (cached && (Date.now() - cached.time < 30 * 60 * 1000)) {
            updateTopbarWeatherWidget(cached.temp, cached.icon, cached.condition || cached.city);
        }
    } catch (e) {}

    // 2. Fetch latest live weather (display-only badge, non-clickable)
    await fetchTopbarWeather();

    // 3. Refresh every 15 minutes
    setInterval(fetchTopbarWeather, 15 * 60 * 1000);
}

window.weatherView = {
    init: initWeatherView,
    activate: activateWeatherView,
    search: searchWeatherCity,
    searchWithQuery: searchWeatherCityWithQuery,
    initTopbar: initTopbarWeather
};
