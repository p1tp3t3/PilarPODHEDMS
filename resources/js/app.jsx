import '../css/app.css';
import './bootstrap';

import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { ThemeModeProvider } from './context-provider/theme-mode-provider';

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
    progress: {
        color: '#4B5563',
    },
});
