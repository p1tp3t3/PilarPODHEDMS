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
//   "bar"     — inside the title bar (phones): 32px round icon button;
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

    if (!icon) {
        return { sx: { py: 0.5, minHeight: 0, lineHeight: 1.4, fontSize: "0.8em" }, content: children }
    }

    const name = (label ?? textOf(children)).replace(/\s+/g, " ").trim()
    const size = mode === "compact" ? 40 : 32
    return {
        name,
        sx: { width: size, height: size, minWidth: size, p: 0, borderRadius: "9999px" },
        content: <span className="grid place-items-center" aria-hidden="true">{icon}</span>,
    }
}

// Renders the page title into the layout's title bar. Its right-side
// actions go in the bar only on phones (as icon buttons, on the title's
// row); on tablets and desktops they stay out of the bar, at the top right
// of the page content, full size with their labels. Falls back to
// rendering in place when there's no bar (a page shown outside AuthLayout).
export const PageTitle = ({ title, rightSideComponent, actionsElsewhere = false }) => {
    const slot = useContext(PageTitleSlotContext)
    const isMobile = useIsMobile()
    const actionsInBar = Boolean(rightSideComponent) && isMobile

    const heading = (
        <div className="flex w-full justify-between items-center gap-3 min-w-0">
            <h1 className="min-w-0 text-[0.95em] sm:text-[1.05em] font-bold uppercase tracking-wide text-gray-800">{title}</h1>
            {actionsInBar && (
                // Negative margin: the 32px button overlaps the bar's own
                // padding instead of making the bar taller.
                <div className="shrink-0 -my-1.5">
                    <TitleActionContext.Provider value="bar">{rightSideComponent}</TitleActionContext.Provider>
                </div>
            )}
        </div>
    )

    const pageActions = rightSideComponent && !actionsInBar && !actionsElsewhere && (
        <div className="flex justify-end mb-5">{rightSideComponent}</div>
    )

    if (!slot) return <>{heading}{pageActions}</>

    return (
        <>
            {createPortal(heading, slot)}
            {pageActions}
        </>
    )
}
