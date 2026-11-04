import { Children, createContext, isValidElement, useContext } from "react"
import { createPortal } from "react-dom"
import { useIsMobile } from "@/others/use-is-mobile"
import { useMediaQuery } from "@mui/material"

// AuthLayout owns the page title bar (full width, under the top header);
// pages fill it through this slot. A portal rather than "set the title in
// state" so the right-side actions keep living in the page's own React tree:
// their state, handlers and context (e.g. a button that depends on a fetch)
// work exactly as if they were rendered in place, and nothing re-renders
// the layout when the page re-renders.
export const PageTitleSlotContext = createContext(null)

// How Btn/ActionBtn render a page's title action:
//   "fab"     — phones: a floating 56px round icon button at the bottom
//               right, above the bottom navigation;
//   "bar"     — inside the title bar: 32px round icon button;
//   "compact" — in a tablet's filter row: 40px round icon button, the
//               dropdowns' height, so it fits beside them;
//   false     — anywhere else: the normal labelled button.
export const TitleActionContext = createContext(false)

// The page's action (tablet/desktop) when the page shows it in its own
// filter row — see PageLayout's `actionsWithFilters` and <PageActions />.
export const PageActionsContext = createContext(null)

// Put at the end of a page's filter row: renders the page's title action
// there on tablets/desktops (nothing on phones, where it's in the bar).
export const PageActions = () => {
    const actions = useContext(PageActionsContext)
    const isTablet = useMediaQuery("(max-width: 1023.98px)")
    if (!actions) return null
    return (
        <div className="md:ml-auto shrink-0 flex items-center">
            <TitleActionContext.Provider value={isTablet ? "compact" : false}>{actions}</TitleActionContext.Provider>
        </div>
    )
}

// Plain text of a button's children (for its tooltip/aria-label when only
// the icon is showing).
export const textOf = (node) => {
    if (node == null || typeof node === "boolean") return ""
    if (typeof node === "string" || typeof node === "number") return String(node)
    if (Array.isArray(node)) return node.map(textOf).join("")
    if (isValidElement(node)) return Children.toArray(node.props.children).map(textOf).join("")
    return ""
}

// Shared by Btn/ActionBtn. Inside the title bar (phones): a 32px round
// icon-only button when given an `icon`, else a compact one — either way
// shorter than the bar's own content, so it never makes the bar taller.
export const useTitleActionIcon = (icon, children, label) => {
    const mode = useContext(TitleActionContext)
    if (!mode) return null
    if (mode === "compact" && !icon) return null

    const fabShadow = mode === "fab" ? { boxShadow: "0 6px 16px rgba(0,0,0,0.25)", "&:hover": { boxShadow: "0 8px 20px rgba(0,0,0,0.3)" } } : {}

    if (!icon) {
        // No icon: a labelled pill (a rounded "extended" button when floating).
        return mode === "fab"
            ? { sx: { minHeight: 48, px: 2.5, borderRadius: "9999px", fontSize: "0.9em", ...fabShadow }, content: children }
            : { sx: { py: 0.5, minHeight: 0, lineHeight: 1.4, fontSize: "0.8em" }, content: children }
    }

    const name = (label ?? textOf(children)).replace(/\s+/g, " ").trim()
    const size = mode === "compact" ? 40 : mode === "fab" ? 56 : 32
    return {
        name,
        sx: { width: size, height: size, minWidth: size, p: 0, borderRadius: "9999px", ...fabShadow },
        content: <span className="grid place-items-center" aria-hidden="true">{icon}</span>,
    }
}

// Renders the page title into the layout's title bar. On phones its
// right-side actions float at the bottom right of the screen (round icon
// buttons, above the bottom navigation); on tablets and desktops they stay
// at the top right of the page content, full size with their labels. Falls
// back to rendering in place when there's no bar (a page shown outside
// AuthLayout).
export const PageTitle = ({ title, rightSideComponent, actionsElsewhere = false }) => {
    const slot = useContext(PageTitleSlotContext)
    const isMobile = useIsMobile()
    const floating = Boolean(rightSideComponent) && isMobile

    const heading = (
        <div className="flex w-full justify-between items-center gap-3 min-w-0">
            <h1 className="min-w-0 text-[0.95em] sm:text-[1.05em] font-bold uppercase tracking-wide text-gray-800">{title}</h1>
        </div>
    )

    // Above the 64px bottom navigation (and the phone's safe area), under
    // modals (z-200) but over the page.
    const fab = floating && (
        <div
            className="fixed right-4 z-[85] flex flex-col items-end gap-3"
            style={{ bottom: "calc(64px + 1rem + env(safe-area-inset-bottom))" }}
        >
            <TitleActionContext.Provider value="fab">{rightSideComponent}</TitleActionContext.Provider>
        </div>
    )

    const pageActions = rightSideComponent && !floating && !actionsElsewhere && (
        <div className="flex justify-end mb-5">{rightSideComponent}</div>
    )

    if (!slot) return <>{heading}{pageActions}{fab && createPortal(fab, document.body)}</>

    return (
        <>
            {createPortal(heading, slot)}
            {pageActions}
            {fab && createPortal(fab, document.body)}
        </>
    )
}
