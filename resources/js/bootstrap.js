import axios from 'axios';
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

axios.interceptors.request.use((config) => {
    console.log('Request method:', config.method); // 'get', 'post', etc.
    if (config.method === 'post') {
        console.log('This is a POST request');
    }
    return config;
});

// Session expiring mid-action (Cancel/Archive/Call In/etc — plain axios
// calls, not an Inertia page visit) gets a plain 401 from the server, which
// axios treats as a normal error — left alone, each call site's own catch
// handler would just show its usual "Failed to ..." toast instead of
// sending the user back to log in. Real Inertia page visits don't need this
// — those get redirected server-side via Inertia::location() instead
// (bootstrap/app.php's exception handler).
axios.interceptors.response.use(
    (response) => response,
    (error) => {
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
