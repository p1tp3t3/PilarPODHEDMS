import { useCallback, useEffect, useRef, useState } from "react"
import { router, usePage } from "@inertiajs/react"
import axios from "axios"

// Every mounted list (by its loader), so anything on the page — a modal
// after saving, an action's success handler — can refresh them with
// reloadListData().
const loaders = new Set()

/** Refresh every list on the current page (each refetches from its API). */
export const reloadListData = () => Promise.all([...loaders].map((load) => load()))

const QUERY_EVENT = "list-query-change"

/**
 * A filter / tab change on a list page: the address bar gets the new query
 * (no page request — it's kept for a refresh or a shared link) and the
 * page's lists are fetched again from their API with it.
 * `query`: URLSearchParams, a query string, or an object (empty / "all"
 * values are kept as given; pass only what the page should carry).
 */
export const setListQuery = (query) => {
    const q = (query instanceof URLSearchParams ? query : new URLSearchParams(query ?? "")).toString()
    const url = `${window.location.pathname}${q ? `?${q}` : ""}`
    window.history.replaceState(window.history.state, "", url)
    window.dispatchEvent(new Event(QUERY_EVENT))
    return reloadListData()
}

/** The page's current query (URLSearchParams), re-rendering when setListQuery() changes it. */
export const useListQuery = () => {
    const [search, setSearch] = useState(() => window.location.search)
    useEffect(() => {
        const onChange = () => setSearch(window.location.search)
        window.addEventListener(QUERY_EVENT, onChange)
        window.addEventListener("popstate", onChange)
        return () => {
            window.removeEventListener(QUERY_EVENT, onChange)
            window.removeEventListener("popstate", onChange)
        }
    }, [])
    return new URLSearchParams(search)
}

/**
 * A list page's tables, fetched from its JSON endpoint once the page opens
 * (every row; the tables paginate in the browser). By default that's the
 * current page's API endpoint, /api + the page's path, with the page's
 * query string ('list-data' routes in routes/api.php, list_page() on the
 * server):
 *
 *   const { data, loading, reload } = useListData()
 *   data?.complaint_list   // null until it arrives
 *
 * It refetches after every Inertia visit or reload on the page (a tab's
 * ?status=, router.reload() after saving ...), so the tables follow the
 * page. Pass `url` / `params` to call another endpoint instead;
 * `enabled: false` (a page or section without tables) makes no request.
 * A reload keeps the current rows on screen until the new ones arrive.
 */
export default function useListData(url = null, params = null, { enabled = true } = {}) {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const latest = useRef(0)
    const lastStart = useRef({ key: "", at: 0 })
    const opts = useRef({ url, params, enabled })
    opts.current = { url, params, enabled }
    const paramsKey = JSON.stringify(params ?? null)
    const component = usePage().component

    const load = useCallback(() => {
        if (!opts.current.enabled) {
            setLoading(false)
            return Promise.resolve()
        }
        // Read at fetch time: after a visit the address bar has the new query.
        const endpoint = opts.current.url ?? `/api${window.location.pathname.replace(/\/$/, "")}`
        const query = opts.current.params ?? Object.fromEntries(new URLSearchParams(window.location.search))
        const key = `${endpoint}?${JSON.stringify(query)}`
        // The same request twice at once (mount + the visit that mounted it): once.
        if (lastStart.current.key === key && Date.now() - lastStart.current.at < 300) return Promise.resolve()
        lastStart.current = { key, at: Date.now() }

        const ticket = ++latest.current
        setLoading(true)
        // A request that never reached the server (a network blip): tried
        // again a few times, so the table doesn't stay on its skeleton.
        const request = (attempt) => axios
            .get(endpoint, { params: query, headers: { Accept: "application/json" } })
            .catch((e) => {
                if (!e.response && attempt < 3 && ticket === latest.current) {
                    return new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1))).then(() => request(attempt + 1))
                }
                throw e
            })
        return request(0)
            .then((res) => {
                if (ticket !== latest.current) return
                setData(res.data)
                setError(null)
            })
            .catch((e) => {
                if (ticket !== latest.current) return
                console.error(e)
                setError(e)
            })
            .finally(() => {
                if (ticket === latest.current) setLoading(false)
            })
    }, [])

    useEffect(() => {
        load()
    }, [load, url, paramsKey, enabled])

    useEffect(() => {
        loaders.add(load)
        // After a visit/reload that stays on this page: the lists follow it
        // (not when leaving for another page).
        const off = router.on("success", (event) => {
            if (event.detail?.page?.component === component) load()
        })
        return () => {
            loaders.delete(load)
            off()
        }
    }, [load, component])

    return { data, loading, error, reload: load, setData }
}
