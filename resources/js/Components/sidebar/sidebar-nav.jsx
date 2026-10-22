import { Link, usePage } from "@inertiajs/react"
import { useState } from "react"
import { List, ListItemButton, ListItemIcon, ListItemText, Collapse } from "@mui/material"
import { ChevronRight } from "lucide-react"

// MUI's sx-generated styles win the cascade over Tailwind utility classes
// (sx styles are injected later), so layout/color/background all have to be
// set via sx here — Tailwind classes on these elements get silently
// overridden by MUI's own defaults (padding, near-black text, etc). The
// active-nav highlight is likewise driven by MUI's own `selected` state
// (via &.Mui-selected) rather than a manually toggled Tailwind class, for
// the same reason.
const itemSx = {
    px: 2.5,
    py: 1,
    gap: 1.5,
    width: "100%",
    cursor: "pointer",
    borderRadius: "0.375rem",
    transition: "background-color 0.3s, color 0.3s",
    color: "#fff",
    fontSize: "0.9em",
    "&:hover": { backgroundColor: "#1e3a8a", color: "#fff" },
    "&.Mui-selected": { backgroundColor: "#1e3a8a", color: "#fff" },
    "&.Mui-selected:hover": { backgroundColor: "#1e3a8a", color: "#fff" },
}
const subItemSx = {
    ...itemSx,
    pl: 6,
    pr: 2.5,
    fontSize: "1em",
}
const iconSx = { color: "inherit", minWidth: "auto" }
const textSx = { "& .MuiListItemText-primary": { color: "inherit", fontSize: "inherit" } }

// Renders a role's sidebar nav from a single declarative array of
// { type: 'link', id, href, icon, label, show? } or
// { type: 'dropdown', id, icon, label, items: [...], show? } entries,
// so every role's sidebar body is just data instead of repeated JSX + state.
const SidebarNav = ({ list, height = "h-[26rem]", onNavigate }) => {
    const { url } = usePage()
    const [open, setOpen] = useState({})
    const toggle = (id) => setOpen((prev) => ({ ...prev, [id]: !prev[id] }))

    return (
        <div className={`${height} max-md:h-[calc(100dvh-10rem)] overflow-auto overflow-x-hidden dropdown`}>
            <List disablePadding sx={{ px: 2.5 }} className="nav-list">
                {list.filter((item) => item.show ?? true).map((item) =>
                    item.type === "dropdown" ? (
                        <DropdownItem
                            key={item.id}
                            item={item}
                            isOpen={!!open[item.id]}
                            toggle={() => toggle(item.id)}
                            url={url}
                            onNavigate={onNavigate}
                        />
                    ) : (
                        <NavLink key={item.id} item={item} url={url} onNavigate={onNavigate} />
                    )
                )}
            </List>
        </div>
    )
}

// `id` is matched as a literal substring of the current URL — the same
// convention `sidebar-pages.js` documents (ids are deliberately reused
// across roles' entries since only one role's items ever render at once).
const NavLink = ({ item, url, onNavigate }) => (
    <ListItemButton
        component={Link}
        href={item.href}
        onClick={onNavigate}
        id={item.id}
        className="nav"
        disableGutters
        title={item.label}
        selected={url.includes(item.id)}
        sx={itemSx}
    >
        <ListItemIcon sx={iconSx}>
            <item.icon size={16} />
        </ListItemIcon>
        <ListItemText className="rail-hide" primary={item.label} sx={textSx} />
    </ListItemButton>
)

const DropdownItem = ({ item, isOpen, toggle, url, onNavigate }) => (
    <>
        {/* Highlighted when one of its pages is open, so the narrow icon
            rail still shows where you are. */}
        <ListItemButton
            onClick={toggle}
            disableGutters
            sx={itemSx}
            title={item.label}
            selected={item.items.some((sub) => url.includes(sub.id))}
        >
            <ListItemIcon sx={iconSx}>
                <item.icon size={16} />
            </ListItemIcon>
            <ListItemText className="rail-hide" primary={item.label} sx={textSx} />
            <ChevronRight
                size={14}
                className={`rail-hide transition-transform duration-300 ${isOpen ? "rotate-90" : ""}`}
            />
        </ListItemButton>
        <Collapse in={isOpen} timeout={300} unmountOnExit className="rail-hide">
            <List disablePadding className="dropdown-nav-list text-[0.8em]">
                {item.items.filter((sub) => sub.show ?? true).map((sub) => (
                    <ListItemButton
                        key={sub.id}
                        component={Link}
                        href={sub.href}
                        onClick={onNavigate}
                        id={sub.id}
                        className="nav"
                        disableGutters
                        selected={url.includes(sub.id)}
                        sx={subItemSx}
                    >
                        <ListItemIcon sx={iconSx}>
                            <sub.icon size={16} />
                        </ListItemIcon>
                        <ListItemText className="rail-hide" primary={sub.label} sx={textSx} />
                    </ListItemButton>
                ))}
            </List>
        </Collapse>
    </>
)

export default SidebarNav
