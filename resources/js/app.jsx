import '../css/app.css';
import './bootstrap';

import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { ThemeModeProvider } from './context-provider/theme-mode-provider';
import { installPopupAllowed } from './Components/other/install-app-prompt';

// "Add to Home Screen": keep the browser's install offer for the header
// button's Install (install-app-prompt.jsx); it can arrive before React has
// mounted. (Chrome then logs "Banner not shown:
// beforeinstallpromptevent.preventDefault() called": expected, the panel
// calls prompt() when Install is clicked.)
window.addEventListener('beforeinstallprompt', (e) => {
    if (!installPopupAllowed()) return;
    e.preventDefault();
    window.__installPromptEvent = e;
    window.dispatchEvent(new Event('install-prompt-ready'));
});

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.jsx`,
            import.meta.glob('./Pages/**/*.jsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <ThemeModeProvider>
                <App {...props} />
            </ThemeModeProvider>
        );

        window.Echo.channel('maintenance').listen('MaintenanceModeToggled', () => {
            router.reload();
        });
    },
    // Page-loading line along the top: the sidebar's navy (#1e3a8a), from
    // the app's own blues and still visible over the blue header.
    progress: {
        color: '#1e3a8a',
        delay: 150,
    },
});
