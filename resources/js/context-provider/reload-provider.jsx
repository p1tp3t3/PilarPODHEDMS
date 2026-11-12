import { createContext, useContext, useRef, useState } from "react"
import Reload from "@/Components/reload/reload"
import { startBusy, endBusy } from "@/others/form-busy"

const ReloadContext = createContext()

/**
 * Every page used to own its own reload/reloadType/reloadLabel state and
 * render its own <Reload>. Centralized here — wrap a layout with this once,
 * and any descendant just calls loadRegister(...) via useReload() instead.
 *
 * A handful of pages need extra logic on close (e.g. redirecting after
 * creating a record) — they can pass their own handler to loadRegister's
 * 4th argument, or register one via setOnClose for it to persist across
 * re-renders without re-passing it on every loadRegister call.
 */
export function ReloadProvider({ children }) {
    const [reload, setReload] = useState(false)
    const [reloadType, setReloadType] = useState("")
    const [reloadLabel, setReloadLabel] = useState("")
    const onCloseRef = useRef(null)

    const loadRegister = (r, t = "", l = "", onClose = undefined) => {
        if (onClose !== undefined) onCloseRef.current = onClose
        // Processing: the submitting form shows it (disabled, button spinning)
        // instead of the full-screen loader, when one can be found.
        const showLoader = () => {
            setReload(true)
            setReloadType("text-wait")
            setReloadLabel(l)
        }
        if (r && t === "text-wait" && startBusy(showLoader)) {
            setReload(false)
            setReloadType("")
            return
        }
        endBusy()
        setReload(r)
        setReloadType(t)
        setReloadLabel(l)
    }

    const setOnClose = (fn) => {
        onCloseRef.current = fn
    }

    // Must outrank every form modal's z-[200] (UpModal, AlertModal, FadeModal) —
    // otherwise the loading/success overlay renders behind a still-open modal
    // instead of covering it, since same-z-index siblings stack by DOM order.
    const isReload = () => (reload && ["text-wait", "logo"].includes(reloadType) ? "opacity-1 z-[300]" : "opacity-0 z-[-1] pointer-events-none")

    const handleClose = (e) => {
        if (onCloseRef.current) {
            onCloseRef.current(e)
        } else {
            setReload(e)
        }
    }

    return (
        <ReloadContext.Provider value={{ reload, reloadType, reloadLabel, loadRegister, setReload, setOnClose }}>
            <Reload transition={isReload()} type={reloadType} label={reloadLabel} onClose={handleClose} />
            {children}
        </ReloadContext.Provider>
    )
}

export const useReload = () => useContext(ReloadContext)
export default ReloadContext
