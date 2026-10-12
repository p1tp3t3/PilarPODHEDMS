import { APIRequest } from "../classes/api-req";

const SEARCH_CACHE_PREFIX = "search-cache:";
const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes — long enough to skip re-requests while re-typing/re-visiting the same search, short enough that newly added users still show up soon.

const readSearchCache = (key) => {
    try {
        const raw = localStorage.getItem(SEARCH_CACHE_PREFIX + key);
        if (!raw) return null;

        const { data, expiresAt } = JSON.parse(raw);
        if (Date.now() > expiresAt) {
            localStorage.removeItem(SEARCH_CACHE_PREFIX + key);
            return null;
        }

        return data;
    } catch {
        return null;
    }
};

const writeSearchCache = (key, data) => {
    try {
        localStorage.setItem(SEARCH_CACHE_PREFIX + key, JSON.stringify({
            data,
            expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
        }));
    } catch {
        // localStorage full/unavailable (e.g. private browsing) — caching is
        // a nice-to-have here, not a requirement, so just skip it.
    }
};

export const UserService = {
    search(apiLink, search, setter) {
        const cacheKey = `${apiLink}${apiLink.includes("?") ? "&" : "?"}search=${search}`;
        const cached = readSearchCache(cacheKey);

        if (cached != null) {
            setter(cached);
            return;
        }

        const api = new APIRequest(cacheKey, "get");
        api.setSetter((data) => {
            writeSearchCache(cacheKey, data);
            setter(data);
        });
        api.fetchData();
    },
    getNewlyRegisteredUsers(dateRegistered, setter) {
        const api = new APIRequest(`/api/all-users/all?search=&date_registered=${dateRegistered}`, "get", {}, setter);
        api.fetchData();
    },
    getAllStudents(setter) {
        const api = new APIRequest("/all-students", "get", null, setter);
        api.fetchData();
    },
};
