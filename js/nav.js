// ============================================================
// UNIFIED LIQUID GLASS NAVIGATION & SIDEBAR SCRIPT
// ============================================================
(function () {
    function initNav() {
        const sidebar = document.getElementById('sidebar');
        const sidebarOverlay = document.getElementById('sidebarOverlay');
        const menuBtn = document.querySelector('.menu-btn') || document.getElementById('menuBtn');
        const sidebarClose = document.getElementById('sidebarClose');

        if (!sidebar) return;

        function openSidebar() {
            sidebar.classList.add('open');
            if (sidebarOverlay) sidebarOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function closeSidebar() {
            sidebar.classList.remove('open');
            if (sidebarOverlay) sidebarOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }

        window.closeSidebar = closeSidebar;
        window.openSidebar = openSidebar;

        // Dismiss sidebar whenever any link in the sidebar is tapped
        const sidebarLinksAll = sidebar.querySelectorAll('.sidebar-list a');
        sidebarLinksAll.forEach(link => {
            link.addEventListener('click', () => {
                closeSidebar();
            });
        });

        if (menuBtn) {
            menuBtn.removeEventListener('click', openSidebar);
            menuBtn.addEventListener('click', openSidebar);
        }
        if (sidebarClose) {
            sidebarClose.removeEventListener('click', closeSidebar);
            sidebarClose.addEventListener('click', closeSidebar);
        }
        if (sidebarOverlay) {
            sidebarOverlay.removeEventListener('click', closeSidebar);
            sidebarOverlay.addEventListener('click', closeSidebar);
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && sidebar.classList.contains('open')) {
                closeSidebar();
            }
        });

        // Set active state on current page link
        const currentPath = window.location.pathname.split('/').pop().toLowerCase() || 'index.html';
        const sidebarLinks = sidebar.querySelectorAll('.sidebar-list a');
        sidebarLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href && !href.startsWith('#/')) {
                const linkFile = href.split('/').pop().toLowerCase();
                if (linkFile === currentPath || (currentPath === '' && linkFile === 'index.html')) {
                    link.classList.add('active');
                } else if (!link.classList.contains('logout-link')) {
                    link.classList.remove('active');
                }
            }
        });

        // Rate pill in sidebar is synced by DairyStore; ensure fallback rate display
        const fixRateEl = document.getElementById('fix_rate1');
        if (fixRateEl && window.DairyStore && window.DairyStore.currentRate) {
            fixRateEl.innerHTML = `<i class='bx bx-coin-stack'></i> Current Rate : ${window.DairyStore.currentRate.toFixed(2)}`;
        }

        // Global logout helper if not already defined
        if (!window.logout) {
            window.logout = function () {
                try {
                    const theme = localStorage.getItem('dairy_app_theme');
                    localStorage.clear();
                    sessionStorage.clear();
                    if (theme) localStorage.setItem('dairy_app_theme', theme);
                } catch (e) {}
                window.location.href = 'login.html';
            };
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNav);
    } else {
        initNav();
    }
})();
