import { useEffect, useState } from "react"

// Phone-sized screens get the dedicated mobile design (bottom nav, card
// lists, bottom-sheet modals). Matches Tailwind's `md` breakpoint (768px),
// the same cutoff the sidebar already used to become a drawer.
export const MOBILE_QUERY = "(max-width: 767px)"

const matches = () => typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches

export const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(matches)

    useEffect(() => {
        const mql = window.matchMedia(MOBILE_QUERY)
        const onChange = () => setIsMobile(mql.matches)
        onChange()
        mql.addEventListener("change", onChange)
        return () => mql.removeEventListener("change", onChange)
    }, [])

    return isMobile
}

export default useIsMobile
