import { useEffect, useState } from "react"
import { SlidersHorizontal } from "lucide-react"
import UpModal from "@/Components/modal/up-modal"
import { Button } from "@mui/material"

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
            <Button
                fullWidth
                variant={active > 0 ? "contained" : "outlined"}
                disableElevation
                onClick={() => setOpen(true)}
                startIcon={<SlidersHorizontal size={16} />}
                sx={{
                    textTransform: "none", fontSize: "0.9em", borderRadius: "0.375rem", py: 1.1, gap: 0.5,
                    ...(active > 0
                        ? { bgcolor: "#2563eb", "&:hover": { bgcolor: "#1d4ed8" } }
                        : { bgcolor: "#fff", color: "#374151", borderColor: "#d1d5db", "&:hover": { bgcolor: "#f9fafb", borderColor: "#9ca3af" } }),
                }}
            >
                {title}
                {active > 0 && (
                    <span className="min-w-[1.25rem] px-1.5 rounded-full bg-white text-blue-700 text-[0.8em] font-semibold">
                        {active}
                    </span>
                )}
            </Button>

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
                    <Button
                        fullWidth
                        variant="contained"
                        disableElevation
                        onClick={() => setOpen(false)}
                        sx={{ textTransform: "none", fontSize: "0.9em", borderRadius: "0.375rem", py: 1.1, bgcolor: "#2563eb", "&:hover": { bgcolor: "#1d4ed8" } }}
                    >
                        Done
                    </Button>
                </div>
            </UpModal>
        </>
    )
}

export default MobileFilters
