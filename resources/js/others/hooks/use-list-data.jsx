import { useCallback, useEffect, useRef, useState } from "react"
import { router, usePage } from "@inertiajs/react"
import axios from "axios"

// Every mounted list (by its loader), so anything on the page — a modal
// after saving, an action's success handler — can refresh them with
// reloadListData().
const loaders = new Set()

/** Refresh every list on the current page (each refetches from its API). */
export const reloadListData = () => Promise.all([...loaders].map((load) => load()))

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
        return axios
            .get(endpoint, { params: query, headers: { Accept: "application/json" } })
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
