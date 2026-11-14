// While a confirmed submission is processing, the form it came from is
// disabled and the button that sent it shows a spinner, instead of a
// full-screen loading modal. startBusy() is called where the loading modal
// used to open (loadRegister "text-wait", showLoadingModal); endBusy() when
// the result modal opens or loading ends.

const RECENT_MS = 5 * 60 * 1000

let lastSubmit = null // { form, submitter, at }
let lastClick = null // { el, at }
let busy = null // { scope, trigger, disabledTrigger }

const isInSwal = (el) => !!el?.closest?.(".swal2-container")

if (typeof document !== "undefined") {
    document.addEventListener("submit", (e) => {
        if (isInSwal(e.target)) return
        lastSubmit = { form: e.target, submitter: e.submitter ?? null, at: Date.now() }
    }, true)

    document.addEventListener("click", (e) => {
        if (isInSwal(e.target)) return
        let el = e.target?.closest?.('button, [role="button"], input[type="submit"], input[type="checkbox"]')
        // A switch/checkbox: the whole control, not its hidden input.
        if (el?.type === "checkbox") el = el.closest(".MuiSwitch-root, .MuiCheckbox-root") ?? el
        if (el) lastClick = { el, at: Date.now() }
    }, true)

    document.addEventListener("inertia:navigate", () => endBusy())
}

const recent = (x, maxAge = RECENT_MS) => x && Date.now() - x.at < maxAge && (x.form ?? x.el).isConnected

// The form (or modal panel) and button the processing request came from.
const findSource = (maxAge = RECENT_MS) => {
    const sub = recent(lastSubmit, maxAge) ? lastSubmit : null
    const click = recent(lastClick, maxAge) ? lastClick : null
    if (!sub && !click) return null

    const useSubmit = sub && (!click || sub.at >= click.at || sub.form.contains(click.el))
    if (useSubmit) {
        const trigger = sub.submitter
            ?? (click && sub.form.contains(click.el) ? click.el : null)
            ?? sub.form.querySelector('button[type="submit"], input[type="submit"]')
        return { scope: sub.form, trigger }
    }

    const scope = click.el.closest("form") ?? click.el.closest("[data-modal-panel]")
    return { scope, trigger: click.el }
}

const isShown = (el) => {
    if (!el?.isConnected) return false
    if (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return false
    for (let n = el; n && n !== document.body; n = n.parentElement) {
        if (getComputedStyle(n).pointerEvents === "none" && n !== el) return false
    }
    return true
}

// onHidden: shows the old loading screen instead, for a form that closed
// (e.g. its modal) right after confirming, so the progress stays visible.
export const startBusy = (onHidden, maxAge = RECENT_MS) => {
    if (busy && isShown(busy.trigger ?? busy.scope)) return true
    endBusy()
    const src = findSource(maxAge)
    if (!src || !isShown(src.trigger ?? src.scope)) return false

    const { scope, trigger } = src
    if (scope) {
        scope.classList.add("form-busy")
        scope.inert = true
    }
    let disabledTrigger = false
    const isButton = trigger && !trigger.matches(".MuiSwitch-root, .MuiCheckbox-root, input[type=checkbox]")
    if (trigger && isButton) {
        trigger.style.setProperty("--busy-color", getComputedStyle(trigger).color)
        trigger.classList.add("btn-busy")
        trigger.setAttribute("aria-busy", "true")
        if (!scope && !trigger.disabled) {
            trigger.disabled = true
            disabledTrigger = true
        }
    } else if (trigger) {
        // A switch/checkbox: dimmed and locked, no spinner.
        trigger.classList.add("ctl-busy")
        trigger.inert = true
    }
    busy = { scope, trigger, disabledTrigger }
    const mine = busy
    setTimeout(() => {
        if (busy === mine && !isShown(trigger ?? scope)) {
            endBusy()
            onHidden?.()
        }
    }, 450)
    // Used: a later loading call shouldn't pick the same form again.
    lastSubmit = null
    lastClick = null
    return true
}

export const endBusy = () => {
    if (!busy) return
    const { scope, trigger, disabledTrigger } = busy
    if (scope) {
        scope.classList.remove("form-busy")
        scope.inert = false
    }
    if (trigger) {
        trigger.classList.remove("ctl-busy")
        if (trigger.classList.contains("MuiSwitch-root") || trigger.classList.contains("MuiCheckbox-root") || trigger.type === "checkbox") trigger.inert = false
        trigger.classList.remove("btn-busy")
        trigger.removeAttribute("aria-busy")
        trigger.style.removeProperty("--busy-color")
        if (disabledTrigger) trigger.disabled = false
    }
    busy = null
}

export const isBusy = () => busy !== null
