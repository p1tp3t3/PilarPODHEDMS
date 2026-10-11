import { Tabs, Tab } from "@mui/material";

/**
 * Reusable MUI tab bar, dropped into any page that switches between views.
 * Pass `tabs` as [{ key, label }], the active `value` (a key), and
 * `onChange(key)`. Renders only the tab bar itself — each page still owns
 * rendering whatever content belongs to the active tab.
 */
const TabSwitcher = ({ tabs, value, onChange, fullWidth = false }) => {
    return (
        <Tabs
            value={value}
            onChange={(_, newValue) => onChange(newValue)}
            textColor="primary"
            indicatorColor="primary"
            variant={fullWidth ? "fullWidth" : "scrollable"}
            {...(fullWidth ? {} : { scrollButtons: "auto", allowScrollButtonsMobile: true })}
            sx={{ minHeight: "2.5rem", borderBottom: 1, borderColor: "divider" }}
        >
            {tabs.map((tab) => (
                <Tab
                    key={tab.key}
                    value={tab.key}
                    label={tab.label}
                    icon={tab.icon ? <tab.icon size={16} /> : undefined}
                    iconPosition="start"
                    sx={{
                        minHeight: "2.5rem",
                        textTransform: "none",
                        fontWeight: 600,
                        fontSize: "0.875rem",
                        // Equal-width tabs on a phone: tighter text so each
                        // label stays on one line.
                        ...(fullWidth && {
                            minWidth: 0,
                            px: 1,
                            whiteSpace: "nowrap",
                            fontSize: { xs: "0.78rem", sm: "0.875rem" },
                        }),
                    }}
                />
            ))}
        </Tabs>
    );
};

export default TabSwitcher;
