import axios from 'axios';
import { startBusy, endBusy, isBusy } from './others/form-busy';
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// Every submission (POST/PUT/PATCH/DELETE) disables the form it came from
// while it's processing, even where the page doesn't open a loading screen
// itself (those already do, via loadRegister / showLoadingModal). Only for a
// form the user just clicked or submitted (last 30 seconds), and not for
// background calls (marking notifications/chats read, Echo's channel auth).
const BACKGROUND = /\/(broadcasting\/auth|notification\/read|activity\/status)|\/chat\/.*(read|seen|typing)/;
axios.interceptors.request.use((config) => {
    const method = (config.method ?? 'get').toLowerCase();
    if (method !== 'get' && !isBusy() && !BACKGROUND.test(config.url ?? '')) {
        config.__formBusy = startBusy(null, 30_000);
    }
    return config;
});
// Done: unlock it (a result modal, if any, opens right after).
const releaseBusy = (config) => { if (config?.__formBusy) endBusy(); };

// Session expiring mid-action (Cancel/Archive/Call In/etc — plain axios
// calls, not an Inertia page visit) gets a plain 401 from the server, which
// axios treats as a normal error — left alone, each call site's own catch
// handler would just show its usual "Failed to ..." toast instead of
// sending the user back to log in. Real Inertia page visits don't need this
// — those get redirected server-side via Inertia::location() instead
// (bootstrap/app.php's exception handler).
axios.interceptors.response.use(
    (response) => { releaseBusy(response.config); return response; },
    (error) => {
        releaseBusy(error.config);
        if (error.response?.status === 401) {
            window.location.href = '/';
            return new Promise(() => {});
        }
        return Promise.reject(error);
    }
);
/**
 * Echo exposes an expressive API for subscribing to channels and listening
 * for events that are broadcast by Laravel. Echo and event broadcasting
 * allow your team to quickly build robust real-time web applications.
 */

import './echo';
