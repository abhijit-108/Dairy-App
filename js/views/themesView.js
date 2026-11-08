// ==========================================================================
// DAIRY APP - THEMES VIEW CONTROLLER
// Dual Liquid Glass Suite: Midnight Sapphire (Dark) & Arctic Glacier (Light)
// With Seamless System Dark / Light Mode Auto-Adaptation
// ==========================================================================

export const THEMES = [
    {
        id: 'dark-ocean',
        name: 'Midnight Sapphire',
        mode: 'dark',
        badge: 'Dark',
        desc: 'Deep oceanic abyss with radiant electric cyan and sapphire azure glass.',
        accentColor: '#38bdf8',
        swatches: ['#0284c7', '#38bdf8', '#0a2540', '#030a14']
    },
    {
        id: 'light-azure',
        name: 'Arctic Glacier',
        mode: 'light',
        badge: 'Light',
        desc: 'Crisp glacier ice with deep ocean azure accents and pristine frosted surfaces.',
        accentColor: '#0284c7',
        swatches: ['#0284c7', '#0ea5e9', '#e0f2fe', '#ffffff']
    }
];

/**
 * Returns raw user preference: 'auto', 'dark-ocean', or 'light-azure'
 */
export function getUserThemePreference() {
    try {
        const saved = localStorage.getItem('dairy_app_theme');
        if (saved === 'dark-ocean' || saved === 'light-azure' || saved === 'auto') {
            return saved;
        }
        // Migrate legacy/default to 'auto'
        return 'auto';
    } catch (e) {
        return 'auto';
    }
}

/**
 * Detects current system OS dark mode preference
 */
export function getSystemPreferredTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark-ocean';
    }
    // If system is in light mode
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'light-azure';
    }
    // Fallback default
    return 'dark-ocean';
}

/**
 * Resolves the active theme ID ('dark-ocean' or 'light-azure')
 */
export function getEffectiveThemeId() {
    const pref = getUserThemePreference();
    if (pref === 'dark-ocean' || pref === 'light-azure') {
        return pref;
    }
    return getSystemPreferredTheme();
}

/**
 * Applies a theme or auto mode
 * @param {'auto'|'dark-ocean'|'light-azure'} themeChoice
 */
export function applyTheme(themeChoice) {
    const validChoices = ['auto', 'dark-ocean', 'light-azure'];
    const choice = validChoices.includes(themeChoice) ? themeChoice : 'auto';

    try {
        localStorage.setItem('dairy_app_theme', choice);
    } catch (e) {}

    const effectiveTheme = (choice === 'auto') ? getSystemPreferredTheme() : choice;

    document.documentElement.setAttribute('data-theme', effectiveTheme);
    if (document.body) {
        document.body.setAttribute('data-theme', effectiveTheme);
    }

    // Update meta theme-color for mobile address bars
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
        metaThemeColor.setAttribute('content', effectiveTheme === 'dark-ocean' ? '#040e1c' : '#e0f2fe');
    }

    // Re-render UI cards if Theme Studio is visible
    updateThemesUI();

    // Feedback Toast
    if (window.showToast) {
        if (choice === 'auto') {
            const modeName = effectiveTheme === 'dark-ocean' ? 'Dark' : 'Light';
            window.showToast(`Auto Adapt Enabled (System: ${modeName})`);
        } else {
            const matched = THEMES.find(t => t.id === choice);
            if (matched) {
                window.showToast(`Applied ${matched.name} Theme`);
            }
        }
    }
}

/**
 * Real-time listener for OS system theme changes
 */
let systemListenerBound = false;
export function setupSystemThemeListener() {
    if (systemListenerBound) return;
    if (window.matchMedia) {
        const mql = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e) => {
            const currentPref = getUserThemePreference();
            if (currentPref === 'auto') {
                const newEffective = e.matches ? 'dark-ocean' : 'light-azure';
                document.documentElement.setAttribute('data-theme', newEffective);
                if (document.body) {
                    document.body.setAttribute('data-theme', newEffective);
                }
                const metaThemeColor = document.querySelector('meta[name="theme-color"]');
                if (metaThemeColor) {
                    metaThemeColor.setAttribute('content', newEffective === 'dark-ocean' ? '#040e1c' : '#e0f2fe');
                }
                updateThemesUI();
                if (window.showToast) {
                    window.showToast(`Auto Adapted to System (${e.matches ? 'Dark' : 'Light'})`);
                }
            }
        };

        if (mql.addEventListener) {
            mql.addEventListener('change', handleChange);
        } else if (mql.addListener) {
            mql.addListener(handleChange);
        }
        systemListenerBound = true;
    }
}

/**
 * Initializes theme on app boot
 */
export function initTheme() {
    setupSystemThemeListener();
    const pref = getUserThemePreference();
    const effective = (pref === 'auto') ? getSystemPreferredTheme() : pref;

    document.documentElement.setAttribute('data-theme', effective);
    if (document.body) {
        document.body.setAttribute('data-theme', effective);
    }
}

// Auto-run on script load
initTheme();

/**
 * Updates DOM cards in Theme Studio view without full rerender
 */
function updateThemesUI() {
    const container = document.getElementById('view-themes');
    if (!container) return;

    const pref = getUserThemePreference();
    const effective = getEffectiveThemeId();

    // Auto card
    const autoCard = container.querySelector('#themeAutoCard');
    const autoBtn = container.querySelector('#themeAutoBtn');
    const autoBadge = container.querySelector('#themeAutoBadge');
    if (autoCard) {
        if (pref === 'auto') {
            autoCard.classList.add('active');
            if (autoBtn) autoBtn.innerHTML = "<i class='bx bx-check-circle'></i> Auto Mode Active";
            if (autoBadge) {
                autoBadge.className = 'theme-auto-badge badge-active';
                autoBadge.textContent = `Active (${effective === 'dark-ocean' ? 'Dark Mode' : 'Light Mode'})`;
            }
        } else {
            autoCard.classList.remove('active');
            if (autoBtn) autoBtn.innerHTML = "<i class='bx bx-sync'></i> Enable Auto Adapt";
            if (autoBadge) {
                autoBadge.className = 'theme-auto-badge badge-inactive';
                autoBadge.textContent = 'Manual Override';
            }
        }
    }

    // Theme cards
    container.querySelectorAll('.theme-card').forEach(card => {
        const cardTheme = card.dataset.theme;
        const btn = card.querySelector('.theme-btn-select');
        if (pref === cardTheme) {
            card.classList.add('active');
            if (btn) btn.innerHTML = "<i class='bx bx-check-circle'></i> Active Theme";
        } else if (pref === 'auto' && effective === cardTheme) {
            card.classList.add('active');
            if (btn) btn.innerHTML = "<i class='bx bx-laptop'></i> Active via Auto";
        } else {
            card.classList.remove('active');
            if (btn) btn.innerHTML = "Apply Theme";
        }
    });
}

/**
 * Renders the Theme Studio view
 */
export function renderThemesView() {
    const container = document.getElementById('view-themes');
    if (!container) return;

    const pref = getUserThemePreference();
    const effective = getEffectiveThemeId();
    const isAuto = pref === 'auto';

    container.innerHTML = `
        <div class="themes-container">
            <div class="view-header-banner">
                <div class="header-icon-wrap">
                    <i class='bx bx-palette'></i>
                </div>
                <div>
                    <h2>Theme Studio</h2>
                    <p>Experience Kangsabati in Midnight Sapphire or Arctic Glacier, or auto-adapt to your device.</p>
                </div>
            </div>

            <!-- Auto Adapt Hero Card -->
            <div class="theme-auto-card ${isAuto ? 'active' : ''}" id="themeAutoCard" title="Sync app theme with your operating system">
                <div class="theme-auto-left">
                    <div class="theme-auto-icon-badge">
                        <i class='bx bx-sun-moon'></i>
                    </div>
                    <div class="theme-auto-title-wrap">
                        <h3>
                            <span>Auto Adapt to System</span>
                            <span class="theme-auto-badge ${isAuto ? 'badge-active' : 'badge-inactive'}" id="themeAutoBadge">
                                ${isAuto ? `Active (${effective === 'dark-ocean' ? 'Dark Mode' : 'Light Mode'})` : 'Manual Override'}
                            </span>
                        </h3>
                        <p>Automatically switches between Midnight Sapphire at night and Arctic Glacier in daylight.</p>
                    </div>
                </div>
                <div class="theme-auto-right">
                    <button class="theme-auto-btn" id="themeAutoBtn" aria-label="Toggle Auto Adapt">
                        ${isAuto ? "<i class='bx bx-check-circle'></i> Auto Mode Active" : "<i class='bx bx-sync'></i> Enable Auto Adapt"}
                    </button>
                </div>
            </div>

            <!-- Two Dual Themes Grid -->
            <div class="themes-grid-pair">
                ${THEMES.map(t => {
                    const isDirectActive = pref === t.id;
                    const isAutoActive = isAuto && effective === t.id;
                    const isCardActive = isDirectActive || isAutoActive;

                    let btnLabel = "Apply Theme";
                    if (isDirectActive) {
                        btnLabel = "<i class='bx bx-check-circle'></i> Active Theme";
                    } else if (isAutoActive) {
                        btnLabel = "<i class='bx bx-laptop'></i> Active via Auto";
                    }

                    return `
                        <div class="theme-card ${isCardActive ? 'active' : ''}" data-theme="${t.id}">
                            <div class="theme-card-header">
                                <div class="theme-name">
                                    <span>${t.name}</span>
                                </div>
                                <span class="theme-mode-pill">${t.badge}</span>
                            </div>
                            <div class="theme-desc">${t.desc}</div>
                            <div class="theme-palette-preview">
                                ${t.swatches.map(col => `
                                    <span class="swatch-circle" style="background: ${col};" title="${col}"></span>
                                `).join('')}
                                <div class="swatch-label-wrap">
                                    <span class="swatch-accent-label">${t.name}</span>
                                    <span class="swatch-mood-label">${t.mode === 'dark' ? 'Liquid Dark' : 'Frosted Light'}</span>
                                </div>
                            </div>
                            <div class="theme-card-footer">
                                <button class="theme-btn-select" aria-label="Select ${t.name}">
                                    ${btnLabel}
                                </button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;

    // Wire Auto button click
    const autoCard = container.querySelector('#themeAutoCard');
    if (autoCard) {
        autoCard.addEventListener('click', (e) => {
            applyTheme('auto');
        });
    }

    // Wire card clicks
    container.querySelectorAll('.theme-card').forEach(card => {
        card.addEventListener('click', (e) => {
            e.stopPropagation();
            const themeId = card.dataset.theme;
            if (themeId) {
                applyTheme(themeId);
            }
        });
    });
}

export function activateThemesView() {
    renderThemesView();
}

window.themesView = {
    init: initTheme,
    activate: activateThemesView,
    apply: applyTheme,
    getPreference: getUserThemePreference,
    getEffective: getEffectiveThemeId,
    list: THEMES
};
