import { useEffect, useRef } from "react";
import { Tabs, Tab, useMediaQuery } from "@mui/material";
import { reloadListData } from "@/others/hooks/use-list-data";

/**
 * Reusable MUI tab bar, dropped into any page that switches between views.
 * Pass `tabs` as [{ key, label, short? }], the active `value` (a key), and
 * `onChange(key)`. Renders only the tab bar itself — each page still owns
 * rendering whatever content belongs to the active tab.
 * Clicking the tab that's already selected triggers it again: `onReselect(key)`
 * if given, otherwise the page's lists are reloaded from their API.
 */
// A tab's count is left off when it's zero: "Archived (0)" shows as "Archived".
const tabLabel = (label) => (typeof label === "string" ? label.replace(/\s*\(0\)$/, "") : label);

// Phones: "All Gate Passes" / "All Complaints" -> "All" (or a tab's own
// `short`), so every tab fits on the screen instead of some being scrolled
// out of view.
const shortLabel = (tab) => {
    if (tab.short) return tab.short;
    const label = tabLabel(tab.label);
    return typeof label === "string" && /^All\s/i.test(label) ? "All" : label;
};

const TabSwitcher = ({ tabs, value, onChange, onReselect, fullWidth = false }) => {
    // Phones: the tabs share the full width (none hidden behind a scroll
    // arrow), with shorter labels.
    const isPhone = useMediaQuery("(max-width: 639.98px)");
    const equal = fullWidth || isPhone;

    // The underline follows its tab when the bar's size changes (e.g. a
    // page shows filters beside it for some tabs); MUI only measures it on
    // a change of tab or a window resize.
    const actions = useRef(null);
    const root = useRef(null);
    useEffect(() => {
        if (!root.current || typeof ResizeObserver === "undefined") return;
        const observer = new ResizeObserver(() => {
            actions.current?.updateIndicator();
            actions.current?.updateScrollButtons();
        });
        observer.observe(root.current);
        return () => observer.disconnect();
    }, []);

    return (
        <Tabs
            ref={root}
            action={actions}
            value={value}
            onChange={(_, newValue) => onChange(newValue)}
            textColor="primary"
            indicatorColor="primary"
            variant={equal ? "fullWidth" : "scrollable"}
            {...(equal ? {} : { scrollButtons: "auto", allowScrollButtonsMobile: true })}
            sx={{ minHeight: "2.5rem", borderBottom: 1, borderColor: "divider" }}
        >
            {tabs.map((tab) => (
                <Tab
                    key={tab.key}
                    value={tab.key}
                    // MUI only fires onChange for a different tab.
                    onClick={() => {
                        if (tab.key !== value) return;
                        onReselect ? onReselect(tab.key) : reloadListData();
                    }}
                    // Text only: a tab's `icon` (still in some pages' tab lists) isn't shown.
                    label={isPhone ? shortLabel(tab) : tabLabel(tab.label)}
                    sx={{
                        minHeight: "2.5rem",
                        textTransform: "none",
                        fontWeight: 600,
                        fontSize: "0.875rem",
                        // Equal-width tabs: tighter text; on a phone a two-word
                        // label may wrap onto a second line rather than be cut.
                        ...(equal && {
                            minWidth: 0,
                            // More tabs: less padding and smaller text, so each fits.
                            px: isPhone ? (tabs.length > 5 ? 0 : tabs.length > 3 ? 0.25 : 0.5) : 1,
                            whiteSpace: isPhone ? "normal" : "nowrap",
                            lineHeight: 1.15,
                            fontSize: { xs: tabs.length > 5 ? "0.66rem" : tabs.length > 3 ? "0.72rem" : "0.78rem", sm: "0.875rem" },
                        }),
                    }}
                />
            ))}
        </Tabs>
    );
};

export default TabSwitcher;
