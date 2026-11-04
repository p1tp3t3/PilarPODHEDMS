import { useEffect, useState } from "react"
import { SlidersHorizontal } from "lucide-react"
import UpModal from "@/Components/modal/up-modal"

// How many of these filter values are set ('' / 'all' / null mean "not set").
export const countActive = (...values) =>
    values.filter((v) => v !== undefined && v !== null && v !== "" && v !== "all").length

// Phones only (below Tailwind's `sm`).
const QUERY = "(max-width: 639.98px)"
const useIsPhone = () => {
    const [phone, setPhone] = useState(() => typeof window !== "undefined" && window.matchMedia(QUERY).matches)
    useEffect(() => {
        const mq = window.matchMedia(QUERY)
        const onChange = (e) => setPhone(e.matches)
        mq.addEventListener("change", onChange)
        return () => mq.removeEventListener("change", onChange)
    }, [])
    return phone
}

/**
 * A list page's filter dropdowns: shown inline as they are on wider
 * screens, and behind a "Filters" button that opens them in a modal on a
 * phone. The dropdowns keep applying on change, as they do inline.
 * `active` is how many filters are set (shown on the button).
 */
const MobileFilters = ({ children, active = 0, title = "Filters" }) => {
    const isPhone = useIsPhone()
    const [open, setOpen] = useState(false)

    useEffect(() => { if (!isPhone) setOpen(false) }, [isPhone])

    if (!isPhone) return children

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 text-[0.9em] rounded-md border transition-colors ${
                    active > 0
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-gray-300 bg-white text-gray-700"
                }`}
            >
                <SlidersHorizontal size={16} />
                {title}
                {active > 0 && (
                    <span className="min-w-[1.25rem] px-1.5 rounded-full bg-white text-blue-700 text-[0.8em] font-semibold">
                        {active}
                    </span>
                )}
            </button>

            <UpModal
                close={open}
                closeModal={setOpen}
                isEnableOuterClose={true}
                cntr={true}
                pd={["px-5", "py-5"]}
                bgColor="bg-white"
                w="w-[28rem]"
            >
                <div className="grid gap-4">
                    <div className="flex items-center gap-2 font-semibold text-gray-800">
                        <SlidersHorizontal size={17} className="text-blue-600" />
                        {title}
                    </div>
                    {/* Stacked full width, whatever layout the page gives them inline. */}
                    <div className="grid gap-3 [&>*]:!w-full [&_*]:!max-w-none [&>div]:!flex-col">
                        {children}
                    </div>
                    <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="w-full px-4 py-2.5 text-[0.9em] rounded-md bg-blue-600 text-white hover:bg-blue-700"
                    >
                        Done
                    </button>
                </div>
            </UpModal>
        </>
    )
}

export default MobileFilters
