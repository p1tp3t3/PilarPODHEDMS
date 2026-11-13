import '../css/app.css';
import './bootstrap';

import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { ThemeModeProvider } from './context-provider/theme-mode-provider';
import InstallAppPrompt, { installPopupAllowed } from './Components/other/install-app-prompt';

// "Add to Home Screen": keep the browser's install offer for the popup's
// Install button (install-app-prompt.jsx); it can arrive before React has
// mounted. Only held back when the popup will show, otherwise the browser
// offers it the usual way. (Chrome then logs "Banner not shown:
// beforeinstallpromptevent.preventDefault() called": expected, the popup
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
                <InstallAppPrompt />
            </ThemeModeProvider>
        );

        window.Echo.channel('maintenance').listen('MaintenanceModeToggled', () => {
            router.reload();
        });
    },
    progress: {
        color: '#4B5563',
    },
});
