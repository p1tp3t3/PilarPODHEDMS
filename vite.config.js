import { defineConfig, loadEnv } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    // When tunneling (e.g. ngrok) with a single tunnel, point the tunnel at
    // THIS Vite dev server's port (5173), not Laravel's port. Vite then
    // serves its own asset/HMR URLs directly and proxies everything else
    // (the actual app/API requests) through to Laravel on APP_URL's port.
    // Set VITE_DEV_SERVER_URL to that tunnel's public URL to enable this.
    const devServerUrl = env.VITE_DEV_SERVER_URL;
    const laravelUrl = env.APP_URL || 'http://localhost:8000';
    const reverbUrl = `http://${env.REVERB_HOST || 'localhost'}:${env.REVERB_PORT || 8080}`;

    return {
        plugins: [
            laravel({
                input: 'resources/js/app.jsx',
                refresh: true,
            }),
            react(),
        ],
        // FullCalendar's plugin packages use class-based exports that esbuild's
        // dependency pre-bundling mishandles (throws "Class constructor ...
        // cannot be invoked without 'new'") — excluding them from optimizeDeps
        // keeps them as real ES modules instead.
        optimizeDeps: {
            exclude: [
                '@fullcalendar/core',
                '@fullcalendar/daygrid',
                '@fullcalendar/timegrid',
                '@fullcalendar/interaction',
                '@fullcalendar/react',
            ],
        },
        // Reverb's browser client (resources/js/echo.js) reads these at
        // build time via import.meta.env. Locally they come straight from
        // .env (REVERB_HOST=localhost etc). When tunneling, the browser
        // can't reach "localhost" at all, so redirect it to the tunnel's
        // public host/port instead — the /app proxy rule below forwards
        // that traffic on to the real (local) Reverb server.
        define: devServerUrl
            ? {
                  'import.meta.env.VITE_REVERB_HOST': JSON.stringify(new URL(devServerUrl).hostname),
                  'import.meta.env.VITE_REVERB_PORT': JSON.stringify('443'),
                  'import.meta.env.VITE_REVERB_SCHEME': JSON.stringify('https'),
              }
            : undefined,
        server: devServerUrl
            ? {
                  host: '0.0.0.0',
                  port: 5173,
                  strictPort: true,
                  origin: devServerUrl,
                  cors: true,
                  hmr: {
                      host: new URL(devServerUrl).hostname,
                      protocol: 'wss',
                      clientPort: 443,
                  },
                  proxy: {
                      // Reverb (Pusher-protocol) websocket connections hit
                      // /app/{key} — forward those to the real Reverb server.
                      '^/app/.*': {
                          target: reverbUrl,
                          ws: true,
                          changeOrigin: false,
                      },
                      // Anything else that isn't one of Vite's own dev-server
                      // paths (assets under /resources, HMR client internals
                      // under /@* and /node_modules/*) is an actual Laravel
                      // app/API request — forward it to the real Laravel server.
                      '^(?!/(?:@|resources/|node_modules/)).*': {
                          target: laravelUrl,
                          changeOrigin: false,
                          // Tells Laravel (via bootstrap/app.php's trustProxies)
                          // the original request was https, so route()/url()/
                          // asset() generate https:// links instead of http://.
                          headers: { 'X-Forwarded-Proto': 'https' },
                      },
                  },
              }
            : undefined,
    };
});
