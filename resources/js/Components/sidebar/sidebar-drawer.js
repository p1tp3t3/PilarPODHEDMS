// The sidebar is an off-canvas drawer below the md breakpoint: hidden by the
// `max-[767px]:w-0` class on <aside>, with a dimmed overlay behind it.
const HIDDEN = "max-[767px]:w-0"

const parts = () => [document.querySelector("aside"), document.querySelector("#sidebar-overlay")]

export const openSidebarDrawer = () => {
    const [aside, overlay] = parts()
    aside?.classList.remove(HIDDEN)
    overlay?.classList.remove("hidden")
}

export const closeSidebarDrawer = () => {
    const [aside, overlay] = parts()
    aside?.classList.add(HIDDEN)
    overlay?.classList.add("hidden")
}

export const toggleSidebarDrawer = () => {
    const [aside] = parts()
    if (aside?.classList.contains(HIDDEN)) openSidebarDrawer()
    else closeSidebarDrawer()
}
