import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { ThemeProvider, createTheme } from "@mui/material/styles"
import { router } from "@inertiajs/react"

// Light/dark mode for the whole app. The choice is kept in localStorage
// ("theme") and applied as a `dark` class on <html> — app.blade.php sets it
// before the first paint so a dark page never flashes white on load.
// Tailwind colours are remapped for html.dark in resources/css/app.css; MUI
// components get a matching dark palette from the theme below.
const STORAGE_KEY = "theme"

const ThemeModeContext = createContext({ mode: "light", toggleMode: () => {} })

// app.blade.php only applies the saved theme for a signed-in user, so the
// class on <html> is the starting point: a guest page (login, after logging
// out) starts light, and saving that resets the preference — logging out
// always turns dark mode off.
const readMode = () => (document.documentElement.classList.contains("dark") ? "dark" : "light")

export const ThemeModeProvider = ({ children }) => {
    const [mode, setMode] = useState(readMode)

    // Navigating to a guest page without a full reload (e.g. after logout)
    // also switches back to light.
    useEffect(() => router.on("navigate", (event) => {
        if (!event.detail.page?.props?.auth?.user) setMode("light")
    }), [])

    useEffect(() => {
        document.documentElement.classList.toggle("dark", mode === "dark")
        document.documentElement.style.colorScheme = mode
        try {
            localStorage.setItem(STORAGE_KEY, mode)
        } catch {}
    }, [mode])

    const muiTheme = useMemo(() => createTheme({
        palette: mode === "dark"
            ? {
                mode: "dark",
                background: { default: "#0b1220", paper: "#1e293b" },
                divider: "#334155",
                text: { primary: "#e2e8f0", secondary: "#94a3b8" },
                // MUI's dark defaults are pale colours with black text, which
                // left black labels on the app's own blue/green/red buttons.
                primary: { main: "#3b82f6", contrastText: "#fff" },
                secondary: { main: "#a855f7", contrastText: "#fff" },
                success: { main: "#16a34a", contrastText: "#fff" },
                error: { main: "#dc2626", contrastText: "#fff" },
                warning: { main: "#f59e0b", contrastText: "#fff" },
                info: { main: "#0ea5e9", contrastText: "#fff" },
            }
            : { mode: "light" },
        components: {
            // Keep MUI's dark Paper flat (no white elevation overlay).
            MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
        },
    }), [mode])

    const value = useMemo(() => ({
        mode,
        toggleMode: () => setMode((m) => (m === "dark" ? "light" : "dark")),
    }), [mode])

    return (
        <ThemeModeContext.Provider value={value}>
            <ThemeProvider theme={muiTheme}>{children}</ThemeProvider>
        </ThemeModeContext.Provider>
    )
}

export const useThemeMode = () => useContext(ThemeModeContext)
