// ============================================================
// DAIRY APP - CLIENT-SIDE SPA HASH ROUTER
// Seamless instantaneous view transitions with zero reloads
// ============================================================

import { activateAllMembersView } from './views/allMembersView.js';
import { activateGenerateBillView } from './views/generateBillView.js';
import { activateFixDataView } from './views/fixDataView.js';
import { activateStorageView } from './views/storageView.js';
import { activateWeatherView, initTopbarWeather } from './views/weatherView.js';
import { activateThemesView, initTheme } from './views/themesView.js';

const routes = {
    '': 'view-dashboard',
    '#': 'view-dashboard',
    '#/': 'view-dashboard',
    '#/dashboard': 'view-dashboard',
    '#/all-members': 'view-all-members',
    '#/generate-bill': 'view-generate-bill',
    '#/storage': 'view-storage',
    '#/fix-data': 'view-fix-data',
    '#/weather': 'view-weather',
    '#/themes': 'view-themes'
};

class DairyRouter {
    constructor() {
        this.currentRoute = '';
        this.init();
    }

    init() {
        // Listen to hash change and popstate events
        window.addEventListener('hashchange', () => this.handleRoute());
        window.addEventListener('popstate', () => this.handleRoute());

        // Wire back button
        const backBtn = document.getElementById('navBackBtn');
        if (backBtn) {
            backBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigate('#/dashboard');
            });
        }

        // Wire brand logo to dashboard
        const brandLogo = document.querySelector('.navbar-brand');
        if (brandLogo) {
            brandLogo.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigate('#/dashboard');
            });
        }

        // Intercept sidebar links for internal routing
        this.setupSidebarInterception();

        // Initialize topbar weather widget and theme
        initTopbarWeather();
        initTheme();

        // Initial route resolution
        this.handleRoute();
    }

    setupSidebarInterception() {
        document.querySelectorAll('.sidebar-list a').forEach(link => {
            const href = link.getAttribute('href');
            if (!href) return;

            // Route mapping for hash routes or legacy .html paths
            let targetHash = null;
            if (href.startsWith('#/')) {
                targetHash = href;
            } else if (href.includes('all_member.html')) targetHash = '#/all-members';
            else if (href.includes('generate_bill.html')) targetHash = '#/generate-bill';
            else if (href.includes('storage_page.html')) targetHash = '#/storage';
            else if (href.includes('fix_data.html')) targetHash = '#/fix-data';
            else if (href.includes('weather.html')) targetHash = '#/weather';

            if (targetHash) {
                link.setAttribute('href', targetHash);
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.closeSidebar();
                    this.navigate(targetHash);
                });
            } else {
                link.addEventListener('click', () => {
                    this.closeSidebar();
                });
            }
        });

        // Tapping sidebar header brand/logo also returns to dashboard and closes sidebar
        const sidebarBrand = document.querySelector('.sidebar .title-left');
        if (sidebarBrand) {
            sidebarBrand.style.cursor = 'pointer';
            sidebarBrand.addEventListener('click', () => {
                this.closeSidebar();
                this.navigate('#/dashboard');
            });
        }
    }

    closeSidebar() {
        if (typeof window.closeSidebar === 'function') {
            window.closeSidebar();
        } else {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebarOverlay');
            if (sidebar) sidebar.classList.remove('open');
            if (overlay) overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    navigate(targetHash) {
        if (window.location.hash === targetHash) {
            this.handleRoute();
        } else {
            window.location.hash = targetHash;
        }
    }

    handleRoute() {
        const rawHash = window.location.hash || '#/dashboard';
        const cleanHash = rawHash.split('?')[0].toLowerCase();
        const viewId = routes[cleanHash] || 'view-dashboard';

        this.currentRoute = cleanHash;

        // Dismiss sidebar whenever route changes
        this.closeSidebar();

        // Hide all views, show active view
        document.querySelectorAll('.app-view').forEach(view => {
            if (view.id === viewId) {
                view.classList.add('active');
            } else {
                view.classList.remove('active');
            }
        });

        // Toggle Topbar: Dashboard shows live clock, subviews show Back button
        const datetimeEl = document.getElementById('datetime');
        const backBtnEl = document.getElementById('navBackBtn');

        if (viewId === 'view-dashboard') {
            if (datetimeEl) datetimeEl.style.display = '';
            if (backBtnEl) backBtnEl.style.display = 'none';
        } else {
            if (datetimeEl) datetimeEl.style.display = 'none';
            if (backBtnEl) backBtnEl.style.display = 'inline-flex';
        }

        // Update active class in sidebar
        this.updateSidebarActive(cleanHash);

        // Scroll smoothly to top
        window.scrollTo({ top: 0, behavior: 'instant' });

        // Trigger view activation
        this.activateView(viewId, rawHash);
    }

    updateSidebarActive(cleanHash) {
        document.querySelectorAll('.sidebar-list li a').forEach(a => {
            const href = a.getAttribute('href');
            if (href === cleanHash) {
                a.classList.add('active');
                a.parentElement.classList.add('active');
            } else {
                a.classList.remove('active');
                a.parentElement.classList.remove('active');
            }
        });
    }

    activateView(viewId, rawHash) {
        try {
            switch (viewId) {
                case 'view-dashboard':
                    // Refresh dashboard daily records if needed
                    if (window.renderDashboardDailyRecords) {
                        window.renderDashboardDailyRecords();
                    }
                    if (window.updateCalculationResults) {
                        window.updateCalculationResults();
                    }
                    break;
                case 'view-all-members':
                    activateAllMembersView();
                    break;
                case 'view-generate-bill':
                    activateGenerateBillView();
                    break;
                case 'view-storage':
                    activateStorageView();
                    break;
                case 'view-fix-data':
                    activateFixDataView();
                    break;
                case 'view-weather':
                    activateWeatherView();
                    break;
                case 'view-themes':
                    activateThemesView();
                    break;
            }
        } catch (e) {
            console.error('Error activating view:', viewId, e);
        }
    }
}

// Instantiate and expose globally
window.router = new DairyRouter();
export default window.router;
